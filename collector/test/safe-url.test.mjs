import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeUrl, isBlockedIp, isSafeHttpUrl } from '../safe-url.mjs';

test('accepts public https URLs', () => {
  const u = assertSafeUrl('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
  assert.equal(u.hostname, 'www.cisa.gov');
  assert.equal(isSafeHttpUrl('https://api.github.com/repos/x/y'), true);
});

test('refuses plain http, file, data, and credentialed URLs', () => {
  assert.throws(() => assertSafeUrl('http://example.com/x'), /plain http/);
  assert.throws(() => assertSafeUrl('file:///etc/passwd'), /file/);
  assert.throws(() => assertSafeUrl('data:text/plain,hi'), /data/);
  assert.throws(() => assertSafeUrl('https://user:pass@example.com/'), /credentials/);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
});

test('refuses localhost, metadata, and private IPs', () => {
  for (const bad of [
    'https://localhost/x',
    'https://127.0.0.1/x',
    'https://[::1]/x',
    'https://169.254.169.254/latest/meta-data/',
    'https://metadata.google.internal/',
    'https://10.0.0.5/admin',
    'https://192.168.1.1/',
    'https://172.16.4.1/',
    'https://host.docker.internal/',
    'https://foo.localhost/',
  ]) {
    assert.throws(() => assertSafeUrl(bad), /refusing/, bad);
  }
});

test('isBlockedIp covers RFC1918, loopback, link-local, CGNAT', () => {
  assert.equal(isBlockedIp('10.1.2.3'), true);
  assert.equal(isBlockedIp('127.0.0.1'), true);
  assert.equal(isBlockedIp('169.254.169.254'), true);
  assert.equal(isBlockedIp('192.168.0.1'), true);
  assert.equal(isBlockedIp('172.31.255.255'), true);
  assert.equal(isBlockedIp('100.64.1.1'), true);
  assert.equal(isBlockedIp('8.8.8.8'), false);
  assert.equal(isBlockedIp('1.1.1.1'), false);
  assert.equal(isBlockedIp('::1'), true);
  assert.equal(isBlockedIp('::ffff:127.0.0.1'), true);
  assert.equal(isBlockedIp('2001:4860:4860::8888'), false);
});

test('allowHttp opt permits plain http for fixtures', () => {
  const u = assertSafeUrl('http://example.com/probe', { allowHttp: true });
  assert.equal(u.protocol, 'http:');
});
