import { fetchShipmentMessages } from '@/services/graphService';
import { extractShipmentDetails } from '@/services/shipmentExtractor';
import { getConfiguration } from '@/db/repositories/configurationRepository';
import {
  createShipment,
  getShipmentByOutlookId,
} from '@/db/repositories/shipmentRepository';
import { getSyncState, updateSyncState, resetDeltaLink } from '@/db/repositories/syncStateRepository';
import type { SyncResult } from '@/types/outlook';

export type SyncStep =
  | 'connecting'
  | 'searching'
  | 'processing'
  | 'extracting'
  | 'duplicates'
  | 'saving'
  | 'done';

export async function syncOutlookEmails(
  getAccessToken: () => Promise<string>,
  onStep?: (step: SyncStep) => void
): Promise<SyncResult> {
  onStep?.('connecting');
  const accessToken = await getAccessToken();

  const config = await getConfiguration();
  if (!config.senderEmail?.trim()) {
    throw new Error('Configure the shipment sender before syncing.');
  }

  onStep?.('searching');
  let syncState = await getSyncState();
  let fetchResult = await fetchShipmentMessages(accessToken, config, syncState.deltaLink);

  if (fetchResult.expired) {
    await resetDeltaLink();
    fetchResult = await fetchShipmentMessages(accessToken, config, null);
  }

  const result: SyncResult = {
    emailsChecked: 0,
    newShipments: 0,
    duplicates: 0,
    failedExtractions: 0,
  };

  onStep?.('processing');

  for (const message of fetchResult.messages) {
    result.emailsChecked++;
    onStep?.('extracting');

    const existing = await getShipmentByOutlookId(message.id);
    if (existing) {
      result.duplicates++;
      onStep?.('duplicates');
      continue;
    }

    const extraction = extractShipmentDetails(
      message.body.content,
      message.body.contentType,
      config
    );

    if (extraction.status === 'failed') {
      result.failedExtractions++;
    } else {
      result.newShipments++;
    }

    onStep?.('saving');

    await createShipment({
      outlookMessageId: message.id,
      shipmentFrom: extraction.shipmentFrom,
      shipmentDate: extraction.shipmentDate,
      emailSender: message.from?.emailAddress?.address || config.senderEmail,
      emailSubject: message.subject || '',
      emailReceivedAt: message.receivedDateTime,
      extractionStatus: extraction.status,
      extractionConfidence: extraction.confidence,
    });
  }

  await updateSyncState({
    deltaLink: fetchResult.deltaLink,
    lastSyncAt: new Date().toISOString(),
    emailsChecked: result.emailsChecked,
    shipmentsCreated: result.newShipments,
    duplicates: result.duplicates,
    failedExtractions: result.failedExtractions,
  });

  onStep?.('done');
  return result;
}
