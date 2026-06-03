## Why

当前 wechat-cli 仅支持单个微信公众号的配置和认证（一个 `config.json` + 一个 `token.json`），无法管理多个公众号。用户通常运营 2-3 个公众号，需要在它们之间频繁切换，且面向 AI Agent 的场景要求 JSON 输出能感知当前操作的账号上下文。

## What Changes

- **BREAKING**: 配置文件结构从单文件 `config.json` 迁移到 `profiles/<name>.json` 目录结构，token 缓存同理迁移到 `tokens/<name>.json`
- 新增命名 Profile 系统：每个公众号对应一个独立 profile（配置 + token 缓存隔离）
- 新增 `config use <profile>` 命令：切换当前激活的默认 profile
- 新增 `config list` 命令：列出所有 profile 及其状态
- 新增 `config delete <profile>` 命令：删除指定 profile
- 新增全局 `--profile <name>` 选项：覆盖单次命令使用的 profile
- 所有 JSON 输出增加 `"profile"` 字段，让 AI Agent 感知当前操作的是哪个公众号
- `config init` 增加 `--profile` 参数来创建命名 profile
- 提供旧版配置文件自动迁移路径（`config.json` → `profiles/default.json`）

## Capabilities

### New Capabilities
- `profile-management`: Profile 的创建、列表、切换、删除操作
- `multi-account-auth`: 基于 profile 的独立认证与 token 管理，每个 profile 持有独立的 Access Token 缓存

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **核心模块**: `src/core/config.ts`（文件路径管理、多 profile 加载/保存）、`src/core/token.ts`（按 profile 缓存/刷新 token）、`src/core/http.ts`（按 profile 注入 token）
- **命令模块**: `src/commands/config/init.ts`（增加 profile 感知）、`src/commands/auth/login.ts`（按 profile 认证）
- **类型定义**: `src/types/config.ts`（AppConfig 可能增加 `name` 字段）
- **CLI 入口**: `src/cli.ts`（新增全局 `--profile` 选项）
- **输出格式**: `src/core/output.ts`（JSON 输出需注入 profile 信息）
- **Skills 文件**: `skills/` 目录下的对应 Skill 描述需同步更新
