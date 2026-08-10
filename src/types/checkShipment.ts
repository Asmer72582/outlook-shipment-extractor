export interface ExcelContainerRow {
  rowIndex: number;
  containerNo: string;
  hawb: string | null;
  invoiceNumber: string | null;
  excelDocReceivedDate: string | null;
  excelCiplDateReceived: string | null;
  needsLookup: boolean;
}

export interface ContainerCheckResult {
  rowIndex: number;
  containerNo: string;
  hawb: string | null;
  invoiceNumber: string | null;
  excelDocReceivedDate: string | null;
  excelCiplDateReceived: string | null;
  ciplDateReceived: string | null;
  emailReceivedAt: string | null;
  emailSubject: string | null;
  emailSender: string | null;
  status: 'found' | 'not_found' | 'already_in_excel';
}

export interface ContainerEmailHit {
  containerNo: string;
  ciplDateReceived: string | null;
  emailReceivedAt: string;
  emailSubject: string;
  emailSender: string;
  outlookMessageId: string;
}
