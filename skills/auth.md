---
name: wechat-auth
description: 微信公众号认证与 Token 管理。配置 AppID/AppSecret，获取和管理 Access Token。支持多公众号 Profile 管理。
trigger: 当需要配置微信公众号凭证、获取 Access Token、检查认证状态时使用。
---

# 认证与配置 Skill

管理微信公众号的应用凭证和 Access Token。支持多公众号 Profile。

## Profile 管理

wechat-cli 通过 profile 支持管理多个公众号：

```bash
# 创建命名 profile（每个公众号一个）
wechat-cli config init --profile tech-blog
wechat-cli config init --profile news

# 切换默认 profile
wechat-cli config use tech-blog

# 列出所有 profile
wechat-cli config list

# 删除 profile（同时删除关联的 token 缓存）
wechat-cli config delete news
```

## 首次使用流程（单个公众号）

```bash
# 1. 交互式配置 AppID 和 AppSecret（创建 default profile）
wechat-cli config init

# 2. 获取 Access Token（会自动缓存）
wechat-cli auth login
```

## 可用命令

### Profile 管理（新）

```bash
# 创建命名 profile
wechat-cli config init --profile <name>

# 切换活跃 profile
wechat-cli config use <name>

# 列出所有 profile
wechat-cli config list

# 删除 profile
wechat-cli config delete <name>
```

### 配置管理

```bash
# 交互式初始化配置
wechat-cli config init

# 查看指定配置项
wechat-cli config get appId

# 设置配置项
wechat-cli config set appId <your-app-id>

# 显示所有配置（AppSecret 会脱敏显示，含当前 profile 信息）
wechat-cli config show
```

### 认证管理

```bash
# 获取并缓存当前 profile 的 Access Token
wechat-cli auth login
wechat-cli auth login --profile tech-blog

# 查看认证状态（Token 有效性、过期时间、profile 信息）
wechat-cli auth status
wechat-cli auth status --profile tech-blog --format json --quiet

# 清除缓存的 Token
wechat-cli auth logout
```

## 注意事项

- Access Token 有效期 7200 秒（2小时），CLI 会自动刷新
- 每个 profile 的 Token 独立缓存，互不影响
- JSON 输出自动包含 `"profile"` 字段，Agent 可据此获知当前操作的公众号
- 旧版 `config.json` 首次运行时会自动迁移为 `default` profile
- 配置文件存储在 `~/.wechat-cli/profiles/<name>.json`
