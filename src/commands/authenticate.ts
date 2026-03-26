import { createWalletClient, http, type Chain, type PrivateKeyAccount } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getNetworkConfig, type LensCliNetwork } from '../network.js';

interface AuthenticateOptions {
  appAddress: string;
  accountAddress: string;
  ownerAddress: string;
  network: LensCliNetwork;
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

interface ChallengeQueryResult {
  data: {
    challenge: ChallengeResponse;
  };
  errors?: unknown;
}

interface AuthenticateQueryResult {
  data: {
    authenticate: AuthenticationTokens & {
      reason?: string;
    };
  };
  errors?: unknown;
}

export async function authenticate(options: AuthenticateOptions): Promise<AuthenticationTokens> {
  const { appAddress, accountAddress, ownerAddress, network, privateKey } = options;

  if (!privateKey) {
    throw new Error('Private key is required. Provide it via --private-key option.');
  }

  const { apiEndpoint, chain } = getNetworkConfig(network);

  console.log('\n📝 Starting Lens authentication flow...');
  console.log(`Network: ${network}`);
  console.log(`App: ${appAddress}`);
  console.log(`Account: ${accountAddress}`);
  console.log(`Owner: ${ownerAddress}`);

  // Step 1: Generate authentication challenge
  console.log('\n1️⃣  Generating authentication challenge...');
  const challenge = await generateChallenge(`${apiEndpoint}/graphql`, accountAddress, ownerAddress, appAddress);
  console.log(`Challenge ID: ${challenge.id}`);

  // Step 2: Sign the SIWE message with viem
  console.log('\n2️⃣  Signing SIWE message...');
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const signature = await signMessage(account, challenge.text, chain);
  console.log(`Signature: ${signature.slice(0, 20)}...`);

  // Step 3: Authenticate and get tokens
  console.log('\n3️⃣  Authenticating with Lens...');
  const tokens = await authenticateWithLens(
    `${apiEndpoint}/graphql`,
    challenge.id,
    signature
  );

  return tokens;
}

async function generateChallenge(
  graphqlEndpoint: string,
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

  const response = await fetch(graphqlEndpoint, {
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

  const result = await response.json() as ChallengeQueryResult;

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data.challenge;
}

async function signMessage(
  account: PrivateKeyAccount,
  message: string,
  chain: Chain
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
  graphqlEndpoint: string,
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

  const response = await fetch(graphqlEndpoint, {
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

  const result = await response.json() as AuthenticateQueryResult;

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
