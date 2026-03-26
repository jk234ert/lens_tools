import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveRegisterUsername } from '../src/commands/register-username.ts';

test('returns explicit username when provided', () => {
  assert.equal(resolveRegisterUsername('wagmi'), 'wagmi');
});

test('generates a deterministic fallback username when omitted', () => {
  const now = new Date('2026-03-25T15:30:12Z');

  assert.equal(
    resolveRegisterUsername(undefined, now),
    'test_20260325_153012'
  );
});
