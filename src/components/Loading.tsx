import { View, Text } from "@tarojs/components";
import "./Loading.scss";

interface LoadingProps {
  text?: string;
  size?: "small" | "medium" | "large";
  fullscreen?: boolean;
}

export default function Loading({
  text = "加载中...",
  size = "medium",
  fullscreen = false,
}: LoadingProps) {
  return (
    <View className={`loading-container ${fullscreen ? "fullscreen" : ""}`}>
      <View className="loading-content">
        <View className={`loading-spinner ${size}`}>
          <View className="spinner-ring"></View>
          <View className="spinner-ring"></View>
          <View className="spinner-ring"></View>
        </View>
        {text && <Text className="loading-text">{text}</Text>}
      </View>
    </View>
  );
}
