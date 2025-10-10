import {
  Button,
  Input,
  ScrollView,
  Switch,
  Text,
  Textarea,
  View,
} from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { useEffect, useState } from "react";
import "./me.scss";
import AppHeader from "../index/components/AppHeader";
import { SERVICE_CATEGORIES } from "../../constants/serviceCategories";
import Loading from "../../components/Loading";
import FirmEditForm from "./FirmEditForm";
import type {
  LawFirmMock,
  LegalServiceMock,
  MockDataSnapshot,
} from "../../mock/types";
import {
  createLawFirm,
  updateLawFirm,
  deleteLawFirm,
  createLegalService,
  updateLegalService,
  deleteLegalService,
  getSnapshot,
  onMockDataChange,
  resetMockData,
  initializeDataStore,
} from "../../services/dataStore";

interface FirmFormState {
  name: string;
  description: string;
  price: string;
  servicesText: string;
  rating: string;
  cases: string;
  recommended: boolean;
}

interface ServiceFormState {
  title: string;
  description: string;
  category: string;
  lawFirmId: string;
  price: string;
  duration: string;
  lawyerName: string;
  lawyerTitle: string;
}

const DEFAULT_CATEGORY_ID = SERVICE_CATEGORIES[0]?.id ?? "criminal";

const createEmptyFirmForm = (): FirmFormState => ({
  name: "",
  description: "",
  price: "",
  servicesText: "",
  rating: "",
  cases: "",
  recommended: false,
});

const createEmptyServiceForm = (lawFirmId?: string): ServiceFormState => ({
  title: "",
  description: "",
  category: DEFAULT_CATEGORY_ID,
  lawFirmId: lawFirmId ?? "",
  price: "",
  duration: "",
  lawyerName: "",
  lawyerTitle: "",
});

