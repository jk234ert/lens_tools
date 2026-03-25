import assert from 'node:assert/strict';
import test from 'node:test';

import { formatRegisterFailure } from '../src/commands/register-error.ts';

test('formats register failures from Error instances using the message', () => {
  const error = new Error('Transaction not indexed yet, keep trying');

  assert.equal(
    formatRegisterFailure('Account creation indexing failed', error),
    'Account creation indexing failed: Transaction not indexed yet, keep trying'
  );
});

test('includes the transaction hash when provided', () => {
  const error = new Error('Timeout waiting for transaction');

  assert.equal(
    formatRegisterFailure(
      'Account creation indexing failed',
      error,
      '0x1234'
    ),
    'Account creation indexing failed for tx 0x1234: Timeout waiting for transaction'
  );
});
