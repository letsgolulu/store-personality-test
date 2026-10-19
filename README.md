# 如果你是一家店，会是什么店？

非商业趣味测评演示。前端 GitHub Pages，后端 Supabase Edge Functions + PostgreSQL。

## 功能

36道情境题、6个连续维度、12种方向店型和独立平衡型；测试密码默认3次；上一题修改、报告长图、随机编号分享链接；管理员工作台支持批量密码、CSV导出、次数补发、内容和审计。

这是原创娱乐测评，不是经过信效度验证的心理量表，不用于心理诊断或重大决策。

## 开发与发布

Node.js 24，pnpm 11.25.0。

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm dev
pnpm build
```

GitHub Pages 从 `main` 分支的 `/docs` 发布。修改前端后先构建，提交源文件与新的 `docs` 文件。分享链接使用 hash 路由，无需服务器重写。

数据库迁移保存在 `supabase/migrations`，后台入口为 `supabase/functions/store-api/index.ts`。部署函数时一并上传其依赖的 `lib` 目录。浏览器仅包含公开 publishable key；service-role key 只从 Supabase 服务端内置环境读取。

所有业务表位于未暴露的 `store_private` schema，启用RLS并拒绝客户端角色访问。公共RPC只授予 service_role。管理员令牌在服务端验证，并通过数据库中的管理员邮箱名单与已验证 Auth 用户匹配，不信任用户可编辑 metadata。

## 管理员建立

项目所有者在 Supabase Dashboard 的 Authentication → Users 创建站点管理员用户，自行设置独立密码并确认邮箱。管理员名单只能由数据库所有者修改，不提供公开的管理员注册接口。控制台账号与站点 Auth 用户不是同一账号。

## 运营边界

GitHub Pages 仅按非商业演示用途部署。Supabase Free 可能因低活跃暂停，没有全天候可用保证。正式经营及长期在线需重新评估适用托管方案与服务套餐。

请勿提交任何导出的密码、用户记录、私钥、管理员凭据或真实 `.env` 文件。
