#!/usr/bin/env node

import { Command } from 'commander';
import { authenticate } from './commands/authenticate.js';
import { register } from './commands/register.js';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

function printTokens(tokens: { accessToken: string; refreshToken: string; idToken: string }) {
  console.log('\nTokens:');
  console.log(JSON.stringify(tokens, null, 2));

  const refreshPayload = decodeJwtPayload(tokens.refreshToken);
  if (refreshPayload) {
    console.log('\nRefresh Token payload:');
    console.log(JSON.stringify(refreshPayload, null, 2));

    const toUTC8 = (ts: unknown) =>
      typeof ts === 'number'
        ? new Date(ts * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : null;

    const iat = toUTC8(refreshPayload.iat);
    const exp = toUTC8(refreshPayload.exp);
    if (iat) console.log(`  iat (UTC+8): ${iat}`);
    if (exp) console.log(`  exp (UTC+8): ${exp}`);
  }
}

const program = new Command();

program
  .name('lens-cli')
  .description('CLI tools for Lens Protocol')
  .version('1.0.0');

program
  .command('auth')
  .description('Complete Lens authentication flow')
  .requiredOption('-a, --app <address>', 'App address (e.g., 0x8A5Cc31180c37078e1EbA2A23c861Acf351a97cE)')
  .requiredOption('-u, --account <address>', 'Account address')
  .requiredOption('-o, --owner <address>', 'Owner address')
  .option('-n, --network <network>', 'Network (mainnet, staging, or testnet)', 'testnet')
  .option('-p, --private-key <key>', 'Private key for signing (optional, will prompt if not provided)')
  .action(async (options) => {
    try {
      const result = await authenticate({
        appAddress: options.app,
        accountAddress: options.account,
        ownerAddress: options.owner,
        network: options.network,
        privateKey: options.privateKey
      });

      console.log('\n✓ Authentication successful!');
      printTokens(result);
    } catch (error) {
      console.error('\n✗ Authentication failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('register')
  .description('Register a new Lens account')
  .requiredOption('-a, --app <address>', 'App address')
  .option('-u, --username <name>', 'Desired username (defaults to an auto-generated test name)')
  .option('-n, --network <network>', 'Network (mainnet, staging, or testnet)', 'testnet')
  .requiredOption('-p, --private-key <key>', 'Private key for signing')
  .option('--name <name>', 'Display name for the account')
  .option('--bio <bio>', 'Bio for the account')
  .action(async (options) => {
    try {
      const result = await register({
        appAddress: options.app,
        username: options.username,
        privateKey: options.privateKey,
        network: options.network,
        name: options.name,
        bio: options.bio,
      });

      console.log('\n✓ Registration successful!');
      console.log(`Transaction hash: ${result.txHash}`);
      if (result.accessToken && result.refreshToken && result.idToken) {
        printTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken, idToken: result.idToken });
      }
    } catch (error) {
      console.error('\n✗ Registration failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
