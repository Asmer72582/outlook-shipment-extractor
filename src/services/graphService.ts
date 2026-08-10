import type { GraphMessage, GraphMessagesResponse, GraphUser } from '@/types/outlook';
import type { ShipmentConfiguration } from '@/types/configuration';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const MESSAGE_SELECT = 'id,subject,from,receivedDateTime,body';

async function graphFetch<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'odata.maxpagesize=50',
    },
  });

  if (response.status === 401) {
    throw new Error('Microsoft session expired. Please reconnect Outlook.');
  }

  if (response.status === 403) {
    throw new Error(
      'Microsoft did not grant permission to read Outlook mail. Please reconnect Outlook and approve Mail.Read.'
    );
  }

  if (response.status === 429) {
    throw new Error('Microsoft Graph is throttling requests. Please wait and try again.');
  }

  if (response.status === 410) {
    throw new Error('DELTA_EXPIRED');
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json() as { error?: { message?: string } };
      detail = body.error?.message ? `: ${body.error.message}` : '';
    } catch {
      // ignore parse errors
    }
    throw new Error(`Unable to read Outlook messages (${response.status})${detail}`);
  }

  return response.json() as Promise<T>;
}

export async function getCurrentUser(accessToken: string): Promise<GraphUser> {
  return graphFetch<GraphUser>(`${GRAPH_BASE}/me`, accessToken);
}

export async function getInboxMessages(
  accessToken: string,
  nextLink?: string
): Promise<GraphMessagesResponse> {
  const url =
    nextLink ||
    `${GRAPH_BASE}/me/mailFolders/inbox/messages?$select=${MESSAGE_SELECT}&$top=50`;
  return graphFetch<GraphMessagesResponse>(url, accessToken);
}

function matchesSender(message: GraphMessage, senderEmail: string): boolean {
  const address = message.from?.emailAddress?.address?.toLowerCase() ?? '';
  return address === senderEmail.toLowerCase();
}

function matchesSubject(message: GraphMessage, subjectContains: string): boolean {
  if (!subjectContains.trim()) return true;
  return message.subject?.toLowerCase().includes(subjectContains.toLowerCase()) ?? false;
}

export function filterShipmentMessages(
  messages: GraphMessage[],
  config: Pick<ShipmentConfiguration, 'senderEmail' | 'subjectContains'>
): GraphMessage[] {
  return messages.filter(
    (msg) => matchesSender(msg, config.senderEmail) && matchesSubject(msg, config.subjectContains)
  );
}

function isValidMessage(msg: GraphMessage): boolean {
  return Boolean(msg.id && msg.body?.content);
}

/**
 * Initial sync via standard messages endpoint — supports full OData $filter.
 */
export async function getShipmentEmails(
  accessToken: string,
  config: Pick<ShipmentConfiguration, 'senderEmail' | 'subjectContains'>
): Promise<GraphMessage[]> {
  const allMessages: GraphMessage[] = [];
  const filters: string[] = [
    `from/emailAddress/address eq '${config.senderEmail.replace(/'/g, "''")}'`,
  ];

  if (config.subjectContains?.trim()) {
    filters.push(`contains(subject,'${config.subjectContains.replace(/'/g, "''")}')`);
  }

  const initialUrl =
    `${GRAPH_BASE}/me/mailFolders/inbox/messages` +
    `?$select=${MESSAGE_SELECT}` +
    `&$filter=${encodeURIComponent(filters.join(' and '))}` +
    `&$top=50`;

  let url: string | undefined = initialUrl;

  while (url) {
    const data: GraphMessagesResponse = await graphFetch<GraphMessagesResponse>(url, accessToken);
    allMessages.push(...data.value.filter(isValidMessage));
    url = data['@odata.nextLink'];
  }

  return allMessages;
}

/**
 * Walk the delta endpoint to obtain a deltaLink for future incremental syncs.
 * Delta queries do not support from/subject filters — only receivedDateTime ge.
 * We request minimal fields to reduce payload while establishing the token.
 */
async function bootstrapDeltaLink(accessToken: string): Promise<string | null> {
  let url: string | undefined =
    `${GRAPH_BASE}/me/mailFolders/inbox/messages/delta?$select=id&$top=50`;

  while (url) {
    const data: GraphMessagesResponse = await graphFetch<GraphMessagesResponse>(url, accessToken);
    if (data['@odata.deltaLink']) {
      return data['@odata.deltaLink'];
    }
    url = data['@odata.nextLink'];
  }

  return null;
}

/**
 * Incremental sync via stored deltaLink.
 * Sender/subject filtering is applied client-side because Graph delta
 * only supports: receivedDateTime ge {value}
 */
async function fetchDeltaMessages(
  accessToken: string,
  deltaLink: string,
  config: Pick<ShipmentConfiguration, 'senderEmail' | 'subjectContains'>
): Promise<{ messages: GraphMessage[]; deltaLink: string | null; expired: boolean }> {
  const rawMessages: GraphMessage[] = [];
  let newDeltaLink: string | null = null;
  let url: string | undefined = deltaLink;

  try {
    while (url) {
      const data: GraphMessagesResponse = await graphFetch<GraphMessagesResponse>(url, accessToken);

      rawMessages.push(...data.value.filter(isValidMessage));

      if (data['@odata.deltaLink']) {
        newDeltaLink = data['@odata.deltaLink'];
        break;
      }

      url = data['@odata.nextLink'];
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'DELTA_EXPIRED') {
      return { messages: [], deltaLink: null, expired: true };
    }
    throw error;
  }

  return {
    messages: filterShipmentMessages(rawMessages, config),
    deltaLink: newDeltaLink,
    expired: false,
  };
}

/**
 * Fetch shipment emails and maintain delta sync state.
 * - No deltaLink: filtered initial sync + bootstrap delta token
 * - Has deltaLink: incremental delta sync with client-side filtering
 */
export async function fetchShipmentMessages(
  accessToken: string,
  config: Pick<ShipmentConfiguration, 'senderEmail' | 'subjectContains'>,
  deltaLink: string | null
): Promise<{ messages: GraphMessage[]; deltaLink: string | null; expired: boolean }> {
  if (deltaLink) {
    return fetchDeltaMessages(accessToken, deltaLink, config);
  }

  const messages = await getShipmentEmails(accessToken, config);
  const newDeltaLink = await bootstrapDeltaLink(accessToken);

  return { messages, deltaLink: newDeltaLink, expired: false };
}

/** @deprecated Use fetchShipmentMessages */
export async function getDeltaMessages(
  accessToken: string,
  deltaLink: string | null,
  config: Pick<ShipmentConfiguration, 'senderEmail' | 'subjectContains'>
): Promise<{ messages: GraphMessage[]; deltaLink: string | null; expired: boolean }> {
  return fetchShipmentMessages(accessToken, config, deltaLink);
}

export async function getEmailBody(
  accessToken: string,
  messageId: string
): Promise<GraphMessage> {
  return graphFetch<GraphMessage>(
    `${GRAPH_BASE}/me/messages/${messageId}?$select=${MESSAGE_SELECT}`,
    accessToken
  );
}

export async function testConnection(accessToken: string): Promise<GraphUser> {
  return getCurrentUser(accessToken);
}
