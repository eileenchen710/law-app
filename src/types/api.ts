// API 数据类型定义
export interface LawFirm {
  id: string;
  name: string;
  description: string;
  address?: string;
  city?: string;
  contact_email?: string;
  contact_phone?: string;
  // 前端需要的额外字段
  price?: string;
  services?: string[];
  rating?: number;
  cases?: number;
  recommended?: boolean;
}

export interface LegalService {
  id: string;
  title: string;
  description: string;
  category: string;
  law_firm_id: string;
  price?: string;
  duration?: string;
  lawyer_name?: string;
  lawyer_title?: string;
}

export interface ApiListResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
