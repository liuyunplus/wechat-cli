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
  expiresAt: number; // Unix timestamp in ms
}

export const DEFAULT_API_BASE_URL = 'https://api.weixin.qq.com';

export const DEFAULT_CONFIG: AppConfig = {
  appId: '',
  appSecret: '',
  accountType: 'service',
  apiBaseUrl: DEFAULT_API_BASE_URL,
};

export const PROFILE_NAME_REGEX = /^[a-z0-9][a-z0-9-]*$/;
export const DEFAULT_PROFILE_NAME = 'default';

export const CONFIG_DIR = join(homedir(), '.wechat-cli');
export const PROFILES_DIR = join(CONFIG_DIR, 'profiles');
export const TOKENS_DIR = join(CONFIG_DIR, 'tokens');
export const ACTIVE_FILE = join(CONFIG_DIR, 'active.json');
export const LEGACY_CONFIG_FILE = join(CONFIG_DIR, 'config.json');
export const LEGACY_TOKEN_FILE = join(CONFIG_DIR, 'token.json');
