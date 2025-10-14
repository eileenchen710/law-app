import {
  Button,
  Input,
  Picker,
  ScrollView,
  Switch,
  Text,
  Textarea,
  View,
} from "@tarojs/components";
import Taro, { useLoad, useDidShow } from "@tarojs/taro";
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
import { apiClient } from "../../services/apiClient";
import { adaptFirmFromApi, adaptServiceFromApi } from "../../services/dataAdapter";

interface FirmFormState {
  name: string;
  slug: string;
  description: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  price: string;
  servicesText: string;
  practiceAreasText: string;
  tagsText: string;
  lawyersText: string;
  rating: string;
  cases: string;
  recommended: boolean;
  contactEmail: string;
  contactPhone: string;
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
  slug: "",
  description: "",
  city: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  price: "",
  servicesText: "",
  practiceAreasText: "",
  tagsText: "",
  lawyersText: "",
  rating: "",
  cases: "",
  recommended: false,
  contactEmail: "",
  contactPhone: "",
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
  const [allAppointments, setAllAppointments] = useState<AppointmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "appointments" | "all-appointments" | "firms" | "services"
  >("appointments");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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

  // 页面每次显示时刷新数据
  useDidShow(() => {
    console.log("Me page shown, refreshing profile data...");
    // 如果已经初始化过且有token，则刷新数据
    const token = (() => {
      try {
        return Taro.getStorageSync("auth_token");
      } catch (error) {
        return "";
      }
    })();

    if (token && !loading) {
      refreshProfile().catch((error) => {
        console.error("Failed to refresh profile on page show", error);
      });
      // refreshProfile会触发user更新，useEffect会自动加载所有预约
    }
  });

  const isAdmin = useMemo(() => {
    const admin = user?.role === "admin";
    console.log("[ME PAGE] isAdmin check:", {
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      roleType: typeof user?.role,
      isAdmin: admin,
      fullUser: JSON.stringify(user)
    });
    return admin;
  }, [user]);

  const tabs = useMemo<TabItem<typeof activeTab>[]>(
    () => {
      const tabsArray = [
        { key: "appointments", label: "我的预约", visible: true },
        { key: "all-appointments", label: "预约管理", visible: isAdmin },
        { key: "firms", label: "律所管理", visible: isAdmin },
        { key: "services", label: "服务管理", visible: isAdmin },
      ];
      console.log("[ME PAGE] Tabs generated:", tabsArray, "isAdmin:", isAdmin);
      return tabsArray;
    },
    [isAdmin]
  );

  // 加载律所和服务数据（管理员功能）
  // 加载律所和服务数据（仅管理员）
  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const [firmsRes, servicesRes] = await Promise.all([
        apiClient.getFirms(),
        apiClient.getServices(),
      ]);

      const firms = (firmsRes.items || firmsRes.data || []).map(adaptFirmFromApi);
      const services = (servicesRes.items || servicesRes.data || []).map(adaptServiceFromApi);

      setLawFirms(firms);
      setLegalServices(services);

