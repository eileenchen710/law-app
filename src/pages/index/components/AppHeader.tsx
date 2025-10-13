import { View, Text, Image, Button } from "@tarojs/components";
import { useState } from "react";
import logo from "../../../assets/logo.png";
import "./AppHeader.scss";

interface MenuItem {
  label: string;
  onClick: () => void;
}

interface AppHeaderProps {
  scrolled?: boolean;
  showActions?: boolean;
  onConsultClick?: () => void;
  menuItems?: MenuItem[];
}

export default function AppHeader({
  scrolled = false,
  showActions = true,
  onConsultClick,
  menuItems = [],
}: AppHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMenuItemClick = (onClick: () => void) => {
    onClick();
    setMobileMenuOpen(false);
  };

  return (
    <>
      <View
        className={`app-header${
          scrolled ? " scrolled" : ""
        }`}
      >
        <View className="app-header-container">
          <View className="app-header-logo">
            <Image src={logo} className="logo-image" mode="aspectFit" />
            <Text className="logo-text metallic-gradient-text">法律服务</Text>
            {menuItems.length > 0 && (
              <View
                className="mobile-menu-toggle"
                onClick={handleMobileMenuToggle}
              >
                <View className="bar" />
                <View className="bar" />
                <View className="bar" />
              </View>
            )}
          </View>
          {menuItems.length > 0 && (
            <View className="app-header-menu">
              {menuItems.map((item, idx) => (
                <Text key={idx} className="menu-item" onClick={item.onClick}>
                  {item.label}
                </Text>
              ))}
            </View>
          )}
          {showActions && (
            <View className="app-header-actions">
              <Button
                className="consult-btn primary-btn"
                onClick={onConsultClick}
              >
                立即咨询
              </Button>
            </View>
          )}
        </View>
      </View>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && menuItems.length > 0 && (
        <>
          <View
            className="mobile-menu-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <View className="mobile-menu">
            <View className="mobile-menu-content">
              {menuItems.map((item, idx) => (
                <Text
                  key={idx}
                  className="mobile-menu-item"
                  onClick={() => handleMenuItemClick(item.onClick)}
                >
                  {item.label}
                </Text>
              ))}
              {showActions && onConsultClick && (
                <Button
                  className="mobile-consult-btn"
                  onClick={() => {
                    onConsultClick();
                    setMobileMenuOpen(false);
                  }}
                >
                  立即咨询
                </Button>
              )}
            </View>
          </View>
        </>
      )}
    </>
  );
}
