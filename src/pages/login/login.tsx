import { Button, Form, Input, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState } from "react";
import "./login.scss";
import { loginWithPassword, registerWithPassword } from "../../services/api";
import type { ApiError } from "../../services/http";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    phone: "",
  });

  const handleInputChange = (field: string) => (e: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.detail.value,
    }));
  };

  const storeAuthToken = (token: string) => {
    try {
      Taro.setStorageSync("auth_token", token);
    } catch (error) {
      console.warn("Failed to store auth token", error);
    }
  };

  const handleLogin = async () => {
    if (!formData.username || !formData.password) {
      Taro.showToast({
        title: "请输入用户名和密码",
        icon: "none",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await loginWithPassword({
        username: formData.username,
        password: formData.password,
      });

      storeAuthToken(response.token);

      Taro.showToast({
        title: "登录成功",
        icon: "success",
      });

      setTimeout(() => {
        Taro.switchTab({ url: "/pages/me/me" }).catch(() => undefined);
      }, 1000);
    } catch (error) {
      const apiError = error as ApiError;
      Taro.showToast({
        title: apiError?.message || "登录失败",
        icon: "none",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.username || !formData.password || !formData.email) {
      Taro.showToast({
        title: "请填写完整信息",
        icon: "none",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Taro.showToast({
        title: "两次密码输入不一致",
        icon: "none",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await registerWithPassword({
        username: formData.username,
        password: formData.password,
        email: formData.email,
        phone: formData.phone,
      });

      storeAuthToken(response.token);

      Taro.showToast({
        title: "注册成功",
        icon: "success",
      });

      setTimeout(() => {
        Taro.switchTab({ url: "/pages/me/me" }).catch(() => undefined);
      }, 1000);
    } catch (error) {
      const apiError = error as ApiError;
      Taro.showToast({
        title: apiError?.message || "注册失败",
        icon: "none",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="login-page">
      <View className="login-container">
        <View className="login-header">
          <Text className="login-title">{isLogin ? "用户登录" : "用户注册"}</Text>
          <Text className="login-subtitle">
            {isLogin ? "欢迎回来" : "创建您的账户"}
          </Text>
        </View>

        <View className="login-form">
          <View className="form-item">
            <Text className="form-label">用户名</Text>
            <Input
              className="form-input"
              placeholder="请输入用户名"
              value={formData.username}
              onInput={handleInputChange("username")}
            />
          </View>

          {!isLogin && (
            <View className="form-item">
              <Text className="form-label">邮箱</Text>
              <Input
                className="form-input"
                placeholder="请输入邮箱"
                value={formData.email}
                onInput={handleInputChange("email")}
              />
            </View>
          )}

          {!isLogin && (
            <View className="form-item">
              <Text className="form-label">手机号（可选）</Text>
              <Input
                className="form-input"
                placeholder="请输入手机号"
                value={formData.phone}
                onInput={handleInputChange("phone")}
              />
            </View>
          )}

          <View className="form-item">
            <Text className="form-label">密码</Text>
            <Input
              className="form-input"
              type="password"
              placeholder="请输入密码"
              value={formData.password}
              password
              onInput={handleInputChange("password")}
            />
          </View>

          {!isLogin && (
            <View className="form-item">
              <Text className="form-label">确认密码</Text>
              <Input
                className="form-input"
                type="password"
                placeholder="请再次输入密码"
                value={formData.confirmPassword}
                password
                onInput={handleInputChange("confirmPassword")}
              />
            </View>
          )}

          <Button
            className="submit-button"
            onClick={isLogin ? handleLogin : handleRegister}
            loading={loading}
            disabled={loading}
          >
            {isLogin ? "登录" : "注册"}
          </Button>

          <View className="switch-mode">
            <Text className="switch-text">
              {isLogin ? "还没有账号？" : "已有账号？"}
            </Text>
            <Text
              className="switch-link"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "立即注册" : "立即登录"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
