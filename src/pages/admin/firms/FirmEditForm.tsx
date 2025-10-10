import { View, Text, Input, Textarea, Button } from '@tarojs/components';
import { useState } from 'react';
import './FirmEditForm.scss';

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

interface FirmEditFormProps {
  firm: Firm;
  isCreating: boolean;
  onSave: (firm: Firm) => void;
  onCancel: () => void;
}

export default function FirmEditForm({ firm, isCreating, onSave, onCancel }: FirmEditFormProps) {
  const [formData, setFormData] = useState<Firm>(firm);
  const [practiceAreaInput, setPracticeAreaInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = () => {
    // 验证必填字段
    if (!formData.name || !formData.city || !formData.address || !formData.description) {
      return;
    }
    onSave(formData);
  };

  const handleAddPracticeArea = () => {
    if (!practiceAreaInput.trim()) return;
    setFormData({
      ...formData,
      practiceAreas: [...(formData.practiceAreas || []), practiceAreaInput.trim()],
    });
    setPracticeAreaInput('');
  };

  const handleRemovePracticeArea = (index: number) => {
    setFormData({
      ...formData,
      practiceAreas: formData.practiceAreas?.filter((_, i) => i !== index) || [],
    });
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    setFormData({
      ...formData,
      tags: [...(formData.tags || []), tagInput.trim()],
    });
    setTagInput('');
  };

  const handleRemoveTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((_, i) => i !== index) || [],
    });
  };

  return (
    <View className="firm-edit-form">
      <View className="form-header">
        <Text className="form-title">
          {isCreating ? '新增律所' : '编辑律所'}
        </Text>
        <Button className="close-btn" onClick={onCancel}>
          ×
        </Button>
      </View>

      <View className="form-body">
        <View className="form-group">
          <Text className="form-label">
            律所名称 <Text className="required">*</Text>
          </Text>
          <Input
            className="form-input"
            placeholder="请输入律所名称"
            value={formData.name}
            onInput={(e) => setFormData({ ...formData, name: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">
            所在城市 <Text className="required">*</Text>
          </Text>
          <Input
            className="form-input"
            placeholder="请输入所在城市"
            value={formData.city}
            onInput={(e) => setFormData({ ...formData, city: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">
            地址 <Text className="required">*</Text>
          </Text>
          <Input
            className="form-input"
            placeholder="请输入详细地址"
            value={formData.address}
            onInput={(e) => setFormData({ ...formData, address: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">
            简介 <Text className="required">*</Text>
          </Text>
          <Textarea
            className="form-textarea"
            placeholder="请输入律所简介"
            value={formData.description}
            onInput={(e) => setFormData({ ...formData, description: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">联系电话</Text>
          <Input
            className="form-input"
            placeholder="请输入联系电话"
            value={formData.phone}
            onInput={(e) => setFormData({ ...formData, phone: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">邮箱</Text>
          <Input
            className="form-input"
            placeholder="请输入邮箱"
            value={formData.email}
            onInput={(e) => setFormData({ ...formData, email: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">网站</Text>
          <Input
            className="form-input"
            placeholder="请输入网站地址"
            value={formData.website}
            onInput={(e) => setFormData({ ...formData, website: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">业务领域</Text>
          <View className="input-with-button">
            <Input
              className="form-input flex-1"
              placeholder="请输入业务领域"
              value={practiceAreaInput}
              onInput={(e) => setPracticeAreaInput(e.detail.value)}
            />
            <Button className="add-btn" onClick={handleAddPracticeArea}>
              添加
            </Button>
          </View>
          <View className="tags-list">
            {formData.practiceAreas?.map((area, index) => (
              <View key={index} className="tag-item">
                <Text>{area}</Text>
                <Text
                  className="remove-icon"
                  onClick={() => handleRemovePracticeArea(index)}
                >
                  ×
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="form-group">
          <Text className="form-label">标签</Text>
          <View className="input-with-button">
            <Input
              className="form-input flex-1"
              placeholder="请输入标签"
              value={tagInput}
              onInput={(e) => setTagInput(e.detail.value)}
            />
            <Button className="add-btn" onClick={handleAddTag}>
              添加
            </Button>
          </View>
          <View className="tags-list">
            {formData.tags?.map((tag, index) => (
              <View key={index} className="tag-item">
                <Text>{tag}</Text>
                <Text
                  className="remove-icon"
                  onClick={() => handleRemoveTag(index)}
                >
                  ×
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="form-actions">
          <Button className="cancel-btn" onClick={onCancel}>
            取消
          </Button>
          <Button className="submit-btn" onClick={handleSubmit}>
            保存
          </Button>
        </View>
      </View>
    </View>
  );
}
