export type ExtractionStatus = 'success' | 'partial' | 'failed';

export interface Shipment {
  id: string;
  outlookMessageId: string;
  shipmentFrom: string | null;
  shipmentDate: string | null;
  emailSender: string;
  emailSubject: string;
  emailReceivedAt: string;
  extractionStatus: ExtractionStatus;
  extractionConfidence: number;
  createdAt: string;
}

export interface ExtractionResult {
  shipmentFrom: string | null;
  shipmentDate: string | null;
  confidence: number;
  status: ExtractionStatus;
}
