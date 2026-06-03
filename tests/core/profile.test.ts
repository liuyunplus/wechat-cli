import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_BASE = join(tmpdir(), 'wechat-cli-test-profile-' + Date.now());

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    homedir: () => TEST_BASE,
  };
});

beforeEach(() => {
  const profilesDir = join(TEST_BASE, '.wechat-cli', 'profiles');
  const tokensDir = join(TEST_BASE, '.wechat-cli', 'tokens');
  mkdirSync(profilesDir, { recursive: true });
  mkdirSync(tokensDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_BASE)) {
    rmSync(TEST_BASE, { recursive: true, force: true });
  }
});

function createProfile(name: string, appId = 'test-id', appSecret = 'test-secret'): void {
  const profilesDir = join(TEST_BASE, '.wechat-cli', 'profiles');
  writeFileSync(
    join(profilesDir, `${name}.json`),
    JSON.stringify({ appId, appSecret, accountType: 'service', apiBaseUrl: 'https://api.weixin.qq.com' }),
  );
}

function createToken(name: string, token = 'fake-token', expiresAt = 9999999999999): void {
  const tokensDir = join(TEST_BASE, '.wechat-cli', 'tokens');
  writeFileSync(
    join(tokensDir, `${name}.json`),
    JSON.stringify({ accessToken: token, expiresAt }),
  );
}

describe('profile-management', () => {
  it('should list profiles', async () => {
    const { listProfiles } = await import('../../src/core/config.js');
    createProfile('default');
    createProfile('tech-blog');
    createProfile('news');

    const profiles = listProfiles();
    expect(profiles.length).toBe(3);
    expect(profiles.map(p => p.name)).toContain('default');
    expect(profiles.map(p => p.name)).toContain('tech-blog');
    expect(profiles.map(p => p.name)).toContain('news');
  });

  it('should list empty when no profiles', async () => {
    const { listProfiles } = await import('../../src/core/config.js');
    const profiles = listProfiles();
    expect(profiles.length).toBe(0);
  });

  it('should save and load active profile', async () => {
    const { saveActiveProfile, loadActiveProfile, clearActiveProfile } = await import('../../src/core/config.js');
    createProfile('tech-blog');

    saveActiveProfile('tech-blog');
    expect(loadActiveProfile()).toBe('tech-blog');

    saveActiveProfile('default');
    expect(loadActiveProfile()).toBe('default');
  });

  it('should fallback to default when active is invalid', async () => {
    const { saveActiveProfile, loadActiveProfile } = await import('../../src/core/config.js');
    createProfile('default');

    saveActiveProfile('nonexistent');
    expect(loadActiveProfile()).toBe('default');
  });

  it('should fallback to default when active.json is missing', async () => {
    const { loadActiveProfile } = await import('../../src/core/config.js');
    createProfile('default');

    expect(loadActiveProfile()).toBe('default');
  });

  it('should delete profile and token', async () => {
    const { deleteProfile, listProfiles } = await import('../../src/core/config.js');
    createProfile('to-delete');
    createToken('to-delete');

    const tokensDir = join(TEST_BASE, '.wechat-cli', 'tokens');
    expect(existsSync(join(tokensDir, 'to-delete.json'))).toBe(true);

    deleteProfile('to-delete');

    const profiles = listProfiles();
    expect(profiles.map(p => p.name)).not.toContain('to-delete');
    expect(existsSync(join(tokensDir, 'to-delete.json'))).toBe(false);
  });

  it('should throw when deleting non-existent profile', async () => {
    const { deleteProfile } = await import('../../src/core/config.js');
    expect(() => deleteProfile('nonexistent')).toThrow("Profile 'nonexistent' 不存在");
  });

  it('should migrate legacy config', async () => {
    const { migrateLegacyConfig, loadActiveProfile, listProfiles } = await import('../../src/core/config.js');

    const baseDir = join(TEST_BASE, '.wechat-cli');
    writeFileSync(
      join(baseDir, 'config.json'),
      JSON.stringify({ appId: 'legacy-id', appSecret: 'legacy-secret', accountType: 'service', apiBaseUrl: 'https://api.weixin.qq.com' }),
    );
    writeFileSync(
      join(baseDir, 'token.json'),
      JSON.stringify({ accessToken: 'legacy-token', expiresAt: 9999999999999 }),
    );

    const migrated = migrateLegacyConfig();
    expect(migrated).toBe(true);

    const profilesDir = join(baseDir, 'profiles');
    const tokensDir = join(baseDir, 'tokens');
    expect(existsSync(join(profilesDir, 'default.json'))).toBe(true);
    expect(existsSync(join(tokensDir, 'default.json'))).toBe(true);
    expect(loadActiveProfile()).toBe('default');
  });
});

describe('multi-account-auth', () => {
  it('should load config per profile', async () => {
    const { loadConfig } = await import('../../src/core/config.js');
    createProfile('profile-a', 'app-id-a', 'secret-a');
    createProfile('profile-b', 'app-id-b', 'secret-b');

    const configA = loadConfig('profile-a');
    const configB = loadConfig('profile-b');

    expect(configA.appId).toBe('app-id-a');
    expect(configA.appSecret).toBe('secret-a');
    expect(configB.appId).toBe('app-id-b');
    expect(configB.appSecret).toBe('secret-b');
  });

  it('should load and save token cache per profile', async () => {
    const { saveTokenCache, loadTokenCache } = await import('../../src/core/config.js');

    saveTokenCache({ accessToken: 'token-a', expiresAt: 1000 }, 'profile-a');
    saveTokenCache({ accessToken: 'token-b', expiresAt: 2000 }, 'profile-b');

    const cacheA = loadTokenCache('profile-a');
    const cacheB = loadTokenCache('profile-b');

    expect(cacheA?.accessToken).toBe('token-a');
    expect(cacheB?.accessToken).toBe('token-b');
  });

  it('should clear token per profile', async () => {
    const { saveTokenCache, loadTokenCache, clearTokenCache } = await import('../../src/core/config.js');

    saveTokenCache({ accessToken: 'token-a', expiresAt: 1000 }, 'profile-a');
    saveTokenCache({ accessToken: 'token-b', expiresAt: 2000 }, 'profile-b');

    clearTokenCache('profile-a');

    expect(loadTokenCache('profile-a')).toBeNull();
    expect(loadTokenCache('profile-b')?.accessToken).toBe('token-b');
  });

  it('should reject invalid profile name', async () => {
    const { resolveProfile } = await import('../../src/core/config.js');
    createProfile('default');

    expect(() => resolveProfile({ profile: '技术博客' })).toThrow('Profile 名称不合法');
    expect(() => resolveProfile({ profile: 'Tech Blog' })).toThrow('Profile 名称不合法');
  });

  it('should resolve profile from options', async () => {
    const { resolveProfile } = await import('../../src/core/config.js');
    createProfile('tech-blog');

    const name = resolveProfile({ profile: 'tech-blog' });
    expect(name).toBe('tech-blog');
  });

  it('should resolve profile from config option when config is a profile name', async () => {
    const { resolveProfile } = await import('../../src/core/config.js');
    createProfile('foo');

    const name = resolveProfile({ config: 'foo' });
    expect(name).toBe('foo');
  });

  it('should handle custom config path as __custom__', async () => {
    const { resolveProfile } = await import('../../src/core/config.js');
    const name = resolveProfile({ config: '/some/custom/path.json' });
    expect(name).toBe('__custom__');
  });
});
