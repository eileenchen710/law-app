export interface Pagination<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ServiceSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number | null;
  firm_id?: string | null;
  firm_name?: string | null;
  firm_address?: string | null;
  available_times?: string[];
}

export interface FirmSummary {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  available_times?: string[];
}

export interface FirmDetail extends FirmSummary {
  services: ServiceSummary[];
}

export interface ServiceDetail extends ServiceSummary {
  firm?: FirmSummary;
}

export interface ConsultationSummary {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  firm_id?: string | null;
  firm_name?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  time: string;
  remark?: string | null;
  status: string;
  created_at: string;
}

// Deprecated: Use ConsultationSummary instead
export interface AppointmentSummary extends ConsultationSummary {}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  provider: 'wechat' | 'anonymous' | 'admin';
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfileResponse {
  user: UserProfile;
  appointments: ConsultationSummary[];
}

export interface ConsultationPayload {
  name: string;
  email: string;
  phone: string;
  serviceName?: string;
  message: string;
  preferredTime?: string;
}

export interface ConsultationResult {
  status: string;
  message: string;
  emailSummary?: unknown;
}
