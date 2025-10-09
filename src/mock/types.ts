export interface LawFirmMock {
  id: string;
  name: string;
  description: string;
  price: string;
  services: string[];
  rating?: number;
  cases?: number;
  recommended?: boolean;
  city?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface LegalServiceMock {
  id: string;
  title: string;
  description: string;
  category: string;
  lawFirmId: string;
  price: string;
  duration: string;
  lawyerName: string;
  lawyerTitle: string;
}

export interface MockDataSnapshot {
  lawFirms: LawFirmMock[];
  legalServices: LegalServiceMock[];
}
