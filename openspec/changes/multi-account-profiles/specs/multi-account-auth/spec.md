## ADDED Requirements

### Requirement: 按 Profile 隔离 Token 缓存

每个 profile 的 Access Token 缓存 SHALL 独立存储在 `~/.wechat-cli/tokens/<profile>.json` 中，不同 profile 之间的 token 互不影响。

#### Scenario: 不同 profile 持有独立 token

- **WHEN** profile `tech-blog` 已认证且 token 有效
- **AND** profile `news` 已认证且 token 有效
- **THEN** 两个 token 互不相同，互不干扰
- **AND** 切换 profile 不会导致另一方 token 失效或被覆盖

#### Scenario: token 过期自动刷新（按 profile）

- **WHEN** 当前 active profile 的 token 已过期或将在 5 分钟内过期
- **AND** 用户执行需要认证的命令
- **THEN** 系统仅刷新当前 profile 的 token
- **AND** 其他 profile 的 token 不受影响

### Requirement: `auth login` 按 Profile 认证

`auth login` 命令 SHALL 使用当前确定的 profile 配置来获取 Access Token 并缓存到对应的 token 文件。

#### Scenario: 使用 active profile 认证

- **WHEN** 当前 active profile 为 `news`
- **AND** 用户执行 `wechat-cli auth login`（不带 `--profile`）
- **THEN** 系统使用 `profiles/news.json` 的 AppID/AppSecret 获取 token
- **AND** 缓存到 `tokens/news.json`

#### Scenario: 使用 --profile 覆盖认证

- **WHEN** 用户执行 `wechat-cli auth login --profile tech-blog`
- **THEN** 系统使用 `profiles/tech-blog.json` 的配置获取 token
- **AND** 缓存到 `tokens/tech-blog.json`
- **AND** 不影响 active profile 的设置

### Requirement: `auth status` 按 Profile 查询

`auth status` 命令 SHALL 显示当前 profile 的认证状态。

#### Scenario: 查看 active profile 认证状态

- **WHEN** 当前 active profile 为 `news` 且 token 有效
- **AND** 用户执行 `wechat-cli auth status`
- **THEN** 系统显示 profile `news` 的认证状态：已认证、token 预览、过期时间、剩余分钟数
- **AND** JSON 模式下输出包含 `"profile": "news"` 字段

#### Scenario: 查看指定 profile 认证状态

- **WHEN** 用户执行 `wechat-cli auth status --profile tech-blog`
- **THEN** 系统显示 profile `tech-blog` 的认证状态
- **AND** JSON 模式下输出包含 `"profile": "tech-blog"` 字段

### Requirement: `auth logout` 按 Profile 清除

`auth logout` 命令 SHALL 清除当前 profile 的 token 缓存。

#### Scenario: 清除 active profile 的 token

- **WHEN** 用户执行 `wechat-cli auth logout`
- **THEN** 系统清除当前 active profile 对应的 `tokens/<profile>.json`
- **AND** 不影响其他 profile 的 token 缓存

### Requirement: Profile 感知的用户信息

所有通过微信 API 获取的用户相关数据（如用户列表、用户信息）SHALL 在 JSON 输出中包含 `"profile"` 字段，使 Agent 能区分数据来源。

#### Scenario: 草稿列表输出含 profile

- **WHEN** 用户执行 `wechat-cli draft list --format json --quiet --profile news`
- **THEN** JSON 输出顶层包含 `"profile": "news"` 字段

#### Scenario: 素材列表输出含 profile

- **WHEN** 用户执行 `wechat-cli media list --type image --format json --quiet`
- **AND** 当前 active profile 为 `tech-blog`
- **THEN** JSON 输出顶层包含 `"profile": "tech-blog"` 字段

#### Scenario: 数据统计输出含 profile

- **WHEN** 用户执行 `wechat-cli stats user --begin-date 2026-01-01 --end-date 2026-01-07 --format json --quiet`
- **THEN** JSON 输出顶层包含当前 profile 名称

### Requirement: `--profile` 全局选项

所有命令 SHALL 支持 `--profile <name>` 选项来覆盖当前激活的 profile，仅对本次调用生效。

#### Scenario: --profile 覆盖 active profile

- **WHEN** active profile 为 `default`
- **AND** 用户执行 `wechat-cli draft list --profile news`
- **THEN** 系统使用 `profiles/news.json` 的配置和 `tokens/news.json` 的 token
- **AND** active profile 保持为 `default` 不变

#### Scenario: --profile 指向不存在的 profile

- **WHEN** 用户执行 `wechat-cli draft list --profile nonexistent`
- **THEN** 系统提示 "Profile 'nonexistent' 不存在"
- **AND** 退出码非零
