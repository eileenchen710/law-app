import { Button, Input, ScrollView, Text, View } from "@tarojs/components";
import type { ITouchEvent } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";
import "./search.scss";
import { SERVICE_CATEGORIES } from "../../constants/serviceCategories";
import type {
  LawFirmMock,
  LegalServiceMock,
  MockDataSnapshot,
} from "../../mock/types";
import { getSnapshot, onMockDataChange, initializeDataStore } from "../../services/dataStore";
import AppHeader from "../index/components/AppHeader";

const TABS = [
  { id: "firms", label: "律所" },
  { id: "services", label: "法律服务" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function normalize(text: string): string {
  return text.toLowerCase();
}

function toText(value: unknown): string {
  if (value === null || typeof value === "undefined") {
    return "";
  }
  return String(value);
}

export default function Search() {
  const [lawFirms, setLawFirms] = useState<LawFirmMock[]>([]);
  const [legalServices, setLegalServices] = useState<LegalServiceMock[]>([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("firms");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useLoad(() => {
    console.log("Search page loaded.");
  });

  useEffect(() => {
    const applySnapshot = (snapshot: MockDataSnapshot) => {
      setLawFirms(snapshot.lawFirms);
      setLegalServices(snapshot.legalServices);
    };

    // 初始化数据存储
    initializeDataStore().then(() => {
      applySnapshot(getSnapshot());
    }).catch((error) => {
      console.error("Failed to initialize data store:", error);
    });

    const unsubscribe = onMockDataChange(applySnapshot);

    return () => {
      unsubscribe();
    };
  }, []);

  const normalizedQuery = useMemo(() => normalize(query.trim()), [query]);

  const firmResults = useMemo(() => {
    if (!normalizedQuery) {
      return lawFirms;
    }
    return lawFirms.filter((firm) => {
      const tokens = [
        firm.name,
        firm.description,
        firm.price,
        firm.cases,
        ...(firm.services || []),
      ];
      return tokens.some((value) =>
        normalize(toText(value)).includes(normalizedQuery)
      );
    });
  }, [lawFirms, normalizedQuery]);

  const serviceResults = useMemo(() => {
    const candidates =
      selectedCategory === "all"
        ? legalServices
        : legalServices.filter(
            (service) => service.category === selectedCategory
          );

    if (!normalizedQuery) {
      return candidates;
    }

    return candidates.filter((service) => {
      const tokens = [
        service.title,
        service.description,
        service.price,
        service.duration,
        service.lawyerName,
        service.lawyerTitle,
      ];
      return tokens.some((value) =>
        normalize(toText(value)).includes(normalizedQuery)
      );
    });
  }, [legalServices, normalizedQuery, selectedCategory]);

  const activeResults = activeTab === "firms" ? firmResults : serviceResults;

  const handleTabClick = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "firms") {
      setSelectedCategory("all");
    }
  };

  const handleClearQuery = (event: ITouchEvent) => {
    event.stopPropagation();
    setQuery("");
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory((current) =>
      current === categoryId ? "all" : categoryId
    );
  };

  const menuItems = [
    {
      label: "首页",
      onClick: () => Taro.switchTab({ url: "/pages/index/index" }),
    },
    {
      label: "后台",
      onClick: () => Taro.navigateTo({ url: "/pages/admin/index" }),
    },
  ];

  return (
    <ScrollView className="search-page" scrollY>
      <AppHeader menuItems={menuItems} showActions={false} scrolled={false} />

      <View className="search-hero">
        <Text className="hero-title metallic-gradient-text">智能检索</Text>
        <Text className="hero-desc">
          快速定位合作律所与法律服务，支持关键词与分类组合搜索
        </Text>
      </View>

      <View className="search-box">
        <Input
          className="search-input"
          placeholder={
            activeTab === "firms"
              ? "搜索律所名称、简介或亮点"
              : "搜索服务名称、律师或分类"
          }
          value={query}
          onInput={(event) => setQuery(event.detail.value)}
          confirmType="search"
        />
        {query ? (
          <Button className="clear-btn" size="mini" onClick={handleClearQuery}>
            清除
          </Button>
        ) : null}
      </View>

      <View className="tab-bar">
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <View
              key={tab.id}
              className={`tab-item ${active ? "active" : ""}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <Text className="tab-label">{tab.label}</Text>
            </View>
          );
        })}
      </View>

      {activeTab === "services" ? (
        <View className="category-bar">
          <View
            className={`category-chip ${
              selectedCategory === "all" ? "selected" : ""
            }`}
            onClick={() => setSelectedCategory("all")}
          >
            全部
          </View>
          {SERVICE_CATEGORIES.map((category) => (
            <View
              key={category.id}
              className={`category-chip ${
                selectedCategory === category.id ? "selected" : ""
              }`}
              onClick={() => handleCategorySelect(category.id)}
            >
              <Text className="category-icon">{category.icon}</Text>
              <Text>{category.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="result-header">
        <Text className="result-count">共 {activeResults.length} 条结果</Text>
        {normalizedQuery ? (
          <Text className="result-query">关键词：{query}</Text>
        ) : (
          <Text className="result-query">建议先在后台完善律所与服务数据</Text>
        )}
      </View>

      <View className="result-list">
        {activeResults.map((item) => {
          if (activeTab === "firms") {
            const firm = item as LawFirmMock;
            return (
              <View key={firm.id} className="result-card card-bg-black">
                <View className="card-header">
                  <Text className="card-title metallic-gradient-text">
                    {firm.name}
                  </Text>
                  {firm.rating ? (
                    <Text className="card-tag">
                      评分 {firm.rating.toFixed(1)}
                    </Text>
                  ) : null}
                  {firm.recommended ? (
                    <Text className="card-tag highlight">首页推荐</Text>
                  ) : null}
                </View>
                <Text className="card-desc">
                  {firm.description || "暂无简介"}
                </Text>
                <View className="card-meta">
                  <Text className="meta-item">
                    费用：{firm.price || "面议"}
                  </Text>
                  {firm.cases ? (
                    <Text className="meta-item">案例：{firm.cases}</Text>
                  ) : null}
                </View>
                {firm.services?.length ? (
                  <View className="service-chips">
                    {firm.services.slice(0, 6).map((service) => (
                      <Text key={service} className="chip">
                        {service}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          }

          const service = item as LegalServiceMock;
          const category = SERVICE_CATEGORIES.find(
            (cat) => cat.id === service.category
          );
          return (
            <View key={service.id} className="result-card card-bg-black">
              <View className="card-header">
                <Text className="card-title metallic-gradient-text">
                  {service.title}
                </Text>
                {category ? (
                  <Text className="card-tag">{category.name}</Text>
                ) : null}
              </View>
              <Text className="card-desc">
                {service.description || "暂无简介"}
              </Text>
              <View className="card-meta">
                <Text className="meta-item">
                  费用：{service.price || "面议"}
                </Text>
                <Text className="meta-item">
                  周期：{service.duration || "待沟通"}
                </Text>
              </View>
              <View className="card-footer">
                <Text className="meta-item">
                  主办律师：{service.lawyerName || "待定"}
                </Text>
                {service.lawyerTitle ? (
                  <Text className="meta-item">{service.lawyerTitle}</Text>
                ) : null}
              </View>
            </View>
          );
        })}

        {activeResults.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-title">未找到匹配内容</Text>
            <Text className="empty-desc">
              尝试换个关键词或在后台新增相关数据
            </Text>
            <Button
              className="empty-btn"
              size="mini"
              onClick={() => Taro.navigateTo({ url: "/pages/admin/index" })}
            >
              前往后台
            </Button>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
