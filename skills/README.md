# wechat-cli Skills

面向 AI Agent 的微信公众号 CLI 能力描述文件。

## 使用方式

这些 Skills 文件可被 AI Agent（如 Claude Code、Cursor）作为上下文加载，Agent 据此理解可用能力并调用相应的 CLI 命令。

## 可用 Skills

| Skill | 描述 | 文件 |
|-------|------|------|
| auth | 认证与 Token 管理 | [auth.md](auth.md) |
| draft | 草稿箱与文章发布 | [draft.md](draft.md) |
| media | 素材管理（图片/音频/视频） | [media.md](media.md) |
| stats | 数据统计与分析 | [stats.md](stats.md) |
| api | 原始 API 调用 | [api.md](api.md) |

## 前置条件

1. 安装 CLI: `npm install -g wechat-cli`
2. 初始化配置: `wechat-cli config init`
3. 获取 Token: `wechat-cli auth login`

## 多公众号管理（Profiles）

wechat-cli 支持通过命名 profile 管理多个微信公众号。每个 profile 拥有独立的配置和 Token 缓存。

```bash
# 创建命名 profile（支持中英文、数字、下划线、连字符，1–64 字符）
wechat-cli config init --profile tech-blog
wechat-cli config init --profile news
wechat-cli config init --profile "技术博客"
wechat-cli config init --profile "科技-news"
wechat-cli config init --profile "TechBlog_2024"

# 切换默认 profile
wechat-cli config use tech-blog
wechat-cli config use "技术博客"

# 列出所有 profile
wechat-cli config list

# 单次命令覆盖 profile（不改变默认值）
wechat-cli draft list --profile news
wechat-cli draft list --profile "技术博客"
wechat-cli auth status --profile tech-blog --format json --quiet
```

> **Shell 用法提示**：名称含中文、空格或 `-` 时，shell 中请用引号包裹（`--profile "技术博客"`），避免词分割。
>
> **字符规则**：`[A-Za-z0-9_\-\p{Script=Han}]`，长度 1–64 字符，`__custom__` 为保留名禁用。名称在保存时统一 trim + Unicode NFC 规范化，跨平台文件名稳定。

首次升级时，旧版 `config.json` 会自动迁移为 `default` profile。

## 全局选项

所有命令支持以下全局选项：

- `--format json` — 输出 JSON（推荐 Agent 使用），JSON 输出会自动注入 `"profile"` 字段
- `--quiet` — 静默模式，仅输出数据
- `--output <file>` — 输出到文件
- `--verbose` — 调试模式
- `--profile <name>` — 指定要使用的 profile
- `--config <path>` — 指定配置文件路径（高级用法）
