# API 路由部署说明

项目使用 `api/index.js` 作为单一的 Serverless 函数入口。部署到 Vercel 时需要注意：

1. **路径映射**
   - `vercel.json` 中已经配置了 `routes`，确保所有 `/api/**` 请求都会转发给 `/api/index`。
   - 如需新增局部函数，请同步更新 `vercel.json` 并考虑套餐限制。

2. **环境变量**
   - 在 Vercel 控制台为 `Production`、`Preview`、`Development` 环境分别配置：
     - `MONGODB_URI`
     - `MONGODB_DB`
     - `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS`, `ADMIN_EMAIL`（如果启用邮件通知）
     - `TARO_APP_API_BASE_URL`, `TARO_APP_API_PREFIX`, `TARO_APP_API_TIMEOUT`

3. **本地调试**
   - `npm run dev:h5` 负责前端；若需模拟 Serverless，可使用 `npm run test:api`。
   - `vercel dev` 需先 `vercel login` 并允许网络访问。

4. **部署流程建议**
   - 提交代码 → Vercel 自动构建 → 检查 `https://your-domain/api/v1/*` 是否返回 200。
   - 如遇 404，确认 `vercel.json` 是否正确指向 `/api/index`。

