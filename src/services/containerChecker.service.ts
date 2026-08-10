import type { GraphMessage } from '@/types/outlook';
import type { ShipmentConfiguration } from '@/types/configuration';
import type { ContainerEmailHit, ContainerCheckResult, ExcelContainerRow } from '@/types/checkShipment';
import { getSenderEmails } from '@/utils/configuration';
import { fetchEmailsForContainerCheck } from '@/services/graphService';
import {
  containerAppearsInText,
  extractCiplDateReceived,
  extractContainerReferences,
  buildMessageSearchText,
  normalizeContainerId,
} from '@/services/ciplExtractor';

export type CheckProgress = {
  phase: 'fetching' | 'matching';
  emailsChecked: number;
  containersChecked: number;
  totalContainers: number;
};

export type ContainerCheckStats = {
  emailsFetched: number;
  containersChecked: number;
  foundInEmail: number;
  notFound: number;
  alreadyInExcel: number;
};

function buildTargetIndex(targetContainers: string[]): Map<string, string> {
  const targets = new Map<string, string>();
  for (const raw of targetContainers) {
    const normalized = normalizeContainerId(raw);
    if (normalized.length >= 4) {
      targets.set(normalized, normalized);
    }
  }
  return targets;
}

function pickLatestHit(
  current: ContainerEmailHit | undefined,
  candidate: ContainerEmailHit
): ContainerEmailHit {
  if (!current) return candidate;
  return new Date(candidate.emailReceivedAt) > new Date(current.emailReceivedAt)
    ? candidate
    : current;
}

export function buildContainerEmailIndex(
  messages: GraphMessage[],
  targetContainers: string[]
): Map<string, ContainerEmailHit> {
  const targets = buildTargetIndex(targetContainers);
  const index = new Map<string, ContainerEmailHit>();

  for (const message of messages) {
    const searchText = buildMessageSearchText(
      message.subject,
      message.body?.content,
      message.body?.contentType
    );
    if (!searchText.trim()) continue;

    const ciplDateReceived = extractCiplDateReceived(searchText, message.receivedDateTime);
    const containersInEmail = extractContainerReferences(searchText);
    const matchedContainers = new Set<string>();

    for (const containerNo of containersInEmail) {
      if (!targets.has(containerNo)) continue;
      matchedContainers.add(containerNo);
      const hit: ContainerEmailHit = {
        containerNo,
        ciplDateReceived,
        emailReceivedAt: message.receivedDateTime,
        emailSubject: message.subject || '',
        emailSender: message.from?.emailAddress?.address || '',
        outlookMessageId: message.id,
      };
      index.set(containerNo, pickLatestHit(index.get(containerNo), hit));
    }

    for (const containerNo of targets.keys()) {
      if (matchedContainers.has(containerNo)) continue;
      if (!containerAppearsInText(containerNo, searchText)) continue;

      const hit: ContainerEmailHit = {
        containerNo,
        ciplDateReceived,
        emailReceivedAt: message.receivedDateTime,
        emailSubject: message.subject || '',
        emailSender: message.from?.emailAddress?.address || '',
        outlookMessageId: message.id,
      };

      index.set(containerNo, pickLatestHit(index.get(containerNo), hit));
    }
  }

  return index;
}

export function matchContainersToEmails(
  rows: ExcelContainerRow[],
  index: Map<string, ContainerEmailHit>,
  onlyMissing: boolean
): ContainerCheckResult[] {
  const toCheck = onlyMissing ? rows.filter((r) => r.needsLookup) : rows;

  return toCheck.map((row) => {
    const keys = [normalizeContainerId(row.containerNo)];
    if (row.hawb) keys.push(normalizeContainerId(row.hawb));

    let hit: ContainerEmailHit | undefined;
    for (const key of keys) {
      const match = index.get(key);
      if (match) {
        hit = hit ? pickLatestHit(hit, match) : match;
      }
    }

    if (!row.needsLookup && row.excelDocReceivedDate) {
      return {
        rowIndex: row.rowIndex,
        containerNo: row.containerNo,
        hawb: row.hawb,
        invoiceNumber: row.invoiceNumber,
        excelDocReceivedDate: row.excelDocReceivedDate,
        excelCiplDateReceived: row.excelCiplDateReceived,
        ciplDateReceived: row.excelCiplDateReceived || row.excelDocReceivedDate,
        emailReceivedAt: null,
        emailSubject: null,
        emailSender: null,
        status: 'already_in_excel',
      };
    }

    if (hit) {
      return {
        rowIndex: row.rowIndex,
        containerNo: row.containerNo,
        hawb: row.hawb,
        invoiceNumber: row.invoiceNumber,
        excelDocReceivedDate: row.excelDocReceivedDate,
        excelCiplDateReceived: row.excelCiplDateReceived,
        ciplDateReceived: hit.ciplDateReceived,
        emailReceivedAt: hit.emailReceivedAt,
        emailSubject: hit.emailSubject,
        emailSender: hit.emailSender,
        status: 'found',
      };
    }

    return {
      rowIndex: row.rowIndex,
      containerNo: row.containerNo,
      hawb: row.hawb,
      invoiceNumber: row.invoiceNumber,
      excelDocReceivedDate: row.excelDocReceivedDate,
      excelCiplDateReceived: row.excelCiplDateReceived,
      ciplDateReceived: null,
      emailReceivedAt: null,
      emailSubject: null,
      emailSender: null,
      status: 'not_found',
    };
  });
}

export async function checkContainersAgainstEmails(
  accessToken: string,
  rows: ExcelContainerRow[],
  config: ShipmentConfiguration,
  onlyMissing: boolean,
  onProgress?: (progress: CheckProgress) => void
): Promise<{ results: ContainerCheckResult[]; stats: ContainerCheckStats }> {
  const senderEmails = getSenderEmails(config);
  if (senderEmails.length === 0) {
    throw new Error('Configure at least one sender email in Settings.');
  }

  const toCheck = onlyMissing ? rows.filter((r) => r.needsLookup) : rows;
  const targetContainers = [
    ...new Set(
      toCheck.flatMap((r) => [r.containerNo, r.hawb].filter(Boolean) as string[])
    ),
  ];

  onProgress?.({
    phase: 'fetching',
    emailsChecked: 0,
    containersChecked: 0,
    totalContainers: toCheck.length,
  });

  const messages = await fetchEmailsForContainerCheck(
    accessToken,
    senderEmails,
    (count) => {
      onProgress?.({
        phase: 'fetching',
        emailsChecked: count,
        containersChecked: 0,
        totalContainers: toCheck.length,
      });
    }
  );

  onProgress?.({
    phase: 'matching',
    emailsChecked: messages.length,
    containersChecked: 0,
    totalContainers: toCheck.length,
  });

  const index = buildContainerEmailIndex(messages, targetContainers);

  const results = matchContainersToEmails(rows, index, onlyMissing);
  const stats: ContainerCheckStats = {
    emailsFetched: messages.length,
    containersChecked: results.length,
    foundInEmail: results.filter((r) => r.status === 'found').length,
    notFound: results.filter((r) => r.status === 'not_found').length,
    alreadyInExcel: results.filter((r) => r.status === 'already_in_excel').length,
  };

  return { results, stats };
}
