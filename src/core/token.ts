import axios from 'axios';
import { AppConfig, TokenCache, DEFAULT_API_BASE_URL } from '../types/config.js';
import { AccessTokenResponse } from '../types/wechat-api.js';
import { loadConfig, loadTokenCache, saveTokenCache, resolveProfile } from './config.js';
import { TokenError, WechatApiError } from './error.js';

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

export async function getAccessToken(profileName?: string): Promise<string> {
  const name = profileName || resolveProfile();
  const cached = loadTokenCache(name);

  if (cached && cached.accessToken && Date.now() < cached.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
    return cached.accessToken;
  }

  return refreshAccessToken(name);
}

export async function refreshAccessToken(profileName?: string): Promise<string> {
  const name = profileName || resolveProfile();
  const config = loadConfig(name);
  return fetchAndCacheToken(config, name);
}

async function fetchAndCacheToken(config: AppConfig, profileName: string): Promise<string> {
  const baseUrl = config.apiBaseUrl || DEFAULT_API_BASE_URL;
  const url = `${baseUrl}/cgi-bin/token`;

  try {
    const resp = await axios.get<AccessTokenResponse>(url, {
      params: {
        grant_type: 'client_credential',
        appid: config.appId,
        secret: config.appSecret,
      },
    });

    const data = resp.data;

    if (data.errcode && data.errcode !== 0) {
      throw new WechatApiError(data.errcode, data.errmsg || 'Unknown error');
    }

    if (!data.access_token) {
      throw new TokenError('获取 Access Token 失败：响应中无 access_token');
    }

    const tokenCache: TokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    saveTokenCache(tokenCache, profileName);
    return data.access_token;
  } catch (err) {
    if (err instanceof WechatApiError || err instanceof TokenError) {
      throw err;
    }
    throw new TokenError(
      `获取 Access Token 失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
