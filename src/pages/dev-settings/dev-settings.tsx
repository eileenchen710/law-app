import { Button, Switch, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState, useEffect } from "react";
import "./dev-settings.scss";
import {
  getTerminologyMode,
  setTerminologyMode,
  type TerminologyMode,
} from "../../utils/terminology";

// 检测是否为 H5 环境
const isH5 = process.env.TARO_ENV === "h5";

export default function DevSettings() {
  const [mode, setMode] = useState<TerminologyMode>("financial");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // 初始化时读取当前模式
    setMode(getTerminologyMode());
  }, []);

  const handleModeChange = (checked: boolean) => {
    const newMode: TerminologyMode = checked ? "legal" : "financial";
    setMode(newMode);
    setTerminologyMode(newMode);
    setSaved(true);

    // 显示保存成功提示
    Taro.showToast({
      title: `已切换到${checked ? "法律" : "财务"}模式`,
      icon: "success",
      duration: 1500,
    });

    // 2秒后刷新页面以应用新设置
    setTimeout(() => {
      if (isH5) {
        window.location.reload();
      } else {
        Taro.reLaunch({ url: "/pages/index/index" });
      }
    }, 1500);
  };

  const handleBack = () => {
    Taro.navigateBack().catch(() => {
      Taro.switchTab({ url: "/pages/index/index" });
    });
  };

  // 小程序端显示空白页面
  if (!isH5) {
    return (
      <View className="dev-settings-page not-available">
        <Text className="not-available-text">此页面仅在 H5 端可用</Text>
        <Button className="back-btn" onClick={handleBack}>
          返回首页
        </Button>
      </View>
    );
  }

  return (
    <View className="dev-settings-page">
      <View className="settings-header">
        <Text className="header-title">开发者设置</Text>
        <Text className="header-desc">此页面仅供内部测试使用</Text>
      </View>

      <View className="settings-section">
        <Text className="section-title">术语模式</Text>

        <View className="setting-item">
          <View className="setting-info">
            <Text className="setting-label">使用术语</Text>
            <Text className="setting-desc">
              {mode === "legal"
                ? "当前显示: xx服务"
                : "当前显示：商家、专业财会、财务服务"}
            </Text>
          </View>
          <Switch
            checked={mode === "legal"}
            onChange={(e) => handleModeChange(e.detail.value)}
            color="#d4a574"
          />
        </View>

        <View className="mode-preview">
          <Text className="preview-title">当前模式预览：</Text>
          <View className="preview-items">
            <View className="preview-item">
              <Text className="preview-label">机构名称：</Text>
              <Text className="preview-value">
                {mode === "legal" ? "律所" : "商家"}
              </Text>
            </View>
            <View className="preview-item">
              <Text className="preview-label">专业人员：</Text>
              <Text className="preview-value">
                {mode === "legal" ? "律师" : "专业财会"}
              </Text>
            </View>
            <View className="preview-item">
              <Text className="preview-label">服务类型：</Text>
              <Text className="preview-value">
                {mode === "legal" ? "法律服务" : "财务服务"}
              </Text>
            </View>
          </View>
        </View>

        {saved && (
          <View className="save-notice">
            <Text className="notice-text">设置已保存，页面即将刷新...</Text>
          </View>
        )}
      </View>

      <View className="settings-footer">
        <Button className="back-btn" onClick={handleBack}>
          返回
        </Button>
      </View>
    </View>
  );
}
