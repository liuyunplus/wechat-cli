## Why

`profile-management` 能力在初次设计时（`openspec/changes/multi-account-profiles/design.md` D2）以"CLI 中中文名输入不便"和"文件系统编码问题多"为由，将 profile 名称约束为 slug 风格（`/^[a-z0-9][a-z0-9-]*$/`）。当前 wechat-cli 在多终端 / AI Agent 场景下使用，对中文账号名的实际需求被低估：

- 多数公众号本身就是中文品牌（如「技术博客」「生活号」），用拼音或英文 slug 表示不仅不直观，还增加了用户记忆与配置对齐成本。
- 现代终端（macOS Terminal / iTerm2、Windows Terminal、Linux 各发行版）均原生支持 UTF-8，配合 `~/.wechat-cli/` 目录位于用户主目录（macOS APFS / Linux ext4 / Windows NTFS 均原生支持 Unicode 文件名），并不存在设计假设里的"编码问题"。
- 在 shell 中使用中文名时只需加引号（`--profile "技术博客"`），与中文文件路径的做法完全一致。

因此本次变更正式反转 D2 决策，将 profile 命名规则扩展为支持中文 + 大小写英文 + 数字 + `-` + `_`，并对存储形式做 Unicode NFC 规范化以避免跨平台/编辑器差异导致"看似相同但被视作两个 profile"的问题。

## What Changes

- **MODIFIED** `profile-management`：将 profile 名称规则从 `[a-z0-9][a-z0-9-]*` 扩展为支持 CJK Han 脚本 + ASCII 字母数字 + `-` + `_`，长度 1–64 字符，保留名 `__custom__` 显式禁用。
- **ADDED** `profile-management`：名称在保存与查找时均经过 `trim()` + Unicode NFC 规范化，跨平台文件名稳定。
- **MODIFIED** `profile-management` 相关错误文案，更新允许字符集合说明。
- **NOT CHANGED**：现有 slug 风格名（`default`、`tech-blog` 等）继续可用；不引入数据迁移。

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `profile-management`：见 `specs/profile-management/spec.md`

## Impact

- **类型定义**：`src/types/config.ts` — 替换 `PROFILE_NAME_REGEX`，新增 `PROFILE_NAME_MAX_LENGTH`、`RESERVED_PROFILE_NAMES`、`normalizeProfileName()`、`validateProfileName()`。
- **核心配置**：`src/core/config.ts` — 替换 4 处正则校验为统一 `validateProfileName()`，在 `resolveProfile` / `saveActiveProfile` / `loadActiveProfile` / `listProfiles` 中插入 NFC 规范化。
- **命令层**：`src/commands/config/init.ts` — `init` / `use` / `delete` 三个子命令的参数入口统一走 `normalize + validate`。
- **CLI 入口**：`src/cli.ts` 无需改动（全局 `--profile` 已被 `resolveProfile` 覆盖）。
- **测试**：`tests/core/profile.test.ts` — 修改"拒绝非法名"断言、新增中文/NFC/保留名/长度相关用例。
- **文档**：`skills/README.md` — 增加中文示例与 shell 引号提示。
- **历史**：`openspec/changes/multi-account-profiles/design.md` — D2 增加"已由 allow-chinese-profile-names 反转"指针，保持可追溯。
