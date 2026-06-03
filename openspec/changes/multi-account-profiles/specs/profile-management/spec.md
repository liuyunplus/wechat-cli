## ADDED Requirements

### Requirement: 创建命名 Profile

用户 SHALL 能够通过 `config init --profile <name>` 创建一个新的命名 profile。profile 名称限制为小写字母、数字和连字符（slug 格式），且不能与已有 profile 重名。

#### Scenario: 创建新 profile

- **WHEN** 用户执行 `wechat-cli config init --profile tech-blog` 并完成交互式输入（AppID、AppSecret、账号类型）
- **THEN** 系统在 `~/.wechat-cli/profiles/tech-blog.json` 保存配置
- **AND** 不自动切换 active profile

#### Scenario: 创建 profile 时名称冲突

- **WHEN** 用户执行 `wechat-cli config init --profile tech-blog` 但该 profile 已存在
- **THEN** 系统提示 "Profile 'tech-blog' 已存在"，并在交互中预填现有配置值供修改

#### Scenario: profile 名称不合法

- **WHEN** 用户执行 `wechat-cli config init --profile 技术博客`（包含中文）
- **THEN** 系统提示名称不合法，要求使用小写字母、数字和连字符

### Requirement: 列出所有 Profile

用户 SHALL 能够通过 `config list` 列出所有已创建的 profile 及其状态。

#### Scenario: 列出 profiles

- **WHEN** 用户执行 `wechat-cli config list`
- **THEN** 系统列出所有 `profiles/` 目录下的 profile
- **AND** 标记当前 active profile（如 `* tech-blog`）
- **AND** 在 JSON 模式下输出 `{ "active": "tech-blog", "profiles": [...] }`

#### Scenario: 无 profile 时列出

- **WHEN** 用户执行 `wechat-cli config list` 但 `profiles/` 目录为空
- **THEN** 系统提示 "暂无 profile，请运行 wechat-cli config init 创建"

### Requirement: 切换激活的 Profile

用户 SHALL 能够通过 `config use <profile>` 切换当前默认激活的 profile，后续命令无需 `--profile` 即可操作该公众号。

#### Scenario: 切换 profile

- **WHEN** 用户执行 `wechat-cli config use news`
- **THEN** 系统将 `active.json` 内容更新为 `"news"`
- **AND** 提示 "已切换到 profile 'news'"

#### Scenario: 切换到不存在的 profile

- **WHEN** 用户执行 `wechat-cli config use nonexistent`
- **THEN** 系统提示 "Profile 'nonexistent' 不存在，请先运行 wechat-cli config init --profile nonexistent"

### Requirement: 删除 Profile

用户 SHALL 能够通过 `config delete <profile>` 删除指定 profile 及其关联的 token 缓存。

#### Scenario: 删除 profile

- **WHEN** 用户执行 `wechat-cli config delete tech-blog`
- **THEN** 系统删除 `profiles/tech-blog.json` 和 `tokens/tech-blog.json`
- **AND** 如果删除的是 active profile，清空 `active.json` 并提示用户重新切换

#### Scenario: 删除不存在的 profile

- **WHEN** 用户执行 `wechat-cli config delete nonexistent`
- **THEN** 系统提示 "Profile 'nonexistent' 不存在"

### Requirement: Profile 感知的配置显示

`config show` 和 `config get` 命令 SHALL 显示当前 profile 的上下文信息。

#### Scenario: 显示当前 profile 配置

- **WHEN** 用户执行 `wechat-cli config show`
- **THEN** 系统在输出中标识当前使用的 profile 名称
- **AND** AppSecret 脱敏显示

### Requirement: 旧版配置自动迁移

当系统检测到旧版 `config.json` 存在但 `profiles/` 目录不存在时，SHALL 自动将旧配置迁移为 `default` profile。

#### Scenario: 首次升级自动迁移

- **WHEN** 存在 `~/.wechat-cli/config.json` 但不存在 `~/.wechat-cli/profiles/` 目录
- **AND** CLI 执行任何需要加载配置的命令
- **THEN** 系统自动将 `config.json` 迁移为 `profiles/default.json`
- **AND** 将 `token.json`（如果存在）迁移为 `tokens/default.json`
- **AND** 写入 `active.json` 内容 `"default"`
- **AND** 打印迁移提示信息

#### Scenario: 已迁移后不再重复

- **WHEN** `profiles/` 目录已存在且包含 `default.json`
- **THEN** 系统不执行迁移，正常按 profile 模式工作
