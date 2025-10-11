import Taro from "@tarojs/taro";
import type {
  AuthResponse,
  ConsultationPayload,
  ConsultationResult,
  UserProfile,
  UserProfileResponse,
} from "./types";

const runtimeEnv =
  typeof globalThis !== "undefined" &&
  (globalThis as any).process &&
  (globalThis as any).process.env
    ? ((globalThis as any).process.env as Record<string, string | undefined>)
    : ({} as Record<string, string | undefined>);

const stripTrailingSlash = (value?: string) => {
  if (!value) return "";
  return value.replace(/\/+$/, "");
};

const ensureLeadingSlash = (value?: string) => {
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
};

const envBase = stripTrailingSlash(runtimeEnv.TARO_APP_API_BASE_URL || "");
const envPrefix = ensureLeadingSlash(
  runtimeEnv.TARO_APP_API_PREFIX || "/api/v1"
);

const API_BASE_URL = envBase
  ? `${envBase}${envPrefix}`
  : process.env.NODE_ENV === "production"
    ? `https://law-app-six.vercel.app${envPrefix}`
    : envPrefix;

interface ApiResponse<T> {
  items?: T[];
  total?: number;
  page?: number;
  size?: number;
  pages?: number;
  data?: T;
  success?: boolean;
  message?: string;
}

class ApiService {
  private getAuthToken(): string | null {
    try {
      return Taro.getStorageSync("auth_token") || null;
    } catch (error) {
      console.warn("Failed to get auth token", error);
      return null;
    }
  }

  private async request<T>(
    url: string,
    options: Taro.request.Option = {}
  ): Promise<T> {
    try {
      const token = this.getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.header as Record<string, string>),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await Taro.request({
        url: `${API_BASE_URL}${url}`,
        header: headers,
        ...options,
      });

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response.data as T;
      }

      throw new Error(
        `API Error: ${response.statusCode} - ${JSON.stringify(response.data)}`
      );
    } catch (error) {
      console.error("API Request Failed:", error);
      throw error;
    }
  }

  // Firms API
  async getFirms(page = 1, size = 100): Promise<ApiResponse<any>> {
    return this.request(`/firms?page=${page}&size=${size}`);
  }

  async getFirm(id: string): Promise<any> {
    return this.request(`/firms/${id}`);
  }

  async createFirm(data: any): Promise<any> {
    return this.request("/firms", {
      method: "POST",
      data,
    });
  }

  async updateFirm(id: string, data: any): Promise<any> {
    return this.request(`/firms/${id}`, {
      method: "PUT",
      data,
    });
  }

  async deleteFirm(id: string): Promise<any> {
    return this.request(`/firms/${id}`, {
      method: "DELETE",
    });
  }

  // Services API
  async getServices(page = 1, size = 100): Promise<ApiResponse<any>> {
    return this.request(`/services?page=${page}&size=${size}`);
  }

  async getService(id: string): Promise<any> {
    return this.request(`/services/${id}`);
  }

  async createService(data: any): Promise<any> {
    return this.request("/services", {
      method: "POST",
      data,
    });
  }

  async updateService(id: string, data: any): Promise<any> {
    return this.request(`/services/${id}`, {
      method: "PUT",
      data,
    });
  }

  async deleteService(id: string): Promise<any> {
    return this.request(`/services/${id}`, {
      method: "DELETE",
    });
  }

  async submitConsultation(
    data: ConsultationPayload
  ): Promise<ConsultationResult> {
    return this.request("/consultations", {
      method: "POST",
      data,
    });
  }

  async loginWithWechat(payload: {
    code: string;
    userInfo?: Record<string, unknown>;
  }): Promise<AuthResponse> {
    return this.request("/auth/wechat", {
      method: "POST",
      data: payload,
    });
  }

  async loginAnonymously(payload: {
    email?: string;
    phone?: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<AuthResponse> {
    return this.request("/auth/anonymous", {
      method: "POST",
      data: payload,
    });
  }

  async getCurrentUser(): Promise<UserProfileResponse> {
    return this.request("/users/me", { method: "GET" });
  }

  async updateCurrentUser(payload: Partial<UserProfile>): Promise<UserProfileResponse> {
    return this.request("/users/me", {
      method: "PUT",
      data: payload,
    });
  }

  async loginWithPassword(payload: {
    username: string;
    password: string;
  }): Promise<AuthResponse> {
    return this.request("/auth/login", {
      method: "POST",
      data: payload,
    });
  }

  async registerWithPassword(payload: {
    username: string;
    password: string;
    email: string;
    phone?: string;
  }): Promise<AuthResponse> {
    return this.request("/auth/register", {
      method: "POST",
      data: payload,
    });
  }
}

export const apiService = new ApiService();
export default apiService;

// Export wrapper functions for backward compatibility
export const fetchFirms = (params?: { page?: number; size?: number }) =>
  apiService.getFirms(params?.page, params?.size);

export const fetchFirmById = (id: string) => apiService.getFirm(id);

export const fetchServices = (params?: { page?: number; size?: number }) =>
  apiService.getServices(params?.page, params?.size);

export const fetchServiceById = (id: string) => apiService.getService(id);

// Placeholder for appointments (not implemented in ApiService yet)
export const fetchAppointments = async () => {
  console.warn("fetchAppointments not yet implemented");
  return { items: [], total: 0 };
};

export const submitConsultationRequest = (payload: ConsultationPayload) =>
  apiService.submitConsultation(payload);

export const loginWithWechat = (payload: {
  code: string;
  userInfo?: Record<string, unknown>;
}) => apiService.loginWithWechat(payload);

export const loginAnonymously = (payload: {
  email?: string;
  phone?: string;
  name?: string;
  avatarUrl?: string;
}) => apiService.loginAnonymously(payload);

export const fetchCurrentUser = () => apiService.getCurrentUser();

export const updateCurrentUser = (payload: Partial<UserProfile>) =>
  apiService.updateCurrentUser(payload);

export const loginWithPassword = (payload: {
  username: string;
  password: string;
}) => apiService.loginWithPassword(payload);

export const registerWithPassword = (payload: {
  username: string;
  password: string;
  email: string;
  phone?: string;
}) => apiService.registerWithPassword(payload);
