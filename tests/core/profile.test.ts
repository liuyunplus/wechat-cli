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

  it('should reject profile name containing space', async () => {
    const { resolveProfile } = await import('../../src/core/config.js');
    createProfile('default');

    expect(() => resolveProfile({ profile: 'Tech Blog' })).toThrow('Profile 名称不合法');
  });

  it('should reject path-like profile name', async () => {
    const { resolveProfile } = await import('../../src/core/config.js');
    createProfile('default');

    expect(() => resolveProfile({ profile: '../etc/passwd' })).toThrow('Profile 名称不合法');
    expect(() => resolveProfile({ profile: 'foo/bar' })).toThrow('Profile 名称不合法');
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

describe('chinese-profile-names', () => {
  it('should accept Chinese profile names', async () => {
    const { resolveProfile } = await import('../../src/core/config.js');
    createProfile('default');

    const name = resolveProfile({ profile: '技术博客' });
    expect(name).toBe('技术博客');
  });

  it('should accept mixed-case and underscored profile names', async () => {
    const { resolveProfile } = await import('../../src/core/config.js');
    createProfile('default');

    expect(resolveProfile({ profile: 'TechBlog_2024' })).toBe('TechBlog_2024');
    expect(resolveProfile({ profile: '科技-news' })).toBe('科技-news');
    expect(resolveProfile({ profile: '生活号' })).toBe('生活号');
  });

  it('should persist Chinese profile to disk', async () => {
    const { saveConfig, loadConfig, getProfileConfigPath } = await import('../../src/core/config.js');

    const cfg = {
      appId: 'wxid-chinese',
      appSecret: 'chinese-secret',
      accountType: 'service' as const,
      apiBaseUrl: 'https://api.weixin.qq.com',
    };
    saveConfig(cfg, '技术博客');

    const path = getProfileConfigPath('技术博客');
    expect(existsSync(path)).toBe(true);

    const loaded = loadConfig('技术博客');
    expect(loaded.appId).toBe('wxid-chinese');
    expect(loaded.appSecret).toBe('chinese-secret');
  });

  it('should list Chinese profiles', async () => {
    const { listProfiles } = await import('../../src/core/config.js');
    createProfile('default');
    createProfile('技术博客');
    createProfile('生活号');

    const names = listProfiles().map(p => p.name);
    expect(names).toContain('技术博客');
    expect(names).toContain('生活号');
  });

  it('should track active profile for Chinese names', async () => {
    const { saveActiveProfile, loadActiveProfile } = await import('../../src/core/config.js');
    createProfile('技术博客');

    saveActiveProfile('技术博客');
    expect(loadActiveProfile()).toBe('技术博客');
  });

  it('should isolate tokens between ASCII and Chinese profiles', async () => {
    const { saveTokenCache, loadTokenCache } = await import('../../src/core/config.js');

    saveTokenCache({ accessToken: 'token-ascii', expiresAt: 1000 }, 'tech-blog');
    saveTokenCache({ accessToken: 'token-cn', expiresAt: 2000 }, '技术博客');

    expect(loadTokenCache('tech-blog')?.accessToken).toBe('token-ascii');
    expect(loadTokenCache('技术博客')?.accessToken).toBe('token-cn');
  });
});

describe('profile-name-validation', () => {
  it('should reject empty profile name', async () => {
    const { validateProfileName } = await import('../../src/types/config.js');
    const r = validateProfileName('');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('不能为空');
  });

  it('should reject whitespace-only profile name', async () => {
    const { validateProfileName } = await import('../../src/types/config.js');
    const r = validateProfileName('   ');
    expect(r.valid).toBe(false);
  });

  it('should reject reserved name __custom__', async () => {
    const { validateProfileName } = await import('../../src/types/config.js');
    const r = validateProfileName('__custom__');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('保留名');
  });

  it('should reject names longer than 64 characters', async () => {
    const { validateProfileName } = await import('../../src/types/config.js');
    const r = validateProfileName('a'.repeat(65));
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('64');
  });

  it('should accept exactly 64-character name', async () => {
    const { validateProfileName } = await import('../../src/types/config.js');
    const r = validateProfileName('a'.repeat(64));
    expect(r.valid).toBe(true);
  });

  it('should reject names with path separators or control characters', async () => {
    const { validateProfileName } = await import('../../src/types/config.js');
    expect(validateProfileName('foo/bar').valid).toBe(false);
    expect(validateProfileName('foo\\bar').valid).toBe(false);
    expect(validateProfileName('foo:bar').valid).toBe(false);
    expect(validateProfileName('foo*bar').valid).toBe(false);
  });

  it('should accept default as a valid name', async () => {
    const { validateProfileName } = await import('../../src/types/config.js');
    expect(validateProfileName('default').valid).toBe(true);
  });
});

describe('profile-name-normalization', () => {
  it('should trim surrounding whitespace', async () => {
    const { normalizeProfileName } = await import('../../src/types/config.js');
    expect(normalizeProfileName('  技术博客  ')).toBe('技术博客');
    expect(normalizeProfileName('  tech-blog\t')).toBe('tech-blog');
  });

  it('should apply NFC normalization', async () => {
    const { normalizeProfileName } = await import('../../src/types/config.js');
    const input = '技术博客';
    const nfd = input.normalize('NFD').normalize('NFC');
    expect(normalizeProfileName(nfd)).toBe(input);
  });

  it('should save trimmed+NFC name and read it back consistently', async () => {
    const { saveActiveProfile, loadActiveProfile } = await import('../../src/core/config.js');
    createProfile('技术博客');

    saveActiveProfile('  技术博客  ');
    expect(loadActiveProfile()).toBe('技术博客');
  });

  it('should persist active name to disk in NFC form', async () => {
    const { saveActiveProfile } = await import('../../src/core/config.js');
    const activePath = join(TEST_BASE, '.wechat-cli', 'active.json');
    createProfile('技术博客');

    saveActiveProfile('技术博客');
    const content = readFileSync(activePath, 'utf-8');
    expect(content).toContain('技术博客');
    expect(content).not.toMatch(/\u200B|\uFEFF/);
  });

  it('should list profiles with NFC names', async () => {
    const { listProfiles } = await import('../../src/core/config.js');
    createProfile('技术博客');

    const names = listProfiles().map(p => p.name);
    expect(names).toContain('技术博客');
    names.forEach(n => expect(n).toBe(n.normalize('NFC')));
  });
});
