// 真实 API 数据存储层
import apiClient from "./apiClient";
import {
  adaptFirmFromApi,
  adaptFirmToApi,
  adaptServiceFromApi,
  adaptServiceToApi,
} from "./dataAdapter";
import type { LawFirmMock, LegalServiceMock, MockDataSnapshot } from "../mock/types";

type ChangeListener = (snapshot: MockDataSnapshot) => void;

class DataStore {
  private lawFirms: LawFirmMock[] = [];
  private legalServices: LegalServiceMock[] = [];
  private listeners: Set<ChangeListener> = new Set();
  private isInitialized = false;

  // 初始化数据
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Promise.all([this.loadFirms(), this.loadServices()]);
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize data store:", error);
      throw error;
    }
  }

  // 加载律所数据
  private async loadFirms(): Promise<void> {
    try {
      const response = await apiClient.getFirms();
      this.lawFirms = (response.items || []).map(adaptFirmFromApi);
    } catch (error) {
      console.error("Failed to load firms:", error);
      this.lawFirms = [];
    }
  }

  // 加载服务数据
  private async loadServices(): Promise<void> {
    try {
      const response = await apiClient.getServices();
      this.legalServices = (response.items || []).map(adaptServiceFromApi);
    } catch (error) {
      console.error("Failed to load services:", error);
      this.legalServices = [];
    }
  }

  // 获取快照
  getSnapshot(): MockDataSnapshot {
    return {
      lawFirms: [...this.lawFirms],
      legalServices: [...this.legalServices],
    };
  }

  // 监听数据变化
  onDataChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 通知所有监听器
  private notifyListeners(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  // 创建律所
  async createLawFirm(data: Omit<LawFirmMock, "id">): Promise<LawFirmMock> {
    try {
      const apiData = adaptFirmToApi(data);
      const response = await apiClient.createFirm(apiData);
      const newFirm = adaptFirmFromApi(response.data || response);
      
      this.lawFirms.push(newFirm);
      this.notifyListeners();
      return newFirm;
    } catch (error) {
      console.error("Failed to create firm:", error);
      throw error;
    }
  }

  // 更新律所
  async updateLawFirm(id: string, data: Partial<LawFirmMock>): Promise<void> {
    try {
      const apiData = adaptFirmToApi(data);
      const response = await apiClient.updateFirm(id, apiData);
      const updatedFirm = adaptFirmFromApi(response.data || response);
      
      const index = this.lawFirms.findIndex((f) => f.id === id);
      if (index !== -1) {
        this.lawFirms[index] = { ...this.lawFirms[index], ...updatedFirm };
        this.notifyListeners();
      }
    } catch (error) {
      console.error("Failed to update firm:", error);
      throw error;
    }
  }

  // 删除律所
  async deleteLawFirm(id: string): Promise<void> {
    try {
      await apiClient.deleteFirm(id);
      
      this.lawFirms = this.lawFirms.filter((f) => f.id !== id);
      this.legalServices = this.legalServices.filter((s) => s.lawFirmId !== id);
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to delete firm:", error);
      throw error;
    }
  }

  // 创建服务
  async createLegalService(data: Omit<LegalServiceMock, "id">): Promise<LegalServiceMock> {
    try {
      const apiData = adaptServiceToApi(data);
      const response = await apiClient.createService(apiData);
      const newService = adaptServiceFromApi(response.data || response);
      
      this.legalServices.push(newService);
      this.notifyListeners();
      return newService;
    } catch (error) {
      console.error("Failed to create service:", error);
      throw error;
    }
  }

  // 更新服务
  async updateLegalService(id: string, data: Partial<LegalServiceMock>): Promise<void> {
    try {
      const apiData = adaptServiceToApi(data);
      const response = await apiClient.updateService(id, apiData);
      const updatedService = adaptServiceFromApi(response.data || response);
      
      const index = this.legalServices.findIndex((s) => s.id === id);
      if (index !== -1) {
        this.legalServices[index] = { ...this.legalServices[index], ...updatedService };
        this.notifyListeners();
      }
    } catch (error) {
      console.error("Failed to update service:", error);
      throw error;
    }
  }

  // 删除服务
  async deleteLegalService(id: string): Promise<void> {
    try {
      await apiClient.deleteService(id);
      
      this.legalServices = this.legalServices.filter((s) => s.id !== id);
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to delete service:", error);
      throw error;
    }
  }

  // 重新加载所有数据
  async reload(): Promise<void> {
    await Promise.all([this.loadFirms(), this.loadServices()]);
    this.notifyListeners();
  }
}

// 创建单例
const dataStore = new DataStore();

// 导出与 mockDataStore 兼容的接口
export const getSnapshot = (): MockDataSnapshot => dataStore.getSnapshot();
export const onMockDataChange = (listener: ChangeListener) => dataStore.onDataChange(listener);
export const createLawFirm = (data: Omit<LawFirmMock, "id">) => dataStore.createLawFirm(data);
export const updateLawFirm = (id: string, data: Partial<LawFirmMock>) => dataStore.updateLawFirm(id, data);
export const deleteLawFirm = (id: string) => dataStore.deleteLawFirm(id);
export const createLegalService = (data: Omit<LegalServiceMock, "id">) => dataStore.createLegalService(data);
export const updateLegalService = (id: string, data: Partial<LegalServiceMock>) => dataStore.updateLegalService(id, data);
export const deleteLegalService = (id: string) => dataStore.deleteLegalService(id);
export const resetMockData = () => dataStore.reload();

// 初始化数据
export const initializeDataStore = () => dataStore.initialize();

export default dataStore;
