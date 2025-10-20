import { Button, Input, Picker, ScrollView, Text, Textarea, View } from "@tarojs/components";
import Taro, { useLoad, useRouter } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "./firm-detail.scss";
import { getSnapshot, onMockDataChange } from "../../services/dataStore";
import type { LawFirmMock, LegalServiceMock } from "../../mock/types";
import { SERVICE_CATEGORIES } from "../../constants/serviceCategories";
import AppHeader from "../index/components/AppHeader";

const formatBookingTime = (value: string): string => {
  const parsed = dayjs(value);
  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD HH:mm");
  }
  return value;
};

export default function FirmDetail() {
  const router = useRouter();
  const firmId = router.params.id || "";

  const [firm, setFirm] = useState<LawFirmMock | null>(null);
  const [services, setServices] = useState<LegalServiceMock[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    description: "",
    preferredTime: "",
  });

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

    // Only collect times from firm, not from individual services
    collect(firm?.availableTimes || []);

    const unique = Array.from(new Set(times));
    const now = dayjs();

    return unique
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
  }, [firm, services]);

  const formattedAvailableTimes = useMemo(
    () => availableTimes.map((time) => formatBookingTime(time)),
    [availableTimes]
  );

  const renderAvailableTimesPreview = () => {
    if (availableTimes.length === 0) {
      return (
        <Text className="available-times-empty">暂未配置可预约时间</Text>
      );
    }

    const preview = availableTimes.slice(0, 3);
    const extraCount = Math.max(availableTimes.length - preview.length, 0);

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
          该律所暂未设置可预约时间，您可以在备注中填写期望时间。
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

  useEffect(() => {
    if (formData.preferredTime && !availableTimes.includes(formData.preferredTime)) {
      setFormData((prev) => ({ ...prev, preferredTime: "" }));
    }
  }, [availableTimes, formData.preferredTime]);

  useLoad(() => {
    console.log("Firm detail page loaded, id:", firmId);
  });

  useEffect(() => {
    const applySnapshot = () => {
      const snapshot = getSnapshot();
      const foundFirm = snapshot.lawFirms.find((f) => f.id === firmId);
      setFirm(foundFirm || null);

      // Get services for this firm
      const firmServices = snapshot.legalServices.filter(
        (s) => s.lawFirmId === firmId
      );
      setServices(firmServices);
    };

    applySnapshot();
    const unsubscribe = onMockDataChange(applySnapshot);

    return () => {
      unsubscribe();
    };
  }, [firmId]);

  const handleSubmitBooking = () => {
    if (!formData.name || !formData.phone) {
      Taro.showToast({
        title: "请填写姓名和电话",
        icon: "none",
      });
      return;
    }

    const preferredTime = formData.preferredTime;

    console.log('Firm consultation request', {
      firmId,
      name: formData.name,
      phone: formData.phone,
      description: formData.description,
      preferredTime,
    });

    Taro.showToast({
      title: "预约成功！我们会尽快联系您",
      icon: "success",
    });

    setShowBookingForm(false);
    setFormData({ name: "", phone: "", description: "", preferredTime: "" });
  };

  if (!firm) {
    return (
      <View className="firm-detail-page">
        <AppHeader menuItems={[]} showActions={false} scrolled={false} />
        <View className="empty-state">
          <Text className="empty-title">律所不存在</Text>
          <Button onClick={() => Taro.navigateBack()}>返回</Button>
        </View>
      </View>
    );
  }

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
    <ScrollView className="firm-detail-page" scrollY>
      <AppHeader menuItems={menuItems} showActions={false} scrolled={false} />

      <View className="firm-header">
        <Text className="firm-name metallic-gradient-text">{firm.name}</Text>
        {firm.rating && (
          <View className="firm-rating">
            <Text className="rating-text">评分 {firm.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View className="firm-section">
        <Text className="section-title">律所简介</Text>
        <Text className="section-content">{firm.description || "暂无简介"}</Text>
      </View>

      <View className="firm-section">
        <Text className="section-title">服务信息</Text>
        <View className="info-grid">
          <View className="info-item">
            <Text className="info-label">收费标准</Text>
            <Text className="info-value">{firm.price || "面议"}</Text>
          </View>
          {firm.cases && (
            <View className="info-item">
              <Text className="info-label">案例数量</Text>
              <Text className="info-value">{firm.cases}</Text>
            </View>
          )}
        </View>
      </View>

      <View className="firm-section">
        <Text className="section-title">可预约时间</Text>
        {renderAvailableTimesPreview()}
      </View>

      {firm.services && firm.services.length > 0 && (
        <View className="firm-section">
          <Text className="section-title">业务领域</Text>
          <View className="service-tags">
            {firm.services.map((service) => (
              <Text key={service} className="service-tag">
                {service}
              </Text>
            ))}
          </View>
        </View>
      )}

      {services.length > 0 && (
        <View className="firm-section">
          <Text className="section-title">提供的法律服务 ({services.length})</Text>
          <View className="services-list">
            {services.map((service) => {
              const category = SERVICE_CATEGORIES.find(
                (cat) => cat.id === service.category
              );
              return (
                <View
                  key={service.id}
                  className="service-card"
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages/service-detail/service-detail?id=${service.id}`,
                    })
                  }
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
                    <Text className="meta-text">费用：{service.price || "面议"}</Text>
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
