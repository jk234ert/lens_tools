import {
  evmAddress,
  nonNullable,
  PublicClient,
  uri,
} from "@lens-protocol/client";
import { staging } from "@lens-protocol/env";
import { signMessageWith, handleOperationWith } from "@lens-protocol/client/viem";
import {
  canCreateUsername,
  createAccountWithUsername,
  fetchAccount,
  fetchAccountsAvailable,
  fetchApp,
} from "@lens-protocol/client/actions";
import { account } from "@lens-protocol/metadata";
import { StorageClient } from "@lens-chain/storage-client";
import { chains } from "@lens-chain/sdk/viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

interface RegisterOptions {
  appAddress: string;
  username: string;
  privateKey: string;
  name?: string;
  bio?: string;
}

export async function register(options: RegisterOptions) {
  const { appAddress, username, privateKey, name, bio } = options;

  const viemAccount = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account: viemAccount,
    chain: chains.testnet,
    transport: http(),
  });

  console.log("\n📝 Starting Lens account registration...");
  console.log(`Network: testnet`);
  console.log(`App: ${appAddress}`);
  console.log(`Wallet: ${viemAccount.address}`);
  console.log(`Username: lens/${username}`);

  // Step 1: Create PublicClient and run pre-checks
  const client = PublicClient.create({
    environment: staging,
    origin: "https://lens.xyz",
  });

  // Pre-check: verify wallet doesn't already have an account
  console.log("\n🔍 Pre-flight checks...");
  const walletAddress = evmAddress(viemAccount.address);
  const accountsResult = await fetchAccountsAvailable(client, {
    managedBy: walletAddress,
    includeOwned: true,
  });
  if (accountsResult.isErr()) {
    throw new Error(`Failed to check wallet accounts: ${accountsResult.error}`);
  }
  const existingAccounts = accountsResult.value.items;
  if (existingAccounts.length > 0) {
    const list = existingAccounts
      .map((item) => {
        const acc = item.account;
        const username = acc.username?.value ?? "no username";
        return `  - ${acc.address} (${username})`;
      })
      .join("\n");
    throw new Error(
      `Wallet ${viemAccount.address} already has Lens account(s):\n${list}\n\nUse a different wallet or login with the "auth" command instead.`
    );
  }
  console.log("  Wallet has no existing accounts");

  // Pre-check: verify app exists
  const appResult = await fetchApp(client, {
    app: evmAddress(appAddress),
  });
  if (appResult.isErr()) {
    throw new Error(`Failed to query app: ${appResult.error}`);
  }
  if (!appResult.value) {
    throw new Error(`App not found: ${appAddress}`);
  }
  console.log(`  App verified: ${appResult.value.metadata?.name ?? appAddress}`);

  // Step 2: Login as onboarding user
  console.log("\n1️⃣  Logging in as onboarding user...");
  const authenticated = await client.login({
    onboardingUser: {
      app: evmAddress(appAddress),
      wallet: viemAccount.address,
    },
    signMessage: signMessageWith(walletClient),
  });

  if (authenticated.isErr()) {
    throw new Error(`Login failed: ${authenticated.error}`);
  }

  const sessionClient = authenticated.value;
  console.log("Login successful.");

  // Pre-check: verify username is available
  console.log("\n🔍 Checking username availability...");
  const usernameResult = await canCreateUsername(sessionClient, {
    localName: username,
  });
  if (usernameResult.isErr()) {
    throw new Error(`Failed to check username: ${usernameResult.error}`);
  }
  const usernameCheck = usernameResult.value;
  if (usernameCheck.__typename === "UsernameTaken") {
    throw new Error(`Username "lens/${username}" is already taken`);
  }
  if (usernameCheck.__typename === "NamespaceOperationValidationFailed") {
    throw new Error(`Username validation failed: ${usernameCheck.reason}`);
  }
  console.log(`  Username "lens/${username}" is available`);

  // Step 3: Upload account metadata
  console.log("\n2️⃣  Uploading account metadata...");
  const storageClient = StorageClient.create();
  const metadata = account({
    name: name || username,
    bio: bio || "",
  });

  const { uri: metadataUri } = await storageClient.uploadAsJson(metadata);
  console.log(`Metadata URI: ${metadataUri}`);

  // Step 4: Create account with username
  console.log("\n3️⃣  Creating account with username...");
  const result = await createAccountWithUsername(sessionClient, {
    username: { localName: username },
    metadataUri: uri(metadataUri),
  })
    .andThen(handleOperationWith(walletClient))
    .andThen(sessionClient.waitForTransaction);

  if (result.isErr()) {
    throw new Error(
      `Account creation failed: ${JSON.stringify(result.error)}`
    );
  }

  const txHash = result.value;
  console.log(`Transaction hash: ${txHash}`);

  // Step 5: Switch to the new account and get credentials
  console.log("\n4️⃣  Switching to new account...");
  const accountResult = await fetchAccount(sessionClient, { txHash })
    .map(nonNullable)
    .andThen((acc) =>
      sessionClient.switchAccount({
        account: acc.address,
      })
    );

  if (accountResult.isErr()) {
    throw new Error(
      `Switch account failed: ${JSON.stringify(accountResult.error)}`
    );
  }

  const newSessionClient = accountResult.value;
  const credentialsResult = newSessionClient.getCredentials();

  if (credentialsResult.isErr()) {
    throw new Error(
      `Failed to get credentials: ${JSON.stringify(credentialsResult.error)}`
    );
  }

  const credentials = credentialsResult.value;

  return {
    txHash,
    accessToken: credentials?.accessToken ?? null,
    refreshToken: credentials?.refreshToken ?? null,
    idToken: credentials?.idToken ?? null,
  };
}
