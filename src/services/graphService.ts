import type { GraphMessage, GraphMessagesResponse, GraphUser, InboxPageResult } from '@/types/outlook';
import type { ShipmentConfiguration } from '@/types/configuration';
import { getSenderEmails } from '@/utils/configuration';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const MESSAGE_SELECT = 'id,subject,from,receivedDateTime,body';
const INBOX_LIST_SELECT = 'id,subject,from,receivedDateTime,bodyPreview,isRead';

export class GraphApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'GraphApiError';
  }
}

function isInefficientFilterError(error: unknown): boolean {
  return (
    error instanceof GraphApiError &&
    (error.code === 'InefficientFilter' || error.message.includes('too complex'))
  );
}

async function graphFetch<T>(
  url: string,
  accessToken: string,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'odata.maxpagesize=50',
      ...extraHeaders,
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
    let code: string | undefined;
    try {
      const body = await response.json() as { error?: { code?: string; message?: string } };
      code = body.error?.code;
      detail = body.error?.message ? `: ${body.error.message}` : '';
    } catch {
      // ignore parse errors
    }
    throw new GraphApiError(
      `Unable to read Outlook messages (${response.status})${detail}`,
      response.status,
      code
    );
  }

  return response.json() as Promise<T>;
}

export async function getCurrentUser(accessToken: string): Promise<GraphUser> {
  return graphFetch<GraphUser>(`${GRAPH_BASE}/me`, accessToken);
}

function matchesAnySender(message: GraphMessage, senderEmails: string[]): boolean {
  const address = message.from?.emailAddress?.address?.toLowerCase() ?? '';
  return senderEmails.some((email) => address === email.toLowerCase());
}

function matchesSubject(message: GraphMessage, subjectContains: string): boolean {
  if (!subjectContains.trim()) return true;
  return message.subject?.toLowerCase().includes(subjectContains.toLowerCase()) ?? false;
}

export function filterShipmentMessages(
  messages: GraphMessage[],
  config: Pick<ShipmentConfiguration, 'senderEmails' | 'senderEmail' | 'subjectContains'>
): GraphMessage[] {
  const senderEmails = getSenderEmails(config);
  return messages.filter(
    (msg) => matchesAnySender(msg, senderEmails) && matchesSubject(msg, config.subjectContains)
  );
}

function isValidShipmentMessage(msg: GraphMessage): boolean {
  return Boolean(msg.id && (msg.body?.content || msg.subject));
}

function buildSenderFilter(senderEmail: string, subjectContains?: string): string {
  const filters: string[] = [
    `from/emailAddress/address eq '${senderEmail.replace(/'/g, "''")}'`,
  ];

  if (subjectContains?.trim()) {
    filters.push(`contains(subject,'${subjectContains.replace(/'/g, "''")}')`);
  }

  return filters.join(' and ');
}

async function fetchMessagePages(
  accessToken: string,
  initialUrl: string,
  preferHeaders?: Record<string, string>
): Promise<GraphMessage[]> {
  const allMessages: GraphMessage[] = [];
  let url: string | undefined = initialUrl;

  while (url) {
    const data: GraphMessagesResponse = await graphFetch<GraphMessagesResponse>(
      url,
      accessToken,
      preferHeaders
    );
    allMessages.push(...data.value.filter(isValidShipmentMessage));
    url = data['@odata.nextLink'];
  }

  return allMessages;
}

function buildMessagesUrl(
  basePath: string,
  filter: string,
  options?: { orderBy?: boolean }
): string {
  const params = new URLSearchParams({
    $select: MESSAGE_SELECT,
    $filter: filter,
    $top: '50',
  });

  if (options?.orderBy) {
    params.set('$orderby', 'receivedDateTime desc');
  }

  return `${basePath}?${params.toString()}`;
}

