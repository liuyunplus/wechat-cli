## 1. 类型定义与数据模型

- [x] 1.1 更新 `src/types/config.ts`：为 `AppConfig` 增加可选 `name` 字段，新增 `ActiveProfile` 类型，定义 profile 文件路径常量
- [x] 1.2 新增 `src/types/profile.ts`：定义 `ProfileMeta` 类型（name, config 路径, token 路径, active 标记）

## 2. 核心配置模块重构

- [x] 2.1 重构 `src/core/config.ts`：新增 `getProfilesDir()`、`getTokensDir()`、`getActivePath()`、`getProfileConfigPath(name)`、`getProfileTokenPath(name)` 路径工具函数
- [x] 2.2 实现 `loadConfig()` 的 profile 感知版本：优先使用 `--profile`/`--config`，否则读 `active.json`，回退到 `"default"`
- [x] 2.3 实现 `resolveProfile()` 函数：解析 --profile / --config / active.json 优先级链，返回确定的 profile 名
- [x] 2.4 实现 `loadActiveProfile()` / `saveActiveProfile()`：读/写 `active.json`
- [x] 2.5 实现 `listProfiles()`：扫描 `profiles/` 目录，返回所有 profile 名称及 active 状态
- [x] 2.6 实现 `deleteProfile(name)`：删除 `profiles/<name>.json` + `tokens/<name>.json`，若为 active 则清空 `active.json`
- [x] 2.7 实现 `migrateLegacyConfig()`：检测并迁移旧版 `config.json` + `token.json` → profiles 结构

## 3. Token 模块 Profile 化

- [x] 3.1 重构 `src/core/token.ts`：`loadTokenCache(profileName)` 和 `saveTokenCache(profileName, token)` 使用 profile 感知路径
- [x] 3.2 更新 `getAccessToken()`：接收 profileName 参数，按 profile 缓存和刷新 token
- [x] 3.3 更新 `refreshAccessToken()`：接收 profileName 参数，按 profile 读取配置并获取 token
- [x] 3.4 更新 `clearTokenCache(profileName)`：按 profile 清除 token

## 4. HTTP 模块 Profile 化

- [x] 4.1 更新 `src/core/http.ts`：`request()` 函数接收 profileName，传递给 `getAccessToken()`
- [x] 4.2 更新 `apiGet()` 和 `apiPost()`：接收并透传 profileName

## 5. 输出模块 Profile 感知

- [x] 5.1 更新 `src/core/output.ts`：`output()` 函数接收可选 profileName，JSON 格式时在顶层注入 `"profile"` 字段
- [x] 5.2 更新 `success()`、`error()`、`info()` 等辅助函数，向下传递 profileName（不影响非 JSON 输出）

## 6. CLI 入口重构

- [x] 6.1 更新 `src/cli.ts`：为全局 program 添加 `--profile <name>` 选项
- [x] 6.2 实现 pre-action hook 或 context 注入机制：在命令执行前解析 profile 名，注入到命令 context

## 7. Config 命令扩展

- [x] 7.1 更新 `config init`：增加 `--profile` 选项，交互式创建命名 profile
- [x] 7.2 新增 `config use <profile>` 命令：切换 active profile
- [x] 7.3 新增 `config list` 命令：列出所有 profile 及状态
- [x] 7.4 新增 `config delete <profile>` 命令：删除 profile 及关联 token
- [x] 7.5 更新 `config show`：显示当前 profile 名称和配置
- [x] 7.6 更新 `config get/set`：基于当前 profile 的配置操作

## 8. Auth 命令 Profile 化

- [x] 8.1 更新 `auth login`：读取当前 profile 配置获取 token，缓存到 profile 对应的 token 文件
- [x] 8.2 更新 `auth status`：输出中包含当前 profile 名
- [x] 8.3 更新 `auth logout`：按 profile 清除 token 缓存

## 9. 业务命令透传 Profile

- [x] 9.1 更新所有 draft/media/stats/api 命令：确保在执行 API 调用时透传当前 profileName
- [x] 9.2 更新 md2html/write/humanize 命令：在 `--draft` 模式下透传 profileName

## 10. Skills 文件更新

- [x] 10.1 更新 `skills/README.md`：增加 profile 概念说明
- [x] 10.2 更新 `skills/auth.md`：描述 profile 感知的认证流程
- [x] 10.3 更新其他 skills 文件：说明 `--profile` 全局选项

## 11. 测试

- [x] 11.1 为 `profile-management` 能力编写单元测试（创建、列表、切换、删除 profile）
- [x] 11.2 为 `multi-account-auth` 能力编写单元测试（独立 token 缓存、按 profile 刷新）
- [x] 11.3 编写旧版迁移逻辑的单元测试
- [x] 11.4 运行全量测试确保无回归
