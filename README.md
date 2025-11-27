# Law App

一个基于 Taro 4.x 开发的跨平台应用，支持微信小程序、支付宝小程序、H5 等多个平台。

## 技术栈

- **框架**: Taro 4.1.3
- **前端框架**: React 18
- **语言**: TypeScript 5.4.5
- **样式**: Sass
- **状态管理**: MobX 6.x
- **HTTP 请求**: Axios 1.6.x
- **UI 组件**: Taroify
- **工具库**: Day.js
- **代码规范**: ESLint + Stylelint + Husky + Commitlint

## 环境要求

### 必需环境
1. **Node.js**: >= 16.0.0 (推荐 18.x LTS 版本)
2. **npm**: >= 8.0.0 或 **yarn**: >= 1.22.0
3. **Git**: 最新版本

### 开发工具推荐
- **IDE**: Visual Studio Code
- **浏览器**: Chrome (用于 H5 调试)

## 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/eileenchen710/law-app.git
cd law-app
```

### 2. 安装依赖
```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

### 3. 全局安装 Taro CLI (如果还没安装)
```bash
# 使用 npm
npm install -g @tarojs/cli@4.1.3

# 或使用 yarn
yarn global add @tarojs/cli@4.1.3

# 验证安装
taro --version
```

## 开发运行

### 微信小程序
```bash
# 启动微信小程序开发模式
npm run dev:weapp

# 构建微信小程序
npm run build:weapp
```

### H5 网页
```bash
# 启动 H5 开发模式
npm run dev:h5

# 构建 H5
npm run build:h5
```

### 其他平台
```bash
# 支付宝小程序
npm run dev:alipay
npm run build:alipay

# 百度智能小程序
npm run dev:swan
npm run build:swan

# 字节跳动小程序
npm run dev:tt
npm run build:tt

# QQ 小程序
npm run dev:qq
npm run build:qq

# 京东小程序
npm run dev:jd
npm run build:jd

# 鸿蒙应用
npm run dev:harmony-hybrid
npm run build:harmony-hybrid
```

## 项目结构

```
law-app/
├── config/                 # Taro 配置文件
│   ├── dev.ts              # 开发环境配置
│   ├── index.ts            # 主配置文件
│   └── prod.ts             # 生产环境配置
├── src/                    # 源代码目录
│   ├── app.config.ts       # 应用配置
│   ├── app.scss            # 全局样式
│   ├── app.ts              # 应用入口
│   ├── assets/             # 静态资源
│   │   └── images/         # 图片资源
│   └── pages/              # 页面组件
│       ├── index/          # 首页
│       ├── me/             # 个人中心
│       └── search/         # 搜索页
├── types/                  # TypeScript 类型定义
├── .env.development        # 开发环境变量
├── .env.production         # 生产环境变量
├── .env.test              # 测试环境变量
├── babel.config.js        # Babel 配置
├── package.json           # 项目依赖和脚本
├── project.config.json    # 小程序项目配置
└── tsconfig.json         # TypeScript 配置
```

## 开发规范

### 提交信息规范
本项目使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
# 功能新增
git commit -m "feat: 添加用户登录功能"

# Bug 修复
git commit -m "fix: 修复搜索页面崩溃问题"

# 文档更新
git commit -m "docs: 更新 README 安装指南"

# 样式调整
git commit -m "style: 调整首页布局样式"
```

### 代码规范
- 项目集成了 ESLint、Stylelint
- 使用 Husky 进行 Git Hook 管理
- 提交前会自动进行代码检查和格式化

## 常见问题

### 1. Node.js 版本不匹配
```bash
# 检查当前 Node.js 版本
node --version

# 如果版本过低，建议使用 nvm 管理 Node.js 版本
# Windows 用户可以使用 nvm-windows
# macOS/Linux 用户可以使用 nvm
```

### 2. 依赖安装失败
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# 或者使用淘宝镜像
npm install --registry=https://registry.npmmirror.com
```

### 3. Taro CLI 版本问题
```bash
# 确保使用项目对应的 Taro 版本
npm install -g @tarojs/cli@4.1.3

# 检查版本
taro --version
```

### 4. 微信小程序开发
- 需要下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 运行 `npm run dev:weapp` 后，用微信开发者工具打开 `dist` 目录

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

如有问题，请通过以下方式联系：
- 提交 [Issue](https://github.com/eileenchen710/law-app/issues)
- 项目维护者：eileenchen710

