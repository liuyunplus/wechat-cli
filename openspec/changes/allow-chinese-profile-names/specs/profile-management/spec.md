## MODIFIED Requirements

### Requirement: 创建命名 Profile

用户 SHALL 能够通过 `config init --profile <name>` 创建一个新的命名 profile。profile 名称 SHALL 满足以下规则：

- 允许字符：ASCII 字母（A–Z、a–z）、数字（0–9）、下划线（`_`）、连字符（`-`）、CJK 汉字（Han 脚本）。
- 长度限制：1–64 字符。
- 首字符 SHALL 在允许字符集合内（不允许以 `.` 起头，不允许空字符串）。
- 保留名 `__custom__` SHALL 显式禁用（被 CLI 内部 sentinel 占用）。
- 名称在保存与查找时均经过 `trim()` + Unicode NFC 规范化，跨平台稳定。

#### Scenario: 创建中文 profile

- **WHEN** 用户执行 `wechat-cli config init --profile "技术博客"` 并完成交互式输入
- **THEN** 系统在 `~/.wechat-cli/profiles/技术博客.json` 保存配置
- **AND** 不自动切换 active profile

#### Scenario: 创建混合字符 profile

- **WHEN** 用户执行 `wechat-cli config init --profile "TechBlog_2024"` 或 `--profile "科技-news"`
- **THEN** 系统在 `~/.wechat-cli/profiles/TechBlog_2024.json`（或 `科技-news.json`）保存配置

#### Scenario: 创建 profile 时名称冲突

- **WHEN** 用户执行 `wechat-cli config init --profile tech-blog` 但该 profile 已存在
- **THEN** 系统提示 "Profile 'tech-blog' 已存在"，并在交互中预填现有配置值供修改

#### Scenario: profile 名称不合法（包含非法字符）

- **WHEN** 用户执行 `wechat-cli config init --profile "tech blog"`（含空格）或 `--profile "../etc/passwd"`（含路径分隔符）
- **THEN** 系统提示名称不合法，要求使用中英文、数字、下划线和连字符（1–64 字符）

#### Scenario: profile 名称为保留名

- **WHEN** 用户执行 `wechat-cli config init --profile __custom__`
- **THEN** 系统提示 `__custom__` 是保留名，不能用作 profile 名

### Requirement: Profile 名称 Unicode 规范化

无论用户以何种 Unicode 形式（NFC / NFD）输入 profile 名称，CLI SHALL 在保存与查找路径中统一使用 NFC 形式，确保 `active.json` 内容、磁盘文件名、JSON 输出 `profile` 字段三者字符序列一致。

#### Scenario: NFD 输入被规范化为 NFC

- **WHEN** 用户以 NFD 形式输入 profile 名（例如某些 macOS 工具产生的分解形式）
- **THEN** CLI 内部以 NFC 形式保存与后续查找
- **AND** 用户后续用 NFC 或 NFD 任一形式查询都能匹配到同一 profile

#### Scenario: 名称前后空白被去除

- **WHEN** 用户输入 `"  技术博客  "`（含前后空格）
- **THEN** CLI 存储为 `"技术博客"`，文件路径为 `~/.wechat-cli/profiles/技术博客.json`
