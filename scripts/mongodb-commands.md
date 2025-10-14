# MongoDB 数据库操作命令

## 方式一：查看现有数据

### 1. 查看所有律所
```javascript
db.firms.find({}, { name: 1, services: 1, _id: 1 })
```

### 2. 查看所有服务
```javascript
db.services.find({}, { title: 1, law_firm_id: 1, firm_id: 1 })
```

### 3. 查看某个律所的所有服务
```javascript
// 华夏律师事务所
db.services.find({
  law_firm_id: ObjectId("68dd0de11f8a0e63c6dc1080")
}, {
  title: 1, lawyer_name: 1
})
```

---

## 方式二：更新律所的 services 字段

### 华夏律师事务所
```javascript
db.firms.updateOne(
  { _id: ObjectId("68dd0de11f8a0e63c6dc1080") },
  {
    $set: {
      services: [
        "公司上市法律服务",
        "并购重组法律顾问",
        "股权激励方案设计",
        "公司法律顾问",
        "资本市场服务",
        "合规咨询"
      ],
      rating: 4.9,
      cases: 2500,
      recommended: true
    }
  }
)
```

### 瀚海律师事务所
```javascript
db.firms.updateOne(
  { _id: ObjectId("68dd0de11f8a0e63c6dc1081") },
  {
    $set: {
      services: [
        "商事诉讼代理",
        "国际仲裁服务",
        "知识产权维权诉讼",
        "数据合规审查",
        "合同纠纷解决",
        "跨境争议解决"
      ],
      rating: 4.8,
      cases: 1800,
      recommended: false
    }
  }
)
```

### 明德律师事务所
```javascript
db.firms.updateOne(
  { _id: ObjectId("68dd0de11f8a0e63c6dc1082") },
  {
    $set: {
      services: [
        "创业公司股权架构设计",
        "风险投资交易法律服务",
        "互联网平台合规咨询",
        "数据跨境传输合规方案",
        "ESOP员工持股计划",
        "初创企业法律顾问"
      ],
      rating: 4.7,
      cases: 1200,
      recommended: true
    }
  }
)
```

---

## 方式三：更新服务的 law_firm_id 字段

### 根据服务标题批量更新

```javascript
// 华夏律师事务所的服务
db.services.updateMany(
  {
    title: {
      $regex: "公司上市|并购重组|股权激励|公司法律顾问|资本市场|合规咨询"
    }
  },
  { $set: { law_firm_id: ObjectId("68dd0de11f8a0e63c6dc1080") } }
)

// 瀚海律师事务所的服务
db.services.updateMany(
  {
    title: {
      $regex: "商事诉讼|商业诉讼|国际仲裁|知识产权维权|合同纠纷|跨境争议"
    }
  },
  { $set: { law_firm_id: ObjectId("68dd0de11f8a0e63c6dc1081") } }
)

// 明德律师事务所的服务
db.services.updateMany(
  {
    title: {
      $regex: "创业公司|初创企业|风险投资|互联网平台|数据跨境|ESOP"
    }
  },
  { $set: { law_firm_id: ObjectId("68dd0de11f8a0e63c6dc1082") } }
)

// 数据合规审查 - 两家律所都提供
db.services.updateOne(
  { title: "数据合规审查" },
  { $set: { law_firm_id: ObjectId("68dd0de11f8a0e63c6dc1081") } }
)
```

### 单个服务更新示例
```javascript
// 如果你知道服务的具体 _id
db.services.updateOne(
  { _id: ObjectId("你的服务ID") },
  { $set: { law_firm_id: ObjectId("律所ID") } }
)
```

---

## 方式四：查看绑定结果

### 检查律所的服务列表
```javascript
db.firms.aggregate([
  {
    $lookup: {
      from: "services",
      localField: "_id",
      foreignField: "law_firm_id",
      as: "service_records"
    }
  },
  {
    $project: {
      name: 1,
      services: 1,
      service_count: { $size: "$service_records" },
      service_titles: "$service_records.title"
    }
  }
])
```

### 检查未绑定律所的服务
```javascript
db.services.find({
  $and: [
    { law_firm_id: { $exists: false } },
    { firm_id: { $exists: false } }
  ]
}, {
  title: 1,
  category: 1
})
```

---

## 方式五：清理和重置

### 清空所有服务的律所绑定
```javascript
db.services.updateMany(
  {},
  { $unset: { law_firm_id: "" } }
)
```

### 清空律所的 services 字段
```javascript
db.firms.updateMany(
  {},
  { $set: { services: [] } }
)
```

---

## 使用说明

### 在 MongoDB Compass 中使用：
1. 连接到你的 MongoDB 数据库
2. 点击底部的 "MONGOSH" 标签页
3. 复制粘贴上述命令
4. 按 Enter 执行

### 使用 Node.js 脚本：
```bash
# 查看 MongoDB URI
echo $MONGODB_URI

# 如果没有设置，先设置
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/law-app"

# 运行绑定脚本
node scripts/bind-services-to-firms.js
```

---

## 验证步骤

执行完命令后，运行以下验证：

```javascript
// 1. 检查每个律所的 services 数组
db.firms.find({}, { name: 1, services: 1 })

// 2. 检查每个律所绑定的服务记录
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
      services_field_count: { $size: { $ifNull: ["$services", []] } },
      bound_services_count: { $size: "$bound_services" }
    }
  }
])

// 3. 确保所有服务都已绑定
db.services.countDocuments({ law_firm_id: { $exists: true } })
db.services.countDocuments({})
```

如果第3步两个数字相等，说明所有服务都已成功绑定！
