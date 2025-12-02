/**
 * 术语切换系统
 * 默认使用财务术语，可通过隐藏设置页面切换
 */

import Taro from "@tarojs/taro";

export type TerminologyMode = "legal" | "financial";

// localStorage key
const TERMINOLOGY_MODE_KEY = "app_terminology_mode";

// 默认模式：财务
const DEFAULT_MODE: TerminologyMode = "financial";

/**
 * 获取当前术语模式
 * 优先从 localStorage 读取，否则使用默认值（财务）
 */
export function getTerminologyMode(): TerminologyMode {
  try {
    const stored = Taro.getStorageSync(TERMINOLOGY_MODE_KEY);
    if (stored === "legal" || stored === "financial") {
      return stored;
    }
  } catch (e) {
    // 忽略存储读取错误
  }
  return DEFAULT_MODE;
}

/**
 * 设置术语模式
 * @param mode 术语模式
 */
export function setTerminologyMode(mode: TerminologyMode): void {
  try {
    Taro.setStorageSync(TERMINOLOGY_MODE_KEY, mode);
  } catch (e) {
    console.error("Failed to save terminology mode:", e);
  }
}

/**
 * 是否使用财务术语
 */
export function useFinancialTerms(): boolean {
  return getTerminologyMode() === "financial";
}

/**
 * 是否使用术语
 */
export function useLegalTerms(): boolean {
  return getTerminologyMode() === "legal";
}

// 术语映射表
const TERMINOLOGY_MAP = {
  legal: {
    // 核心术语
    service: "法律服务",
    serviceShort: "法律",
    firm: "律所",
    firmFull: "律师事务所",
    professional: "律师",
    professionalTitle: "律师",

    // 页面标题和描述
    platformName: "法律服务平台",
    platformDesc: "专业法律咨询与代理服务",
    firmSection: "合作律所",
    firmSectionDesc: "汇聚顶尖律师资源",
    serviceSection: "法律服务",

    // 详情页
    firmDetail: "律所详情",
    serviceDetail: "服务详情",
    consultBtn: "立即咨询",

    // 表单相关
    selectService: "选择服务类型",
    problemDesc: "问题描述",
    problemPlaceholder: "请详细描述您遇到的问题",

    // Hero 区域
    heroBadge: "汇聚顶尖律所 · 专业服务平台",
    heroDesc: "连接您与澳大利亚顶级律师事务所，提供刑事辩护、家事法、移民法等全方位专业法律咨询与代理服务",

    // 特性
    featureFirms: "多家律所",
    featureFirmsDesc: "汇集顶尖律师资源",

    // 推荐标签
    recommendTag: "推荐律所",

    // 搜索页
    searchFirmTab: "律所",
    searchServiceTab: "法律服务",
  },
  financial: {
    // 核心术语
    service: "财务服务",
    serviceShort: "财务",
    firm: "商家",
    firmFull: "财务服务机构",
    professional: "专业财会",
    professionalTitle: "财会顾问",

    // 页面标题和描述
    platformName: "财务服务平台",
    platformDesc: "专业财务咨询与规划服务",
    firmSection: "合作商家",
    firmSectionDesc: "汇聚专业财会资源",
    serviceSection: "财务服务",

    // 详情页
    firmDetail: "商家详情",
    serviceDetail: "服务详情",
    consultBtn: "立即咨询",

    // 表单相关
    selectService: "选择服务类型",
    problemDesc: "问题描述",
    problemPlaceholder: "请详细描述您的财务需求",

    // Hero 区域
    heroBadge: "汇聚专业商家 · 财务服务平台",
    heroDesc: "连接您与澳大利亚专业财务服务机构，提供税务筹划、财务咨询、审计等全方位专业财务服务",

    // 特性
    featureFirms: "多家商家",
    featureFirmsDesc: "汇集专业财会资源",

    // 推荐标签
    recommendTag: "推荐商家",

    // 搜索页
    searchFirmTab: "商家",
    searchServiceTab: "财务服务",
  },
} as const;

export type TerminologyKey = keyof typeof TERMINOLOGY_MAP.legal;

/**
 * 获取术语
 * @param key 术语键名
 * @returns 当前模式下的术语文本
 */
export function getTerm(key: TerminologyKey): string {
  const mode = getTerminologyMode();
  return TERMINOLOGY_MAP[mode][key];
}

/**
 * 获取所有术语（当前模式）
 */
export function getTerms() {
  const mode = getTerminologyMode();
  return TERMINOLOGY_MAP[mode];
}

// 导出便捷访问对象
export const Terms = new Proxy({} as typeof TERMINOLOGY_MAP.legal, {
  get(_, key: string) {
    return getTerm(key as TerminologyKey);
  },
});
