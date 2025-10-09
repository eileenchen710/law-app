import Taro from "@tarojs/taro";
import { defaultMockSnapshot } from "../mock/default-data";
import type {
  LawFirmMock,
  LegalServiceMock,
  MockDataSnapshot,
} from "../mock/types";

const STORAGE_KEY = "LAW_APP_MOCK_DATA_V1";
const EVENT_KEY = "LAW_APP_MOCK_DATA_CHANGED";

type LawFirmInput = Omit<LawFirmMock, "id">;
type LegalServiceInput = Omit<LegalServiceMock, "id">;

type Subscriber = (snapshot: MockDataSnapshot) => void;

function cloneSnapshot(snapshot: MockDataSnapshot): MockDataSnapshot {
  return {
    lawFirms: snapshot.lawFirms.map((firm) => ({ ...firm })),
    legalServices: snapshot.legalServices.map((service) => ({ ...service })),
  };
}

function ensureSnapshot(): MockDataSnapshot {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY);
    if (!raw) {
      const fresh = cloneSnapshot(defaultMockSnapshot);
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && parsed.lawFirms && parsed.legalServices) {
      return cloneSnapshot(parsed);
    }
  } catch (error) {
    console.warn("Failed to parse mock data store, resetting with defaults", error);
  }
  const fallback = cloneSnapshot(defaultMockSnapshot);
  Taro.setStorageSync(STORAGE_KEY, JSON.stringify(fallback));
  return fallback;
}

function persistSnapshot(snapshot: MockDataSnapshot): MockDataSnapshot {
  const cloned = cloneSnapshot(snapshot);
  Taro.setStorageSync(STORAGE_KEY, JSON.stringify(cloned));
  Taro.eventCenter.trigger(EVENT_KEY, cloned);
  return cloned;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function getSnapshot(): MockDataSnapshot {
  return ensureSnapshot();
}

export function onMockDataChange(callback: Subscriber): () => void {
  const handler = (snapshot: MockDataSnapshot) => {
    callback(cloneSnapshot(snapshot));
  };
  Taro.eventCenter.on(EVENT_KEY, handler);
  return () => {
    Taro.eventCenter.off(EVENT_KEY, handler);
  };
}

export function listLawFirms(): LawFirmMock[] {
  return ensureSnapshot().lawFirms;
}

export function listLegalServices(): LegalServiceMock[] {
  return ensureSnapshot().legalServices;
}

export function createLawFirm(payload: LawFirmInput): LawFirmMock {
  const snapshot = ensureSnapshot();
  const firm: LawFirmMock = { id: generateId("firm"), ...payload };
  const nextSnapshot: MockDataSnapshot = {
    ...snapshot,
    lawFirms: [...snapshot.lawFirms, firm],
  };
  persistSnapshot(nextSnapshot);
  return firm;
}

export function updateLawFirm(id: string, updates: Partial<LawFirmInput>): LawFirmMock {
  const snapshot = ensureSnapshot();
  const index = snapshot.lawFirms.findIndex((firm) => firm.id === id);
  if (index === -1) {
    throw new Error("Law firm not found");
  }
  const updated: LawFirmMock = { ...snapshot.lawFirms[index], ...updates };
  const nextSnapshot: MockDataSnapshot = {
    ...snapshot,
    lawFirms: [
      ...snapshot.lawFirms.slice(0, index),
      updated,
      ...snapshot.lawFirms.slice(index + 1),
    ],
  };
  persistSnapshot(nextSnapshot);
  return updated;
}

export function deleteLawFirm(id: string): void {
  const snapshot = ensureSnapshot();
  const nextSnapshot: MockDataSnapshot = {
    lawFirms: snapshot.lawFirms.filter((firm) => firm.id !== id),
    legalServices: snapshot.legalServices.filter((service) => service.lawFirmId !== id),
  };
  persistSnapshot(nextSnapshot);
}

export function createLegalService(payload: LegalServiceInput): LegalServiceMock {
  const snapshot = ensureSnapshot();
  const lawFirmExists = snapshot.lawFirms.some((firm) => firm.id === payload.lawFirmId);
  if (!lawFirmExists) {
    throw new Error("Associated law firm not found");
  }
  const service: LegalServiceMock = { id: generateId("service"), ...payload };
  const nextSnapshot: MockDataSnapshot = {
    ...snapshot,
    legalServices: [...snapshot.legalServices, service],
  };
  persistSnapshot(nextSnapshot);
  return service;
}

export function updateLegalService(
  id: string,
  updates: Partial<LegalServiceInput>,
): LegalServiceMock {
  const snapshot = ensureSnapshot();
  const index = snapshot.legalServices.findIndex((service) => service.id === id);
  if (index === -1) {
    throw new Error("Legal service not found");
  }

  if (updates.lawFirmId && !snapshot.lawFirms.some((firm) => firm.id === updates.lawFirmId)) {
    throw new Error("Associated law firm not found");
  }

  const updated: LegalServiceMock = {
    ...snapshot.legalServices[index],
    ...updates,
  };

  const nextSnapshot: MockDataSnapshot = {
    ...snapshot,
    legalServices: [
      ...snapshot.legalServices.slice(0, index),
      updated,
      ...snapshot.legalServices.slice(index + 1),
    ],
  };
  persistSnapshot(nextSnapshot);
  return updated;
}

export function deleteLegalService(id: string): void {
  const snapshot = ensureSnapshot();
  const nextSnapshot: MockDataSnapshot = {
    ...snapshot,
    legalServices: snapshot.legalServices.filter((service) => service.id !== id),
  };
  persistSnapshot(nextSnapshot);
}

export function resetMockData(): MockDataSnapshot {
  const fresh = cloneSnapshot(defaultMockSnapshot);
  persistSnapshot(fresh);
  return fresh;
}
