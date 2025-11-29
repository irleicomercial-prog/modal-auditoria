
export interface FileData {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface InconsistencyDetail {
  productName: string;
  issueType: string; // e.g., "Quantidade", "Data", "Ausência"
  report1Value: string;
  report1Date: string; // New field for System Date
  report2Value: string;
  report2Date: string; // New field for Physical Date
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AnalysisResult {
  summary: string;
  totalProductsChecked: number;
  inconsistenciesFound: number;
  details: InconsistencyDetail[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface QuestionnaireAnswers {
  wasSold: boolean | null;
  hasExpired: boolean | null;
  inSalesArea: boolean | null;
  isOnOffer: boolean | null;
  wasMarkedDown: boolean | null;
  wasRemovedFromSalesArea: boolean | null; // Ensure this field is present for the 6th question
}

export interface InvestigationResult {
  productName: string;
  answers: QuestionnaireAnswers;
}
