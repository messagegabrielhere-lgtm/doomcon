import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicError, publicErrorObject } from '../safe-error.mjs';

test('publicError strips stacks and keeps a short message', () => {
  const err = new Error('boom');
  err.stack = 'Error: boom\n    at /home/ubuntu/doomcon/arena/run.mjs:12:3';
  const msg = publicError(err);
  assert.equal(msg, 'boom');
  assert.ok(!msg.includes('at '));
  assert.ok(!msg.includes('/home/'));
});

test('publicError redacts secret-shaped substrings and paths', () => {
  // Built at runtime so the source file never contains a secret-shaped literal
  // (compliance secret-in-repo scans the tree).
  const fakeKey = ['sk', 'ant', 'a'.repeat(24)].join('-');
  const msg = publicError(`upstream said Bearer ${fakeKey} and file:///tmp/x`);
  assert.ok(!/sk-ant-/.test(msg), msg);
  assert.ok(!/Bearer\s+sk/i.test(msg), msg);
  assert.match(msg, /\[redacted\]/);
  assert.match(msg, /\[path\]/);
});

test('publicErrorObject never includes stack', () => {
  const err = Object.assign(new Error('nope'), { kind: 'http', status: 503, stack: 'secret stack' });
  const obj = publicErrorObject(err);
  assert.deepEqual(obj, { error: 'nope', kind: 'http', status: 503 });
  assert.equal(JSON.stringify(obj).includes('stack'), false);
});

test('publicError caps length', () => {
  const msg = publicError('x'.repeat(1000), { max: 40 });
  assert.ok(msg.length <= 40);
});
