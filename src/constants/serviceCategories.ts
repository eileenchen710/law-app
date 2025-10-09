export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: "criminal", name: "刑事辩护", icon: "⚖️" },
  { id: "family", name: "家庭暴力", icon: "👨‍👩‍👧‍👦" },
  { id: "traffic", name: "交通肇事", icon: "🚗" },
  { id: "immigration", name: "移民拘留", icon: "✈️" },
  { id: "corporate", name: "企业法务", icon: "🏢" },
  { id: "property", name: "房产纠纷", icon: "🏠" },
];
