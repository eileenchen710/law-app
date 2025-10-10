import { View, Text, Input, Textarea, Button } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import './edit.scss';

interface FirmForm {
  name: string;
  city: string;
  address: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  practiceAreas: string[];
  tags: string[];
}

export default function FirmEdit() {
  const router = useRouter();
  const firmId = router.params.id;
  const isEdit = !!firmId;

  const [form, setForm] = useState<FirmForm>({
    name: '',
    city: '',
    address: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    practiceAreas: [],
    tags: [],
  });

  const [loading, setLoading] = useState(false);
  const [practiceAreaInput, setPracticeAreaInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (isEdit) {
      loadFirm();
    }
  }, []);

  const loadFirm = async () => {
    try {
      const res = await Taro.request({
        url: `/api/v1/firms/${firmId}`,
        method: 'GET',
      });

      if (res.data.success) {
        setForm(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load firm:', error);
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  };

  const handleSubmit = async () => {
    // 验证必填字段
    if (!form.name || !form.city || !form.address || !form.description) {
      Taro.showToast({
        title: '请填写必填字段',
        icon: 'none',
      });
      return;
    }

    try {
      setLoading(true);

      const url = isEdit
        ? `/api/admin/firms/${firmId}`
        : '/api/admin/firms';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await Taro.request({
        url,
        method,
        data: form,
      });

      if (res.data.success) {
        Taro.showToast({
          title: isEdit ? '更新成功' : '创建成功',
          icon: 'success',
        });

        setTimeout(() => {
          Taro.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to save firm:', error);
      Taro.showToast({
        title: '保存失败',
        icon: 'none',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPracticeArea = () => {
    if (!practiceAreaInput.trim()) return;

    setForm({
      ...form,
      practiceAreas: [...form.practiceAreas, practiceAreaInput.trim()],
    });
    setPracticeAreaInput('');
  };

  const handleRemovePracticeArea = (index: number) => {
    setForm({
      ...form,
      practiceAreas: form.practiceAreas.filter((_, i) => i !== index),
    });
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;

    setForm({
      ...form,
      tags: [...form.tags, tagInput.trim()],
    });
    setTagInput('');
  };

  const handleRemoveTag = (index: number) => {
    setForm({
      ...form,
      tags: form.tags.filter((_, i) => i !== index),
    });
  };

  return (
    <View className="firm-edit">
      <View className="edit-header">
        <Text className="edit-title">
          {isEdit ? '编辑律所' : '新建律所'}
        </Text>
      </View>

      <View className="edit-form">
        <View className="form-group">
          <Text className="form-label">
            律所名称 <Text className="required">*</Text>
          </Text>
          <Input
            className="form-input"
            placeholder="请输入律所名称"
            value={form.name}
            onInput={(e) => setForm({ ...form, name: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">
            所在城市 <Text className="required">*</Text>
          </Text>
          <Input
            className="form-input"
            placeholder="请输入所在城市"
            value={form.city}
            onInput={(e) => setForm({ ...form, city: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">
            地址 <Text className="required">*</Text>
          </Text>
          <Input
            className="form-input"
            placeholder="请输入详细地址"
            value={form.address}
            onInput={(e) => setForm({ ...form, address: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">
            简介 <Text className="required">*</Text>
          </Text>
          <Textarea
            className="form-textarea"
            placeholder="请输入律所简介"
            value={form.description}
            onInput={(e) => setForm({ ...form, description: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">联系电话</Text>
          <Input
            className="form-input"
            placeholder="请输入联系电话"
            value={form.phone}
            onInput={(e) => setForm({ ...form, phone: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">邮箱</Text>
          <Input
            className="form-input"
            placeholder="请输入邮箱"
            value={form.email}
            onInput={(e) => setForm({ ...form, email: e.detail.value })}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">网站</Text>
          <Input
            className="form-input"
            placeholder="请输入网站地址"
            value={form.website}
            onInput={(e) => setForm({ ...form, website: e.detail.value })}
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
            {form.practiceAreas.map((area, index) => (
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
            {form.tags.map((tag, index) => (
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
          <Button
            className="cancel-btn"
            onClick={() => Taro.navigateBack()}
          >
            取消
          </Button>
          <Button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </View>
      </View>
    </View>
  );
}
