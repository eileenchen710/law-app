import { View, Text, Image, ScrollView, Button } from "@tarojs/components";
import type { ITouchEvent } from "@tarojs/components";
import Taro, { useLoad, usePageScroll } from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import "./index.scss";
import logo from "../../assets/logo.png";
import heroImage from "../../assets/legal-app-hero.png";
import lawFirmLogo from "../../assets/fu_du.png";
import ServiceCard from "./components/ServiceCard";

// 服务分类数据
const serviceCategories = [
  { id: "criminal", name: "刑事辩护", icon: "⚖️" },
  { id: "family", name: "家庭暴力", icon: "👨‍👩‍👧‍👦" },
  { id: "traffic", name: "交通肇事", icon: "🚗" },
  { id: "immigration", name: "移民拘留", icon: "✈️" },
  { id: "corporate", name: "企业法务", icon: "🏢" },
  { id: "property", name: "房产纠纷", icon: "🏠" },
];

// 律所数据
const lawFirms = [
  {
    id: "1",
    name: "金诚律师事务所",
    description: "专业提供全方位法律服务，拥有20年执业经验",
    price: "¥3000起",
    services: [
      "刑事案件无罪辩护",
      "民事纠纷调解诉讼",
      "合同纠纷处理",
      "法律风险评估",
      "专业律师团队",
    ],
    rating: 4.9,
    cases: 2500,
  },
  {
    id: "2",
    name: "盛世律师事务所",
    description: "专注刑事辩护和民事诉讼，成功案例众多",
    price: "¥2500起",
    services: [
      "交通事故理赔",
      "工伤赔偿案件",
      "刑事辩护服务",
      "债权债务纠纷",
      "24小时咨询热线",
      "快速响应服务",
    ],
    rating: 4.8,
    cases: 1800,
    recommended: true,
  },
  {
    id: "3",
    name: "卓越律师事务所",
    description: "家庭法律专家，为您的家庭保驾护航",
    price: "¥2000起",
    services: [
      "离婚财产分割",
      "子女抚养权争议",
      "婚前财产协议",
      "家庭暴力维权",
      "遗产继承纠纷",
      "专业家事调解",
    ],
    rating: 4.7,
    cases: 3200,
  },
];

// 法律服务数据
const legalServices = [
  {
    id: "s1",
    title: "刑事案件辩护",
    description:
      "提供全方位刑事案件辩护服务，包括侦查阶段、审查起诉阶段和审判阶段的法律代理",
    category: "criminal",
    lawFirm: "金诚律师事务所",
    price: "¥20,000起",
    duration: "根据案件复杂度",
    lawyerName: "张伟律师",
    lawyerTitle: "高级合伙人 · 20年刑辩经验",
  },
  {
    id: "s2",
    title: "企业法律顾问",
    description:
      "为企业提供全面的法律咨询服务，包括合同审查、风险评估、纠纷处理等",
    category: "corporate",
    lawFirm: "金诚律师事务所",
    price: "¥50,000/年",
    duration: "长期服务",
    lawyerName: "李明律师",
    lawyerTitle: "合伙人 · 企业法务专家",
  },
  {
    id: "s3",
    title: "家庭暴力保护",
    description:
      "为家暴受害者提供紧急保护令申请、离婚诉讼、子女抚养权等全方位法律援助",
    category: "family",
    lawFirm: "盛世律师事务所",
    price: "¥15,000起",
    duration: "3-6个月",
    lawyerName: "王芳律师",
    lawyerTitle: "资深律师 · 家事法专家",
  },
  {
    id: "s4",
    title: "交通事故赔偿",
    description: "处理各类交通事故人身伤害赔偿案件，争取最大化赔偿金额",
    category: "traffic",
    lawFirm: "卓越律师事务所",
    price: "按赔偿额30%收费",
    duration: "2-4个月",
    lawyerName: "刘强律师",
    lawyerTitle: "高级律师 · 交通事故专家",
  },
  {
    id: "s5",
    title: "移民拘留应对",
    description: "为面临移民拘留的客户提供紧急法律援助，申请保释和庇护",
    category: "immigration",
    lawFirm: "新纪元律师事务所",
    price: "¥30,000起",
    duration: "紧急处理",
    lawyerName: "孙晓律师",
    lawyerTitle: "合伙人 · 移民法专家",
  },
  {
    id: "s6",
    title: "房产买卖纠纷",
    description: "处理房产买卖合同纠纷、产权纠纷、拆迁补偿等案件",
    category: "property",
    lawFirm: "金诚律师事务所",
    price: "¥18,000起",
    duration: "3-6个月",
    lawyerName: "吴刚律师",
    lawyerTitle: "资深律师 · 房产法专家",
  },
];

