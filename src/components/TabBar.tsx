import { Text, View } from "@tarojs/components";
import "./TabBar.scss";

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  visible?: boolean;
}

export interface TabBarProps<T extends string = string> {
  activeTab: T;
  tabs: TabItem<T>[];
  onChange: (tab: T) => void;
  className?: string;
}

export default function TabBar<T extends string = string>({
  activeTab,
  tabs,
  onChange,
  className = "",
}: TabBarProps<T>) {
  const visibleTabs = tabs.filter((tab) => tab.visible !== false);

  return (
    <View className={`tab-bar ${className}`}>
      {visibleTabs.map((tab) => (
        <View
          key={tab.key}
          className={`tab-item ${activeTab === tab.key ? "active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          <Text className="tab-label">{tab.label}</Text>
        </View>
      ))}
    </View>
  );
}
