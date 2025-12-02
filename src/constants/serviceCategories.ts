import { getTerminologyMode } from "../utils/terminology";

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
}

// 法律服务分类
const LEGAL_CATEGORIES: ServiceCategory[] = [
  { id: "criminal", name: "刑事辩护", icon: "⚖️" },
  { id: "family", name: "家庭暴力", icon: "👨‍👩‍👧‍👦" },
  { id: "traffic", name: "交通肇事", icon: "🚗" },
  { id: "immigration", name: "移民拘留", icon: "✈️" },
  { id: "corporate", name: "企业法务", icon: "🏢" },
  { id: "property", name: "房产纠纷", icon: "🏠" },
];

// 财务服务分类
const FINANCIAL_CATEGORIES: ServiceCategory[] = [
  { id: "criminal", name: "税务筹划", icon: "📊" },
  { id: "family", name: "财务审计", icon: "📋" },
  { id: "traffic", name: "成本管控", icon: "💰" },
  { id: "immigration", name: "投融资咨询", icon: "📈" },
  { id: "corporate", name: "企业财务", icon: "🏢" },
  { id: "property", name: "资产评估", icon: "🏠" },
];

/**
 * 获取当前模式下的服务分类
 */
export function getServiceCategories(): ServiceCategory[] {
  const mode = getTerminologyMode();
  return mode === "legal" ? LEGAL_CATEGORIES : FINANCIAL_CATEGORIES;
}

// 为了向后兼容，保留 SERVICE_CATEGORIES 但改为动态获取
// 注意：这是一个 getter，每次访问都会根据当前模式返回对应分类
export const SERVICE_CATEGORIES = new Proxy([] as ServiceCategory[], {
  get(target, prop) {
    const categories = getServiceCategories();
    if (prop === "length") {
      return categories.length;
    }
    if (typeof prop === "string" && !isNaN(Number(prop))) {
      return categories[Number(prop)];
    }
    if (prop === Symbol.iterator) {
      return function* () {
        for (const cat of categories) {
          yield cat;
        }
      };
    }
    if (typeof prop === "string" && prop in Array.prototype) {
      return (categories as any)[prop].bind(categories);
    }
    return (categories as any)[prop];
  },
});