export default function Me() {
  const [lawFirms, setLawFirms] = useState<LawFirmMock[]>([]);
  const [legalServices, setLegalServices] = useState<LegalServiceMock[]>([]);
  const [firmForm, setFirmForm] = useState<FirmFormState>(
    createEmptyFirmForm()
  );
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(
    createEmptyServiceForm()
  );
  const [editingFirmId, setEditingFirmId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"firms" | "services">("firms");
  const [loading, setLoading] = useState(true);
  const [showFirmEditForm, setShowFirmEditForm] = useState(false);

  useLoad(() => {
    console.log("Me page loaded.");
  });

  const handleGoHome = () => {
    Taro.switchTab({ url: "/pages/index/index" }).catch(() => undefined);
  };

  const menuItems = [{ label: "首页", onClick: handleGoHome }];

  useEffect(() => {
    const applySnapshot = (snapshot: MockDataSnapshot) => {
      setLawFirms(snapshot.lawFirms);
      setLegalServices(snapshot.legalServices);
      setServiceForm((prev) => {
        if (snapshot.lawFirms.length === 0) {
          return { ...prev, lawFirmId: "" };
        }
        if (snapshot.lawFirms.some((firm) => firm.id === prev.lawFirmId)) {
          return prev;
        }
        return { ...prev, lawFirmId: snapshot.lawFirms[0].id };
      });
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
          duration: 2000,
        });
      });

    const unsubscribe = onMockDataChange(applySnapshot);

    return () => {
      unsubscribe();
    };
  }, []);

  const handleFirmInput = (field: keyof FirmFormState) => (event: any) => {
    setFirmForm((prev) => ({ ...prev, [field]: event.detail.value }));
  };

  const handleFirmRecommendedChange = (event: any) => {
    setFirmForm((prev) => ({ ...prev, recommended: event.detail.value }));
  };

  const handleServiceInput =
    (field: keyof ServiceFormState) => (event: any) => {
      setServiceForm((prev) => ({ ...prev, [field]: event.detail.value }));
    };

  const showToast = (title: string, icon: "none" | "success" = "success") => {
    Taro.showToast({ title, icon, duration: 1400 }).catch(() => undefined);
  };

  const handleFirmSubmit = async () => {
    if (!firmForm.name.trim()) {
      showToast("请输入律所名称", "none");
      return;
    }

    const services = firmForm.servicesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let ratingValue: number | undefined;
    if (firmForm.rating.trim()) {
      const parsed = Number(firmForm.rating);
      if (Number.isNaN(parsed)) {
        showToast("评分必须是数字", "none");
        return;
      }
      ratingValue = parsed;
    }

    let casesValue: number | undefined;
    if (firmForm.cases.trim()) {
      const parsed = Number(firmForm.cases);
      if (Number.isNaN(parsed)) {
        showToast("案例数量必须是数字", "none");
        return;
      }
      casesValue = parsed;
    }

    const payload = {
      name: firmForm.name.trim(),
      description: firmForm.description.trim(),
      price: firmForm.price.trim() || "面议",
      services,
      rating: ratingValue,
      cases: casesValue,
      recommended: firmForm.recommended,
    } as const;

    try {
      if (editingFirmId) {
        await updateLawFirm(editingFirmId, payload);
        showToast("律所信息已更新");
      } else {
        const createdFirm = await createLawFirm(payload);
        showToast("律所已创建");
        if (lawFirms.length === 0) {
          setServiceForm((prev) => ({ ...prev, lawFirmId: createdFirm.id }));
        }
      }
      setFirmForm(createEmptyFirmForm());
      setEditingFirmId(null);
    } catch (error) {
      console.error("Failed to save firm", error);
      showToast("保存律所失败", "none");
    }
  };

  const handleFirmEdit = (firm: LawFirmMock) => {
    setEditingFirmId(firm.id);
    setFirmForm({
      name: firm.name,
      description: firm.description,
      price: firm.price,
      servicesText: firm.services.join("\n"),
      rating: firm.rating != null ? String(firm.rating) : "",
      cases: firm.cases != null ? String(firm.cases) : "",
      recommended: Boolean(firm.recommended),
    });
    setShowFirmEditForm(true);
  };

  const handleFirmCreate = () => {
    setEditingFirmId(null);
    setFirmForm(createEmptyFirmForm());
    setShowFirmEditForm(true);
  };

  const handleFirmFormSave = async (formData: FirmFormState) => {
    await handleFirmSubmit();
    setShowFirmEditForm(false);
  };

  const handleFirmFormCancel = () => {
    setShowFirmEditForm(false);
    setEditingFirmId(null);
    setFirmForm(createEmptyFirmForm());
  };

  const handleFirmDelete = async (firm: LawFirmMock) => {
    const result = await Taro.showModal({
      title: "确认删除",
      content: `确定删除"${firm.name}"及其相关服务吗？`,
      confirmText: "删除",
      cancelText: "取消",
    });
    if (!result.confirm) {
      return;
    }
    try {
      deleteLawFirm(firm.id);
      showToast("已删除律所");
    } catch (error) {
      console.error("Failed to delete firm", error);
      showToast("删除失败", "none");
    }
  };

  const handleServiceSubmit = () => {
    if (!serviceForm.title.trim()) {
      showToast("请输入服务名称", "none");
      return;
    }
    if (!serviceForm.lawFirmId) {
      showToast("请先选择关联律所", "none");
      return;
    }

    const payload = {
      title: serviceForm.title.trim(),
      description: serviceForm.description.trim(),
      category: serviceForm.category || DEFAULT_CATEGORY_ID,
      lawFirmId: serviceForm.lawFirmId,
      price: serviceForm.price.trim() || "面议",
      duration: serviceForm.duration.trim() || "待沟通",
      lawyerName: serviceForm.lawyerName.trim() || "待定律师",
      lawyerTitle: serviceForm.lawyerTitle.trim() || "",
    } as const;

    try {
      if (editingServiceId) {
        updateLegalService(editingServiceId, payload);
        showToast("服务信息已更新");
      } else {
        createLegalService(payload);
        showToast("服务已创建");
      }
      const defaultLawFirmId = serviceForm.lawFirmId || lawFirms[0]?.id;
      setServiceForm(createEmptyServiceForm(defaultLawFirmId));
      setEditingServiceId(null);
    } catch (error) {
      console.error("Failed to save service", error);
      showToast("保存服务失败", "none");
    }
  };

  const handleServiceEdit = (service: LegalServiceMock) => {
    setEditingServiceId(service.id);
    setServiceForm({
      title: service.title,
      description: service.description,
      category: service.category,
      lawFirmId: service.lawFirmId,
      price: service.price,
      duration: service.duration,
      lawyerName: service.lawyerName,
      lawyerTitle: service.lawyerTitle,
    });
  };

  const handleServiceCancel = () => {
    setEditingServiceId(null);
    const defaultLawFirmId = lawFirms[0]?.id ?? "";
    setServiceForm(createEmptyServiceForm(defaultLawFirmId));
  };

  const handleServiceDelete = async (service: LegalServiceMock) => {
    const result = await Taro.showModal({
      title: "确认删除",
      content: `确定删除"${service.title}"吗？`,
      confirmText: "删除",
      cancelText: "取消",
    });
    if (!result.confirm) {
      return;
    }
    try {
      deleteLegalService(service.id);
      showToast("已删除服务");
    } catch (error) {
      console.error("Failed to delete service", error);
      showToast("删除失败", "none");
    }
  };

  const handleSelectLawFirm = (lawFirmId: string) => {
    setServiceForm((prev) => ({ ...prev, lawFirmId }));
  };

  const handleSelectCategory = (categoryId: string) => {
    setServiceForm((prev) => ({ ...prev, category: categoryId }));
  };

  const handleResetData = async () => {
    const result = await Taro.showModal({
      title: "重置数据",
      content: "确定将所有数据重置为初始状态吗？该操作不可撤销。",
      confirmText: "重置",
      cancelText: "取消",
    });

    if (!result.confirm) {
      return;
    }

    try {
      resetMockData();
      const snapshot = getSnapshot();
      setFirmForm(createEmptyFirmForm());
      const defaultLawFirmId = snapshot.lawFirms[0]?.id ?? "";
      setServiceForm(createEmptyServiceForm(defaultLawFirmId));
      setEditingFirmId(null);
      setEditingServiceId(null);
      showToast("数据已重置");
    } catch (error) {
      console.error("Failed to reset data", error);
      showToast("重置失败", "none");
    }
  };

  return (
    <ScrollView className="me-page" scrollY>
      <AppHeader menuItems={menuItems} showActions={false} />

      <View className="admin-header">
        <View className="admin-header-texts">
          <Text className="admin-title metallic-gradient-text">
            数据管理后台
          </Text>
          <Text className="admin-subtitle">
            管理律所、服务与推荐配置，数据将保存到云端数据库
          </Text>
        </View>
        <Button className="reset-btn" size="mini" onClick={handleResetData}>
          重置数据
        </Button>
      </View>

      <View className="tab-bar">
        <View
          className={`tab-item ${activeTab === "firms" ? "active" : ""}`}
          onClick={() => setActiveTab("firms")}
        >
          <Text className="tab-label">律所管理</Text>
        </View>
        <View
          className={`tab-item ${activeTab === "services" ? "active" : ""}`}
          onClick={() => setActiveTab("services")}
        >
          <Text className="tab-label">服务管理</Text>
        </View>
      </View>

      {loading ? (
        <Loading text="加载数据中..." size="medium" />
      ) : activeTab === "firms" ? (
        <View className="section card-bg-black">
        <View className="section-header">
          <Text className="section-title metallic-gradient-text">律所管理</Text>
          <Text className="section-desc">
            管理合作律所信息，数据将同步保存到云端数据库。
          </Text>
          <Button className="primary-btn" onClick={handleFirmCreate}>
            新增律所
          </Button>
        </View>

        <View className="list card-bg-black">
          {lawFirms.map((firm) => (
            <View key={firm.id} className="list-item">
              <View className="item-header">
                <Text className="item-title">{firm.name}</Text>
                <View className="item-tags">
                  {firm.recommended ? <Text className="tag">推荐</Text> : null}
                  {firm.rating != null ? (
                    <Text className="tag">评分 {firm.rating.toFixed(1)}</Text>
                  ) : null}
                  {firm.cases != null ? (
                    <Text className="tag">案例 {firm.cases}</Text>
                  ) : null}
                </View>
              </View>
              <Text className="item-desc">
                {firm.description || "暂无简介"}
              </Text>
              <Text className="item-meta">
                收费区间：{firm.price || "面议"}
              </Text>
              <View className="item-services">
                {firm.services.map((service) => (
                  <Text key={service} className="service-chip">
                    {service}
                  </Text>
                ))}
              </View>
              <View className="item-actions">
                <Button
                  className="edit-btn"
                  size="mini"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFirmEdit(firm);
                  }}
                >
                  编辑
                </Button>
                <Button
                  className="delete-btn"
                  size="mini"
                  type="warn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFirmDelete(firm);
                  }}
                >
                  删除
                </Button>
              </View>
            </View>
          ))}

          {lawFirms.length === 0 ? (
            <View className="empty">
              <Text>暂无律所，请先创建一条记录。</Text>
            </View>
          ) : null}
        </View>
      </View>
      ) : (
        <View className="section card-bg-black">
          <View className="section-header">
            <Text className="section-title metallic-gradient-text">
              法律服务管理
            </Text>
            <Text className="section-desc">
              管理法律服务项目与律师信息，数据将同步保存到云端数据库。
            </Text>
          </View>

        <View className="form-card card-bg-black">
          <View className="form-row">
            <Text className="form-label">服务名称 *</Text>
            <Input
              className="form-input"
              placeholder="请输入服务名称"
              value={serviceForm.title}
              onInput={handleServiceInput("title")}
            />
          </View>

          <View className="form-row">
            <Text className="form-label">服务描述</Text>
            <Textarea
              className="form-textarea"
              placeholder="输入服务描述"
              value={serviceForm.description}
              onInput={handleServiceInput("description")}
            />
          </View>

          <View className="form-row">
            <Text className="form-label">选择类别</Text>
            <View className="option-group">
              {SERVICE_CATEGORIES.map((category) => (
                <View
                  key={category.id}
                  className={`option ${
                    serviceForm.category === category.id ? "selected" : ""
                  }`}
                  onClick={() => handleSelectCategory(category.id)}
                >
                  <Text className="option-icon">{category.icon}</Text>
                  <Text className="option-text">{category.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="form-row">
            <Text className="form-label">关联律所 *</Text>
            {lawFirms.length > 0 ? (
              <View className="option-group">
                {lawFirms.map((firm) => (
                  <View
                    key={firm.id}
                    className={`option ${
                      serviceForm.lawFirmId === firm.id ? "selected" : ""
                    }`}
                    onClick={() => handleSelectLawFirm(firm.id)}
                  >
                    <Text className="option-text">{firm.name}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="hint-text">请先创建律所后再添加服务</Text>
            )}
          </View>

          <View className="form-row inline">
            <View className="form-field">
              <Text className="form-label">收费说明</Text>
              <Input
                className="form-input"
                placeholder="例如：¥20,000起"
                value={serviceForm.price}
                onInput={handleServiceInput("price")}
              />
            </View>
            <View className="form-field">
              <Text className="form-label">服务周期</Text>
              <Input
                className="form-input"
                placeholder="例如：1-3个月"
                value={serviceForm.duration}
                onInput={handleServiceInput("duration")}
              />
            </View>
          </View>

          <View className="form-row inline">
            <View className="form-field">
              <Text className="form-label">主办律师</Text>
              <Input
                className="form-input"
                placeholder="例如：张伟律师"
                value={serviceForm.lawyerName}
                onInput={handleServiceInput("lawyerName")}
              />
            </View>
            <View className="form-field">
              <Text className="form-label">律师头衔</Text>
              <Input
                className="form-input"
                placeholder="例如：高级合伙人"
                value={serviceForm.lawyerTitle}
                onInput={handleServiceInput("lawyerTitle")}
              />
            </View>
          </View>

          <View className="form-actions">
            {editingServiceId ? (
              <>
                <Button className="primary-btn" onClick={handleServiceSubmit}>
                  保存修改
                </Button>
                <Button className="ghost-btn" onClick={handleServiceCancel}>
                  取消
                </Button>
              </>
            ) : (
              <Button className="primary-btn" onClick={handleServiceSubmit}>
                新增服务
              </Button>
            )}
          </View>
        </View>

        <View className="list card-bg-black">
          {legalServices.map((service) => {
            const lawFirm = lawFirms.find(
              (firm) => firm.id === service.lawFirmId
            );
            return (
              <View key={service.id} className="list-item">
                <View className="item-header">
                  <Text className="item-title">{service.title}</Text>
                  <View className="item-tags">
                    <Text className="tag">
                      类别{" "}
                      {SERVICE_CATEGORIES.find(
                        (cat) => cat.id === service.category
                      )?.name ?? service.category}
                    </Text>
                    {lawFirm ? (
                      <Text className="tag">{lawFirm.name}</Text>
                    ) : (
                      <Text className="tag warn">未关联律所</Text>
                    )}
                  </View>
                </View>
                <Text className="item-desc">
                  {service.description || "暂无描述"}
                </Text>
                <Text className="item-meta">
                  收费：{service.price || "面议"}
                </Text>
                <Text className="item-meta">
                  周期：{service.duration || "待沟通"}
                </Text>
                <Text className="item-meta">
                  律师：{service.lawyerName || "待定"}{" "}
                  {service.lawyerTitle ? `· ${service.lawyerTitle}` : ""}
                </Text>
                <View className="item-actions">
                  <Button
                    className="edit-btn"
                    size="mini"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleServiceEdit(service);
                    }}
                  >
                    编辑
                  </Button>
                  <Button
                    className="delete-btn"
                    size="mini"
                    type="warn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleServiceDelete(service);
                    }}
                  >
                    删除
                  </Button>
                </View>
              </View>
            );
          })}

          {legalServices.length === 0 ? (
            <View className="empty">
              <Text>暂无服务，请先创建律所并添加服务项目。</Text>
            </View>
          ) : null}
        </View>
      </View>
      )}
    </ScrollView>

    {/* 律所编辑表单 */}
    {showFirmEditForm && (
      <FirmEditForm
        formData={firmForm}
        isEditing={!!editingFirmId}
        onSave={handleFirmFormSave}
        onCancel={handleFirmFormCancel}
      />
    )}
  </View>
  );
}
