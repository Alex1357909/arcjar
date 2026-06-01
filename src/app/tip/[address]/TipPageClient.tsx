"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  createPublicClient,
  http,
  formatUnits,
  parseAbiItem,
} from "viem";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { kit } from "@/lib/kit";
import {
  arcTestnet,
  USDC_ADDRESS,
  USDC_DECIMALS,
  ARC_CHAIN_ID_HEX,
} from "@/lib/arcChain";
import type { TipStatus, TipTransaction } from "@/lib/types";
import Navbar from "@/components/Navbar";
import BuiltByBadge from "@/components/BuiltByBadge";

/* ──────────────────── Constants ──────────────────── */

const PRESETS = [1, 5, 10, 25];
const MAX_TIP = Number(process.env.NEXT_PUBLIC_MAX_TIP ?? "100");

/* ──────────── ERC-20 Transfer event ABI ──────────── */

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

/* ──────────── Helpers ──────────── */

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/* ──────────── Public client (singleton) ──────────── */

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});

/* ━━━━━━━━━━━━━━━━━━━━ Component ━━━━━━━━━━━━━━━━━━━━ */

export default function TipPageClient() {
  /* ── Creator info from URL ── */
  const params = useParams();
  const searchParams = useSearchParams();

  const creatorAddress = (params.address as string) ?? "";
  const creatorName = searchParams.get("name") ?? "Creator";
  const creatorBio = searchParams.get("bio") ?? "";

  /* ── Wallet state ── */
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  /* ── Tip amount state ── */
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  /* ── Transaction state ── */
  const [status, setStatus] = useState<TipStatus>("idle");
  const [txHash, setTxHash] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState("");

  /* ── History state ── */
  const [history, setHistory] = useState<TipTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* ── Derived amount ── */
  const finalAmount =
    selectedPreset != null
      ? selectedPreset.toFixed(2)
      : customAmount
        ? parseFloat(customAmount).toFixed(2)
        : "";

  const canSend = !!account && !!finalAmount && parseFloat(finalAmount) > 0;

  /* ── Validate address ── */
  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(creatorAddress);

  /* ────────────── Wallet Connection ────────────── */

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setErrorMsg("No wallet detected. Please install MetaMask.");
      setStatus("error");
      return;
    }

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
        const err = switchErr as { code?: number; message?: string };
        if (err.code === 4902 || err.code === -32603) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: ARC_CHAIN_ID_HEX,
                chainName: "Arc Testnet",
                nativeCurrency: {
                  name: "USDC",
                  symbol: "USDC",
                  decimals: 6,
                },
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

      setAccount(accounts[0]);
      setStatus("idle");
      setErrorMsg("");
    } catch (err: unknown) {
      console.error("Connect error:", err);
      const walletErr = err as { code?: number; message?: string };
      if (walletErr.code === 4001) {
        setConnecting(false);
        return;
      }
      setErrorMsg(
        walletErr.message || (err instanceof Error ? err.message : "Failed to connect wallet")
      );
      setStatus("error");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setStatus("idle");
    setErrorMsg("");
  }, []);

  /* ────────────── Send Tip ────────────── */

  const sendTip = useCallback(async () => {
    if (!account || !finalAmount || !creatorAddress) return;

    setStatus("pending");
    setErrorMsg("");
    setTxHash("");

    try {
      const adapter = await createViemAdapterFromProvider({
        provider: window.ethereum! as import("viem").EIP1193Provider,
      });

      const result = await kit.send({
        from: { adapter, chain: "Arc_Testnet" },
        to: creatorAddress,
        amount: finalAmount,
        token: "USDC",
      });

      setTxHash(result.txHash ?? "");
      setStatus("success");

      // Fire confetti
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#3E74BB", "#ACC6E9", "#8DD89F", "#FFE27C", "#E86D7A"],
      });

      // Refresh history
      fetchHistory();
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setErrorMsg(msg.replace(/\bETH\b/gi, "USDC"));
    }
  }, [account, finalAmount, creatorAddress]);

  /* ────────────── Fetch Transaction History ────────────── */

  const fetchHistory = useCallback(async () => {
    if (!creatorAddress || !isValidAddress) return;

    setHistoryLoading(true);
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n;

      const logs = await publicClient.getLogs({
        address: USDC_ADDRESS,
        event: TRANSFER_EVENT,
        args: { to: creatorAddress as `0x${string}` },
        fromBlock,
        toBlock: "latest",
      });

      const blockNumbers = [...new Set(logs.map((l) => l.blockNumber))];
      const blockTimestamps = new Map<bigint, number>();

      await Promise.all(
        blockNumbers.slice(-10).map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps.set(bn, Number(block.timestamp));
          } catch {
            blockTimestamps.set(bn, Math.floor(Date.now() / 1000));
          }
        })
      );

      const tips: TipTransaction[] = logs
        .slice(-10)
        .reverse()
        .map((log) => ({
          sender: (log.args.from as string) ?? "0x",
          amount: formatUnits(
            (log.args.value as bigint) ?? 0n,
            USDC_DECIMALS
          ),
          timestamp: blockTimestamps.get(log.blockNumber) ?? 0,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        }));

      setHistory(tips);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [creatorAddress, isValidAddress]);

  /* ────────────── Reset Form ────────────── */

  const resetForm = useCallback(() => {
    setSelectedPreset(null);
    setCustomAmount("");
    setStatus("idle");
    setTxHash("");
    setErrorMsg("");
  }, []);

  /* ────────────── Effects ────────────── */

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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

  /* ━━━━━━━━━━━━━━━━━━━━ Render ━━━━━━━━━━━━━━━━━━━━ */

  /* ── Invalid address guard ── */
  if (!isValidAddress) {
    return (
      <>
        <Navbar
          account={account}
          connecting={connecting}
          onConnect={connectWallet}
          onDisconnect={disconnect}
        />
        <main className="flex-1 flex items-center justify-center px-4 py-12" style={{ paddingTop: 84 }}>
          <div className="w-full max-w-[480px] animate-fade-in">
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-error/15 border border-error/20 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Invalid wallet address
              </h1>
              <p className="text-sm text-subtle mb-4">
                The address in this link doesn&apos;t appear to be valid.
              </p>
              <p className="text-xs text-muted font-mono break-all">
                {creatorAddress}
              </p>
              <a href="/" className="send-btn mt-6 block text-center">
                Create an ArcJar
              </a>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar
        account={account}
        connecting={connecting}
        onConnect={connectWallet}
        onDisconnect={disconnect}
      />
      <main className="flex-1 flex items-center justify-center px-4 py-12" style={{ paddingTop: 84 }}>
      <div className="w-full max-w-[480px] animate-fade-in">
        {/* ── Glass Card ── */}
        <div className="glass-card rounded-2xl p-8">
          {/* ── Creator Header ── */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mb-4">
              <span className="text-xl font-semibold text-primary-light">
                {getInitials(creatorName)}
              </span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {creatorName}
            </h1>
            {creatorBio && (
              <p className="text-sm text-subtle mt-1.5 max-w-[320px]">
                {creatorBio}
              </p>
            )}
            <p className="text-xs text-muted mt-1 font-mono">
              {truncateAddress(creatorAddress)}
            </p>
          </div>

          {/* ── Divider ── */}
          <div className="h-px bg-border mb-6" />

          {/* ── Preset Tip Buttons ── */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted uppercase tracking-wider mb-3 block">
              Choose an amount
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map((amount) => (
                <button
                  key={amount}
                  className={`preset-btn flex-1 min-w-[70px] ${selectedPreset === amount ? "active" : ""}`}
                  onClick={() => {
                    setSelectedPreset(amount);
                    setCustomAmount("");
                  }}
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* ── Custom Amount ── */}
          <div className="mb-6">
            <input
              type="number"
              min="0.01"
              max={MAX_TIP}
              step="0.01"
              placeholder="Custom amount in USDC"
              className="custom-input"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedPreset(null);
              }}
              id="custom-amount-input"
            />
          </div>

          {/* ── Wallet Connection (in-card, synced with navbar) ── */}
          {!account ? (
            <button
              className="connect-btn mb-4"
              onClick={connectWallet}
              disabled={connecting}
              id="connect-wallet-btn"
            >
              {connecting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" />
                  Connecting…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Connect Wallet
                </span>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-between mb-4">
              <span className="connected-badge">
                {truncateAddress(account)}
              </span>
              <button
                onClick={disconnect}
                className="text-xs text-muted hover:text-error transition-colors cursor-pointer"
                id="disconnect-btn"
              >
                Disconnect
              </button>
            </div>
          )}

          {/* ── Send / Status ── */}
          {status === "idle" && (
            <button
              className="send-btn"
              onClick={sendTip}
              disabled={!canSend}
              id="send-tip-btn"
            >
              {canSend
                ? `Send $${finalAmount} USDC`
                : "Select an amount to tip"}
            </button>
          )}

          {status === "pending" && (
            <button className="send-btn pending" disabled id="pending-btn">
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" />
                Sending USDC…
              </span>
            </button>
          )}

          {status === "success" && (
            <div className="status-success">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--success)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="font-semibold text-success">
                  Tip sent! 🎉
                </span>
              </div>
              <p className="text-sm text-subtle mb-3">
                You sent{" "}
                <span className="text-foreground font-medium">
                  ${finalAmount} USDC
                </span>{" "}
                to {creatorName}
              </p>
              {txHash && (
                <a
                  href={`https://testnet.arcscan.app/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-light hover:text-foreground transition-colors underline underline-offset-2"
                  id="tx-link"
                >
                  View on ArcScan ↗
                </a>
              )}
              <button
                onClick={resetForm}
                className="send-btn mt-4"
                id="send-another-btn"
              >
                Send another tip
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="status-error">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--error)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span className="font-semibold text-error">
                  Transaction failed
                </span>
              </div>
              <p className="text-sm text-subtle mb-3">{errorMsg}</p>
              <button
                onClick={() => {
                  setStatus("idle");
                  setErrorMsg("");
                }}
                className="send-btn"
                id="retry-btn"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* ── Transaction History ── */}
        {history.length > 0 && (
          <div className="glass-card rounded-2xl p-6 mt-4 animate-fade-in" style={{ animationDelay: "0.2s", opacity: 0 }}>
            <h2 className="text-sm font-semibold text-subtle uppercase tracking-wider mb-4">
              Recent Tips
            </h2>
            {historyLoading ? (
              <div className="flex items-center justify-center py-4">
                <span className="spinner" />
              </div>
            ) : (
              <div>
                {history.map((tx) => (
                  <div key={tx.txHash} className="tx-row">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-foreground font-medium">
                        {truncateAddress(tx.sender)}
                      </span>
                      <span className="text-xs text-muted">
                        {tx.timestamp > 0 ? timeAgo(tx.timestamp) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-primary-light">
                        ${parseFloat(tx.amount).toFixed(2)}
                      </span>
                      <a
                        href={`https://testnet.arcscan.app/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted hover:text-primary-light transition-colors"
                      >
                        ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-6 text-center space-y-2.5 animate-fade-in" style={{ animationDelay: "0.3s", opacity: 0 }}>
          <img
            src="/arcjar-logo.png"
            alt="ArcJar"
            height="40"
            width="40"
            className="mx-auto navbar-logo"
            style={{ height: 40, width: "auto" }}
          />
          <p className="text-xs text-muted">
            Powered by{" "}
            <span className="text-subtle font-medium">Arc</span>
            {" · "}
            <span className="text-subtle font-medium">USDC</span>
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/"
              className="text-xs text-muted hover:text-primary-light transition-colors"
            >
              Create your own ArcJar
            </a>
            <span className="text-xs text-muted">·</span>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-primary-light transition-colors"
              id="faucet-link"
            >
              Get testnet USDC →
            </a>
          </div>
          <div className="flex justify-center pt-1">
            <BuiltByBadge />
          </div>
        </div>
      </div>
      </main>
    </>
  );
}

/* ──────────── Ethereum window type ──────────── */

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (
        event: string,
        handler: (...args: unknown[]) => void
      ) => void;
    };
  }
}
