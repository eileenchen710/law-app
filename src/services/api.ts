import Taro from "@tarojs/taro";

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://law-app-six.vercel.app/api/v1"
    : "http://localhost:3000/api/v1";

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
  private async request<T>(
    url: string,
    options: Taro.request.Option = {}
  ): Promise<T> {
    try {
      const response = await Taro.request({
        url: `${API_BASE_URL}${url}`,
        header: {
          "Content-Type": "application/json",
          ...options.header,
        },
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
