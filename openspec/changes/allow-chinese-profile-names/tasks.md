## 1. 类型定义扩展

- [x] 1.1 在 `src/types/config.ts` 中将 `PROFILE_NAME_REGEX` 替换为 `/^[A-Za-z0-9_\-\p{Script=Han}]+$/u`
- [x] 1.2 新增 `PROFILE_NAME_MAX_LENGTH = 64` 常量
- [x] 1.3 新增 `RESERVED_PROFILE_NAMES = new Set(['__custom__'])` 常量
- [x] 1.4 新增 `normalizeProfileName(name: string): string`（trim + NFC）
- [x] 1.5 新增 `validateProfileName(name: string): { valid: boolean; reason?: string }` 集中校验

## 2. 核心配置模块改造

- [x] 2.1 `src/core/config.ts` 的 `resolveProfile()`：对 `opts.profile` / `opts.config` 先 `normalizeProfileName` 再 `validateProfileName`
- [x] 2.2 `saveActiveProfile(name)`：写入前规范化
- [x] 2.3 `loadActiveProfile()`：读取后规范化再校验
- [x] 2.4 `listProfiles()`：扫描文件后通过 `normalizeProfileName` 输出统一形式
- [x] 2.5 错误文案统一为「支持中英文、数字、下划线和连字符（1–64 字符），且不能使用保留名」

## 3. Config 命令改造

- [x] 3.1 `src/commands/config/init.ts` 中 `init` / `use` / `delete` 三个子命令的参数入口走 `normalize + validate` 流程
- [x] 3.2 校验失败时 `warn` 输出 `validateProfileName` 返回的原因

## 4. 测试

- [x] 4.1 `tests/core/profile.test.ts`：修改「reject invalid profile name」断言（移除中文负例，保留空格负例，新增其他负例）
- [x] 4.2 新增正向用例：中文、大小写英文含 `-`/`_`、纯中文、`default`
- [x] 4.3 新增反向用例：`__custom__`、含 `/`、含 `\`、以 `.` 起头、超长 65 字符、空字符串
- [x] 4.4 新增 NFC 用例：NFD 输入被存储为 NFC，`saveActiveProfile` + `loadActiveProfile` 一致
- [x] 4.5 运行 `npm test` 全量验证

## 5. 文档与历史

- [x] 5.1 `skills/README.md` 增加中文示例与 shell 引号提示
- [x] 5.2 `openspec/changes/multi-account-profiles/design.md` D2 段尾追加「已被 allow-chinese-profile-names 反转」指针
