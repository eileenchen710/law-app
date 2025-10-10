import { View, Text, Button, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import './firms.scss';

interface Firm {
  _id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  phone?: string;
  email?: string;
  website?: string;
  practiceAreas?: string[];
  tags?: string[];
}

interface Service {
  _id: string;
  title: string;
  description: string;
  category: string;
  price?: number;
  firm_ids?: string[];
}

export default function FirmsAdmin() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [firmServices, setFirmServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 加载律所列表
      const firmsRes = await Taro.request({
        url: '/api/admin/firms',
        method: 'GET',
      });

      // 加载服务列表
      const servicesRes = await Taro.request({
        url: '/api/admin/services',
        method: 'GET',
      });

      if (firmsRes.data.success) {
        setFirms(firmsRes.data.data);
      }

      if (servicesRes.data.success) {
        setServices(servicesRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFirm = async (firm: Firm) => {
    setSelectedFirm(firm);

    try {
      // 加载该律所的服务
      const res = await Taro.request({
        url: `/api/admin/firms/${firm._id}/services`,
        method: 'GET',
      });

      if (res.data.success) {
        setFirmServices(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load firm services:', error);
    }
  };

  const handleAddService = async (serviceId: string) => {
    if (!selectedFirm) return;

    try {
      const res = await Taro.request({
        url: `/api/admin/firms/${selectedFirm._id}/services`,
        method: 'POST',
        data: { serviceId },
      });

      if (res.data.success) {
        Taro.showToast({
          title: '添加成功',
          icon: 'success',
        });
        // 重新加载律所服务
        handleSelectFirm(selectedFirm);
      }
    } catch (error) {
      console.error('Failed to add service:', error);
      Taro.showToast({
        title: '添加失败',
        icon: 'none',
      });
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    if (!selectedFirm) return;

    try {
      const res = await Taro.request({
        url: `/api/admin/firms/${selectedFirm._id}/services/${serviceId}`,
        method: 'DELETE',
      });

      if (res.data.success) {
        Taro.showToast({
          title: '移除成功',
          icon: 'success',
        });
        // 重新加载律所服务
        handleSelectFirm(selectedFirm);
      }
    } catch (error) {
      console.error('Failed to remove service:', error);
      Taro.showToast({
        title: '移除失败',
        icon: 'none',
      });
    }
  };

  const handleCreateFirm = () => {
    Taro.navigateTo({
      url: '/pages/admin/firms/edit/edit',
    });
  };

  const handleEditFirm = (firm: Firm) => {
    Taro.navigateTo({
      url: `/pages/admin/firms/edit/edit?id=${firm._id}`,
    });
  };

  const handleDeleteFirm = async (firmId: string) => {
    const res = await Taro.showModal({
      title: '确认删除',
      content: '确定要删除此律所吗？',
    });

    if (!res.confirm) return;

    try {
      const deleteRes = await Taro.request({
        url: `/api/admin/firms/${firmId}`,
        method: 'DELETE',
      });

      if (deleteRes.data.success) {
        Taro.showToast({
          title: '删除成功',
          icon: 'success',
        });
        loadData();
        setSelectedFirm(null);
      }
    } catch (error) {
      console.error('Failed to delete firm:', error);
      Taro.showToast({
        title: '删除失败',
        icon: 'none',
      });
    }
  };

  // 获取未添加的服务列表
  const availableServices = services.filter(
    service => !firmServices.some(fs => fs._id === service._id)
  );

  if (loading) {
    return (
      <View className="admin-firms">
        <Text className="loading">加载中...</Text>
      </View>
    );
  }

  return (
    <View className="admin-firms">
      <View className="admin-header">
        <Text className="admin-title">律所管理</Text>
        <Button className="create-btn" onClick={handleCreateFirm}>
          新建律所
        </Button>
      </View>

      <View className="admin-content">
        {/* 左侧律所列表 */}
        <ScrollView className="firms-list" scrollY>
          {firms.map(firm => (
            <View
              key={firm._id}
              className={`firm-item ${selectedFirm?._id === firm._id ? 'active' : ''}`}
              onClick={() => handleSelectFirm(firm)}
            >
              <View className="firm-info">
                <Text className="firm-name">{firm.name}</Text>
                <Text className="firm-city">{firm.city}</Text>
              </View>
              <View className="firm-actions">
                <Button
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditFirm(firm);
                  }}
                >
                  编辑
                </Button>
                <Button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFirm(firm._id);
                  }}
                >
                  删除
                </Button>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* 右侧服务管理 */}
        {selectedFirm && (
          <View className="services-management">
            <Text className="section-title">
              {selectedFirm.name} - 服务管理
            </Text>

            {/* 已添加的服务 */}
            <View className="services-section">
              <Text className="services-label">已添加的服务</Text>
              <ScrollView className="services-list" scrollY>
                {firmServices.length === 0 ? (
                  <Text className="empty-text">暂无服务</Text>
                ) : (
                  firmServices.map(service => (
                    <View key={service._id} className="service-item">
                      <View className="service-info">
                        <Text className="service-title">{service.title}</Text>
                        <Text className="service-category">{service.category}</Text>
                      </View>
                      <Button
                        className="remove-btn"
                        onClick={() => handleRemoveService(service._id)}
                      >
                        移除
                      </Button>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            {/* 可添加的服务 */}
            <View className="services-section">
              <Text className="services-label">可添加的服务</Text>
              <ScrollView className="services-list" scrollY>
                {availableServices.length === 0 ? (
                  <Text className="empty-text">无可添加的服务</Text>
                ) : (
                  availableServices.map(service => (
                    <View key={service._id} className="service-item">
                      <View className="service-info">
                        <Text className="service-title">{service.title}</Text>
                        <Text className="service-category">{service.category}</Text>
                      </View>
                      <Button
                        className="add-btn"
                        onClick={() => handleAddService(service._id)}
                      >
                        添加
                      </Button>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
