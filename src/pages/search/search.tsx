import { Button, Input, Picker, ScrollView, Text, Textarea, View } from "@tarojs/components";
import type { ITouchEvent } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "./search.scss";
import { SERVICE_CATEGORIES } from "../../constants/serviceCategories";
import type {
  LawFirmMock,
  LegalServiceMock,
  MockDataSnapshot,
} from "../../mock/types";
import { getSnapshot, onMockDataChange, initializeDataStore } from "../../services/dataStore";
import AppHeader from "../index/components/AppHeader";
import Loading from "../../components/Loading";
import { fetchCurrentUser, submitConsultationRequest } from "../../services/api";
import type { UserProfile, ConsultationPayload } from "../../services/types";

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

function formatBookingTime(value: string): string {
  const parsed = dayjs(value);
  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD HH:mm");
  }
  return value;
}

export default function Search() {
  const [lawFirms, setLawFirms] = useState<LawFirmMock[]>([]);
  const [legalServices, setLegalServices] = useState<LegalServiceMock[]>([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("firms");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    description: "",
    preferredTime: "",
  });
  const [submittingBooking, setSubmittingBooking] = useState(false);

  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  useLoad(() => {
    console.log("Search page loaded.");
  });

  // 获取当前用户信息
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = Taro.getStorageSync("auth_token");
        if (token) {
          const response = await fetchCurrentUser();
          setUser(response.user);
        }
      } catch (error) {
        console.log("User not logged in or session expired");
        setUser(null);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const applySnapshot = (snapshot: MockDataSnapshot) => {
      setLawFirms(snapshot.lawFirms);
      setLegalServices(snapshot.legalServices);
      setLoading(false);
    };

    // 初始化数据存储
    setLoading(true);
    initializeDataStore()
      .then(() => {
        applySnapshot(getSnapshot());
      })
      .catch((error) => {
        console.error("Failed to initialize data store:", error);
        setLoading(false);
        Taro.showToast({
          title: "数据加载失败",
          icon: "none",
        });
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

  const handleFirmClick = (firmId: string) => {
    setSelectedFirmId(firmId);
    setSelectedServiceId(null);
    setShowBookingForm(false);
  };

  const handleServiceClick = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedFirmId(null);
    setShowBookingForm(false);
  };

  const handleBackToList = () => {
    setSelectedFirmId(null);
    setSelectedServiceId(null);
    setShowBookingForm(false);
    setFormData({ name: "", phone: "", email: "", description: "", preferredTime: "" });
  };

  const handleSubmitBooking = async () => {
    if (submittingBooking) return;

    const trimmedName = formData.name.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedName) {
      Taro.showToast({ title: "请填写姓名", icon: "none", duration: 2000 });
      return;
    }

    if (!trimmedEmail) {
      Taro.showToast({ title: "请填写邮箱", icon: "none", duration: 2000 });
      return;
    }

    if (!trimmedPhone) {
      Taro.showToast({ title: "请填写联系电话", icon: "none", duration: 2000 });
      return;
    }

    if (!trimmedDescription) {
      Taro.showToast({ title: "请填写问题描述", icon: "none", duration: 2000 });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Taro.showToast({ title: "请输入正确的邮箱地址", icon: "none", duration: 2000 });
      return;
    }

    const phoneRegex = /^\+?[0-9\-\s]{6,16}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      Taro.showToast({ title: "请输入正确的联系电话", icon: "none", duration: 2000 });
      return;
    }

    const selectedService = selectedServiceId
      ? legalServices.find((s) => s.id === selectedServiceId)
      : null;
    const selectedFirm = selectedFirmId
      ? lawFirms.find((f) => f.id === selectedFirmId)
      : null;
    const selectedPreferredTime = formData.preferredTime;


    const payload: ConsultationPayload = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      serviceName: selectedService?.title || "咨询",
      message: trimmedDescription,
      preferredTime: selectedPreferredTime || undefined,
      firmId: selectedFirmId || undefined,
      serviceId: selectedServiceId || undefined,
    };

    try {
      setSubmittingBooking(true);
      await submitConsultationRequest(payload);
      Taro.showToast({
        title: "预约成功！我们会尽快联系您",
        icon: "success",
        duration: 2000,
      });
      setShowBookingForm(false);
      setFormData({ name: "", phone: "", email: "", description: "", preferredTime: "" });
    } catch (error) {
      console.error("提交预约失败", error);
      Taro.showToast({
        title: "提交失败，请稍后再试",
        icon: "error",
        duration: 2000,
      });
    } finally {
      setSubmittingBooking(false);
    }
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

  // Get selected firm or service
  const selectedFirm = selectedFirmId
    ? lawFirms.find((f) => f.id === selectedFirmId)
    : null;
  const selectedService = selectedServiceId
    ? legalServices.find((s) => s.id === selectedServiceId)
    : null;
  const firmServices = selectedFirmId
    ? legalServices.filter((s) => s.lawFirmId === selectedFirmId)
    : [];
  const serviceFirm = selectedService
    ? lawFirms.find((f) => f.id === selectedService.lawFirmId)
    : null;

  const availableTimes = useMemo(() => {
    const times: string[] = [];

    const collect = (list?: string[] | null) => {
      if (!list) {
        return;
      }
      list.forEach((time) => {
        if (typeof time === "string" && time.trim()) {
          times.push(time.trim());
        }
      });
    };

    // Only collect times from the firm
    console.log("=== Available Times Debug ===");
    console.log("Selected Firm:", selectedFirm?.name);
    console.log("Selected Firm availableTimes:", selectedFirm?.availableTimes);
    collect(selectedFirm?.availableTimes || []);

    // If no firm is selected but a service is selected, get times from the service's firm
    if (!selectedFirm && selectedService) {
      const serviceFirm = lawFirms.find(f => f.id === selectedService.lawFirmId);
      console.log("Service Firm:", serviceFirm?.name);
      console.log("Service Firm availableTimes:", serviceFirm?.availableTimes);
      collect(serviceFirm?.availableTimes || []);
    }

    console.log("Collected times before filtering:", times);

    const unique = Array.from(new Set(times));
    const now = dayjs();

    const filtered = unique
      .filter((time) => {
        const parsed = dayjs(time);
        return parsed.isValid() ? parsed.isAfter(now) : true;
      })
      .sort((a, b) => {
        const aParsed = dayjs(a);
        const bParsed = dayjs(b);
        if (aParsed.isValid() && bParsed.isValid()) {
          return aParsed.valueOf() - bParsed.valueOf();
        }
        return a.localeCompare(b);
      });

    console.log("Final available times:", filtered);
    console.log("===========================");

    return filtered;
  }, [selectedService, selectedFirm, lawFirms]);

  const formattedAvailableTimes = useMemo(
    () => availableTimes.map((time) => formatBookingTime(time)),
    [availableTimes]
  );

  const renderAvailableTimesPreview = (times: string[]) => {
    if (times.length === 0) {
      return (
        <Text className="available-times-empty">
          暂未配置可预约时间
        </Text>
      );
    }

    const preview = times.slice(0, 3);
    const extraCount = Math.max(times.length - preview.length, 0);

    return (
      <View className="available-times-preview">
        {preview.map((time) => (
          <Text key={time} className="available-time-chip">
            {formatBookingTime(time)}
          </Text>
        ))}
        {extraCount > 0 ? (
          <Text className="available-time-more">等{extraCount}个时段</Text>
        ) : null}
      </View>
    );
  };

  const selectedTimeIndex = useMemo(() => {
    if (!formData.preferredTime) {
      return -1;
    }
    return availableTimes.findIndex((time) => time === formData.preferredTime);
  }, [availableTimes, formData.preferredTime]);

  const renderPreferredTimePicker = () => {
    if (availableTimes.length === 0) {
      return (
        <Text className="form-hint">
          该服务暂未设置可预约时间，您可以在备注中填写期望时间。
        </Text>
      );
    }

    const pickerValue = selectedTimeIndex >= 0 ? selectedTimeIndex : 0;

    return (
      <Picker
        mode="selector"
        range={formattedAvailableTimes}
        value={pickerValue}
        onChange={(e) => {
          const index = Number(e.detail.value);
          const value = availableTimes[index] || "";
          setFormData((prev) => ({
            ...prev,
            preferredTime: value,
          }));
        }}
      >
        <View
          className={`form-input picker-input${
            formData.preferredTime ? "" : " placeholder"
          }`}
        >
          {formData.preferredTime
            ? formatBookingTime(formData.preferredTime)
            : "请选择可预约时间"}
        </View>
      </Picker>
    );
  };

  const renderBookingForm = () => (
    <View className="booking-form">
      <Text className="form-title">预约咨询</Text>
      <Input
        className="form-input"
        placeholder="您的姓名"
        value={formData.name}
        onInput={(e) =>
          setFormData({ ...formData, name: e.detail.value })
        }
      />
      <Input
        className="form-input"
        placeholder="您的邮箱"
        type="text"
        value={formData.email}
        onInput={(e) =>
          setFormData({ ...formData, email: e.detail.value })
        }
      />
      <Input
        className="form-input"
        placeholder="联系电话"
        type="number"
        value={formData.phone}
        onInput={(e) =>
          setFormData({ ...formData, phone: e.detail.value })
        }
      />
      <View className="form-group">
        <Text className="form-label">可预约时间</Text>
        {renderPreferredTimePicker()}
      </View>
      <Textarea
        className="form-textarea"
        placeholder="请描述您的法律问题（选填）"
        value={formData.description}
        onInput={(e) =>
          setFormData({ ...formData, description: e.detail.value })
        }
      />
      <View className="form-actions">
        <Button
          className="form-btn cancel"
          onClick={() => setShowBookingForm(false)}
        >
          取消
        </Button>
        <Button className="form-btn submit" onClick={handleSubmitBooking}>
          提交预约
        </Button>
      </View>
    </View>
  );

  useEffect(() => {
    if (formData.preferredTime && !availableTimes.includes(formData.preferredTime)) {
      setFormData((prev) => ({ ...prev, preferredTime: "" }));
    }
  }, [availableTimes, formData.preferredTime]);

  // Show detail view if firm or service is selected
  if (selectedFirm) {
    return (
      <ScrollView className="search-page search-detail-page" scrollY>
        <AppHeader showActions={false} scrolled={false} />

        <View className="back-button" onClick={handleBackToList}>
          <Text>← 返回搜索</Text>
        </View>

        <View className="detail-header">
          <Text className="detail-title metallic-gradient-text">
            {selectedFirm.name}
          </Text>
          {selectedFirm.rating && (
            <View className="detail-rating">
              <Text className="rating-text">
                评分 {selectedFirm.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        <View className="detail-section">
          <Text className="section-title">律所简介</Text>
          <Text className="section-content">
            {selectedFirm.description || "暂无简介"}
          </Text>
        </View>

        <View className="detail-section">
          <Text className="section-title">联系信息</Text>
          <View className="info-grid">
            {selectedFirm.city && (
              <View className="info-item">
                <Text className="info-label">城市</Text>
                <Text className="info-value">{selectedFirm.city}</Text>
              </View>
            )}
            {selectedFirm.address && (
              <View className="info-item">
                <Text className="info-label">地址</Text>
                <Text className="info-value">{selectedFirm.address}</Text>
              </View>
            )}
            {selectedFirm.phone && (
              <View className="info-item">
                <Text className="info-label">电话</Text>
                <Text className="info-value">{selectedFirm.phone}</Text>
              </View>
            )}
            {selectedFirm.email && (
              <View className="info-item">
                <Text className="info-label">邮箱</Text>
                <Text className="info-value">{selectedFirm.email}</Text>
              </View>
            )}
            {selectedFirm.website && (
              <View className="info-item">
                <Text className="info-label">网站</Text>
                <Text className="info-value">{selectedFirm.website}</Text>
              </View>
            )}
          </View>
        </View>

        <View className="detail-section">
          <Text className="section-title">服务信息</Text>
          <View className="info-grid">
            <View className="info-item">
              <Text className="info-label">收费标准</Text>
              <Text className="info-value">{selectedFirm.price || "面议"}</Text>
            </View>
            {selectedFirm.cases && (
              <View className="info-item">
                <Text className="info-label">案例数量</Text>
                <Text className="info-value">{selectedFirm.cases}</Text>
              </View>
            )}
          </View>
        </View>

        <View className="detail-section">
          <Text className="section-title">可预约时间</Text>
          {renderAvailableTimesPreview(availableTimes)}
        </View>

        {selectedFirm.practiceAreas && selectedFirm.practiceAreas.length > 0 && (
          <View className="detail-section">
            <Text className="section-title">执业领域</Text>
            <View className="service-tags">
              {selectedFirm.practiceAreas.map((area, index) => (
                <Text key={index} className="service-tag">
                  {area}
                </Text>
              ))}
            </View>
          </View>
        )}

        {selectedFirm.tags && selectedFirm.tags.length > 0 && (
          <View className="detail-section">
            <Text className="section-title">特色标签</Text>
            <View className="service-tags">
              {selectedFirm.tags.map((tag, index) => (
                <Text key={index} className="service-tag">
                  {tag}
                </Text>
              ))}
            </View>
          </View>
        )}

        {selectedFirm.lawyers && selectedFirm.lawyers.length > 0 && (
          <View className="detail-section">
            <Text className="section-title">专业律师团队</Text>
            {selectedFirm.lawyers.map((lawyer, index) => (
              <View key={index} className="lawyer-card">
                <View className="lawyer-header">
                  <Text className="lawyer-name">{lawyer.name}</Text>
                  <Text className="lawyer-title">{lawyer.title}</Text>
                </View>
                {lawyer.phone && (
                  <Text className="lawyer-info">电话：{lawyer.phone}</Text>
                )}
                {lawyer.email && (
                  <Text className="lawyer-info">邮箱：{lawyer.email}</Text>
                )}
                {lawyer.specialties && lawyer.specialties.length > 0 && (
                  <View className="lawyer-specialties">
                    <Text className="specialties-label">专长：</Text>
                    <View className="service-tags">
                      {lawyer.specialties.map((specialty, idx) => (
                        <Text key={idx} className="service-tag">
                          {specialty}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {selectedFirm.services && selectedFirm.services.length > 0 && (
          <View className="detail-section">
            <Text className="section-title">业务领域</Text>
            <View className="service-tags">
              {selectedFirm.services.map((service) => (
                <Text key={service} className="service-tag">
                  {service}
                </Text>
              ))}
            </View>
          </View>
        )}

        {firmServices.length > 0 && (
          <View className="detail-section">
            <Text className="section-title">
              提供的法律服务 ({firmServices.length})
            </Text>
            <View className="services-list">
              {firmServices.map((service) => {
                const category = SERVICE_CATEGORIES.find(
                  (cat) => cat.id === service.category
                );
                return (
                  <View
                    key={service.id}
                    className="service-card"
                    onClick={() => handleServiceClick(service.id)}
                  >
                    <View className="service-header">
                      <Text className="service-title">{service.title}</Text>
                      {category && (
                        <Text className="service-category">{category.name}</Text>
                      )}
                    </View>
                    <Text className="service-desc">
                      {service.description || "暂无描述"}
                    </Text>
                    <View className="service-meta">
                      <Text className="meta-text">
                        费用：{service.price || "面议"}
                      </Text>
                      <Text className="meta-text">
                        周期：{service.duration || "待沟通"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View className="booking-section">
          {!showBookingForm ? (
            <Button
              className="booking-btn"
              onClick={() => setShowBookingForm(true)}
            >
              立即预约咨询
            </Button>
          ) : (
            renderBookingForm()
          )}
        </View>
      </ScrollView>
    );
  }

  if (selectedService) {
    const category = SERVICE_CATEGORIES.find(
      (cat) => cat.id === selectedService.category
    );

    return (
      <ScrollView className="search-page search-detail-page" scrollY>
        <AppHeader showActions={false} scrolled={false} />

        <View className="back-button" onClick={handleBackToList}>
          <Text>← 返回搜索</Text>
        </View>

        <View className="detail-header">
          <Text className="detail-title metallic-gradient-text">
            {selectedService.title}
          </Text>
          {category && (
            <View className="detail-category-badge">
              <Text className="category-icon">{category.icon}</Text>
              <Text className="category-text">{category.name}</Text>
            </View>
          )}
        </View>

        <View className="detail-section">
          <Text className="section-title">服务描述</Text>
          <Text className="section-content">
            {selectedService.description || "暂无描述"}
          </Text>
        </View>

        <View className="detail-section">
          <Text className="section-title">服务详情</Text>
          <View className="info-grid">
            <View className="info-item">
              <Text className="info-label">收费标准</Text>
              <Text className="info-value">
                {selectedService.price || "面议"}
              </Text>
            </View>
            <View className="info-item">
              <Text className="info-label">服务周期</Text>
              <Text className="info-value">
                {selectedService.duration || "待沟通"}
              </Text>
            </View>
            {selectedService.lawyerName && (
              <View className="info-item">
                <Text className="info-label">主办律师</Text>
                <Text className="info-value">{selectedService.lawyerName}</Text>
              </View>
            )}
            {selectedService.lawyerTitle && (
              <View className="info-item">
                <Text className="info-label">律师职称</Text>
                <Text className="info-value">{selectedService.lawyerTitle}</Text>
              </View>
            )}
          </View>
        </View>

        {serviceFirm && (
          <View className="detail-section">
            <Text className="section-title">所属律所</Text>
            <View
              className="firm-card"
              onClick={() => handleFirmClick(serviceFirm.id)}
            >
              <View className="firm-header-inline">
                <Text className="firm-name">{serviceFirm.name}</Text>
                {serviceFirm.rating && (
                  <Text className="firm-rating">
                    评分 {serviceFirm.rating.toFixed(1)}
                  </Text>
                )}
              </View>
              <Text className="firm-desc">
                {serviceFirm.description || "暂无简介"}
              </Text>
              <View className="firm-meta">
                <Text className="meta-text">
                  费用：{serviceFirm.price || "面议"}
                </Text>
                {serviceFirm.cases && (
                  <Text className="meta-text">案例：{serviceFirm.cases}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View className="booking-section">
          {!showBookingForm ? (
            <Button
              className="booking-btn"
              onClick={() => setShowBookingForm(true)}
            >
              预约此服务
            </Button>
          ) : (
            <View className="booking-form">
              <Text className="form-title">预约咨询</Text>
              <Input
                className="form-input"
                placeholder="您的姓名"
                value={formData.name}
                onInput={(e) =>
                  setFormData({ ...formData, name: e.detail.value })
                }
              />
              <Input
                className="form-input"
                placeholder="您的邮箱"
                type="text"
                value={formData.email}
                onInput={(e) =>
                  setFormData({ ...formData, email: e.detail.value })
                }
              />
              <Input
                className="form-input"
                placeholder="联系电话"
                type="number"
                value={formData.phone}
                onInput={(e) =>
                  setFormData({ ...formData, phone: e.detail.value })
                }
              />
              <View className="form-group">
                <Text className="form-label">可预约时间</Text>
                {renderPreferredTimePicker()}
              </View>
              <Textarea
                className="form-textarea"
                placeholder="请描述您的法律问题（选填）"
                value={formData.description}
                onInput={(e) =>
                  setFormData({ ...formData, description: e.detail.value })
                }
              />
              <View className="form-actions">
                <Button
                  className="form-btn cancel"
                  onClick={() => setShowBookingForm(false)}
                >
                  取消
                </Button>
                <Button className="form-btn submit" onClick={handleSubmitBooking}>
                  提交预约
                </Button>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // Show list view
  return (
    <ScrollView className="search-page" scrollY>
      <AppHeader showActions={false} scrolled={false} />

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

      {loading ? (
        <Loading text="加载数据中..." size="medium" />
      ) : (
        <>
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
              <View
                key={firm.id}
                className="result-card card-bg-black"
                onClick={() => handleFirmClick(firm.id)}
              >
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
            <View
              key={service.id}
              className="result-card card-bg-black"
              onClick={() => handleServiceClick(service.id)}
            >
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
              {isAdmin ? "尝试换个关键词或在后台新增相关数据" : "尝试换个关键词"}
            </Text>
            {isAdmin && (
              <Button
                className="empty-btn"
                size="mini"
                onClick={() => Taro.switchTab({ url: "/pages/me/me" })}
              >
                前往后台
              </Button>
            )}
          </View>
        ) : null}
      </View>
        </>
      )}
    </ScrollView>
  );
}
