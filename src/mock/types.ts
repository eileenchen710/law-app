export interface LawyerInfo {
  name: string;
  title: string;
  phone?: string;
  email?: string;
  specialties?: string[];
}

export interface LawFirmMock {
  id: string;
  name: string;
  slug?: string;
  description: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  price?: string;
  services?: string[];
  practiceAreas?: string[];
  tags?: string[];
  lawyers?: LawyerInfo[];
  rating?: number;
  cases?: number;
  recommended?: boolean;
  contactPhone?: string;
  contactEmail?: string;
  availableTimes?: string[];
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
