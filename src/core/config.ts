import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  AppConfig,
  TokenCache,
  DEFAULT_CONFIG,
  DEFAULT_PROFILE_NAME,
  PROFILE_NAME_REGEX,
  CONFIG_DIR,
  PROFILES_DIR,
  TOKENS_DIR,
  ACTIVE_FILE,
  LEGACY_CONFIG_FILE,
  LEGACY_TOKEN_FILE,
} from '../types/config.js';
import type { ProfileMeta } from '../types/profile.js';
import { ConfigError } from './error.js';

let currentProfileName: string | undefined;

export function getCurrentProfileName(): string | undefined {
  return currentProfileName;
}

export function setCurrentProfileName(name: string): void {
  currentProfileName = name;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getProfilesDir(): string {
  return PROFILES_DIR;
}

export function getTokensDir(): string {
  return TOKENS_DIR;
}

export function getActivePath(): string {
  return ACTIVE_FILE;
}

export function getProfileConfigPath(name: string): string {
  return join(PROFILES_DIR, `${name}.json`);
}

export function getProfileTokenPath(name: string): string {
  return join(TOKENS_DIR, `${name}.json`);
}

export function getConfigPath(customPath?: string): string {
  return customPath || getProfileConfigPath(DEFAULT_PROFILE_NAME);
}

function isCustomPath(path: string): boolean {
  return path.includes('/') || path.includes('.json') || path.includes('\\');
}

export function resolveProfile(opts?: { profile?: string; config?: string }): string {
  if (opts?.config && isCustomPath(opts.config)) {
    setCurrentProfileName('__custom__');
    return '__custom__';
  }

  if (opts?.profile) {
    const name = opts.profile.trim();
    if (!PROFILE_NAME_REGEX.test(name)) {
      throw new ConfigError(
        `Profile 名称不合法: "${name}"。仅支持小写字母、数字和连字符（例如 tech-blog）`,
      );
    }
    setCurrentProfileName(name);
    return name;
  }

  if (opts?.config) {
    const name = opts.config.trim();
    if (!PROFILE_NAME_REGEX.test(name)) {
      throw new ConfigError(
        `Profile 名称不合法: "${name}"。仅支持小写字母、数字和连字符（例如 tech-blog）`,
      );
    }
    setCurrentProfileName(name);
    return name;
  }

  const active = loadActiveProfile();
  setCurrentProfileName(active);
  return active;
}

export function loadActiveProfile(): string {
  if (!existsSync(ACTIVE_FILE)) {
    return DEFAULT_PROFILE_NAME;
  }

  try {
    const raw = readFileSync(ACTIVE_FILE, 'utf-8').trim();
    if (!raw) return DEFAULT_PROFILE_NAME;

    const data = JSON.parse(raw);
    const name = typeof data === 'string' ? data : (data as { active?: string }).active;
    if (!name || !PROFILE_NAME_REGEX.test(name)) {
      return DEFAULT_PROFILE_NAME;
    }

    if (!existsSync(getProfileConfigPath(name))) {
      return DEFAULT_PROFILE_NAME;
    }

    return name;
  } catch {
    return DEFAULT_PROFILE_NAME;
  }
}

export function saveActiveProfile(name: string): void {
  ensureDir(CONFIG_DIR);
  writeFileSync(ACTIVE_FILE, JSON.stringify(name, null, 2) + '\n', 'utf-8');
}

export function clearActiveProfile(): void {
  if (existsSync(ACTIVE_FILE)) {
    unlinkSync(ACTIVE_FILE);
  }
}

export function listProfiles(): ProfileMeta[] {
  ensureDir(PROFILES_DIR);
  const active = loadActiveProfile();

  if (!existsSync(PROFILES_DIR)) {
    return [];
  }

  const files = readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json'));

  return files.map(file => {
    const name = file.replace(/\.json$/, '');
    return {
      name,
      configPath: getProfileConfigPath(name),
      tokenPath: getProfileTokenPath(name),
      active: name === active,
    };
  });
}

export function deleteProfile(name: string): void {
  const configPath = getProfileConfigPath(name);
  const tokenPath = getProfileTokenPath(name);

  if (!existsSync(configPath)) {
    throw new ConfigError(`Profile '${name}' 不存在`);
  }

  unlinkSync(configPath);

  if (existsSync(tokenPath)) {
    unlinkSync(tokenPath);
  }

  const active = loadActiveProfile();
  if (active === name) {
    clearActiveProfile();
  }
}

export function migrateLegacyConfig(): boolean {
  if (existsSync(PROFILES_DIR) && readdirSync(PROFILES_DIR).length > 0) {
    return false;
  }

  if (!existsSync(LEGACY_CONFIG_FILE)) {
    return false;
  }

  ensureDir(PROFILES_DIR);
  ensureDir(TOKENS_DIR);

  const raw = readFileSync(LEGACY_CONFIG_FILE, 'utf-8');
  const configPath = getProfileConfigPath(DEFAULT_PROFILE_NAME);
  writeFileSync(configPath, raw, 'utf-8');

  if (existsSync(LEGACY_TOKEN_FILE)) {
    try {
      const tokenRaw = readFileSync(LEGACY_TOKEN_FILE, 'utf-8');
      if (tokenRaw.trim()) {
        const tokenPath = getProfileTokenPath(DEFAULT_PROFILE_NAME);
        writeFileSync(tokenPath, tokenRaw, 'utf-8');
      }
    } catch {
      // token file may be empty or corrupted, skip
    }
  }

  saveActiveProfile(DEFAULT_PROFILE_NAME);

  return true;
}

function resolveConfigPath(profileName?: string): string {
  const name = profileName || resolveProfile();

  if (name === '__custom__' || isCustomPath(name)) {
    return name;
  }

  return getProfileConfigPath(name);
}

export function loadConfig(profileName?: string): AppConfig {
  if (profileName && isCustomPath(profileName)) {
    const configPath = profileName;
    if (!existsSync(configPath)) {
      throw new ConfigError(
        `配置文件不存在: ${configPath}\n请先运行 wechat-cli config init 初始化配置`,
      );
    }
    const raw = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw) as AppConfig;
    if (!config.appId || !config.appSecret) {
      throw new ConfigError('AppID 或 AppSecret 未配置，请运行 wechat-cli config init');
    }
    return { ...DEFAULT_CONFIG, ...config };
  }

  const configPath = resolveConfigPath(profileName);

  if (!existsSync(configPath)) {
    throw new ConfigError(
      `配置文件不存在: ${configPath}\n请先运行 wechat-cli config init 初始化配置`,
    );
  }

  const raw = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(raw) as AppConfig;

  if (!config.appId || !config.appSecret) {
    throw new ConfigError('AppID 或 AppSecret 未配置，请运行 wechat-cli config init');
  }

  return { ...DEFAULT_CONFIG, ...config };
}

