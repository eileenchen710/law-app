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
import { useCallback, useEffect, useMemo, useState } from "react";
import "./me.scss";
import Loading from "../../components/Loading";
import TabBar, { type TabItem } from "../../components/TabBar";
import LoginForm from "../../components/LoginForm";
import AppHeader from "../index/components/AppHeader";
import { SERVICE_CATEGORIES } from "../../constants/serviceCategories";
import type { ApiError } from "../../services/http";
import type {
  AppointmentSummary,
  AuthResponse,
  UserProfile,
} from "../../services/types";
import type {
  LawFirmMock,
  LegalServiceMock,
  MockDataSnapshot,
} from "../../mock/types";
import {
  fetchCurrentUser,
  loginAnonymously,
  loginWithWechat,
} from "../../services/api";
import {
  createLawFirm,
  updateLawFirm,
  deleteLawFirm,
  createLegalService,
  updateLegalService,
  deleteLegalService,
  getSnapshot,
  onMockDataChange,
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

const storeAuthToken = (token?: string) => {
  if (token) {
    try {
      Taro.setStorageSync("auth_token", token);
    } catch (error) {
      console.warn("Failed to store auth token", error);
    }
  }
};

const clearAuthToken = () => {
  try {
    Taro.removeStorageSync("auth_token");
  } catch (error) {
    console.warn("Failed to clear auth token", error);
  }
};

const isWeappEnv = () => {
  const env = Taro.getEnv();
  return env === "WEAPP";
};

const formatDateTime = (value?: string | number | Date | null) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  } catch (error) {
    return "-";
  }
};

