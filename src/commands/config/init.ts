import { existsSync } from 'node:fs';
import { Command } from 'commander';
import inquirer from 'inquirer';
import {
  loadConfig,
  saveConfig,
  getProfileConfigPath,
  resolveProfile,
  loadActiveProfile,
  saveActiveProfile,
  listProfiles,
  deleteProfile,
} from '../../core/config.js';
import { output, success, info, warn } from '../../core/output.js';
import type { AppConfig, AccountType } from '../../types/config.js';
import {
  DEFAULT_CONFIG,
  normalizeProfileName,
  validateProfileName,
} from '../../types/config.js';
import type { GlobalOptions } from '../../types/common.js';

export function registerConfigCommands(program: Command): void {
  const config = program
    .command('config')
    .description('配置管理');

  config
    .command('init')
    .description('交互式初始化配置')
    .option('-p, --profile <name>', 'Profile 名称')
    .action(async (cmdOpts: { profile?: string }) => {
      const opts = program.opts<GlobalOptions & { profile?: string }>();
      const profileName = cmdOpts.profile || opts.profile;

      initConfig(profileName, opts);
    });

  config
    .command('use')
    .description('切换当前激活的 profile')
    .argument('<profile>', 'Profile 名称')
    .action((profile: string) => {
      const opts = program.opts<GlobalOptions>();

      const validation = validateProfileName(profile);
      if (!validation.valid) {
        warn(validation.reason || 'Profile 名称不合法', opts.quiet);
        process.exit(1);
      }
      const normalized = normalizeProfileName(profile);

      const configPath = getProfileConfigPath(normalized);
      if (!existsSync(configPath)) {
        warn(`Profile '${normalized}' 不存在，请先运行 wechat-cli config init --profile ${normalized}`, opts.quiet);
        process.exit(1);
      }

      saveActiveProfile(normalized);
      success(`已切换到 profile '${normalized}'`, opts.quiet);
    });

  config
    .command('list')
    .description('列出所有 profile')
    .action(() => {
      const opts = program.opts<GlobalOptions>();
      const profiles = listProfiles();

      if (profiles.length === 0) {
        info('暂无 profile，请运行 wechat-cli config init 创建', opts.quiet);
        return;
      }

      output(
        {
          active: loadActiveProfile(),
          profiles: profiles.map(p => ({
            name: p.name,
            active: p.active,
          })),
        },
        { format: opts.format, quiet: opts.quiet },
      );
    });

  config
    .command('delete')
    .description('删除 profile 及关联的 token 缓存')
    .argument('<profile>', 'Profile 名称')
    .action((profile: string) => {
      const opts = program.opts<GlobalOptions>();

      const validation = validateProfileName(profile);
      if (!validation.valid) {
        warn(validation.reason || 'Profile 名称不合法', opts.quiet);
        process.exit(1);
      }
      const normalized = normalizeProfileName(profile);

      if (!existsSync(getProfileConfigPath(normalized))) {
        warn(`Profile '${normalized}' 不存在`, opts.quiet);
        process.exit(1);
      }

      deleteProfile(normalized);

      const active = loadActiveProfile();
      const msg = active
        ? `Profile '${normalized}' 已删除，当前 active: '${active}'`
        : `Profile '${normalized}' 已删除（该 profile 曾是默认激活项，请使用 config use 切换）`;

      success(msg, opts.quiet);
    });

  config
    .command('get')
    .description('查看配置项')
    .argument('<key>', '配置项名称')
    .action((key: string) => {
      const opts = program.opts<GlobalOptions>();
      const cfg = loadConfig(resolveProfile({ profile: opts.profile, config: opts.config }));
      const value = (cfg as Record<string, unknown>)[key];
      if (value === undefined) {
        info(`配置项 "${key}" 不存在`, opts.quiet);
      } else {
        output({ key: value }, { format: opts.format, quiet: opts.quiet });
      }
    });

  config
    .command('set')
    .description('设置配置项')
    .argument('<key>', '配置项名称')
    .argument('<value>', '配置值')
    .action((key: string, value: string) => {
      const opts = program.opts<GlobalOptions>();
      const profileName = resolveProfile({ profile: opts.profile, config: opts.config });
      const cfg = loadConfig(profileName);
      (cfg as Record<string, unknown>)[key] = value;
      saveConfig(cfg, profileName);
      success(`已设置 ${key} = ${value}`, opts.quiet);
    });

  config
    .command('show')
    .description('显示所有配置')
    .action(() => {
      const opts = program.opts<GlobalOptions>();
      const profileName = resolveProfile({ profile: opts.profile, config: opts.config });
      const cfg = loadConfig(profileName);
      const display = {
        ...cfg,
        appSecret: cfg.appSecret ? cfg.appSecret.substring(0, 4) + '****' : '',
        profile: profileName,
      };
      output(display, { format: opts.format, quiet: opts.quiet });
    });
}

async function initConfig(
  profileName: string | undefined,
  opts: GlobalOptions,
): Promise<void> {
  const resolvedName = profileName
    ? normalizeProfileName(profileName)
    : resolveProfile({ profile: opts.profile, config: opts.config });

  if (profileName) {
    const validation = validateProfileName(resolvedName);
    if (!validation.valid) {
      warn(validation.reason || `Profile 名称不合法: "${profileName}"`, opts.quiet);
      process.exit(1);
    }
  }

  let existing: Partial<AppConfig> = {};
  try {
    existing = loadConfig(resolvedName);
  } catch {
    // No existing config, that's fine
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'appId',
      message: 'AppID:',
      default: existing.appId || '',
      validate: (input: string) => input.trim() ? true : 'AppID 不能为空',
    },
    {
      type: 'input',
      name: 'appSecret',
      message: 'AppSecret:',
      default: existing.appSecret || '',
      validate: (input: string) => input.trim() ? true : 'AppSecret 不能为空',
    },
    {
      type: 'list',
      name: 'accountType',
      message: '账号类型:',
      choices: [
        { name: '服务号 (Service)', value: 'service' },
        { name: '订阅号 (Subscription)', value: 'subscription' },
      ],
      default: existing.accountType || 'service',
    },
  ]);

  const appConfig: AppConfig = {
    ...DEFAULT_CONFIG,
    appId: answers.appId.trim(),
    appSecret: answers.appSecret.trim(),
    accountType: answers.accountType as AccountType,
  };

  saveConfig(appConfig, resolvedName);
  success(`配置已保存到 ${getProfileConfigPath(resolvedName)}`, opts.quiet);
}