      // 更新服务表单的默认律所ID
      setServiceForm((prev) => {
        if (firms.length === 0) {
          return { ...prev, lawFirmId: "" };
        }
        if (prev.lawFirmId) {
          const exists = firms.some((f) => f.id === prev.lawFirmId);
          if (exists) return prev;
        }
        return { ...prev, lawFirmId: firms[0].id };
      });
    } catch (error) {
      console.error("Failed to load admin data:", error);
      Taro.showToast({ title: "加载数据失败", icon: "none" });
    }
  }, [isAdmin]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // 加载所有预约（仅管理员）
  const loadAllAppointments = useCallback(async () => {
    // 不在这里检查isAdmin，让调用方决定是否调用
    try {
      const response = await apiClient.getAllAppointments();
      const items = response.items || [];
      setAllAppointments(items);
      console.log('[ME PAGE] Loaded all appointments:', items.length);
      console.log('[ME PAGE] Sample appointment:', items[0]);
    } catch (error) {
      console.error("Failed to load all appointments:", error);
      const apiError = error as any;
      console.error("API Error details:", apiError.message, apiError.data);
      Taro.showToast({ title: "加载预约失败", icon: "none" });
    }
  }, []);

  // 当用户信息更新且用户是管理员时，加载所有预约
  useEffect(() => {
    if (user && isAdmin && !loading) {
      console.log('[ME PAGE] User is admin, loading all appointments');
      loadAllAppointments();
    }
  }, [user, isAdmin, loading, loadAllAppointments]);

  // 取消预约
  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await Taro.showModal({
        title: "确认取消",
        content: "确定要取消这个预约吗？",
        confirmText: "确定",
        cancelText: "不取消"
      });
    } catch (error) {
      // 用户点击了取消
      return;
    }

    try {
      setCancellingId(appointmentId);
      await apiClient.cancelAppointment(appointmentId);

      Taro.showToast({ title: "预约已取消", icon: "success" });

      // 刷新预约列表
      await refreshProfile();

      // 如果是管理员，也刷新所有预约列表
      if (isAdmin) {
        await loadAllAppointments();
      }
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      Taro.showToast({ title: "取消失败，请重试", icon: "none" });
    } finally {
      setCancellingId(null);
    }
  };

  const refreshProfile = useCallback(async () => {
    try {
      const response = await fetchCurrentUser();
      console.log("Current user data:", response.user);
      console.log("User role:", response.user?.role);
      console.log("Is admin?", response.user?.role === "admin");
      console.log("Full user object:", JSON.stringify(response.user));
      console.log("User object keys:", response.user ? Object.keys(response.user) : 'null');

      // 添加预约记录的详细日志
      console.log("=== Appointments Debug ===");
      console.log("Number of appointments returned:", response.appointments?.length || 0);
      console.log("User ID:", response.user?.id);
      console.log("User provider:", response.user?.provider);

      if (response.appointments && response.appointments.length > 0) {
        console.log("All appointments:", JSON.stringify(response.appointments, null, 2));
        response.appointments.forEach((apt, index) => {
          console.log(`Appointment ${index + 1}:`, {
            id: apt.id,
            user_id: (apt as any).user_id,
            service_name: apt.service_name,
            status: apt.status,
            created_at: apt.created_at
          });
        });
      } else {
        console.log("No appointments returned from API");
      }
      console.log("=== End Appointments Debug ===");

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
          userProfile = profile?.userInfo as unknown as Record<string, unknown>;
          console.log("获取到的微信用户信息:", userProfile);
          console.log("微信用户信息字段:", userProfile ? Object.keys(userProfile) : 'null');
          console.log("nickName:", userProfile?.nickName, "avatarUrl:", userProfile?.avatarUrl);
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

      console.log("微信登录API响应:", authRes);

      if (!authRes?.token) {
        throw new Error("登录响应中缺少 token");
      }

      if (!authRes?.user) {
        throw new Error("登录响应中缺少用户信息");
      }

      storeAuthToken(authRes.token);
      console.log("微信登录成功:", {
        userId: authRes.user.id,
        displayName: authRes.user.displayName,
        role: authRes.user.role,
        provider: authRes.user.provider
      });

      if (userProfile) {
        Taro.showToast({
          title: `登录成功！欢迎 ${authRes.user?.displayName || "用户"}`,
          icon: "success"
        }).catch(() => undefined);
      }

      return authRes;
    } catch (error) {
      console.error("WeChat login failed", error);

      // 获取详细的错误信息
      let message = "微信登录失败";
      if (error && typeof error === 'object') {
        const apiError = error as any;
        message = apiError.message || apiError.error || apiError.details || message;

        // 记录完整的错误对象以便调试
        console.error("完整错误对象:", JSON.stringify(error, null, 2));
      }

      Taro.showToast({
        title: message.length > 30 ? message.substring(0, 30) + "..." : message,
        icon: "none",
        duration: 3000
      }).catch(() => undefined);

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

    const practiceAreas = firm.practiceAreasText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const tags = firm.tagsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Parse lawyers JSON
    let lawyers: any[] | undefined;
    if (firm.lawyersText.trim()) {
      try {
        const parsed = JSON.parse(firm.lawyersText);
        if (!Array.isArray(parsed)) {
          throw new Error("律师信息必须是数组格式");
        }
        lawyers = parsed;
      } catch (error) {
        Taro.showToast({ title: "律师信息格式错误", icon: "none" });
        return;
      }
    }

    try {
      if (editingFirmId) {
        await apiClient.updateFirm(editingFirmId, {
          name: firm.name.trim(),
          slug: firm.slug.trim() || undefined,
          description: firm.description.trim() || undefined,
          city: firm.city.trim() || undefined,
          address: firm.address.trim() || undefined,
          phone: firm.phone.trim() || undefined,
          email: firm.email.trim() || undefined,
          website: firm.website.trim() || undefined,
          price: firm.price.trim() || undefined,
          services: services.length > 0 ? services : undefined,
          practice_areas: practiceAreas.length > 0 ? practiceAreas : undefined,
          tags: tags.length > 0 ? tags : undefined,
          lawyers: lawyers || undefined,
          rating: firm.rating ? parseFloat(firm.rating) : undefined,
          cases: firm.cases ? parseInt(firm.cases, 10) : undefined,
          recommended: firm.recommended,
          contact_email: firm.contactEmail.trim() || undefined,
          contact_phone: firm.contactPhone.trim() || undefined,
        });
        Taro.showToast({ title: "律所已更新", icon: "success" });
      } else {
        const newData = {
          name: firm.name.trim(),
          slug: firm.slug.trim() || undefined,
          description: firm.description.trim() || undefined,
          city: firm.city.trim() || undefined,
          address: firm.address.trim() || undefined,
          phone: firm.phone.trim() || undefined,
          email: firm.email.trim() || undefined,
          website: firm.website.trim() || undefined,
          price: firm.price.trim() || undefined,
          services: services.length > 0 ? services : ["初步咨询"],
          practice_areas: practiceAreas.length > 0 ? practiceAreas : undefined,
          tags: tags.length > 0 ? tags : undefined,
          lawyers: lawyers || undefined,
          rating: firm.rating ? parseFloat(firm.rating) : 4.8,
          cases: firm.cases ? parseInt(firm.cases, 10) : 0,
          recommended: firm.recommended,
          contact_email: firm.contactEmail.trim() || undefined,
          contact_phone: firm.contactPhone.trim() || undefined,
        };
        // 过滤掉 undefined 值
        const filteredData = Object.fromEntries(
          Object.entries(newData).filter(([_, v]) => v !== undefined)
        );
        await apiClient.createFirm(filteredData);
        Taro.showToast({ title: "律所已创建", icon: "success" });
      }

      setFirmForm(createEmptyFirmForm());
      setEditingFirmId(null);
      await loadAdminData(); // 重新加载数据
    } catch (error) {
      console.error("Failed to submit firm:", error);
      Taro.showToast({ title: "操作失败", icon: "none" });
    }
  };

  const handleFirmEdit = (firm: LawFirmMock) => {
    setEditingFirmId(firm.id);
    setFirmForm({
      name: firm.name,
      slug: firm.slug || "",
      description: firm.description || "",
      city: firm.city || "",
      address: firm.address || "",
      phone: firm.phone || "",
      email: firm.email || "",
      website: firm.website || "",
      price: firm.price || "",
      servicesText: firm.services?.join("\n") || "",
      practiceAreasText: firm.practiceAreas?.join("\n") || "",
      tagsText: firm.tags?.join(", ") || "",
      lawyersText: firm.lawyers ? JSON.stringify(firm.lawyers, null, 2) : "",
      rating: firm.rating?.toString() || "",
      cases: firm.cases?.toString() || "",
      recommended: firm.recommended || false,
      contactEmail: firm.contactEmail || "",
      contactPhone: firm.contactPhone || "",
    });
  };

  const handleFirmDelete = async (id: string) => {
    try {
      await apiClient.deleteFirm(id);
      Taro.showToast({ title: "律所已删除", icon: "success" });
      await loadAdminData(); // 重新加载数据
    } catch (error) {
      console.error("Failed to delete firm:", error);
      Taro.showToast({ title: "删除失败", icon: "none" });
    }
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

    try {
      if (editingServiceId) {
        await apiClient.updateService(editingServiceId, {
          title: svc.title.trim(),
          description: svc.description.trim() || undefined,
          category: svc.category || DEFAULT_CATEGORY_ID,
          law_firm_id: svc.lawFirmId,
          price: svc.price.trim() || undefined,
          duration: svc.duration.trim() || undefined,
          lawyer_name: svc.lawyerName.trim() || undefined,
          lawyer_title: svc.lawyerTitle.trim() || undefined,
        });
        Taro.showToast({ title: "服务已更新", icon: "success" });
      } else {
        await apiClient.createService({
          title: svc.title.trim(),
          description: svc.description.trim() || "专业法律服务",
          category: svc.category || DEFAULT_CATEGORY_ID,
          law_firm_id: svc.lawFirmId,
          price: svc.price.trim() || "面议",
          duration: svc.duration.trim() || "1-2小时",
          lawyer_name: svc.lawyerName.trim() || "专业律师",
          lawyer_title: svc.lawyerTitle.trim() || "资深律师",
        });
        Taro.showToast({ title: "服务已创建", icon: "success" });
      }

      setServiceForm(createEmptyServiceForm(svc.lawFirmId));
      setEditingServiceId(null);
      await loadAdminData(); // 重新加载数据
    } catch (error) {
      console.error("Failed to submit service:", error);
      Taro.showToast({ title: "操作失败", icon: "none" });
    }
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
    try {
      await apiClient.deleteService(id);
      Taro.showToast({ title: "服务已删除", icon: "success" });
      await loadAdminData(); // 重新加载数据
    } catch (error) {
      console.error("Failed to delete service:", error);
      Taro.showToast({ title: "删除失败", icon: "none" });
    }
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
                {item.status !== "cancelled" && (
                  <Button
                    className="cancel-btn"
                    size="mini"
                    disabled={cancellingId === item.id}
                    onClick={() => handleCancelAppointment(item.id)}
                  >
                    {cancellingId === item.id ? "取消中..." : "取消预约"}
                  </Button>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderAllAppointments = () => (
    <View className="section">
      <View className="section-header">
        <Text className="section-title">预约管理</Text>
        <Text className="section-desc">
          查看和管理所有用户的预约记录
        </Text>
      </View>

      {allAppointments.length === 0 ? (
        <View className="empty-state">
          <Text className="empty-title">暂无预约记录</Text>
          <Text className="empty-desc">
            还没有用户提交预约申请
          </Text>
        </View>
      ) : (
        <View className="appointment-list">
          {allAppointments.map((item) => (
            <View className="appointment-card" key={item.id}>
              <View className="appointment-header">
                <Text className="appointment-title">{item.service_name || "未指定服务"}</Text>
                <Text className="appointment-status">{item.status || "待确认"}</Text>
              </View>
              <View className="appointment-body">
                <Text className="appointment-field">
                  <Text className="appointment-label">客户姓名：</Text>
                  {item.name}
                </Text>
                <Text className="appointment-field">
                  <Text className="appointment-label">联系电话：</Text>
                  {item.phone}
                </Text>
                <Text className="appointment-field">
                  <Text className="appointment-label">邮箱：</Text>
                  {item.email}
                </Text>
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
                {item.status !== "cancelled" && (
                  <Button
                    className="cancel-btn"
                    size="mini"
                    disabled={cancellingId === item.id}
                    onClick={() => handleCancelAppointment(item.id)}
                  >
                    {cancellingId === item.id ? "取消中..." : "取消预约"}
                  </Button>
                )}
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
          <Text className="form-label">URL友好名称 (slug)</Text>
          <Input
            className="form-input"
            placeholder="例如：huaxia-law-firm"
            value={firmForm.slug}
            onInput={handleFirmInput("slug")}
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
            <Text className="form-label">城市</Text>
            <Input
              className="form-input"
              placeholder="例如：北京"
              value={firmForm.city}
              onInput={handleFirmInput("city")}
            />
          </View>
          <View className="form-field">
            <Text className="form-label">地址</Text>
            <Input
              className="form-input"
              placeholder="详细地址"
              value={firmForm.address}
              onInput={handleFirmInput("address")}
            />
          </View>
        </View>

        <View className="form-row inline">
          <View className="form-field">
            <Text className="form-label">电话</Text>
            <Input
              className="form-input"
              placeholder="+86-10-1234-5678"
              value={firmForm.phone}
              onInput={handleFirmInput("phone")}
            />
          </View>
          <View className="form-field">
            <Text className="form-label">邮箱</Text>
            <Input
              className="form-input"
              placeholder="contact@firm.com"
              value={firmForm.email}
              onInput={handleFirmInput("email")}
            />
          </View>
        </View>

        <View className="form-row">
          <Text className="form-label">网站</Text>
          <Input
            className="form-input"
            placeholder="https://www.firm.com"
            value={firmForm.website}
            onInput={handleFirmInput("website")}
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
          <Text className="form-label">执业领域（一行一项）</Text>
          <Textarea
            className="form-textarea"
            placeholder={`公司治理\n并购重组\n资本市场\n合规管理`}
            value={firmForm.practiceAreasText}
            onInput={handleFirmInput("practiceAreasText")}
          />
        </View>

        <View className="form-row">
          <Text className="form-label">特色标签（逗号分隔）</Text>
          <Input
            className="form-input"
            placeholder="头部律所, 跨境业务, 资本运营"
            value={firmForm.tagsText}
            onInput={handleFirmInput("tagsText")}
          />
        </View>

        <View className="form-row">
          <Text className="form-label">律师团队（JSON格式）</Text>
          <Textarea
            className="form-textarea"
            placeholder={`[\n  {\n    "name": "张律师",\n    "title": "高级合伙人",\n    "phone": "+86-138-0000-1234",\n    "email": "zhang@firm.com",\n    "specialties": ["上市合规", "股权激励"]\n  }\n]`}
            value={firmForm.lawyersText}
            onInput={handleFirmInput("lawyersText")}
            style={{ minHeight: "150px" }}
          />
        </View>

        <View className="form-row inline">
          <View className="form-field">
            <Text className="form-label">联系邮箱</Text>
            <Input
              className="form-input"
              placeholder="example@firm.com"
              value={firmForm.contactEmail}
              onInput={handleFirmInput("contactEmail")}
            />
          </View>
          <View className="form-field">
            <Text className="form-label">联系电话</Text>
            <Input
              className="form-input"
              placeholder="+61 2 1234 5678"
              value={firmForm.contactPhone}
              onInput={handleFirmInput("contactPhone")}
            />
          </View>
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
            <Picker
              mode="selector"
              range={lawFirms}
              rangeKey="name"
              value={lawFirms.findIndex(f => f.id === serviceForm.lawFirmId)}
              onChange={(e) => {
                const index = Number(e.detail.value);
                if (lawFirms[index]) {
                  setServiceForm((prev) => ({ ...prev, lawFirmId: lawFirms[index].id }));
                }
              }}
            >
              <View className="picker-display">
                <Text className="picker-text">
                  {lawFirms.find(f => f.id === serviceForm.lawFirmId)?.name || "请选择律所"}
                </Text>
              </View>
            </Picker>
          </View>
          <View className="form-field">
            <Text className="form-label">服务分类</Text>
            <Picker
              mode="selector"
              range={SERVICE_CATEGORIES}
              rangeKey="name"
              value={SERVICE_CATEGORIES.findIndex(c => c.id === serviceForm.category)}
              onChange={(e) => {
                const index = Number(e.detail.value);
                if (SERVICE_CATEGORIES[index]) {
                  setServiceForm((prev) => ({ ...prev, category: SERVICE_CATEGORIES[index].id }));
                }
              }}
            >
              <View className="picker-display">
                <Text className="picker-text">
                  {SERVICE_CATEGORIES.find(c => c.id === serviceForm.category)?.icon} {SERVICE_CATEGORIES.find(c => c.id === serviceForm.category)?.name || "请选择分类"}
                </Text>
              </View>
            </Picker>
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

  const isDesktop = useMemo(() => {
    try {
      const systemInfo = Taro.getSystemInfoSync();
      return systemInfo.windowWidth >= 768;
    } catch {
      return false;
    }
  }, []);

  return (
    <ScrollView className="me-page" scrollY>
      <AppHeader showActions={false} scrolled={false} />
      {(loading || authenticating) && !user ? (
        <Loading text={authenticating ? "正在登录..." : "加载中..."} />
      ) : (
        <View>
          {/* 移动端显示 TabBar */}
          {!isDesktop && (
            <TabBar
              activeTab={activeTab}
              tabs={tabs}
              onChange={(tab) => setActiveTab(tab as typeof activeTab)}
            />
          )}

          {errorMessage ? (
            <View className="empty-state">
              <Text className="empty-title">{errorMessage}</Text>
              <Button className="action-button" onClick={initialize}>
                重新加载
              </Button>
            </View>
          ) : null}

          {/* 桌面端:卡片式布局 */}
          {isDesktop ? (
            <View className="desktop-card-grid">
              <View className="desktop-card">
                {renderAppointments()}
              </View>
              {isAdmin && (
                <>
                  <View className="desktop-card">
                    {renderAllAppointments()}
                  </View>
                  <View className="desktop-card">
                    {renderFirmsManagement()}
                  </View>
                  <View className="desktop-card">
                    {renderServicesManagement()}
                  </View>
                </>
              )}
            </View>
          ) : (
            /* 移动端:Tab切换布局 */
            <>
              {activeTab === "appointments" && renderAppointments()}
              {activeTab === "all-appointments" && isAdmin && renderAllAppointments()}
              {activeTab === "firms" && isAdmin && renderFirmsManagement()}
              {activeTab === "services" && isAdmin && renderServicesManagement()}
            </>
          )}

          <View className="section" style={{ marginBottom: "48px" }}>
            <Button
              className="action-button"
              onClick={async () => {
                setLoading(true);
                await refreshProfile();
                setLoading(false);
                Taro.showToast({ title: "已刷新用户信息", icon: "success" });
              }}
              style={{ marginBottom: "12px" }}
            >
              刷新用户信息
            </Button>
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
