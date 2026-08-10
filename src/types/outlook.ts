export interface GraphUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
}

export interface GraphEmailAddress {
  name?: string;
  address: string;
}

export interface GraphMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: GraphEmailAddress;
  };
  receivedDateTime: string;
  bodyPreview?: string;
  isRead?: boolean;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
}

export interface GraphMessagesResponse {
  value: GraphMessage[];
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
}

export interface SyncState {
  id: number;
  deltaLink: string | null;
  lastSyncAt: string | null;
  emailsChecked: number;
  shipmentsCreated: number;
  duplicates: number;
  failedExtractions: number;
}

export interface SyncResult {
  emailsChecked: number;
  newShipments: number;
  duplicates: number;
  failedExtractions: number;
}

export interface InboxPageResult {
  messages: GraphMessage[];
  nextLink?: string;
}
