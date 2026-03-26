import type { EnvironmentConfig } from "@lens-protocol/env";
import {
  mainnet as lensMainnet,
  staging,
  testnet as lensTestnet,
} from "@lens-protocol/env";
import { chains } from "@lens-chain/sdk/viem";
import type { Chain } from "viem";

export type LensCliNetwork = "mainnet" | "staging" | "testnet";

interface NetworkConfig {
  network: LensCliNetwork;
  apiEndpoint: string;
  environment: EnvironmentConfig;
  chain: Chain;
}

const NETWORK_CONFIGS: Record<LensCliNetwork, NetworkConfig> = {
  mainnet: {
    network: "mainnet",
    apiEndpoint: "https://api.lens.xyz",
    environment: lensMainnet,
    chain: chains.mainnet,
  },
  staging: {
    network: "staging",
    apiEndpoint: "https://api.staging.lens.dev",
    environment: staging,
    chain: chains.mainnet,
  },
  testnet: {
    network: "testnet",
    apiEndpoint: "https://api.testnet.lens.xyz",
    environment: lensTestnet,
    chain: chains.testnet,
  },
};

export function getNetworkConfig(network: LensCliNetwork): NetworkConfig {
  return NETWORK_CONFIGS[network];
}
