## Context

`profile-management` 能力首次设计时（见 `openspec/changes/multi-account-profiles/design.md` D2）将 profile 名称限制为 slug：`/^[a-z0-9][a-z0-9-]*$/`，理由是「中文输入不便 + 文件系统编码问题多」。实际使用中该决策不必要地限制了体验：

- 多数公众号品牌本身就是中文，要求用户用拼音或英文 slug 是反向工作。
- 配置文件位于 `~/.wechat-cli/`，对应文件系统在主流平台（APFS / ext4 / NTFS）均原生支持 UTF-8 文件名。
- 终端 UTF-8 渲染早已是默认行为，shell 中加引号即可（`--profile "技术博客"`）。

目标：把命名规则扩展为支持 CJK Han 脚本 + ASCII 字母数字 + `-` + `_`，并对存储形式做 Unicode NFC 规范化，保证跨平台一致。

## Goals / Non-Goals

**Goals:**
- 接受中文 profile 名（以及大小写英文、数字、`-`、`_`）。
- 名称在保存/查找时统一使用 NFC 形式。
- 保留 `default` 旧版迁移目标，向后兼容所有现有 slug 风格 profile。
- 保留 `__custom__` 作为内部 sentinel，不允许用户占用。
- 错误信息清晰告知新规则。

**Non-Goals:**
- 不支持 emoji、控制字符、空格、`/ \ : * ? " < > |` 等文件系统不合法或语义不明字符。
- 不引入国际化文案（保持中文错误信息，符号用法与现有命令一致）。
- 不改变 file 存储目录结构或 token 缓存策略。
- 不做旧数据迁移（slug 名称自动满足新规则）。

## Decisions

### D7: 字符集合 — CJK Han + ASCII 字母数字 + `-` + `_`

正则：`/^[A-Za-z0-9_\-\p{Script=Han}]+$/u`，长度 1–64 字符。

- 使用 Unicode property escape `\p{Script=Han}`（Node.js 18+ 原生支持）以覆盖中日韩汉字。
- 大小写英文均允许（提升灵活性），同时保持 slug 风格（`-` 仍合法）。
- 显式排除：emoji、其他 Unicode 脚本（Latin 扩展、希腊文等），因其并非本场景所需且容易导致名称混淆。
- 显式排除：`.`、空格、`/` 等文件系统非法字符（被正则外加业务层校验兜底）。

**为什么排除 emoji？**
- 终端显示宽度不一致，影响 CLI 表格对齐。
- 文件名编码长度膨胀（部分 emoji 是 4 字节序列），增加跨平台工具链复杂度。
- 业务上无此需求。

**为什么不直接用 `\p{L}`（任意字母）？**
- 会意外允许希腊文、阿拉伯文、西里尔文等，与"中文 + 英文"的核心需求不符，且当用户误输入时不易察觉。
- 显式白名单更易测试与文档化。

### D8: 保留名与边界

- `__custom__`：保留为代码内部 sentinel（`src/core/config.ts:69`），用户层面显式禁用。
- `default`：保留为旧版迁移目标名，**仍然合法**。
- `.` / `..`：被正则（首字符必须为允许字符之一）自然拒绝。
- 长度上限 64 字符：避免极端情况下的文件名过长问题（UTF-8 编码汉字最多 3 字节，64 字符 ≤ 192 字节，加上 `.json` 后 ≤ 197 字节，远低于 255 字节限制）。

### D9: Unicode NFC 规范化

所有写入与读取路径都先经过 `normalizeProfileName(name) = name.trim().normalize('NFC')`。

**为什么需要 NFC？**
- macOS APFS 历史上使用 NFD（分解形式）存储文件名（虽然现代 macOS 已切换为默认 NFC，但旧文件、跨设备同步、外部工具仍可能产生 NFD）。
- Linux ext4 与 Windows NTFS 普遍使用 NFC。
- 例如「技术」字符串的 NFD 形式（`\u6280\u672f` 已在 NFC 中，但某些汉字如「为」在少数平台可能 NFD 化为「为」= `为`）。如果不做规范化，理论上可能出现「同一逻辑名 → 多个文件」的情况。
- 在所有写入点统一 NFC，可确保 `active.json`、磁盘文件名、JSON 输出中的 `profile` 字段三处保持一致字符串。

**为什么不强制 NFD？**
- 实际场景中 NFC 是更通用的"显示形式"，NFD 是 macOS 历史遗留。
- 接受 `NFD` 输入但存储为 `NFC`，对用户透明且跨平台最稳定。

### D10: 校验位置

集中到 `validateProfileName(name)` 工具函数（`src/types/config.ts`）：

1. `name.trim()` 之后再校验（防止"看起来为空"）。
2. 长度检查。
3. 正则检查。
4. 保留名检查。

返回 `{ valid: boolean; reason?: string }`，所有调用点（`resolveProfile`、`config init`、`config use`、`config delete`）共用同一套文案，避免规则漂移。

## Risks / Trade-offs

- **[R] shell tab 补全对中文支持参差** → 文档提示用户用引号包裹名称；不影响功能。
- **[R] `__custom__` 字符集本身在新规则下合法** → 通过 `RESERVED_PROFILE_NAMES` blocklist 显式拦截，错误信息明确。
- **[R] 现有 ASCII slug 名用户在升级后无感知** → 严格向后兼容，无迁移负担。
- **[R] 跨平台文件名编码差异** → NFC 规范化把多源编码统一为单一形式，最大限度避免。

## Open Questions

1. 是否需要新增 `config rename <old> <new>` 命令？→ **否**，超出本次需求范围。
2. 是否需要长度上限 64 字符外加可配置？→ **否**，64 已足够且固定更易测试。
