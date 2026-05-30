import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: {
    default: { name: "ArcScan", url: "http://testnet.arcscan.app" },
  },
});

/** USDC ERC-20 contract on Arc Testnet — use for Transfer event logs */
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

/** USDC uses 6 decimals in ERC-20 Transfer events (NOT 18) */
export const USDC_DECIMALS = 6;

/** Hex chain ID for MetaMask wallet_addEthereumChain */
export const ARC_CHAIN_ID_HEX = "0x4CEF52";
