import Taro from "@tarojs/taro";

const API_BASE_URL = "https://law-app-six.vercel.app/api/v1";

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

class ApiClient {
  private async request<T>(
    url: string,
    options: Partial<Taro.request.Option> = {}
  ): Promise<T> {
    try {
      const response = await Taro.request({
        url: \`\${API_BASE_URL}\${url}\`,
        header: {
          "Content-Type": "application/json",
          ...options.header,
        },
        ...options,
      });

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response.data as T;
      }

      throw new Error(\`API Error: \${response.statusCode}\`);
    } catch (error) {
      console.error("API Request Failed:", error);
      throw error;
    }
  }

  // Firms API
  async getFirms(page = 1, size = 100): Promise<ApiResponse<any>> {
    return this.request(\`/firms?page=\${page}&size=\${size}\`);
  }

  async createFirm(data: any): Promise<any> {
    return this.request("/firms", {
      method: "POST",
      data,
    });
  }

  async updateFirm(id: string, data: any): Promise<any> {
    return this.request(\`/firms/\${id}\`, {
      method: "PUT",
      data,
    });
  }

  async deleteFirm(id: string): Promise<any> {
    return this.request(\`/firms/\${id}\`, {
      method: "DELETE",
    });
  }

  // Services API
  async getServices(page = 1, size = 100): Promise<ApiResponse<any>> {
    return this.request(\`/services?page=\${page}&size=\${size}\`);
  }

  async createService(data: any): Promise<any> {
    return this.request("/services", {
      method: "POST",
      data,
    });
  }

  async updateService(id: string, data: any): Promise<any> {
    return this.request(\`/services/\${id}\`, {
      method: "PUT",
      data,
    });
  }

  async deleteService(id: string): Promise<any> {
    return this.request(\`/services/\${id}\`, {
      method: "DELETE",
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
