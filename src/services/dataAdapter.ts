// 数据适配器：将 API 数据转换为前端需要的格式

import type { LawFirmMock, LegalServiceMock } from "../mock/types";

// API 返回的律所数据格式
interface ApiFirm {
  id: string;
  name: string;
  description: string;
  address?: string;
  city?: string;
  contact_email?: string;
  contact_phone?: string;
  price?: string;
  services?: string[];
  rating?: number;
  cases?: number;
  recommended?: boolean;
}

// API 返回的服务数据格式
interface ApiService {
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

// 将 API 律所数据转换为前端格式
export function adaptFirmFromApi(apiFirm: ApiFirm): LawFirmMock {
  return {
    id: apiFirm.id,
    name: apiFirm.name,
    description: apiFirm.description || "",
    price: apiFirm.price || "面议",
    services: apiFirm.services || [],
    rating: apiFirm.rating,
    cases: apiFirm.cases,
    recommended: apiFirm.recommended || false,
    city: apiFirm.city,
    contactPhone: apiFirm.contact_phone,
    contactEmail: apiFirm.contact_email,
  };
}

// 将前端律所数据转换为 API 格式
export function adaptFirmToApi(firm: Partial<LawFirmMock>): Partial<ApiFirm> {
  return {
    name: firm.name,
    description: firm.description,
    price: firm.price,
    services: firm.services,
    rating: firm.rating,
    cases: firm.cases,
    recommended: firm.recommended,
    city: firm.city,
    contact_phone: firm.contactPhone,
    contact_email: firm.contactEmail,
  };
}

// 将 API 服务数据转换为前端格式
export function adaptServiceFromApi(apiService: ApiService): LegalServiceMock {
  return {
    id: apiService.id,
    title: apiService.title,
    description: apiService.description || "",
    category: apiService.category,
    lawFirmId: apiService.law_firm_id,
    price: apiService.price || "面议",
    duration: apiService.duration || "待沟通",
    lawyerName: apiService.lawyer_name || "待定律师",
    lawyerTitle: apiService.lawyer_title || "",
  };
}

// 将前端服务数据转换为 API 格式
export function adaptServiceToApi(
  service: Partial<LegalServiceMock>
): Partial<ApiService> {
  return {
    title: service.title,
    description: service.description,
    category: service.category,
    law_firm_id: service.lawFirmId,
    price: service.price,
    duration: service.duration,
    lawyer_name: service.lawyerName,
    lawyer_title: service.lawyerTitle,
  };
}
