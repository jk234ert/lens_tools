import { createWalletClient, http, type Address, type PrivateKeyAccount } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

interface AuthenticateOptions {
  appAddress: string;
  accountAddress: string;
  ownerAddress: string;
  network: 'mainnet' | 'testnet';
  privateKey?: string;
}

interface AuthenticationTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

interface ChallengeResponse {
  id: string;
  text: string;
}

const API_ENDPOINTS = {
  mainnet: 'https://api.lens.xyz',
  testnet: 'https://api.staging.lens.dev',
};

export async function authenticate(options: AuthenticateOptions): Promise<AuthenticationTokens> {
  const { appAddress, accountAddress, ownerAddress, network, privateKey } = options;

  if (!privateKey) {
    throw new Error('Private key is required. Provide it via --private-key option.');
  }

  const apiEndpoint = API_ENDPOINTS[network];
  const chain = network === 'mainnet' ? mainnet : sepolia;

  console.log('\n📝 Starting Lens authentication flow...');
  console.log(`Network: ${network}`);
  console.log(`App: ${appAddress}`);
  console.log(`Account: ${accountAddress}`);
  console.log(`Owner: ${ownerAddress}`);

  // Step 1: Generate authentication challenge
  console.log('\n1️⃣  Generating authentication challenge...');
  const challenge = await generateChallenge(apiEndpoint, accountAddress, ownerAddress, appAddress);
  console.log(`Challenge ID: ${challenge.id}`);

  // Step 2: Sign the SIWE message with viem
  console.log('\n2️⃣  Signing SIWE message...');
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const signature = await signMessage(account, challenge.text, chain);
  console.log(`Signature: ${signature.slice(0, 20)}...`);

  // Step 3: Authenticate and get tokens
  console.log('\n3️⃣  Authenticating with Lens...');
  const tokens = await authenticateWithLens(
    apiEndpoint,
    challenge.id,
    signature
  );

  return tokens;
}

async function generateChallenge(
  apiEndpoint: string,
  accountAddress: string,
  ownerAddress: string,
  appAddress: string
): Promise<ChallengeResponse> {
  const query = `
    mutation Challenge($request: ChallengeRequest!) {
      challenge(request: $request) {
        id
        text
      }
    }
  `;

  const variables = {
    request: {
      accountOwner: {
        account: accountAddress,
        owner: ownerAddress,
        app: appAddress,
      },
    },
  };

  const response = await fetch(`${apiEndpoint}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://lens.xyz',
      'User-Agent': 'lens-cli/1.0.0',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate challenge: ${error}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data.challenge;
}

async function signMessage(
  account: PrivateKeyAccount,
  message: string,
  chain: typeof mainnet | typeof sepolia
): Promise<string> {
  const client = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const signature = await client.signMessage({
    account,
    message,
  });

  return signature;
}

async function authenticateWithLens(
  apiEndpoint: string,
  challengeId: string,
  signature: string
): Promise<AuthenticationTokens> {
  const query = `
    mutation Authenticate($request: SignedAuthChallenge!) {
      authenticate(request: $request) {
        ... on AuthenticationTokens {
          accessToken
          refreshToken
          idToken
        }
        ... on ForbiddenError {
          reason
        }
      }
    }
  `;

  const variables = {
    request: {
      id: challengeId,
      signature,
    },
  };

  const response = await fetch(`${apiEndpoint}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://lens.xyz',
      'User-Agent': 'lens-cli/1.0.0',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to authenticate: ${error}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  const authResult = result.data.authenticate;

  if (authResult.reason) {
    throw new Error(`Authentication forbidden: ${authResult.reason}`);
  }

  return {
    accessToken: authResult.accessToken,
    refreshToken: authResult.refreshToken,
    idToken: authResult.idToken,
  };
}
