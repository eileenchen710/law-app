import { Button, Input, ScrollView, Text, Textarea, View } from "@tarojs/components";
import Taro, { useLoad, useRouter } from "@tarojs/taro";
import { useEffect, useState } from "react";
import "./service-detail.scss";
import { getSnapshot, onMockDataChange } from "../../services/dataStore";
import type { LawFirmMock, LegalServiceMock } from "../../mock/types";
import { SERVICE_CATEGORIES } from "../../constants/serviceCategories";
import AppHeader from "../index/components/AppHeader";

export default function ServiceDetail() {
  const router = useRouter();
  const serviceId = router.params.id || "";

  const [service, setService] = useState<LegalServiceMock | null>(null);
  const [firm, setFirm] = useState<LawFirmMock | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    description: "",
  });

  useLoad(() => {
    console.log("Service detail page loaded, id:", serviceId);
  });

  useEffect(() => {
    const applySnapshot = () => {
      const snapshot = getSnapshot();
      const foundService = snapshot.legalServices.find((s) => s.id === serviceId);
      setService(foundService || null);

      if (foundService) {
        const foundFirm = snapshot.lawFirms.find(
          (f) => f.id === foundService.lawFirmId
        );
        setFirm(foundFirm || null);
      }
    };

    applySnapshot();
    const unsubscribe = onMockDataChange(applySnapshot);

    return () => {
      unsubscribe();
    };
  }, [serviceId]);

  const handleSubmitBooking = () => {
    if (!formData.name || !formData.phone) {
      Taro.showToast({
        title: "请填写姓名和电话",
        icon: "none",
      });
      return;
    }

    Taro.showToast({
      title: "预约成功！我们会尽快联系您",
      icon: "success",
    });

    setShowBookingForm(false);
    setFormData({ name: "", phone: "", description: "" });
  };

  if (!service) {
    return (
      <View className="service-detail-page">
        <AppHeader menuItems={[]} showActions={false} scrolled={false} />
        <View className="empty-state">
          <Text className="empty-title">服务不存在</Text>
          <Button onClick={() => Taro.navigateBack()}>返回</Button>
        </View>
      </View>
    );
  }

  const category = SERVICE_CATEGORIES.find((cat) => cat.id === service.category);

  const menuItems = [
    {
      label: "首页",
      onClick: () => Taro.switchTab({ url: "/pages/index/index" }),
    },
    {
      label: "搜索",
      onClick: () => Taro.switchTab({ url: "/pages/search/search" }),
    },
  ];

  return (
    <ScrollView className="service-detail-page" scrollY>
      <AppHeader menuItems={menuItems} showActions={false} scrolled={false} />

      <View className="service-header">
        <Text className="service-name metallic-gradient-text">
          {service.title}
        </Text>
        {category && (
          <View className="service-category-badge">
            <Text className="category-icon">{category.icon}</Text>
            <Text className="category-text">{category.name}</Text>
          </View>
        )}
      </View>

      <View className="service-section">
        <Text className="section-title">服务描述</Text>
        <Text className="section-content">
          {service.description || "暂无描述"}
        </Text>
      </View>

      <View className="service-section">
        <Text className="section-title">服务详情</Text>
        <View className="info-grid">
          <View className="info-item">
            <Text className="info-label">收费标准</Text>
            <Text className="info-value">{service.price || "面议"}</Text>
          </View>
          <View className="info-item">
            <Text className="info-label">服务周期</Text>
            <Text className="info-value">{service.duration || "待沟通"}</Text>
          </View>
          {service.lawyerName && (
            <View className="info-item">
              <Text className="info-label">主办律师</Text>
              <Text className="info-value">{service.lawyerName}</Text>
            </View>
          )}
          {service.lawyerTitle && (
            <View className="info-item">
              <Text className="info-label">律师职称</Text>
              <Text className="info-value">{service.lawyerTitle}</Text>
            </View>
          )}
        </View>
      </View>

      {firm && (
        <View className="service-section">
          <Text className="section-title">所属律所</Text>
          <View
            className="firm-card"
            onClick={() =>
              Taro.navigateTo({
                url: `/pages/firm-detail/firm-detail?id=${firm.id}`,
              })
            }
          >
            <View className="firm-header-inline">
              <Text className="firm-name">{firm.name}</Text>
              {firm.rating && (
                <Text className="firm-rating">
                  评分 {firm.rating.toFixed(1)}
                </Text>
              )}
            </View>
            <Text className="firm-desc">
              {firm.description || "暂无简介"}
            </Text>
            <View className="firm-meta">
              <Text className="meta-text">费用：{firm.price || "面议"}</Text>
              {firm.cases && (
                <Text className="meta-text">案例：{firm.cases}</Text>
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
              placeholder="联系电话"
              type="number"
              value={formData.phone}
              onInput={(e) =>
                setFormData({ ...formData, phone: e.detail.value })
              }
            />
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