export default function Index() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeFirm, setActiveFirm] = useState("2");
  const [scrolled, setScrolled] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<string | undefined>(undefined);
  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLoad(() => {
    console.log("Page loaded.");
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
    triggerScrollTo("contact");
    setMobileMenuOpen(false);
  };

  const handleFirmConsult = (event: ITouchEvent, firmName: string) => {
    event.stopPropagation();
    handleConsultClick(`${firmName} 咨询`);
  };

  const handleSubmitConsult = () => {
    Taro.showToast({ title: "已提交，我们将尽快联系您", icon: "none", duration: 2000 });
  };

  const clearSelectedService = () => {
    setSelectedServiceName(null);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const filteredServices =
    selectedCategory === "all"
      ? legalServices
      : legalServices.filter((s) => s.category === selectedCategory);

  return (
    <ScrollView
      className="index"
      scrollY
      scrollWithAnimation
      scrollIntoView={scrollTarget}
    >
      {/* 导航栏 */}
      <View className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <View className="navbar-container">
          <View className="navbar-logo">
            <Image src={logo} className="logo-image" mode="aspectFit" />
            <Text className="logo-text">法律服务</Text>
            <View
              className={`mobile-menu-toggle ${mobileMenuOpen ? "open" : ""}`}
              onClick={toggleMobileMenu}
            >
              <View className="bar" />
              <View className="bar" />
              <View className="bar" />
            </View>
          </View>

          <View className="navbar-menu">
            <Text className="menu-item" onClick={() => handleNavClick("services")}>
              法律服务
            </Text>
            <Text className="menu-item" onClick={() => handleNavClick("lawfirms")}>
              合作律所
            </Text>
            <Text className="menu-item" onClick={() => handleNavClick("contact")}>
              联系我们
            </Text>
          </View>

          <View className="navbar-actions">
            <Button
              className="consult-btn primary-btn"
              onClick={() => handleConsultClick()}
            >
              立即咨询
            </Button>
          </View>
        </View>
      </View>

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
          <View className="hero-badge">
            <Text className="badge-text">汇聚顶尖律所 · 专业法律服务平台</Text>
          </View>

          <View className="hero-title">
            <Text className="title-main metallic-gradient-text">专业法律服务</Text>
            <Text className="title-sub metallic-gradient-text">触手可及</Text>
          </View>

          <Text className="hero-desc">
            连接您与澳大利亚顶级律师事务所，提供刑事辩护、家事法、移民法等全方位专业法律咨询与代理服务
          </Text>

          {/* Hero 图片 */}
          <View className="hero-image-container">
            <Image src={heroImage} className="hero-image" mode="widthFix" />
          </View>

          {/* 特色亮点 */}
          <View className="features-grid">
            <View className="feature-card">
              <Text className="feature-icon">⚖️</Text>
              <Text className="feature-title">多家律所</Text>
              <Text className="feature-desc">汇集顶尖律师资源</Text>
            </View>
            <View className="feature-card">
              <Text className="feature-icon">🛡️</Text>
              <Text className="feature-title">专业可靠</Text>
              <Text className="feature-desc">20年+行业经验</Text>
            </View>
            <View className="feature-card">
              <Text className="feature-icon">👥</Text>
              <Text className="feature-title">服务至上</Text>
              <Text className="feature-desc">8000+成功案例</Text>
            </View>
          </View>

          <View className="hero-actions">
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
          {serviceCategories.map((cat) => (
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
            const serviceFirm = lawFirms.find(
              (firm) => firm.name === service.lawFirm
            );

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
            <Text className="form-title">咨询预约</Text>
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
                <View className="form-input">
                  <Text className="placeholder">请输入您的姓名</Text>
                </View>
              </View>
              <View className="form-group">
                <Text className="form-label">
                  邮箱 <Text className="required">*</Text>
                </Text>
                <View className="form-input">
                  <Text className="placeholder">请输入您的邮箱</Text>
                </View>
              </View>
            </View>

            <View className="form-group">
              <Text className="form-label">
                手机号码 <Text className="required">*</Text>
              </Text>
              <View className="form-input">
                <Text className="placeholder">请输入您的手机号码</Text>
              </View>
            </View>

            <View className="form-group">
              <Text className="form-label">
                咨询服务 <Text className="required">*</Text>
              </Text>
              <View
                className={`form-select ${
                  selectedServiceName ? "filled" : ""
                }`}
              >
                <Text
                  className={`placeholder ${
                    selectedServiceName ? "selected" : ""
                  }`}
                >
                  {selectedServiceName || "请选择您需要咨询的法律服务"}
                </Text>
              </View>
            </View>

            <View className="form-group">
              <Text className="form-label">
                问题描述 <Text className="required">*</Text>
              </Text>
              <View className="form-textarea">
                <Text className="placeholder">
                  请详细描述您遇到的法律问题，以便律师更好地为您提供帮助...
                </Text>
              </View>
            </View>

            <Button className="submit-btn" onClick={handleSubmitConsult}>
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
