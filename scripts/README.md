# 数据库脚本使用指南

## 概述

这个目录包含了用于管理律所和服务数据的脚本和命令。

## 文件说明

### 脚本文件

1. **migrate-firm-data.js** - 律所数据迁移脚本
   - 为律所添加/更新 services、practice_areas、tags、rating、cases 等字段
   - 添加律师信息

2. **bind-services-to-firms.js** - 服务绑定脚本
   - 将现有服务绑定到对应的律所（设置 law_firm_id）
   - 更新律所的 services 数组
   - 自动匹配服务标题和律所

3. **insert-services.js** - 服务插入脚本
   - 包含完整的服务数据插入代码
   - 供参考和备用

### 文档文件

1. **mongodb-commands.md** - MongoDB 操作命令文档
   - 查看、更新、验证数据的所有命令
   - 可在 MongoDB Compass 的 MONGOSH 中直接使用

2. **compass-insert-commands.md** - MongoDB Compass 可视化操作指南
   - 适合不熟悉命令行的用户
   - 逐步操作说明

## 快速开始

### 方式一：使用 Node.js 脚本（推荐）

#### 前置条件
```bash
# 确保已设置 MongoDB URI 环境变量
export MONGODB_URI="your_mongodb_connection_string"
```

#### 运行步骤

**1. 更新律所数据**
```bash
npm run migrate:firms
```
这会为所有律所添加：
- services 数组
- practice_areas 数组
- tags 数组
- rating 评分
- cases 案例数
- recommended 推荐标识
- lawyers 律师信息

**2. 绑定服务到律所**
```bash
npm run bind:services
```
这会：
- 根据服务标题自动匹配对应的律所
- 更新服务的 law_firm_id 字段
- 同步更新律所的 services 数组
- 显示详细的绑定结果

### 方式二：使用 MongoDB Compass

如果你更喜欢可视化操作：

1. 打开 MongoDB Compass
2. 连接到你的数据库
3. 点击底部的 **MONGOSH** 标签页
4. 打开 `mongodb-commands.md` 文档
5. 复制粘贴相应的命令
6. 按 Enter 执行

详细的可视化操作指南见 `compass-insert-commands.md`

## 数据结构

### 律所 (firms collection)

```javascript
{
  _id: ObjectId("68dd0de11f8a0e63c6dc1080"),
  name: "华夏律师事务所",
  slug: "huaxia-law-firm",
  description: "专注于公司治理...",

  // 新增字段
  services: [
    "公司上市法律服务",
    "并购重组法律顾问",
    "股权激励方案设计"
  ],
  practice_areas: ["公司治理", "并购重组", "资本市场"],
  tags: ["头部律所", "跨境业务", "资本运营"],
  rating: 4.9,
  cases: 2500,
  recommended: true,
  lawyers: [
    {
      name: "张伟",
      title: "创始合伙人",
      phone: "+86-138-0000-1001",
      email: "zhangwei@huaxialaw.cn",
      specialties: ["公司治理", "并购重组"]
    }
  ],

  // 原有字段
  address: "北京市朝阳区...",
  city: "北京",
  phone: "+86-10-5860-1234",
  email: "contact@huaxialaw.cn",
  website: "https://www.huaxialaw.cn"
}
```

### 服务 (services collection)

```javascript
{
  _id: ObjectId("..."),
  title: "公司上市法律服务",
  description: "为企业提供IPO全流程法律支持...",
  category: "corporate",

  // 关键字段：绑定到律所
  law_firm_id: ObjectId("68dd0de11f8a0e63c6dc1080"),

  price: "面议",
  duration: "3-6个月",
  lawyer_name: "李文斌",
  lawyer_title: "高级合伙人",
  status: "active",
  available_times: []
}
```

## 服务与律所绑定规则

脚本会根据服务标题关键词自动匹配律所：

### 华夏律师事务所 (68dd0de11f8a0e63c6dc1080)
- 关键词：公司上市、并购重组、股权激励、公司法律顾问、资本市场、合规咨询

### 瀚海律师事务所 (68dd0de11f8a0e63c6dc1081)
- 关键词：商事诉讼、商业诉讼、国际仲裁、知识产权维权、合同纠纷、跨境争议

### 明德律师事务所 (68dd0de11f8a0e63c6dc1082)
- 关键词：创业公司、初创企业、风险投资、互联网平台、数据跨境、ESOP

### 多家律所提供的服务
- **数据合规审查**：瀚海律师事务所 + 明德律师事务所

## 验证数据

### 使用脚本验证
```bash
# 运行绑定脚本会自动显示验证结果
npm run bind:services
```

### 使用 MongoDB 命令验证
```javascript
// 检查律所的服务数组和绑定的服务记录
db.firms.aggregate([
  {
    $lookup: {
      from: "services",
      localField: "_id",
      foreignField: "law_firm_id",
      as: "bound_services"
    }
  },
  {
    $project: {
      name: 1,
      services_count: { $size: { $ifNull: ["$services", []] } },
      bound_services_count: { $size: "$bound_services" }
    }
  }
])
```

## 常见问题

### Q: 脚本运行后前端还是看不到数据？
A: 检查以下几点：
1. 确认脚本执行成功（看到 ✅ 标记）
2. 清除浏览器缓存或使用无痕模式
3. 检查 API 是否正确 populate 了 law_firm_id
4. 如果用 Vercel，等待部署完成并清除 Cloudflare 缓存

### Q: 如何添加新的服务？
A: 三种方式：
1. 在 MongoDB Compass 中手动添加
2. 使用 API 的 POST /api/admin/services 接口
3. 在 `insert-services.js` 中添加数据后运行脚本

### Q: 如何修改服务绑定规则？
A: 编辑 `bind-services-to-firms.js` 中的 `SERVICE_FIRM_MAPPING` 对象，添加新的关键词映射。

### Q: 服务已存在但没有绑定律所怎么办？
A: 运行 `npm run bind:services`，脚本会自动根据标题匹配律所。

## 开发建议

### 本地开发流程
1. 先在本地数据库测试脚本
2. 验证数据正确后再在生产环境运行
3. 生产环境操作前先备份数据

### 添加新律所
1. 在数据库中创建律所文档
2. 在 `bind-services-to-firms.js` 的 `FIRM_IDS` 中添加 ID 映射
3. 在 `SERVICE_FIRM_MAPPING` 中添加服务匹配规则
4. 在 `FIRM_SERVICES` 中定义服务列表
5. 运行 `npm run bind:services`

## 联系支持

如有问题，请查看：
- `mongodb-commands.md` - 完整的命令参考
- `compass-insert-commands.md` - 可视化操作指南
- MongoDB 日志输出 - 脚本会显示详细的执行信息
