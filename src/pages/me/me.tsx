import {
  Button,
  Input,
  ScrollView,
  Text,
  View,
} from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./me.scss";
import Loading from "../../components/Loading";
import type { ApiError } from "../../services/http";
import type {
  AppointmentSummary,
  AuthResponse,
  UserProfile,
} from "../../services/types";
import {
  fetchCurrentUser,
  loginAnonymously,
  loginWithWechat,
  updateCurrentUser,
} from "../../services/api";

interface ProfileFormState {
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string;
}

const createEmptyProfileForm = (user?: UserProfile | null): ProfileFormState => ({
  displayName: user?.displayName || "",
  email: user?.email || "",
  phone: user?.phone || "",
  avatarUrl: user?.avatarUrl || "",
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

const getStoredProfileDraft = (): ProfileFormState | null => {
  try {
    const raw = Taro.getStorageSync("profile_form_draft");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    console.warn("Failed to deserialize profile draft", error);
  }
  return null;
};

const persistProfileDraft = (draft: ProfileFormState) => {
  try {
    Taro.setStorageSync("profile_form_draft", JSON.stringify(draft));
  } catch (error) {
    console.warn("Failed to persist profile draft", error);
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
  const [profileForm, setProfileForm] = useState<ProfileFormState>(
    createEmptyProfileForm()
  );
  const [activeTab, setActiveTab] = useState<"profile" | "appointments" | "admin">(
    "profile"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useLoad(() => {
    console.log("Me page loaded.");
  });

  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  useEffect(() => {
    setActiveTab(isAdmin ? "admin" : "profile");
  }, [isAdmin]);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await fetchCurrentUser();
      setUser(response.user);
      setAppointments(response.appointments || []);
      setProfileForm(createEmptyProfileForm(response.user));
      persistProfileDraft(createEmptyProfileForm(response.user));
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

  const performWechatLogin = useCallback(async (withUserInfo = false): Promise<AuthResponse | null> => {
    try {
      setAuthenticating(true);
      const loginRes = await Taro.login();
      if (!loginRes.code) {
        throw new Error("未获取到微信登录凭证");
      }

      let userProfile: Record<string, unknown> | undefined;

      // 只有在用户点击按钮时才尝试获取 getUserProfile
      if (withUserInfo) {
        try {
          const profile = await Taro.getUserProfile({
            desc: "用于完善个人资料",
          });
          userProfile = profile?.userInfo;
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
    try {
      setAuthenticating(true);
      const draft = getStoredProfileDraft();
      const authRes = await loginAnonymously({
        email: draft?.email,
        phone: draft?.phone,
        name: draft?.displayName,
        avatarUrl: draft?.avatarUrl,
      });
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

  const handleProfileChange = (field: keyof ProfileFormState) => (event: any) => {
    const value = event?.detail?.value ?? "";
    setProfileForm((prev) => {
      const next = { ...prev, [field]: value };
      persistProfileDraft(next);
      return next;
    });
  };

  const handleProfileSave = async () => {
    try {
      setLoading(true);
      await updateCurrentUser({
        displayName: profileForm.displayName,
        email: profileForm.email,
        phone: profileForm.phone,
        avatarUrl: profileForm.avatarUrl,
      });
      await refreshProfile();
      Taro.showToast({ title: "保存成功", icon: "success" }).catch(() => undefined);
    } catch (error) {
      console.error("Failed to save profile", error);
      const apiError = error as ApiError;
      Taro.showToast({
        title: apiError?.message || "保存失败",
        icon: "none",
      }).catch(() => undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    clearAuthToken();
    setUser(null);
    setAppointments([]);
    await initialize();
  };

  const handleGetUserProfile = async () => {
    if (!isWeappEnv()) {
      return;
    }

    try {
      setAuthenticating(true);

      // 直接调用 getUserProfile
      const profile = await Taro.getUserProfile({
        desc: "用于完善个人资料",
      });

      console.log("获取到的微信用户信息:", profile.userInfo);

      // 获取到用户信息后，重新登录并更新
      const loginRes = await Taro.login();
      if (!loginRes.code) {
        throw new Error("未获取到微信登录凭证");
      }

      const authRes = await loginWithWechat({
        code: loginRes.code,
        userInfo: profile.userInfo,
      });

      storeAuthToken(authRes.token);

      Taro.showToast({
        title: `更新成功！欢迎 ${authRes.user?.displayName || "用户"}`,
        icon: "success"
      }).catch(() => undefined);

      // 刷新用户信息
      await refreshProfile();

    } catch (error) {
      console.error("获取用户信息失败", error);
      const message = (error as Error).message || "授权失败";
      Taro.showToast({ title: message, icon: "none" }).catch(() => undefined);
    } finally {
      setAuthenticating(false);
    }
  };

  const goToAdminPanel = () => {
    Taro.navigateTo({ url: "/pages/admin/firms/firms" }).catch(() => {
      Taro.switchTab({ url: "/pages/index/index" }).catch(() => undefined);
    });
  };

  const goToHome = () => {
    Taro.switchTab({ url: "/pages/index/index" }).catch(() => undefined);
  };

  const renderProfileSection = () => (
    <View className="section">
      <View className="section-header">
        <Text className="section-title">个人资料</Text>
        <Text className="section-desc">
          管理您的基础信息，我们会根据这些信息为您提供个性化服务。
        </Text>
      </View>

      {isWeappEnv() && !user?.displayName && (
        <View className="action-card" style={{ marginBottom: "18px" }}>
          <View className="action-texts">
            <Text className="action-title">完善个人资料</Text>
            <Text className="action-desc">
              点击下方按钮，授权获取微信头像与昵称。
            </Text>
          </View>
          <Button
            className="action-button"
            onClick={handleGetUserProfile}
            loading={authenticating}
            disabled={authenticating}
          >
            授权获取微信信息
          </Button>
        </View>
      )}

      <View className="form-card">
        <View className="form-row">
          <View className="form-field">
            <Text className="form-label">昵称</Text>
            <Input
              className="form-input"
              value={profileForm.displayName}
              placeholder="请输入您的称呼"
              onInput={handleProfileChange("displayName")}
            />
          </View>
        </View>

        <View className="form-row inline">
          <View className="form-field">
            <Text className="form-label">邮箱</Text>
            <Input
              className="form-input"
              value={profileForm.email}
              placeholder="用于接收通知"
              onInput={handleProfileChange("email")}
            />
          </View>
          <View className="form-field">
            <Text className="form-label">手机号</Text>
            <Input
              className="form-input"
              value={profileForm.phone}
              placeholder="用于预约联系"
              onInput={handleProfileChange("phone")}
            />
          </View>
        </View>

        <View className="form-row">
          <View className="form-field">
            <Text className="form-label">头像地址</Text>
            <Input
              className="form-input"
              value={profileForm.avatarUrl}
              placeholder="可选，自定义头像 URL"
              onInput={handleProfileChange("avatarUrl")}
            />
          </View>
        </View>

        <Button className="submit-btn" onClick={handleProfileSave}>
          保存资料
        </Button>
      </View>
    </View>
  );

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
                  {item.firm_name || item.firmId || "-"}
                </Text>
                <Text className="appointment-field">
                  <Text className="appointment-label">备注：</Text>
                  {item.remark || "无"}
                </Text>
              </View>
              <View className="appointment-footer">
                <Text className="appointment-meta">
                  提交时间：{formatDateTime(item.created_at || item.createdAt)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderAdminPanel = () => (
    <View className="section">
      <View className="section-header">
        <Text className="section-title">管理后台</Text>
        <Text className="section-desc">
          您具备管理员权限，可以管理律所、服务与预约信息。
        </Text>
      </View>

      <View className="action-card">
        <View className="action-texts">
          <Text className="action-title">进入律所与服务管理</Text>
          <Text className="action-desc">
            审核、更新合作律所及服务项目，查看预约详情。
          </Text>
        </View>
        <Button className="action-button" onClick={goToAdminPanel}>
          打开管理后台
        </Button>
      </View>
    </View>
  );

  return (
    <ScrollView className="me-page" scrollY>
      {(loading || authenticating) && !user ? (
        <Loading text={authenticating ? "正在登录..." : "加载中..."} />
      ) : (
        <View>
          <View className="tab-bar">
            <View
              className={`tab-item ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <Text className="tab-label">个人资料</Text>
            </View>
            <View
              className={`tab-item ${
                activeTab === "appointments" ? "active" : ""
              }`}
              onClick={() => setActiveTab("appointments")}
            >
              <Text className="tab-label">我的预约</Text>
            </View>
            {isAdmin && (
              <View
                className={`tab-item ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => setActiveTab("admin")}
              >
                <Text className="tab-label">管理后台</Text>
              </View>
            )}
          </View>

          {errorMessage ? (
            <View className="empty-state">
              <Text className="empty-title">{errorMessage}</Text>
              <Button className="action-button" onClick={initialize}>
                重新加载
              </Button>
            </View>
          ) : null}

          {activeTab === "profile" && renderProfileSection()}
          {activeTab === "appointments" && renderAppointments()}
          {activeTab === "admin" && isAdmin && renderAdminPanel()}

          <View className="section" style={{ marginBottom: "48px" }}>
            <Button className="reset-btn" onClick={handleLogout}>
              退出当前登录
            </Button>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
