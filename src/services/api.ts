import type {
  AppointmentPayload,
  AppointmentResult,
  AppointmentSummary,
  FirmDetail,
  FirmSummary,
  Pagination,
  ServiceDetail,
  ServiceSummary,
} from './types';
import { request } from './http';

const runtimeEnv = (typeof globalThis !== 'undefined' && (globalThis as any).process && (globalThis as any).process.env)
  ? ((globalThis as any).process.env as Record<string, string | undefined>)
  : ({} as Record<string, string | undefined>);

const API_PREFIX = (runtimeEnv.TARO_APP_API_PREFIX || '/api/v1').replace(/\/$/, '');

function buildPath(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_PREFIX}${suffix}`;
}

export function fetchFirms(params?: {
  q?: string;
  city?: string;
  page?: number;
  size?: number;
}): Promise<Pagination<FirmSummary>> {
  return request<Pagination<FirmSummary>>({
    method: 'GET',
    url: buildPath('/firms'),
    params,
  });
}

export function fetchFirmById(id: string): Promise<FirmDetail> {
  return request<FirmDetail>({
    method: 'GET',
    url: buildPath(`/firms/${id}`),
  });
}

export function fetchServices(params?: {
  q?: string;
  firm_id?: string;
  category?: string;
  page?: number;
  size?: number;
}): Promise<Pagination<ServiceSummary>> {
  return request<Pagination<ServiceSummary>>({
    method: 'GET',
    url: buildPath('/services'),
    params,
  });
}

export function fetchServiceById(id: string): Promise<ServiceDetail> {
  return request<ServiceDetail>({
    method: 'GET',
    url: buildPath(`/services/${id}`),
  });
}

export function fetchAppointments(params?: {
  firm_id?: string;
  date?: string;
  page?: number;
  size?: number;
}): Promise<Pagination<AppointmentSummary>> {
  return request<Pagination<AppointmentSummary>>({
    method: 'GET',
    url: buildPath('/appointments'),
    params,
  });
}

export function createAppointment(payload: AppointmentPayload): Promise<AppointmentResult> {
  return request<AppointmentResult>({
    method: 'POST',
    url: buildPath('/appointments'),
    data: payload,
  });
}
