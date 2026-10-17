import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CSP, REFERRER_POLICY, securityHeadMeta, hasSecurityMeta } from '../security.mjs';
import { esc, safeHref } from '../templates/_html.mjs';

test('CSP locks down plugins and base URI', () => {
  assert.match(CSP, /object-src 'none'/);
  assert.match(CSP, /base-uri 'self'/);
  assert.match(CSP, /upgrade-insecure-requests/);
  assert.match(CSP, /script-src[^;]+www\.googletagmanager\.com/);
  assert.match(CSP, /script-src[^;]+www\.google-analytics\.com/);
  assert.equal(REFERRER_POLICY, 'strict-origin-when-cross-origin');
});

test('securityHeadMeta is idempotent to detect', () => {
  const meta = securityHeadMeta();
  assert.match(meta, /Content-Security-Policy/);
  assert.match(meta, /data-siren-csp/);
  assert.equal(hasSecurityMeta(`<head>${meta}</head>`), true);
  assert.equal(hasSecurityMeta('<head><title>x</title></head>'), false);
});

test('safeHref blocks javascript and data URLs', () => {
  assert.equal(safeHref('javascript:alert(1)'), '');
  assert.equal(safeHref('data:text/html,<img src=x onerror=alert(1)>'), '');
  assert.equal(safeHref('vbscript:msgbox(1)'), '');
  assert.equal(safeHref(''), '');
});

test('safeHref keeps https and site-relative paths', () => {
  assert.equal(safeHref('https://example.com/a?b=1'), esc('https://example.com/a?b=1'));
  assert.equal(safeHref('/api/state.json'), esc('/api/state.json'));
  assert.equal(safeHref('#section'), esc('#section'));
  assert.equal(safeHref('moves/foo.html'), esc('moves/foo.html'));
});