export function saveConfig(config: AppConfig, profileName?: string): void {
  const name = profileName || resolveProfile();

  if (isCustomPath(name)) {
    writeFileSync(name, JSON.stringify(config, null, 2), 'utf-8');
  } else {
    ensureDir(PROFILES_DIR);
    const configPath = getProfileConfigPath(name);
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

export function loadTokenCache(profileName?: string): TokenCache | null {
  const name = profileName || resolveProfile();
  const tokenPath = name === '__custom__' || isCustomPath(name)
    ? join(CONFIG_DIR, 'token.json')
    : getProfileTokenPath(name);

  if (!existsSync(tokenPath)) {
    return null;
  }

  try {
    const raw = readFileSync(tokenPath, 'utf-8');
    if (!raw.trim()) return null;
    return JSON.parse(raw) as TokenCache;
  } catch {
    return null;
  }
}

export function saveTokenCache(token: TokenCache, profileName?: string): void {
  const name = profileName || resolveProfile();

  if (name === '__custom__' || isCustomPath(name)) {
    ensureDir(CONFIG_DIR);
    writeFileSync(join(CONFIG_DIR, 'token.json'), JSON.stringify(token, null, 2), 'utf-8');
  } else {
    ensureDir(TOKENS_DIR);
    const tokenPath = getProfileTokenPath(name);
    writeFileSync(tokenPath, JSON.stringify(token, null, 2), 'utf-8');
  }
}

export function clearTokenCache(profileName?: string): void {
  const name = profileName || resolveProfile();
  const tokenPath = name === '__custom__' || isCustomPath(name)
    ? join(CONFIG_DIR, 'token.json')
    : getProfileTokenPath(name);

  if (existsSync(tokenPath)) {
    writeFileSync(tokenPath, '', 'utf-8');
  }
}

export function getConfigValue(key: string, profileName?: string): string | undefined {
  const config = loadConfig(profileName);
  return (config as Record<string, unknown>)[key] as string | undefined;
}

export function setConfigValue(key: string, value: string, profileName?: string): void {
  const config = loadConfig(profileName);
  (config as Record<string, unknown>)[key] = value;
  saveConfig(config, profileName);
}
