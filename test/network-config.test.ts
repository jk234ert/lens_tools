import assert from 'node:assert/strict';
import test from 'node:test';

import { getNetworkConfig } from '../src/network.ts';

test('maps mainnet to mainnet Lens API and mainnet chain', () => {
  const config = getNetworkConfig('mainnet');

  assert.equal(config.apiEndpoint, 'https://api.lens.xyz');
  assert.equal(config.environment.name, 'mainnet');
  assert.equal(config.network, 'mainnet');
});

test('maps staging to staging Lens API and mainnet chain', () => {
  const config = getNetworkConfig('staging');

  assert.equal(config.apiEndpoint, 'https://api.staging.lens.dev');
  assert.equal(config.environment.name, 'staging');
  assert.equal(config.network, 'staging');
});

test('maps testnet to testnet Lens API and testnet chain', () => {
  const config = getNetworkConfig('testnet');

  assert.equal(config.apiEndpoint, 'https://api.testnet.lens.xyz');
  assert.equal(config.environment.name, 'testnet');
  assert.equal(config.network, 'testnet');
});
