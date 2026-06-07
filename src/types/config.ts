import { homedir } from 'node:os';
import { join } from 'node:path';

export type AccountType = 'subscription' | 'service';

export interface AppConfig {
  appId: string;
  appSecret: string;
  accountType: AccountType;
  apiBaseUrl: string;
  [key: string]: unknown;
}

export interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export interface ProfileNameValidation {
  valid: boolean;
  reason?: string;
}

export const DEFAULT_API_BASE_URL = 'https://api.weixin.qq.com';

export const DEFAULT_CONFIG: AppConfig = {
  appId: '',
  appSecret: '',
  accountType: 'service',
  apiBaseUrl: DEFAULT_API_BASE_URL,
};

export const PROFILE_NAME_REGEX = /^[A-Za-z0-9_\-\p{Script=Han}]+$/u;
export const PROFILE_NAME_MAX_LENGTH = 64;
export const DEFAULT_PROFILE_NAME = 'default';
export const RESERVED_PROFILE_NAMES = new Set<string>(['__custom__']);

export function normalizeProfileName(name: string): string {
  return name.trim().normalize('NFC');
}

export function validateProfileName(name: string): ProfileNameValidation {
  if (typeof name !== 'string') {
    return { valid: false, reason: 'Profile 名称必须为字符串' };
  }

  const normalized = name.trim();

  if (normalized.length === 0) {
    return { valid: false, reason: 'Profile 名称不能为空' };
  }

  if (normalized.length > PROFILE_NAME_MAX_LENGTH) {
    return {
      valid: false,
      reason: `Profile 名称长度不能超过 ${PROFILE_NAME_MAX_LENGTH} 字符`,
    };
  }

  if (RESERVED_PROFILE_NAMES.has(normalized)) {
    return { valid: false, reason: `'${normalized}' 是保留名，不能用作 profile 名称` };
  }

  if (!PROFILE_NAME_REGEX.test(normalized)) {
    return {
      valid: false,
      reason: 'Profile 名称不合法：支持中英文、数字、下划线和连字符（1–64 字符）',
    };
  }

  return { valid: true };
}

export const CONFIG_DIR = join(homedir(), '.wechat-cli');
export const PROFILES_DIR = join(CONFIG_DIR, 'profiles');
export const TOKENS_DIR = join(CONFIG_DIR, 'tokens');
export const ACTIVE_FILE = join(CONFIG_DIR, 'active.json');
export const LEGACY_CONFIG_FILE = join(CONFIG_DIR, 'config.json');
export const LEGACY_TOKEN_FILE = join(CONFIG_DIR, 'token.json');
