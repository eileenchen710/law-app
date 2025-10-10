import { View, Text, Input, Textarea, Button, Switch } from '@tarojs/components';
import { useState } from 'react';
import './FirmEditForm.scss';

interface FirmFormData {
  name: string;
  description: string;
  price: string;
  servicesText: string;
  rating: string;
  cases: string;
  recommended: boolean;
}

interface FirmEditFormProps {
  formData: FirmFormData;
  isEditing: boolean;
  onSave: (data: FirmFormData) => void;
  onCancel: () => void;
}

export default function FirmEditForm({ formData, isEditing, onSave, onCancel }: FirmEditFormProps) {
  const [form, setForm] = useState<FirmFormData>(formData);

  const handleSubmit = () => {
    if (!form.name.trim()) {
      return;
    }
    onSave(form);
  };

  return (
    <View className="firm-edit-overlay">
      <View className="edit-form-container">
        <View className="form-header">
          <Text className="form-title">
            {isEditing ? '编辑律所' : '新增律所'}
          </Text>
          <Button className="close-btn" onClick={onCancel}>
            ×
          </Button>
        </View>

        <View className="form-body">
          <View className="form-group">
            <Text className="form-label">律所名称 *</Text>
            <Input
              className="form-input"
              placeholder="请输入律所名称"
              value={form.name}
              onInput={(e) => setForm({ ...form, name: e.detail.value })}
            />
          </View>

          <View className="form-group">
            <Text className="form-label">律所简介 *</Text>
            <Textarea
              className="form-textarea"
              placeholder="请输入律所简介"
              value={form.description}
              onInput={(e) => setForm({ ...form, description: e.detail.value })}
            />
          </View>

          <View className="form-group">
            <Text className="form-label">收费标准</Text>
            <Input
              className="form-input"
              placeholder="例如：500-2000元/小时"
              value={form.price}
              onInput={(e) => setForm({ ...form, price: e.detail.value })}
            />
          </View>

          <View className="form-group">
            <Text className="form-label">提供的服务</Text>
            <Textarea
              className="form-textarea"
              placeholder="每行一个服务项目"
              value={form.servicesText}
              onInput={(e) => setForm({ ...form, servicesText: e.detail.value })}
            />
          </View>

          <View className="form-row">
            <View className="form-group half">
              <Text className="form-label">评分</Text>
              <Input
                className="form-input"
                type="digit"
                placeholder="0-5"
                value={form.rating}
                onInput={(e) => setForm({ ...form, rating: e.detail.value })}
              />
            </View>

            <View className="form-group half">
              <Text className="form-label">案例数量</Text>
              <Input
                className="form-input"
                type="number"
                placeholder="案例数"
                value={form.cases}
                onInput={(e) => setForm({ ...form, cases: e.detail.value })}
              />
            </View>
          </View>

          <View className="form-group">
            <View className="switch-row">
              <Text className="form-label">推荐律所</Text>
              <Switch
                checked={form.recommended}
                onChange={(e) => setForm({ ...form, recommended: e.detail.value })}
              />
            </View>
          </View>
        </View>

        <View className="form-actions">
          <Button className="cancel-btn" onClick={onCancel}>
            取消
          </Button>
          <Button className="submit-btn" onClick={handleSubmit}>
            {isEditing ? '保存' : '创建'}
          </Button>
        </View>
      </View>
    </View>
  );
}