export default function Me() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "appointments" | "firms" | "services"
  >("appointments");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showLoginForm, setShowLoginForm] = useState(false);

  // 管理员状态
  const [lawFirms, setLawFirms] = useState<LawFirmMock[]>([]);
  const [legalServices, setLegalServices] = useState<LegalServiceMock[]>([]);
  const [firmForm, setFirmForm] = useState<FirmFormState>(createEmptyFirmForm());
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(
    createEmptyServiceForm()
  );
  const [editingFirmId, setEditingFirmId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  useLoad(() => {
    console.log("Me page loaded.");
  });

  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  useEffect(() => {
    setActiveTab("appointments");
  }, [isAdmin]);

  const tabs = useMemo<TabItem<typeof activeTab>[]>(
    () => [
      { key: "appointments", label: "我的预约", visible: true },
      { key: "firms", label: "律所管理", visible: isAdmin },
      { key: "services", label: "服务管理", visible: isAdmin },
    ],
    [isAdmin]
  );

  // 加载律所和服务数据（管理员功能）
  useEffect(() => {
    if (!isAdmin) return;

    const applySnapshot = (snapshot: MockDataSnapshot) => {
      setLawFirms(snapshot.lawFirms);
      setLegalServices(snapshot.legalServices);
      setServiceForm((prev) => {
        if (snapshot.lawFirms.length === 0) {
          return { ...prev, lawFirmId: "" };
        }
        if (prev.lawFirmId) {
          const exists = snapshot.lawFirms.some((f) => f.id === prev.lawFirmId);
          if (exists) return prev;
        }
        return { ...prev, lawFirmId: snapshot.lawFirms[0].id };
      });
    };

    applySnapshot(getSnapshot());
    const unsubscribe = onMockDataChange(applySnapshot);

    return () => {
      unsubscribe();
    };
  }, [isAdmin]);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await fetchCurrentUser();
      setUser(response.user);
      setAppointments(response.appointments || []);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        clearAuthToken();
      } else {
        console.error("Failed to load profile", error);
        setErrorMessage(apiError?.message || "用户信息加载失败");
      }
      throw error;
    }
  }, []);

  const performWechatLogin = useCallback(async (withUserInfo = false, autoPrompt = false): Promise<AuthResponse | null> => {
    try {
      setAuthenticating(true);
      const loginRes = await Taro.login();
      if (!loginRes.code) {
        throw new Error("未获取到微信登录凭证");
      }

      let userProfile: Record<string, unknown> | undefined;

      // 如果需要获取用户信息（手动点击或自动提示）
      if (withUserInfo || autoPrompt) {
        try {
          const profile = await Taro.getUserProfile({
            desc: "用于完善个人资料",
          });
          userProfile = profile?.userInfo as Record<string, unknown>;
          console.log("获取到的微信用户信息:", userProfile);
        } catch (profileError) {
          console.warn("用户拒绝授权获取个人信息", profileError);
          // 即使用户拒绝授权，也继续登录流程
        }
      }

      console.log("准备发送登录请求，userInfo:", userProfile);
      const authRes = await loginWithWechat({
        code: loginRes.code,
        userInfo: userProfile,
      });
      storeAuthToken(authRes.token);
      console.log("微信登录成功:", authRes.user);

      if (userProfile) {
        Taro.showToast({
          title: `登录成功！欢迎 ${authRes.user?.displayName || "用户"}`,
          icon: "success"
        }).catch(() => undefined);
      }

      return authRes;
    } catch (error) {
      console.error("WeChat login failed", error);
      const message = (error as Error).message || "微信登录失败";
      Taro.showToast({ title: message, icon: "none" }).catch(() => undefined);
      return null;
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const performAnonymousLogin = useCallback(async () => {
    // 非微信环境，显示登录表单
    if (!isWeappEnv()) {
      setShowLoginForm(true);
      return null;
    }

    try {
      setAuthenticating(true);
      const authRes = await loginAnonymously({});
      storeAuthToken(authRes.token);
      return authRes;
    } catch (error) {
      console.error("Anonymous login failed", error);
      const message = (error as Error).message || "登录失败，请稍后再试";
      Taro.showToast({ title: message, icon: "none" }).catch(() => undefined);
      return null;
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const ensureAuthenticated = useCallback(async () => {
    const token = (() => {
      try {
        return Taro.getStorageSync("auth_token");
      } catch (error) {
        return "";
      }
    })();

    if (token) {
      return true;
    }

    if (isWeappEnv()) {
      const result = await performWechatLogin();
      return Boolean(result?.token);
    }

    const result = await performAnonymousLogin();
    return Boolean(result?.token);
  }, [performAnonymousLogin, performWechatLogin]);

  const initialize = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const authed = await ensureAuthenticated();
      if (!authed) {
        setErrorMessage("登录失败，请手动重试");
        return;
      }
      await refreshProfile();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        if (await ensureAuthenticated()) {
          await refreshProfile();
        }
      } else {
        console.error("Initialization failed", error);
        setErrorMessage(apiError?.message || "加载失败，请稍后再试");
      }
    } finally {
      setLoading(false);
    }
  }, [ensureAuthenticated, refreshProfile]);

  useEffect(() => {
    initialize().catch((error) => {
      console.error("Failed to initialize", error);
    });
  }, [initialize]);

  const handleLogout = async () => {
    clearAuthToken();
    setUser(null);
    setAppointments([]);
    await initialize();
  };

  const goToHome = () => {
    Taro.switchTab({ url: "/pages/index/index" }).catch(() => undefined);
  };

  const handleLoginSuccess = async (token: string) => {
    storeAuthToken(token);
    setShowLoginForm(false);
    await initialize();
  };

  const handleLoginClose = () => {
    setShowLoginForm(false);
  };

  // 律所管理处理函数
  const handleFirmInput = (field: keyof FirmFormState) => (event: any) => {
    const value = event?.detail?.value ?? "";
    setFirmForm((prev) => {
      if (field === "recommended") {
        return { ...prev, recommended: Boolean(value) };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleFirmSubmit = async () => {
    const firm = firmForm;
    if (!firm.name?.trim()) {
      Taro.showToast({ title: "请填写律所名称", icon: "none" });
      return;
    }

    const services = firm.servicesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingFirmId) {
      await updateLawFirm(editingFirmId, {
        name: firm.name.trim(),
        description: firm.description.trim() || undefined,
        price: firm.price.trim() || undefined,
        services: services.length > 0 ? services : undefined,
        rating: firm.rating ? parseFloat(firm.rating) : undefined,
        cases: firm.cases ? parseInt(firm.cases, 10) : undefined,
        recommended: firm.recommended,
      });
      Taro.showToast({ title: "律所已更新", icon: "success" });
    } else {
      const newData = {
        name: firm.name.trim(),
        description: firm.description.trim() || undefined,
        price: firm.price.trim() || undefined,
        services: services.length > 0 ? services : ["初步咨询"],
        rating: firm.rating ? parseFloat(firm.rating) : 4.8,
        cases: firm.cases ? parseInt(firm.cases, 10) : 0,
        recommended: firm.recommended,
      };
      // 过滤掉 undefined 值
      const filteredData = Object.fromEntries(
        Object.entries(newData).filter(([_, v]) => v !== undefined)
      ) as Omit<LawFirmMock, "id">;
      await createLawFirm(filteredData);
      Taro.showToast({ title: "律所已创建", icon: "success" });
    }

    setFirmForm(createEmptyFirmForm());
    setEditingFirmId(null);
  };

  const handleFirmEdit = (firm: LawFirmMock) => {
    setEditingFirmId(firm.id);
    setFirmForm({
      name: firm.name,
      description: firm.description || "",
      price: firm.price || "",
      servicesText: firm.services?.join("\n") || "",
      rating: firm.rating?.toString() || "",
      cases: firm.cases?.toString() || "",
      recommended: firm.recommended || false,
    });
  };

  const handleFirmDelete = async (id: string) => {
    await deleteLawFirm(id);
    Taro.showToast({ title: "律所已删除", icon: "success" });
  };

  const handleFirmCancel = () => {
    setEditingFirmId(null);
    setFirmForm(createEmptyFirmForm());
  };

  // 服务管理处理函数
  const handleServiceInput = (field: keyof ServiceFormState) => (event: any) => {
    const value = event?.detail?.value ?? "";
    setServiceForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleServiceSubmit = async () => {
    const svc = serviceForm;
    if (!svc.title?.trim() || !svc.lawFirmId) {
      Taro.showToast({ title: "请填写必填字段", icon: "none" });
      return;
    }

    if (editingServiceId) {
      await updateLegalService(editingServiceId, {
        title: svc.title.trim(),
        description: svc.description.trim() || undefined,
        category: svc.category || DEFAULT_CATEGORY_ID,
        lawFirmId: svc.lawFirmId,
        price: svc.price.trim() || undefined,
        duration: svc.duration.trim() || undefined,
        lawyerName: svc.lawyerName.trim() || undefined,
        lawyerTitle: svc.lawyerTitle.trim() || undefined,
      });
      Taro.showToast({ title: "服务已更新", icon: "success" });
    } else {
      await createLegalService({
        title: svc.title.trim(),
        description: svc.description.trim() || "专业法律服务",
        category: svc.category || DEFAULT_CATEGORY_ID,
        lawFirmId: svc.lawFirmId,
        price: svc.price.trim() || "面议",
        duration: svc.duration.trim() || "1-2小时",
        lawyerName: svc.lawyerName.trim() || "专业律师",
        lawyerTitle: svc.lawyerTitle.trim() || "资深律师",
      });
      Taro.showToast({ title: "服务已创建", icon: "success" });
    }

    setServiceForm(createEmptyServiceForm(svc.lawFirmId));
    setEditingServiceId(null);
  };

  const handleServiceEdit = (service: LegalServiceMock) => {
    setEditingServiceId(service.id);
    setServiceForm({
      title: service.title,
      description: service.description || "",
      category: service.category,
      lawFirmId: service.lawFirmId,
      price: service.price || "",
      duration: service.duration || "",
      lawyerName: service.lawyerName || "",
      lawyerTitle: service.lawyerTitle || "",
    });
  };

  const handleServiceDelete = async (id: string) => {
    await deleteLegalService(id);
    Taro.showToast({ title: "服务已删除", icon: "success" });
  };

  const handleServiceCancel = () => {
    setEditingServiceId(null);
    setServiceForm(
      createEmptyServiceForm(lawFirms.length > 0 ? lawFirms[0].id : "")
    );
  };

  const renderAppointments = () => (
    <View className="section">
      <View className="section-header">
        <Text className="section-title">我的预约</Text>
        <Text className="section-desc">
          查看您近期提交的预约，随时掌握进度。
        </Text>
      </View>

      {appointments.length === 0 ? (
        <View className="empty-state">
          <Text className="empty-title">暂无预约记录</Text>
          <Text className="empty-desc">
            您可以在首页选择律师服务，提交新的预约申请。
          </Text>
          <Button className="action-button" onClick={goToHome}>
            去首页预约
          </Button>
        </View>
      ) : (
        <View className="appointment-list">
          {appointments.map((item) => (
            <View className="appointment-card" key={item.id}>
              <View className="appointment-header">
                <Text className="appointment-title">{item.service_name || "未指定服务"}</Text>
                <Text className="appointment-status">{item.status || "待确认"}</Text>
              </View>
              <View className="appointment-body">
                <Text className="appointment-field">
                  <Text className="appointment-label">预约时间：</Text>
                  {formatDateTime(item.time)}
                </Text>
                <Text className="appointment-field">
                  <Text className="appointment-label">律所 / 服务：</Text>
                  {item.firm_name || "-"}
                </Text>
                <Text className="appointment-field">
                  <Text className="appointment-label">备注：</Text>
                  {item.remark || "无"}
                </Text>
              </View>
              <View className="appointment-footer">
                <Text className="appointment-meta">
                  提交时间：{formatDateTime(item.created_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderFirmsManagement = () => (
    <View className="section">
      <View className="section-header">
        <Text className="section-title">律所管理</Text>
        <Text className="section-desc">添加、编辑或删除合作律所信息</Text>
      </View>

      <View className="form-card card-bg-black">
        <View className="form-row">
          <Text className="form-label">律所名称 *</Text>
          <Input
            className="form-input"
            placeholder="请输入律所名称"
            value={firmForm.name}
            onInput={handleFirmInput("name")}
          />
        </View>

        <View className="form-row">
          <Text className="form-label">律所简介</Text>
          <Textarea
            className="form-textarea"
            placeholder="请输入律所简介"
            value={firmForm.description}
            onInput={handleFirmInput("description")}
          />
        </View>

        <View className="form-row inline">
          <View className="form-field">
            <Text className="form-label">收费说明</Text>
            <Input
              className="form-input"
              placeholder="例如：¥20,000起"
              value={firmForm.price}
              onInput={handleFirmInput("price")}
            />
          </View>
          <View className="form-field">
            <Text className="form-label">推荐标记</Text>
            <Switch
              checked={firmForm.recommended}
              onChange={handleFirmInput("recommended")}
            />
          </View>
        </View>

        <View className="form-row inline">
          <View className="form-field">
            <Text className="form-label">评分（1-5）</Text>
            <Input
              className="form-input"
              placeholder="4.8"
              type="digit"
              value={firmForm.rating}
              onInput={handleFirmInput("rating")}
            />
          </View>
          <View className="form-field">
            <Text className="form-label">案例数</Text>
            <Input
              className="form-input"
              placeholder="100"
              type="number"
              value={firmForm.cases}
              onInput={handleFirmInput("cases")}
            />
          </View>
        </View>

        <View className="form-row">
          <Text className="form-label">服务项目（一行一项）</Text>
          <Textarea
            className="form-textarea"
            placeholder={`初步法律咨询\n案件代理\n法律文书审查`}
            value={firmForm.servicesText}
            onInput={handleFirmInput("servicesText")}
          />
        </View>

        <View className="form-row">
          <Button className="submit-btn" onClick={handleFirmSubmit}>
            {editingFirmId ? "更新律所" : "添加律所"}
          </Button>
          {editingFirmId && (
            <Button className="reset-btn" onClick={handleFirmCancel}>
              取消编辑
            </Button>
          )}
        </View>
      </View>

      <View className="list-section">
        {lawFirms.map((firm) => (
          <View
            key={firm.id}
            className={`list-card ${editingFirmId === firm.id ? "editing" : ""}`}
          >
            <View className="list-card-header">
              <Text className="list-card-title">{firm.name}</Text>
              <View className="list-card-tags">
                {firm.recommended && <Text className="tag">推荐</Text>}
                {firm.rating != null && <Text className="tag">评分 {firm.rating.toFixed(1)}</Text>}
                {firm.cases != null && <Text className="tag">案例 {firm.cases}</Text>}
              </View>
            </View>
            <Text className="list-card-desc">{firm.description}</Text>
            <View className="list-card-actions">
              <Button className="edit-btn" onClick={() => handleFirmEdit(firm)}>
                编辑
              </Button>
              <Button className="delete-btn" onClick={() => handleFirmDelete(firm.id)}>
                删除
              </Button>
            </View>
          </View>
        ))}
        {lawFirms.length === 0 && (
          <View className="empty">
            <Text>暂无律所，请先添加律所。</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderServicesManagement = () => (
    <View className="section">
      <View className="section-header">
        <Text className="section-title">服务管理</Text>
        <Text className="section-desc">添加、编辑或删除法律服务项目</Text>
      </View>

      <View className="form-card card-bg-black">
        <View className="form-row">
          <Text className="form-label">服务标题 *</Text>
          <Input
            className="form-input"
            placeholder="请输入服务标题"
            value={serviceForm.title}
            onInput={handleServiceInput("title")}
          />
        </View>

        <View className="form-row">
          <Text className="form-label">服务描述</Text>
          <Textarea
            className="form-textarea"
            placeholder="请输入服务描述"
            value={serviceForm.description}
            onInput={handleServiceInput("description")}
          />
        </View>

        <View className="form-row inline">
          <View className="form-field">
            <Text className="form-label">所属律所 *</Text>
            <View className="form-select">
              {lawFirms.map((firm) => (
                <View
                  key={firm.id}
                  className={`select-option ${serviceForm.lawFirmId === firm.id ? "selected" : ""}`}
                  onClick={() =>
                    setServiceForm((prev) => ({ ...prev, lawFirmId: firm.id }))
                  }
                >
                  <Text>{firm.name}</Text>
                </View>
              ))}
            </View>
          </View>
          <View className="form-field">
            <Text className="form-label">服务分类</Text>
            <View className="form-select">
              {SERVICE_CATEGORIES.map((cat) => (
                <View
                  key={cat.id}
                  className={`select-option ${serviceForm.category === cat.id ? "selected" : ""}`}
                  onClick={() =>
                    setServiceForm((prev) => ({ ...prev, category: cat.id }))
                  }
                >
                  <Text>
                    {cat.icon} {cat.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="form-row inline">
          <View className="form-field">
            <Text className="form-label">收费说明</Text>
            <Input
              className="form-input"
              placeholder="例如：¥5,000起"
              value={serviceForm.price}
              onInput={handleServiceInput("price")}
            />
          </View>
          <View className="form-field">
            <Text className="form-label">服务时长</Text>
            <Input
              className="form-input"
              placeholder="1-2小时"
              value={serviceForm.duration}
              onInput={handleServiceInput("duration")}
            />
          </View>
        </View>

        <View className="form-row inline">
          <View className="form-field">
            <Text className="form-label">律师姓名</Text>
            <Input
              className="form-input"
              placeholder="张律师"
              value={serviceForm.lawyerName}
              onInput={handleServiceInput("lawyerName")}
            />
          </View>
          <View className="form-field">
            <Text className="form-label">律师职称</Text>
            <Input
              className="form-input"
              placeholder="资深律师"
              value={serviceForm.lawyerTitle}
              onInput={handleServiceInput("lawyerTitle")}
            />
          </View>
        </View>

        <View className="form-row">
          <Button className="submit-btn" onClick={handleServiceSubmit}>
            {editingServiceId ? "更新服务" : "添加服务"}
          </Button>
          {editingServiceId && (
            <Button className="reset-btn" onClick={handleServiceCancel}>
              取消编辑
            </Button>
          )}
        </View>
      </View>

      <View className="list-section">
        {legalServices.map((service) => {
          const firm = lawFirms.find((f) => f.id === service.lawFirmId);
          const category = SERVICE_CATEGORIES.find((c) => c.id === service.category);

          return (
            <View
              key={service.id}
              className={`list-card ${editingServiceId === service.id ? "editing" : ""}`}
            >
              <View className="list-card-header">
                <Text className="list-card-title">{service.title}</Text>
                <View className="list-card-tags">
                  {category && (
                    <Text className="tag">
                      {category.icon} {category.name}
                    </Text>
                  )}
                  {service.price && <Text className="tag">{service.price}</Text>}
                </View>
              </View>
              <Text className="list-card-desc">{service.description}</Text>
              <Text className="list-card-meta">
                律所：{firm?.name || "未关联"} | 律师：{service.lawyerName}
              </Text>
              <View className="list-card-actions">
                <Button className="edit-btn" onClick={() => handleServiceEdit(service)}>
                  编辑
                </Button>
                <Button className="delete-btn" onClick={() => handleServiceDelete(service.id)}>
                  删除
                </Button>
              </View>
            </View>
          );
        })}
        {legalServices.length === 0 && (
          <View className="empty">
            <Text>暂无服务，请先创建律所并添加服务项目。</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView className="me-page" scrollY>
      <AppHeader showActions={false} scrolled={false} />
      {(loading || authenticating) && !user ? (
        <Loading text={authenticating ? "正在登录..." : "加载中..."} />
      ) : (
        <View>
          <TabBar
            activeTab={activeTab}
            tabs={tabs}
            onChange={(tab) => setActiveTab(tab as typeof activeTab)}
          />

          {errorMessage ? (
            <View className="empty-state">
              <Text className="empty-title">{errorMessage}</Text>
              <Button className="action-button" onClick={initialize}>
                重新加载
              </Button>
            </View>
          ) : null}

          {activeTab === "appointments" && renderAppointments()}
          {activeTab === "firms" && isAdmin && renderFirmsManagement()}
          {activeTab === "services" && isAdmin && renderServicesManagement()}

          <View className="section" style={{ marginBottom: "48px" }}>
            <Button className="reset-btn" onClick={handleLogout}>
              退出当前登录
            </Button>
          </View>
        </View>
      )}

      {showLoginForm && (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onClose={handleLoginClose}
          closable={false}
        />
      )}
    </ScrollView>
  );
}