async function getEmailsFromSender(
  accessToken: string,
  senderEmail: string,
  subjectContains?: string,
  options?: { allFolders?: boolean; preferTextBody?: boolean }
): Promise<GraphMessage[]> {
  const filter = buildSenderFilter(senderEmail, subjectContains);
  const preferHeaders = options?.preferTextBody
    ? { Prefer: 'odata.maxpagesize=50, outlook.body-content-type="text"' }
    : undefined;

  const inboxPath = `${GRAPH_BASE}/me/mailFolders/inbox/messages`;
  const allMailPath = `${GRAPH_BASE}/me/messages`;

  // Graph returns InefficientFilter when combining from-filter + orderby on /me/messages,
  // or when the filter is too complex. Try simpler queries first, then fall back.
  const attempts: Array<{ path: string; orderBy: boolean }> = [];

  if (options?.allFolders) {
    attempts.push({ path: allMailPath, orderBy: false });
  }
  attempts.push({ path: inboxPath, orderBy: false });
  attempts.push({ path: inboxPath, orderBy: true });

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      const url = buildMessagesUrl(attempt.path, filter, { orderBy: attempt.orderBy });
      return await fetchMessagePages(accessToken, url, preferHeaders);
    } catch (error) {
      lastError = error;
      if (!isInefficientFilterError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to read Outlook messages: filter too complex for this mailbox.');
}

async function getShipmentEmailsForSender(
  accessToken: string,
  senderEmail: string,
  subjectContains: string
): Promise<GraphMessage[]> {
  return getEmailsFromSender(accessToken, senderEmail, subjectContains);
}

/** Fetch all emails from configured senders for container/CIPL checking (no subject filter). */
export async function fetchEmailsForContainerCheck(
  accessToken: string,
  senderEmails: string[],
  onProgress?: (emailCount: number) => void
): Promise<GraphMessage[]> {
  const byId = new Map<string, GraphMessage>();

  for (const senderEmail of senderEmails) {
    const messages = await getEmailsFromSender(accessToken, senderEmail, undefined, {
      allFolders: true,
      preferTextBody: true,
    });
    for (const msg of messages) {
      byId.set(msg.id, msg);
    }
    onProgress?.(byId.size);
  }

  return Array.from(byId.values());
}

/**
 * Initial sync via standard messages endpoint — supports full OData $filter per sender.
 */
export async function getShipmentEmails(
  accessToken: string,
  config: Pick<ShipmentConfiguration, 'senderEmails' | 'senderEmail' | 'subjectContains'>
): Promise<GraphMessage[]> {
  const senderEmails = getSenderEmails(config);
  if (senderEmails.length === 0) return [];

  const byId = new Map<string, GraphMessage>();

  for (const senderEmail of senderEmails) {
    const messages = await getShipmentEmailsForSender(
      accessToken,
      senderEmail,
      config.subjectContains
    );
    for (const msg of messages) {
      byId.set(msg.id, msg);
    }
  }

  return Array.from(byId.values());
}

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

async function fetchDeltaMessages(
  accessToken: string,
  deltaLink: string,
  config: Pick<ShipmentConfiguration, 'senderEmails' | 'senderEmail' | 'subjectContains'>
): Promise<{ messages: GraphMessage[]; deltaLink: string | null; expired: boolean }> {
  const rawMessages: GraphMessage[] = [];
  let newDeltaLink: string | null = null;
  let url: string | undefined = deltaLink;

  try {
    while (url) {
      const data: GraphMessagesResponse = await graphFetch<GraphMessagesResponse>(url, accessToken);

      rawMessages.push(...data.value.filter(isValidShipmentMessage));

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

export async function fetchShipmentMessages(
  accessToken: string,
  config: Pick<ShipmentConfiguration, 'senderEmails' | 'senderEmail' | 'subjectContains'>,
  deltaLink: string | null
): Promise<{ messages: GraphMessage[]; deltaLink: string | null; expired: boolean }> {
  if (deltaLink) {
    return fetchDeltaMessages(accessToken, deltaLink, config);
  }

  const messages = await getShipmentEmails(accessToken, config);
  const newDeltaLink = await bootstrapDeltaLink(accessToken);

  return { messages, deltaLink: newDeltaLink, expired: false };
}

/** Fetch a page of inbox messages for the portal inbox viewer. */
export async function fetchInboxPage(
  accessToken: string,
  nextLink?: string
): Promise<InboxPageResult> {
  const url =
    nextLink ||
    `${GRAPH_BASE}/me/mailFolders/inbox/messages` +
      `?$select=${INBOX_LIST_SELECT}` +
      `&$orderby=receivedDateTime desc` +
      `&$top=25`;

  const data: GraphMessagesResponse = await graphFetch<GraphMessagesResponse>(url, accessToken);

  return {
    messages: data.value.filter((msg) => Boolean(msg.id)),
    nextLink: data['@odata.nextLink'],
  };
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
