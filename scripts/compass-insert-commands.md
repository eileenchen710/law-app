# MongoDB Compass 插入命令

## 步骤1：插入服务数据

在 MongoDB Compass 中：
1. 选择 `services` collection
2. 点击 "ADD DATA" -> "Insert Document"
3. 切换到 JSON 视图
4. 分别插入以下每个服务（一次插入一个）

### 华夏律师事务所的服务 (law_firm_id: 68dd0de11f8a0e63c6dc1080)

```json
{
  "title": "公司上市法律服务",
  "description": "为企业提供IPO全流程法律支持，包括尽职调查、股权结构优化、合规审查等",
  "category": "corporate",
  "price": "面议",
  "duration": "3-6个月",
  "lawyer_name": "李文斌",
  "lawyer_title": "高级合伙人",
  "law_firm_id": {"$oid": "68dd0de11f8a0e63c6dc1080"},
  "status": "active",
  "available_times": []
}
```

```json
{
  "title": "并购重组法律顾问",
  "description": "企业并购、重组、分立的全流程法律服务，包括交易结构设计、尽职调查、协议谈判等",
  "category": "corporate",
  "price": "80000",
  "duration": "2-4个月",
  "lawyer_name": "李文斌",
  "lawyer_title": "高级合伙人",
  "law_firm_id": {"$oid": "68dd0de11f8a0e63c6dc1080"},
  "status": "active",
  "available_times": []
}
```

```json
{
  "title": "股权激励方案设计",
  "description": "为企业设计完整的股权激励计划，包括期权池设置、行权条件、税务筹划等",
  "category": "corporate",
  "price": "50000",
  "duration": "1-2个月",
  "lawyer_name": "张芷晴",
  "lawyer_title": "合伙人",
  "law_firm_id": {"$oid": "68dd0de11f8a0e63c6dc1080"},
  "status": "active",
  "available_times": []
}
```

### 瀚海律师事务所的服务 (law_firm_id: 68dd0de11f8a0e63c6dc1081)

```json
{
  "title": "商事诉讼代理",
  "description": "代理商业合同纠纷、股权纠纷、投资纠纷等商事诉讼案件",
  "category": "litigation",
  "price": "面议",
  "duration": "6-12个月",
  "lawyer_name": "周骁",
  "lawyer_title": "管理合伙人",
  "law_firm_id": {"$oid": "68dd0de11f8a0e63c6dc1081"},
  "status": "active",
  "available_times": []
}
```

```json
{
  "title": "国际仲裁服务",
  "description": "处理国际商事仲裁、投资仲裁，熟悉ICC、HKIAC等仲裁机构规则",
  "category": "litigation",
  "price": "150000",
  "duration": "8-18个月",
  "lawyer_name": "周骁",
  "lawyer_title": "管理合伙人",
  "law_firm_id": {"$oid": "68dd0de11f8a0e63c6dc1081"},
  "status": "active",
  "available_times": []
}
```

```json
{
  "title": "知识产权维权诉讼",
  "description": "专利、商标、著作权侵权诉讼，商业秘密保护诉讼",
  "category": "intellectual_property",
  "price": "60000",
  "duration": "4-8个月",
  "lawyer_name": "林涵",
  "lawyer_title": "资深律师",
  "law_firm_id": {"$oid": "68dd0de11f8a0e63c6dc1081"},
  "status": "active",
  "available_times": []
}
```

```json
{
  "title": "数据合规审查",
  "description": "企业数据处理活动合规审查，个人信息保护合规方案设计",
  "category": "corporate",
  "price": "40000",
  "duration": "1-2个月",
  "lawyer_name": "林涵",
  "lawyer_title": "资深律师",
  "law_firm_id": {"$oid": "68dd0de11f8a0e63c6dc1081"},
  "status": "active",
  "available_times": []
}
```

### 明德律师事务所的服务 (law_firm_id: 68dd0de11f8a0e63c6dc1082)

```json
{
  "title": "创业公司股权架构设计",
  "description": "为初创企业设计合理的股权结构，规划融资方案，设置创始人退出机制",
  "category": "corporate",
  "price": "30000",
  "duration": "2-4周",
  "lawyer_name": "刘思齐",
  "lawyer_title": "高级律师",
  "law_firm_id": {"$oid": "68dd0de11f8a0e63c6dc1082"},
  "status": "active",
  "available_times": []
}
```

```json
{
  "title": "风险投资交易法律服务",
  "description": "VC/PE投资交易全流程法律服务，包括TS谈判、尽职调查、投资协议起草等",
  "category": "corporate",
  "price": "50000",
  "duration": "1-3个月",
  "lawyer_name": "刘思齐",
  "lawyer_title": "高级律师",
  "law_firm_id": {"$oid": "68dd0de11f8a0e63c6dc1082"},
  "status": "active",
  "available_times": []
}
```

```json
{
  "title": "互联网平台合规咨询",
  "description": "互联网平台业务合规审查，包括网络安全、内容安全、广告合规等",
  "category": "corporate",
  "price": "45000",
  "duration": "1-2个月",
  "lawyer_name": "陈明远",
  "lawyer_title": "创始合伙人",
  "law_firm_id": {"$oid": "68dd0de11f8a0e63c6dc1082"},
  "status": "active",
  "available_times": []
}
```

```json
{
  "title": "数据跨境传输合规方案",
  "description": "企业数据出境合规方案设计，包括安全评估、标准合同备案等",
  "category": "corporate",
  "price": "55000",
  "duration": "1-2个月",
  "lawyer_name": "陈明远",
  "lawyer_title": "创始合伙人",
  "law_firm_id": {"$oid": "68dd0de11f8a0e63c6dc1082"},
  "status": "active",
  "available_times": []
}
```

## 步骤2：更新律所的 services 字段

在 MongoDB Compass 中：
1. 选择 `firms` collection
2. 找到对应的律所文档
3. 点击编辑（铅笔图标）
4. 找到 `services` 字段，更新为以下数组

### 华夏律师事务所 (_id: 68dd0de11f8a0e63c6dc1080)

在 services 字段中添加：
```json
[
  "公司上市法律服务",
  "并购重组法律顾问",
  "股权激励方案设计",
  "私募股权投资",
  "跨境投融资"
]
```

同时更新：
- `rating`: 4.9
- `cases`: 150

### 瀚海律师事务所 (_id: 68dd0de11f8a0e63c6dc1081)

在 services 字段中添加：
```json
[
  "商事诉讼代理",
  "国际仲裁服务",
  "知识产权维权诉讼",
  "数据合规审查",
  "商业秘密保护"
]
```

同时更新：
- `rating`: 4.8
- `cases`: 200

### 明德律师事务所 (_id: 68dd0de11f8a0e63c6dc1082)

在 services 字段中添加：
```json
[
  "创业公司股权架构设计",
  "风险投资交易法律服务",
  "互联网平台合规咨询",
  "数据跨境传输合规方案",
  "ESOP员工持股计划"
]
```

同时更新：
- `rating`: 4.7
- `cases`: 120

## 验证

完成后，刷新前端页面，应该可以看到：
1. 律所卡片显示服务列表（带打勾图标）
2. 服务卡片显示完整的律所信息
