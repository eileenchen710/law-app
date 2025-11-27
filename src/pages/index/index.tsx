import {
  View,
  Text,
  Image,
  ScrollView,
  Button,
  Input,
  Textarea,
} from "@tarojs/components";
import type { ITouchEvent } from "@tarojs/components";
import Taro, { useLoad, usePageScroll, useDidShow } from "@tarojs/taro";
import { useEffect, useMemo, useRef, useState } from "react";
import "./index.scss";
import logo from "../../assets/logo.png";
import heroImage from "../../assets/legal-app-hero.png";
import lawFirmLogo from "../../assets/fu_du.png";
import ServiceCard from "./components/ServiceCard";
import AppHeader from "./components/AppHeader";
import { SERVICE_CATEGORIES } from "../../constants/serviceCategories";
import type {
  LawFirmMock,
  LegalServiceMock,
  MockDataSnapshot,
} from "../../mock/types";
import { getSnapshot, onMockDataChange } from "../../services/mockDataStore";

import {
  fetchFirmById,
  fetchFirms,
  fetchServiceById,
  fetchServices,
  submitConsultationRequest,
} from "../../services/api";
import type { ApiError } from "../../services/http";
import type { ConsultationPayload } from "../../services/types";

const featureHighlights = [
  {
    id: "firms",
    title: "多家律所",
    description: "汇集顶尖律师资源",
    icon: "⚖️",
  },
  {
    id: "secure",
    title: "专业可靠",
    description: "20年+行业经验",
    icon: "🛡️",
  },
  {
    id: "service",
    title: "服务至上",
    description: "8000+成功案例",
    icon: "👥",
  },
];

type UiService = LegalServiceMock & { lawFirm: string };

function logApiFailure(tag: string, error: unknown) {
  const err = error as ApiError | Error;
  const message = (err as ApiError).message || err.message || String(error);
  const data = (err as ApiError).data;
  if (data) {
    console.error(`❌ ${tag} API 调用失败:`, message, data);
  } else {
    console.error(`❌ ${tag} API 调用失败:`, message);
  }
}

