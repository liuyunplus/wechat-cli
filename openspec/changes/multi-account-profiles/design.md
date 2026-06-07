## Context

当前架构是单账号模型：`~/.wechat-cli/config.json` 和 `~/.wechat-cli/token.json` 各自只存一份配置和 token。虽然 `--config` 全局选项已支持指定自定义路径，但缺乏工具层管理，每次切换账号需手动传递路径。

约束：
- 用户管理 2-3 个公众号，切换频繁
- CLI 面向 AI Agent，需要 JSON 输出携带 profile 上下文
- 每次命令只操作一个公众号，批量操作采用循环切换方式
- 需兼容旧版单文件配置（自动迁移）

## Goals / Non-Goals

**Goals:**
- 支持通过命名 profile 管理多个公众号的独立配置和 token 缓存
- 提供简洁的 CLI 命令来创建、切换、列出、删除 profile
- 全局 `--profile` 选项允许单次覆盖，无需修改默认值
- 所有 JSON 输出注入 `profile` 字段
- 旧版 `config.json` + `token.json` 自动迁移到 profiles 目录

**Non-Goals:**
- 不同 profile 之间不共享配置（每个 profile 完全独立）
- 不支持同一命令同时操作多个公众号
- 不支持 profile 级别的 API Base URL 单独配置（当前 `apiBaseUrl` 始终为 `https://api.weixin.qq.com`）
- 不改变现有命令的语义（auth/draft/media/stats 等），仅增加 profile 感知

## Decisions

### D1: 文件结构 — `profiles/<name>.json` + `tokens/<name>.json` + `active.json`

```
~/.wechat-cli/
├── profiles/
│   ├── default.json
│   ├── tech-blog.json
│   └── news.json
├── tokens/
│   ├── default.json
│   ├── tech-blog.json
│   └── news.json
└── active.json      # 内容: "news" 或 "default"
```

**为什么选这个而不是单文件多账号？**
- 每个 profile 的 AppSecret 独立存放，安全性更好
- 文件操作简单（CRUD 即文件 CRUD），无需解析 JSON 合并
- 扩展性好：未来可以给 profile 增加独立配置项不影响其他

**为什么 active 单独一个文件而不是写在 config 里？**
- `active.json` 是全局状态，不属于任何一个 profile
- 读写简单（单个 string），不污染 profiles 数据

**为什么 tokens/ 目录不合并到 profiles/？**
- 职责分离：profiles 持久的配置（用户管理），tokens 是运行时缓存（系统管理）
- 删除 profile 时可以各自独立清理

### D2: Profile 命名规则

Profile 名 = 文件名（不含 `.json`），限制 `[a-z0-9][a-z0-9-]*`（小写字母数字+连字符），即 slug 风格。保留名 `"default"` 用于旧版迁移。

**备选方案**：允许中文名。但 CLI 中中文名输入不便，且文件系统编码问题多，决定不做。

> **已被反转**：见 `openspec/changes/allow-chinese-profile-names/`，将字符集扩展为 `^[A-Za-z0-9_\-\p{Script=Han}]+$/u`，并对名称做 NFC 规范化，2026-06-06 起生效。

### D3: `--profile` 与 `--config` 的关系

- `--profile <name>`：指定 profile 名，自动映射到 `profiles/<name>.json` 和 `tokens/<name>.json`
- `--config <path>`：保留但降级为"高级用户直接指定配置文件路径"，不参与 profile 管理
- 优先级：`--config` > `--profile` > `active.json` > `"default"`

这样旧用户如果已经用 `--config` 手动管理多文件，行为不变。新用户用 `--profile` 获得完整体验。

### D4: Profile 感知注入点

Profile 解析发生在 CLI 启动层面的全局 pre-action hook 中，而不是每个命令内部：

```
CLI 启动 → 解析 --profile / --config / active.json
         → 确定 profileName
         → 注入到命令 context
              ├── 配置加载: loadConfig(profileName) → profiles/<name>.json
              ├── Token 获取: getAccessToken(profileName) → tokens/<name>.json
              └── JSON 输出: 自动附加 profile 字段
```

**为什么不在每个命令里手动处理？**
- 一致性：所有命令无需改代码就获得 profile 感知
- 不易遗漏：新增命令自动继承行为

### D5: JSON 输出注入 profile 字段

所有通过 `output()` 输出的 JSON 对象，在顶部自动注入 `"profile": "<当前 profile 名>"`。Agent 友好，无需每个命令单独处理。

实现方式：在 `output()` 内部判断 `format === 'json'` 时，将 profile 名注入到输出的顶层对象。

### D6: 旧版迁移策略

在 `loadConfig()` 中检测：
1. 如果 `profiles/` 目录不存在但旧 `config.json` 存在 → 自动执行迁移
2. 将 `config.json` 复制为 `profiles/default.json`
3. 将 `token.json` 复制为 `tokens/default.json`
4. 写入 `active.json` 内容 `"default"`
5. 不删除旧文件（用户手动清理），仅打印提示

迁移是**幂等的**：已迁移则跳过。

## Risks / Trade-offs

- **[R] 旧版用户升级后首次运行会触发迁移** → 打印清晰的迁移提示，不删除旧文件，方便回退
- **[R] `active.json` 损坏或内容指向不存在的 profile** → 回退到 `"default"`，如果 default 也不存在则提示 `config init`
- **[R] 两个终端同时切换 active profile 可能冲突** → 实际上 CLI 是单次调用，`--profile` 每次都能覆盖，`active.json` 只是默认值，冲突概率极低且影响微弱
- **[R] 新增 profile 字段可能破坏 JSON 输出解析** → 兼容策略：`profile` 是仅在 JSON 模式下附加的顶层字段，不嵌套在任何已有结构中，消费者可选择忽略

## Open Questions

1. `config delete` 删除 profile 时是否同时清除 token 缓存？→ **是**，一起删，否则 token 残留无意义。
2. 是否需要 `config show` 显示当前 profile？→ **是**，在输出中增加当前 profile 名。
