"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { ARC_CHAIN_ID_HEX } from "@/lib/arcChain";

/* ──────────── Context shape ──────────── */

interface WalletContextType {
  account: string | null;
  connecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  connecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

/* ──────────── Provider ──────────── */

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  /* ── Connect ── */
  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    setConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      // Switch or add Arc Testnet
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ARC_CHAIN_ID_HEX }],
        });
      } catch (switchErr: unknown) {
        const err = switchErr as { code?: number };
        if (err.code === 4902 || err.code === -32603) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: ARC_CHAIN_ID_HEX,
                chainName: "Arc Testnet",
                nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
                rpcUrls: ["https://rpc.testnet.arc.network"],
                blockExplorerUrls: ["https://testnet.arcscan.app"],
              },
            ],
          });
        } else if (err.code === 4001) {
          setConnecting(false);
          return;
        } else {
          throw switchErr;
        }
      }

      setAccount(accounts[0] ?? null);
    } catch (err: unknown) {
      const walletErr = err as { code?: number };
      if (walletErr.code === 4001) {
        // user rejected
      } else {
        console.error("Connect error:", err);
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  /* ── Disconnect ── */
  const disconnectWallet = useCallback(() => {
    setAccount(null);
  }, []);

  /* ── Listen for external changes ── */
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        setAccount(null);
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on?.("accountsChanged", handleAccounts);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccounts);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  return (
    <WalletContext.Provider
      value={{ account, connecting, connectWallet, disconnectWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}
