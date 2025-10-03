# Law App API - Vercel Serverless Functions

## 技术栈
- **后端**: Vercel Serverless Functions (Node.js)
- **数据库**: MongoDB (MongoDB Atlas)
- **邮件服务**: Nodemailer
- **部署平台**: Vercel

## 项目结构
```
api/
├── _lib/
│   ├── db.js               # MongoDB 连接
│   └── mailer.js           # 邮件服务
├── models/
│   ├── firm.js             # 律所模型
│   ├── service.js          # 服务模型
│   └── appointment.js      # 预约模型
└── v1/
    ├── firms/
    │   ├── index.js        # GET /api/v1/firms
    │   └── [id].js         # GET /api/v1/firms/:id
    ├── services/
    │   ├── index.js        # GET /api/v1/services
    │   └── [id].js         # GET /api/v1/services/:id
    └── appointments/
        └── index.js        # GET/POST /api/v1/appointments
```

## 部署步骤

### 1. 安装 Vercel CLI
```bash
npm i -g vercel
```

### 2. 配置环境变量
复制 `.env.example` 为 `.env.local` 并填写配置：
```bash
cp .env.example .env.local
```

### 3. 配置 MongoDB Atlas 数据库
1. 登录 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 创建免费集群
3. 获取连接字符串
4. 在 Vercel 项目设置中添加环境变量：
   - MONGODB_URI: MongoDB 连接字符串
   - MONGODB_DB: 数据库名称 (如: law-app)

### 4. 配置邮件服务
使用 Gmail 为例：
1. 开启 [两步验证](https://myaccount.google.com/security)
2. 生成 [应用专用密码](https://myaccount.google.com/apppasswords)
3. 在环境变量中配置：
   - EMAIL_USER: 你的Gmail邮箱
   - EMAIL_PASS: 应用专用密码
   - ADMIN_EMAIL: 管理员邮箱

### 5. 部署到 Vercel
```bash
vercel
```

### 6. 初始化数据库
部署后运行初始化脚本：
```bash
node scripts/init-mongodb.js
```

## API 端点

### 1. 律所接口

#### 获取律所列表
```
GET /api/v1/firms?q=关键词&city=城市&page=1&size=10
```

响应示例：
```json
{
  "items": [
    {
      "id": 1,
      "name": "北京XX律所",
      "description": "专注婚姻家事与劳动纠纷",
      "address": "北京市朝阳区XX路100号",
      "city": "北京",
      "contact_email": "firm@example.com",
      "contact_phone": "010-12345678",
      "available_times": ["2025-09-21T10:00:00Z"]
    }
  ],
  "total": 1,
  "page": 1,
  "size": 10,
  "pages": 1
}
```

#### 获取律所详情
```
GET /api/v1/firms/1
```

### 2. 服务接口

#### 获取服务列表
```
GET /api/v1/services?q=关键词&firm_id=1&category=民事&page=1&size=10
```

#### 获取服务详情
```
GET /api/v1/services/1
```

### 3. 预约接口

#### 提交预约
```
POST /api/v1/appointments
Content-Type: application/json

{
  "name": "张三",
  "phone": "13800000000",
  "email": "user@example.com",
  "firm_id": 1,
  "service_id": 2,
  "time": "2025-09-21T10:00:00Z",
  "remark": "需要婚姻咨询"
}
```

响应：
```json
{
  "status": "ok",
  "message": "预约提交成功，邮件已发送给律所和管理员",
  "appointment_id": "apt-123"
}
```

#### 查询预约列表（管理后台）
```
GET /api/v1/appointments?firm_id=1&date=2025-09-21&page=1&size=20
```

## 本地开发

### 1. 安装依赖
```bash
npm install
```

### 2. 配置本地环境变量
创建 `.env.local` 文件并配置数据库和邮件服务

### 3. 启动开发服务器
```bash
vercel dev
```

服务器将在 http://localhost:3000 启动

## 测试 API

### 使用 curl 测试
```bash
# 获取律所列表
curl http://localhost:3000/api/v1/firms

# 获取律所详情
curl http://localhost:3000/api/v1/firms/1

# 提交预约
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试用户",
    "phone": "13800000000",
    "firm_id": 1,
    "service_id": 1,
    "time": "2025-09-25T10:00:00Z",
    "remark": "测试预约"
  }'
```

## 注意事项

1. **数据库连接**: MongoDB 连接使用连接池，确保在 MongoDB Atlas 中设置 IP 白名单
2. **邮件发送限制**: Gmail 有发送限制，生产环境建议使用专业邮件服务（SendGrid、Mailgun等）
3. **时区处理**: API 统一使用 UTC 时间，前端负责转换为本地时间
4. **错误处理**: 所有API都有完整的错误处理和状态码返回
5. **CORS**: 已配置允许所有来源，生产环境建议限制为特定域名

## 生产环境配置

1. 在 Vercel Dashboard 中设置环境变量
2. 配置自定义域名
3. 开启 Analytics 监控
4. 设置错误报警
5. 配置访问速率限制

## 故障排查

### 数据库连接失败
- 检查环境变量是否正确配置
- 确认数据库已创建并连接到项目
- 查看 Vercel Functions 日志

### 邮件发送失败
- 检查邮件服务配置
- 确认应用专用密码正确
- 查看控制台错误日志

### API 返回 500 错误
- 查看 Vercel Functions 日志
- 检查请求参数格式
- 确认数据库表已创建

## 联系支持

如有问题，请查看 [Vercel 文档](https://vercel.com/docs) 或提交 Issue。