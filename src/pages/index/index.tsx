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
import Taro, { useLoad, usePageScroll } from "@tarojs/taro";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formService, setFormService] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [submittingConsultation, setSubmittingConsultation] = useState(false);
  const scrollResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const applySnapshot = (snapshot: MockDataSnapshot) => {
      setLawFirms(snapshot.lawFirms);
      setLegalServices(snapshot.legalServices);
      setActiveFirm((current) => {
        if (current && snapshot.lawFirms.some((firm) => firm.id === current)) {
          return current;
        }
        return snapshot.lawFirms[0]?.id ?? null;
      });
    };

    applySnapshot(getSnapshot());
    const unsubscribe = onMockDataChange(applySnapshot);

    return () => {
      unsubscribe();
    };
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
    console.log("开始测试 API 接口...");

    const runTests = async () => {
      try {
        const firms = await fetchFirms({ page: 1, size: 5 });
        console.log("✅ 律所列表 API 测试成功:", firms);
        console.log(`  - 获取到 ${firms.items?.length || 0} 个律所`);
        console.log(`  - 总共 ${firms.total || 0} 个律所`);

        if (firms.items && firms.items.length > 0) {
          const firstFirmId = firms.items[0].id;
          const firmDetail = await fetchFirmById(firstFirmId);
          console.log("✅ 律所详情 API 测试成功:", firmDetail);
          console.log(`  - 律所名称: ${firmDetail.name}`);
          console.log(`  - 包含 ${firmDetail.services?.length || 0} 个服务`);
        }
      } catch (error) {
        logApiFailure("律所", error);
      }

      try {
        const services = await fetchServices({ page: 1, size: 5 });
        console.log("✅ 服务列表 API 测试成功:", services);
        console.log(`  - 获取到 ${services.items?.length || 0} 个服务`);

        if (services.items && services.items.length > 0) {
          const firstServiceId = services.items[0].id;
          const serviceDetail = await fetchServiceById(firstServiceId);
          console.log("✅ 服务详情 API 测试成功:", serviceDetail);
          console.log(`  - 服务名称: ${serviceDetail.title}`);
          console.log(
            `  - 所属律所: ${
              serviceDetail.firm?.name || serviceDetail.firm_name || "未知"
            }`
          );
        }
      } catch (error) {
        logApiFailure("服务", error);
      }

    };

    runTests().catch((error) => {
      logApiFailure("API 调试", error);
    });
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
    }
    triggerScrollTo("contact");
    setMobileMenuOpen(false);
  };

  const handleBrowseServices = () => {
    triggerScrollTo("services");
    setMobileMenuOpen(false);
  };

  const handleServiceConsult = (serviceTitle: string) => {
    setSelectedServiceName(serviceTitle);
    setFormService(serviceTitle);
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

  const menuItems = [
    { label: "法律服务", onClick: () => handleNavClick("services") },
    { label: "合作律所", onClick: () => handleNavClick("lawfirms") },
    { label: "联系我们", onClick: () => handleNavClick("contact") },
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
              <Text className="mobile-name">法律服务</Text>
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
                  <Text className="firm-name">{firm.name}</Text>
                </View>
                <Text className="firm-price">{firm.price}</Text>
                <Text className="firm-desc">{firm.description}</Text>
              </View>

              <View className="firm-services">
                {firm.services.map((service, idx) => (
                  <View key={idx} className="service-item">
                    <Text className="service-check">✓</Text>
                    <Text className="service-text">{service}</Text>
                  </View>
                ))}
              </View>

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
                  style={{ color: "#fff", fontSize: "13px" }}
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
                  style={{ color: "#fff", fontSize: "13px" }}
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
                style={{ color: "#fff", fontSize: "13px" }}
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
                  setFormService(e.detail.value);
                  if (selectedServiceName) {
                    setSelectedServiceName(null);
                  }
                }}
                style={{ color: "#fff", fontSize: "13px" }}
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
                  fontSize: "13px",
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