export default function Index() {
  const [lawFirms, setLawFirms] = useState<LawFirmMock[]>([]);
  const [legalServices, setLegalServices] = useState<LegalServiceMock[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeFirm, setActiveFirm] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<string | undefined>(
    undefined
  );
  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(
    null
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formService, setFormService] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [submittingConsultation, setSubmittingConsultation] = useState(false);
  const scrollResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 获取真实的律所和服务数据
        const [firmsRes, servicesRes] = await Promise.all([
          fetchFirms({ page: 1, size: 20 }),
          fetchServices({ page: 1, size: 20 })
        ]);

        // 转换律所数据
        let firms = (firmsRes.items || []).map(item => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          price: item.price || "面议",
          services: item.services || [],
          rating: item.rating || 4.8,
          cases: item.cases || 0,
          recommended: item.recommended || false,
          city: item.city,
          address: item.address,
          phone: item.phone,
          email: item.email,
          website: item.website,
          practiceAreas: item.practice_areas,
          tags: item.tags,
          lawyers: item.lawyers,
          contactEmail: item.contact_email,
          contactPhone: item.contact_phone,
          slug: item.slug
        } as LawFirmMock));

        // 如果超过3个，按评分排序并取前3名
        if (firms.length > 3) {
          firms = firms
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 3);
        }

        // 转换服务数据
        const services = (servicesRes.items || []).map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          category: item.category,
          lawFirmId: item.law_firm_id || item.firm_id || "",
          lawFirm: item.firm_name || "律所名称待定",
          price: item.price || "面议",
          duration: item.duration || "1-2小时",
          lawyerName: item.lawyer_name || "专业律师",
          lawyerTitle: item.lawyer_title || "资深律师"
        } as LegalServiceMock));

        setLawFirms(firms);
        setLegalServices(services);
        setActiveFirm((current) => {
          if (current && firms.some((firm) => firm.id === current)) {
            return current;
          }
          // 默认选中中间那家律所
          const middleIndex = Math.floor(firms.length / 2);
          return firms[middleIndex]?.id ?? firms[0]?.id ?? null;
        });

        console.log("✅ 首页数据加载成功:", {
          律所数量: firms.length,
          服务数量: services.length
        });
      } catch (error) {
        console.error("❌ 首页数据加载失败:", error);
        logApiFailure("首页数据加载", error);

        // 失败时使用 mock 数据作为备用
        const snapshot = getSnapshot();
        setLawFirms(snapshot.lawFirms);
        setLegalServices(snapshot.legalServices);
        // 默认选中中间那家律所
        const middleIndex = Math.floor(snapshot.lawFirms.length / 2);
        setActiveFirm(snapshot.lawFirms[middleIndex]?.id ?? snapshot.lawFirms[0]?.id ?? null);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (selectedServiceName) {
      setFormService(selectedServiceName);
    }
  }, [selectedServiceName]);

  const firmMap = useMemo(() => {
    const map = new Map<string, LawFirmMock>();
    lawFirms.forEach((firm) => {
      map.set(firm.id, firm);
    });
    return map;
  }, [lawFirms]);

  const serviceItems = useMemo<UiService[]>(
    () =>
      legalServices.map((service) => ({
        ...service,
        lawFirm: firmMap.get(service.lawFirmId)?.name ?? "未关联律所",
      })),
    [legalServices, firmMap]
  );

  useLoad(() => {
    console.log("Page loaded.");
  });

  // 监听页面显示，处理从其他页面跳转过来的滚动
  useDidShow(() => {
    try {
      const sectionId = Taro.getStorageSync("scrollToSection");
      if (sectionId) {
        Taro.removeStorageSync("scrollToSection");
        // 延迟执行滚动，确保页面已渲染
        setTimeout(() => {
          triggerScrollTo(sectionId);
        }, 300);
      }
    } catch (error) {
      console.warn("Failed to get scrollToSection", error);
    }
  });

  usePageScroll((res) => {
    const isScrolled = res.scrollTop > 10;
    if (isScrolled !== scrolled) {
      setScrolled(isScrolled);
    }
  });

  useEffect(() => {
    return () => {
      if (scrollResetTimer.current) {
        clearTimeout(scrollResetTimer.current);
      }
    };
  }, []);

  const triggerScrollTo = (targetId: string) => {
    if (!targetId) return;

    // 使用 Taro.createSelectorQuery 获取元素位置，然后滚动
    // 这种方式在微信小程序中更可靠
    setTimeout(() => {
      const query = Taro.createSelectorQuery();
      query.select(`#${targetId}`).boundingClientRect();
      query.selectViewport().scrollOffset();
      query.exec((res) => {
        if (res && res[0] && res[1]) {
          const targetTop = res[0].top;
          const scrollTop = res[1].scrollTop;
          const offsetTop = targetTop + scrollTop - 10; // 10px 偏移量

          Taro.pageScrollTo({
            scrollTop: offsetTop,
            duration: 300
          }).catch((err) => {
            console.warn('Scroll failed:', err);
          });
        }
      });
    }, 100); // 延迟确保DOM已渲染

    // 保留原有的 scrollIntoView 作为备用方案
    setScrollTarget(targetId);
    if (scrollResetTimer.current) {
      clearTimeout(scrollResetTimer.current);
    }
    scrollResetTimer.current = setTimeout(() => {
      setScrollTarget(undefined);
    }, 500);
  };

  const handleNavClick = (targetId: string) => {
    triggerScrollTo(targetId);
    setMobileMenuOpen(false);
  };

  const handleConsultClick = (serviceName?: string) => {
    if (serviceName) {
      setSelectedServiceName(serviceName);
      setFormService(serviceName);
    } else {
      setSelectedServiceName(null);
    }
    setSelectedServiceId(null);
    setSelectedFirmId(null);
    triggerScrollTo("contact");
    setMobileMenuOpen(false);
  };

  const handleBrowseServices = () => {
    triggerScrollTo("services");
    setMobileMenuOpen(false);
  };

  const handleServiceConsult = (service: UiService) => {
    setSelectedServiceId(service.id || null);
    setSelectedFirmId(service.lawFirmId || null);
    setSelectedServiceName(service.title);
    setFormService(service.title);
    triggerScrollTo("contact");
    setMobileMenuOpen(false);
  };

  const handleFirmConsult = (event: ITouchEvent, firmName: string) => {
    event.stopPropagation();
    handleConsultClick(`${firmName} 咨询`);
  };

  const handleSubmitConsult = async () => {
    if (submittingConsultation) {
      return;
    }

    // 检查登录状态
    const authToken = (() => {
      try {
        return Taro.getStorageSync("auth_token");
      } catch (error) {
        console.warn("Failed to get auth token", error);
        return "";
      }
    })();

    if (!authToken) {
      // 显示登录提示对话框
      Taro.showModal({
        title: "需要登录",
        content: "预约服务需要先登录账号，是否前往登录？",
        confirmText: "去登录",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            // 跳转到me页面进行登录
            Taro.switchTab({ url: "/pages/me/me" }).catch((err) => {
              console.error("Failed to navigate to me page", err);
            });
          }
        },
      });
      return;
    }

    const trimmedName = formName.trim();
    const trimmedEmail = formEmail.trim();
    const trimmedPhone = formPhone.trim();
    const trimmedService = formService.trim();
    const trimmedMessage = formMessage.trim();

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

    if (!trimmedService) {
      Taro.showToast({ title: "请选择咨询服务", icon: "none", duration: 2000 });
      return;
    }

    if (!trimmedMessage) {
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

    const payload: ConsultationPayload = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      serviceName: trimmedService,
      message: trimmedMessage,
      firmId: selectedFirmId || undefined,
      serviceId: selectedServiceId || undefined,
    };

    try {
      setSubmittingConsultation(true);
      await submitConsultationRequest(payload);
      Taro.showToast({
        title: "提交成功，我们将尽快联系您",
        icon: "success",
        duration: 2000,
      });
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      setFormService("");
      setFormMessage("");
      setSelectedServiceId(null);
      setSelectedFirmId(null);
      setSelectedServiceName(null);
    } catch (error) {
      console.error("提交咨询失败", error);
      Taro.showToast({
        title: "提交失败，请稍后再试",
        icon: "none",
        duration: 2000,
      });
    } finally {
      setSubmittingConsultation(false);
    }
  };

  const clearSelectedService = () => {
    setSelectedServiceName(null);
    setSelectedServiceId(null);
    setSelectedFirmId(null);
    setFormService("");
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const filteredServices = useMemo<UiService[]>(
    () =>
      selectedCategory === "all"
        ? serviceItems
        : serviceItems.filter(
            (service) => service.category === selectedCategory
          ),
    [serviceItems, selectedCategory]
  );

  // 桌面端导航（替代底部 tabBar）
  const menuItems = [
    { label: "首页", onClick: () => Taro.switchTab({ url: "/pages/index/index" }) },
    { label: "搜索", onClick: () => Taro.switchTab({ url: "/pages/search/search" }) },
    { label: "合作律所", onClick: () => handleNavClick("lawfirms") },
    { label: "联系我们", onClick: () => handleNavClick("contact") },
    { label: "我的", onClick: () => Taro.switchTab({ url: "/pages/me/me" }) },
  ];

  return (
    <ScrollView
      className="index"
      scrollY
      scrollWithAnimation
      scrollIntoView={scrollTarget}
    >
      {/* 导航栏 */}
      <AppHeader
        scrolled={scrolled}
        showActions={true}
        onConsultClick={() => handleConsultClick()}
        menuItems={menuItems}
      />

      {/* Mobile Menu */}
      <View className={`mobile-nav ${mobileMenuOpen ? "open" : ""}`}>
        <View className="mobile-nav-content">
          <View className="mobile-nav-header">
            <View className="mobile-brand">
              <Image src={logo} className="mobile-logo" mode="aspectFit" />
            </View>
            <View className="mobile-close" onClick={closeMobileMenu}>
              <Text className="close-icon">×</Text>
            </View>
          </View>

          <View className="mobile-menu">
            <Text
              className="mobile-menu-item"
              onClick={() => handleNavClick("services")}
            >
              法律服务
            </Text>
            <Text
              className="mobile-menu-item"
              onClick={() => handleNavClick("lawfirms")}
            >
              合作律所
            </Text>
            <Text
              className="mobile-menu-item"
              onClick={() => handleNavClick("contact")}
            >
              联系我们
            </Text>
          </View>

          <Button
            className="mobile-consult-btn"
            onClick={() => handleConsultClick()}
          >
            立即咨询
          </Button>
        </View>
      </View>

      {mobileMenuOpen && (
        <View className="mobile-menu-overlay" onClick={closeMobileMenu} />
      )}

      {/* Hero 区域 */}
      <View className="hero-section">
        <View className="hero-bg">
          <View className="bg-blur-left" />
          <View className="bg-blur-right" />
        </View>

        <View className="hero-content">
          {/* 左侧文字内容 */}
          <View className="hero-text-section">
            <View className="hero-badge">
              <Text className="badge-text">汇聚顶尖律所 · 专业法律服务平台</Text>
            </View>

            <View className="hero-title">
              <Text className="title-main metallic-gradient-text">
                专业法律服务
              </Text>
              <Text className="title-sub metallic-gradient-text">触手可及</Text>
            </View>

            <Text className="hero-desc">
              连接您与澳大利亚顶级律师事务所，提供刑事辩护、家事法、移民法等全方位专业法律咨询与代理服务
            </Text>

            {/* 桌面端按钮 - 在文字下方 */}
            <View className="hero-actions desktop-only">
              <Button
                className="primary-btn action-btn"
                onClick={() => handleConsultClick()}
              >
                立即咨询
              </Button>
              <Button
                className="secondary-btn action-btn"
                onClick={handleBrowseServices}
              >
                浏览服务
              </Button>
            </View>
          </View>

          {/* 右侧图片 */}
          <View className="hero-image-section">
            <View className="hero-image-container">
              <Image src={heroImage} className="hero-image" mode="widthFix" />
            </View>
          </View>

          {/* 按钮区域 - 移动端 */}
          <View className="hero-actions mobile-only">
            <Button
              className="primary-btn action-btn"
              onClick={() => handleConsultClick()}
            >
              立即咨询
            </Button>
            <Button
              className="secondary-btn action-btn"
              onClick={handleBrowseServices}
            >
              浏览服务
            </Button>
          </View>

          {/* 特色亮点 */}
          <View className="features-grid">
            {featureHighlights.map((feature) => (
              <View className="feature-card" key={feature.id}>
                <Text className="feature-icon">{feature.icon}</Text>
                <Text className="feature-title">{feature.title}</Text>
                <Text className="feature-desc">{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 律所展示 */}
      <View className="lawfirms-section" id="lawfirms">
        <View className="section-header">
          <View className="section-title">
            <Text className="title-line">选择合适的</Text>
            <Text className="highlight">法律服务</Text>
          </View>
          <Text className="section-desc">
            根据您的需求选择合适的律师事务所和法律服务方案
          </Text>
        </View>

        <View className="lawfirms-grid">
          {lawFirms.map((firm) => (
            <View
              key={firm.id}
              className={`firm-card ${activeFirm === firm.id ? "active" : ""} ${
                firm.recommended ? "recommended" : ""
              }`}
              onClick={() => setActiveFirm(firm.id)}
            >
              {firm.recommended && (
                <View className="recommend-badge">推荐选择</View>
              )}

              <View className="firm-header">
                <View className="firm-logo-section">
                  <Image
                    src={lawFirmLogo}
                    className="firm-logo"
                    mode="aspectFit"
                  />
                  <View className="firm-name-section">
                    <Text className="firm-name">{firm.name}</Text>
                    {(firm.rating || firm.cases) && (
                      <View className="firm-stats">
                        {firm.rating && (
                          <Text className="firm-rating">⭐ {firm.rating}</Text>
                        )}
                        {firm.cases && (
                          <Text className="firm-cases">{firm.cases}+ 案例</Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
                <Text className="firm-price">{firm.price}</Text>
                <Text className="firm-desc">{firm.description}</Text>
              </View>

              {/* 优先显示 services，如果为空则显示 practice_areas */}
              {firm.services && firm.services.length > 0 ? (
                <View className="firm-services">
                  {firm.services.map((service, idx) => (
                    <View key={idx} className="service-item">
                      <Text className="service-check">✓</Text>
                      <Text className="service-text">{service}</Text>
                    </View>
                  ))}
                </View>
              ) : firm.practiceAreas && firm.practiceAreas.length > 0 ? (
                <View className="firm-services">
                  {firm.practiceAreas.map((area, idx) => (
                    <View key={idx} className="service-item">
                      <Text className="service-check">✓</Text>
                      <Text className="service-text">{area}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Button
                className="firm-btn"
                onClick={(event) => handleFirmConsult(event, firm.name)}
              >
                立即咨询
              </Button>
            </View>
          ))}
        </View>

        {/* 统计数据 */}
        <View className="stats-grid">
          <View className="stat-item">
            <Text className="stat-number">4+</Text>
            <Text className="stat-label">合作律所</Text>
          </View>
          <View className="stat-item">
            <Text className="stat-number">50+</Text>
            <Text className="stat-label">专业律师</Text>
          </View>
          <View className="stat-item">
            <Text className="stat-number">8000+</Text>
            <Text className="stat-label">成功案例</Text>
          </View>
          <View className="stat-item">
            <Text className="stat-number">98%</Text>
            <Text className="stat-label">客户满意度</Text>
          </View>
        </View>
      </View>

      {/* 法律服务 */}
      <View className="services-section" id="services">
        <View className="section-header">
          <Text className="section-title">专业法律服务</Text>
          <Text className="section-desc">
            我们汇聚顶尖律所资源，为您提供全方位的法律服务解决方案
          </Text>
        </View>

        {/* 服务分类 */}
        <View className="category-tabs">
          <View
            className={`category-tab ${
              selectedCategory === "all" ? "active" : ""
            }`}
            onClick={() => setSelectedCategory("all")}
          >
            <Text className="category-text">全部服务</Text>
          </View>
          {SERVICE_CATEGORIES.map((cat) => (
            <View
              key={cat.id}
              className={`category-tab ${
                selectedCategory === cat.id ? "active" : ""
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <Text className="category-icon">{cat.icon}</Text>
              <Text className="category-text">{cat.name}</Text>
            </View>
          ))}
        </View>

        {/* 服务列表 */}
        <View className="services-grid">
          {filteredServices.map((service) => {
            const serviceFirm = firmMap.get(service.lawFirmId);

            return (
              <ServiceCard
                key={service.id}
                service={service}
                lawFirmMeta={
                  serviceFirm
                    ? { name: serviceFirm.name, rating: serviceFirm.rating }
                    : { name: service.lawFirm }
                }
                onConsult={handleServiceConsult}
              />
            );
          })}
        </View>
      </View>

      {/* 咨询表单 */}
      <View className="contact-section" id="contact">
        <View className="section-header">
          <View className="section-title">
            <Text className="title-line">在线咨询</Text>
            <Text className="highlight">预约表单</Text>
          </View>
          <Text className="section-desc">
            填写您的咨询需求，专业律师将及时为您提供法律建议。
          </Text>
        </View>

        <View className="contact-form">
          <View className="form-header">
            <Text className="form-desc">
              请详细填写您的个人信息和法律问题，我们会安排最适合的律师为您提供专业咨询。
            </Text>
          </View>

          {selectedServiceName && (
            <View className="form-selected-service">
              <Text className="selected-label">已选服务：</Text>
              <Text className="selected-value">{selectedServiceName}</Text>
              <Text className="selected-clear" onClick={clearSelectedService}>
                更改
              </Text>
            </View>
          )}

          <View className="form-content">
            <View className="form-row">
              <View className="form-group">
                <Text className="form-label">
                  姓名 <Text className="required">*</Text>
                </Text>
                <Input
                  className="form-input"
                  type="text"
                  placeholder="请输入您的姓名"
                  value={formName}
                  onInput={(e) => setFormName(e.detail.value)}
                  style={{ color: "#fff" }}
                />
              </View>
              <View className="form-group">
                <Text className="form-label">
                  邮箱 <Text className="required">*</Text>
                </Text>
                <Input
                  className="form-input"
                  type="text"
                  placeholder="请输入您的邮箱"
                  value={formEmail}
                  onInput={(e) => setFormEmail(e.detail.value)}
                  style={{ color: "#fff" }}
                />
              </View>
            </View>

            <View className="form-group">
              <Text className="form-label">
                手机号码 <Text className="required">*</Text>
              </Text>
              <Input
                className="form-input"
                type="number"
                placeholder="请输入您的手机号码"
                value={formPhone}
                onInput={(e) => setFormPhone(e.detail.value)}
                style={{ color: "#fff" }}
              />
            </View>

            <View className="form-group">
              <Text className="form-label">
                咨询服务 <Text className="required">*</Text>
              </Text>
              <Input
                className="form-input"
                type="text"
                placeholder="请选择您需要咨询的法律服务"
                value={formService}
                onInput={(e) => {
                  const value = e.detail.value;
                  setFormService(value);
                  if (selectedServiceName) {
                    setSelectedServiceName(null);
                  }
                  if (selectedServiceId) {
                    setSelectedServiceId(null);
                  }
                  if (selectedFirmId) {
                    setSelectedFirmId(null);
                  }
                }}
                style={{ color: "#fff" }}
              />
            </View>

            <View className="form-group">
              <Text className="form-label">
                问题描述 <Text className="required">*</Text>
              </Text>
              <Textarea
                className="form-textarea"
                placeholder="请详细描述您遇到的法律问题，以便律师更好地为您提供帮助..."
                value={formMessage}
                onInput={(e) => setFormMessage(e.detail.value)}
                style={{
                  color: "#fff",
                  backgroundColor: "transparent",
                }}
              />
            </View>

            <Button
              className="submit-btn"
              onClick={handleSubmitConsult}
              loading={submittingConsultation}
              disabled={submittingConsultation}
            >
              提交咨询申请
            </Button>

            <View className="form-footer">
              <Text className="footer-text">
                我们承诺保护您的隐私信息，咨询内容将严格保密。
              </Text>
              <Text className="footer-text">
                提交后，我们将在1-2个工作日内联系您并安排律师咨询时间。
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 页脚 */}
      <View className="footer">
        <View className="footer-content">
          <View className="footer-brand">
            <Image src={logo} className="footer-logo" mode="aspectFit" />
            <Text className="footer-name">法律服务平台</Text>
          </View>
          <Text className="footer-copyright">
            © {new Date().getFullYear()} 法律服务平台. 保留所有权利.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
