"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import DashboardLayout from "@/components/DashboardLayout";
import { useWallet } from "@/components/WalletProvider";

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

/* ──────────── Motion variants ──────────── */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const modalOverlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalContent = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } },
};

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

  /* ── Goal params ── */
  const goalParam = searchParams.get("goal");
  const goal = goalParam ? Number(goalParam) : null;
  const goalDesc = searchParams.get("goalDesc") || null;

  /* ── Wallet state ── */
  const { account, connecting, connectWallet, disconnectWallet } = useWallet();

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

  /* ── Success modal state ── */
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  /* ── Goal progress state ── */
  const [goalLoading, setGoalLoading] = useState(false);
  const [totalReceived, setTotalReceived] = useState<number | null>(null);

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
      setShowSuccessModal(true);

      // Fire confetti
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.55 },
        colors: ["#3B82F6", "#06B6D4", "#8B5CF6", "#34D399", "#FBBF24"],
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
    setShowSuccessModal(false);
  }, []);

  /* ────────────── Fetch Goal Progress ────────────── */

  const fetchGoalProgress = useCallback(async () => {
    if (!goal || !creatorAddress || !isValidAddress) return;

    const LOG_CHUNK = 10_000n;
    const SCAN_WINDOW = 500_000n;

    setGoalLoading(true);
    try {
      const latest = await publicClient.getBlockNumber();
      const start = latest > SCAN_WINDOW ? latest - SCAN_WINDOW : 0n;

      let sum = 0n;
      for (let to = latest; to >= start; to = to - LOG_CHUNK - 1n) {
        const from = to - LOG_CHUNK + 1n < start ? start : to - LOG_CHUNK + 1n;
        try {
          const batch = await publicClient.getLogs({
            address: USDC_ADDRESS,
            event: TRANSFER_EVENT,
            args: { to: creatorAddress as `0x${string}` },
            fromBlock: from,
            toBlock: to,
          });
          for (const log of batch) {
            sum += (log.args.value as bigint) ?? 0n;
          }
        } catch {
          // ignore individual chunk failures
        }
      }

      setTotalReceived(parseFloat(formatUnits(sum, USDC_DECIMALS)));
    } catch {
      // on failure, hide the goal section (leave totalReceived as null)
    } finally {
      setGoalLoading(false);
    }
  }, [goal, creatorAddress, isValidAddress]);

  /* ────────────── Effects ────────────── */

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchGoalProgress();
  }, [fetchGoalProgress]);



  /* ━━━━━━━━━━━━━━━━━━━━ Render ━━━━━━━━━━━━━━━━━━━━ */

  /* ── Invalid address guard ── */
  if (!isValidAddress) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-12" style={{ paddingTop: 80 }}>
          <motion.div
            className="w-full max-w-[480px]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h1 className="heading-section text-xl mb-2">
                Invalid wallet address
              </h1>
              <p className="text-sm mb-4" style={{ color: 'var(--fg-dim)' }}>
                The address in this link doesn&apos;t appear to be valid.
              </p>
              <p className="text-xs font-mono break-all" style={{ color: 'var(--fg-muted)' }}>
                {creatorAddress}
              </p>
              <a href="/" className="send-btn mt-6 block text-center">
                Create an ArcJar
              </a>
            </div>
          </motion.div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <DashboardLayout alwaysShowChildren={true}>

      {/* ── Success Modal Overlay ── */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            className="success-overlay"
            variants={modalOverlay}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="success-overlay-bg" onClick={() => setShowSuccessModal(false)} />
            <motion.div
              className="success-modal"
              variants={modalContent}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Check icon */}
              <motion.div
                className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                style={{ background: 'var(--success-bg)', border: '2px solid var(--success-border)' }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </motion.div>

              <h2 className="heading-display text-xl mb-2">
                Tip sent! 🎉
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--fg-dim)' }}>
                You sent{" "}
                <span className="text-gradient font-bold">
                  ${finalAmount} USDC
                </span>{" "}
                to {creatorName}
              </p>
              {txHash && (
                <a
                  href={`https://testnet.arcscan.app/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline underline-offset-2 transition-colors mb-5 inline-block"
                  style={{ color: 'var(--accent-text)' }}
                  id="tx-link"
                >
                  View on ArcScan ↗
                </a>
              )}
              <motion.button
                onClick={resetForm}
                className="send-btn mt-3"
                id="send-another-btn"
                whileTap={{ scale: 0.97 }}
              >
                Send another tip
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex items-center justify-center px-4 py-12" style={{ paddingTop: 80 }}>
        <motion.div
          className="w-full max-w-[480px]"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* ── Glass Card ── */}
          <motion.div className="glass-card rounded-2xl p-7 sm:p-8" variants={scaleIn}>
            {/* ── Creator Header ── */}
            <div className="flex flex-col items-center text-center mb-8">
              <motion.div
                className="avatar-ring mb-4"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              >
                <div className="w-[4.25rem] h-[4.25rem] rounded-full flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
                  <span className="text-xl font-bold" style={{ color: 'var(--accent-text)' }}>
                    {getInitials(creatorName)}
                  </span>
                </div>
              </motion.div>
              <h1 className="heading-display text-[1.625rem] sm:text-[1.875rem]">
                {creatorName}
              </h1>
              {creatorBio && (
                <p className="text-[0.875rem] mt-2 max-w-[300px] leading-relaxed" style={{ color: 'var(--fg-dim)' }}>
                  {creatorBio}
                </p>
              )}
              <p className="text-xs mt-1.5 font-mono" style={{ color: 'var(--fg-muted)' }}>
                {truncateAddress(creatorAddress)}
              </p>
            </div>

            {/* ── Goal Progress Bar ── */}
            {goal !== null && goalDesc && (
              goalLoading ? (
                /* Skeleton */
                <div
                  className="rounded-xl mb-6 p-4"
                  style={{
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <div
                    className="h-3 rounded-full mb-3 animate-pulse"
                    style={{ background: 'rgba(255,255,255,0.12)', width: '60%' }}
                  />
                  <div
                    className="h-3 rounded-full mb-3 animate-pulse"
                    style={{ background: 'rgba(255,255,255,0.08)', width: '100%' }}
                  />
                  <div
                    className="h-2 rounded-full animate-pulse"
                    style={{ background: 'rgba(255,255,255,0.06)', width: '45%' }}
                  />
                </div>
              ) : totalReceived !== null ? (
                /* Real bar */
                (() => {
                  const pct = Math.min((totalReceived / goal) * 100, 100);
                  const reached = totalReceived >= goal;
                  return (
                    <div
                      className="rounded-xl mb-6 p-4"
                      style={{
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'rgba(255,255,255,0.05)',
                      }}
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                          🎯 {goalDesc}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: reached ? '#4ade80' : 'var(--accent-text)' }}>
                          {Math.round(pct)}%
                        </span>
                      </div>

                      {/* Bar track */}
                      <div
                        className="h-3 rounded-full overflow-hidden mb-2"
                        style={{ background: 'rgba(255,255,255,0.10)' }}
                      >
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: reached
                              ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                              : 'linear-gradient(90deg, #3E74BB, #ACC6E9)',
                            transition: 'width 0.8s ease',
                          }}
                        />
                      </div>

                      {/* Stats row */}
                      {reached ? (
                        <p className="text-xs font-medium" style={{ color: '#4ade80' }}>
                          🎉 Goal reached! Thank you!
                        </p>
                      ) : (
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.60)', fontSize: 13 }}>
                          ${totalReceived.toFixed(2)} raised of ${goal.toFixed(2)} goal
                        </p>
                      )}
                    </div>
                  );
                })()
              ) : null /* hide on error */
            )}

            {/* ── Divider ── */}
            <div className="divider-gradient mb-6" />

            {/* ── Preset Tip Buttons ── */}
            <div className="mb-5">
              <label className="label-upper mb-3 block">
                Choose an amount
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {PRESETS.map((amount, i) => (
                  <motion.button
                    key={amount}
                    className={`preset-btn ${selectedPreset === amount ? "active" : ""}`}
                    onClick={() => {
                      setSelectedPreset(amount);
                      setCustomAmount("");
                    }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    ${amount}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* ── Custom Amount ── */}
            <div className="mb-7">
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
            <AnimatePresence mode="wait">
              {!account ? (
                <motion.button
                  key="connect"
                  className="connect-btn mb-5"
                  onClick={connectWallet}
                  disabled={connecting}
                  id="connect-wallet-btn"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  whileTap={{ scale: 0.98 }}
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
                </motion.button>
              ) : (
                <motion.div
                  key="connected"
                  className="flex items-center justify-between mb-5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="connected-badge">
                    {truncateAddress(account)}
                  </span>
                  <button
                    onClick={disconnectWallet}
                    className="text-xs cursor-pointer transition-colors"
                    style={{ color: 'var(--fg-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--fg-muted)'}
                    id="disconnect-btn"
                  >
                    Disconnect
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Send / Status ── */}
            <AnimatePresence mode="wait">
              {status === "idle" && (
                <motion.button
                  key="idle"
                  className="send-btn"
                  onClick={sendTip}
                  disabled={!canSend}
                  id="send-tip-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {canSend
                    ? `Send $${finalAmount} USDC`
                    : "Select an amount to tip"}
                </motion.button>
              )}

              {status === "pending" && (
                <motion.button
                  key="pending"
                  className="send-btn pending"
                  disabled
                  id="pending-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner" style={{ borderTopColor: '#fff' }} />
                    Sending USDC…
                  </span>
                </motion.button>
              )}

              {status === "success" && !showSuccessModal && (
                <motion.div
                  key="success-inline"
                  className="status-success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="font-bold" style={{ color: 'var(--success)' }}>
                      Tip sent! 🎉
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'var(--fg-dim)' }}>
                    You sent{" "}
                    <span className="font-bold" style={{ color: 'var(--fg)' }}>
                      ${finalAmount} USDC
                    </span>{" "}
                    to {creatorName}
                  </p>
                  {txHash && (
                    <a
                      href={`https://testnet.arcscan.app/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline underline-offset-2 transition-colors"
                      style={{ color: 'var(--accent-text)' }}
                      id="tx-link"
                    >
                      View on ArcScan ↗
                    </a>
                  )}
                  <motion.button
                    onClick={resetForm}
                    className="send-btn mt-4"
                    id="send-another-btn"
                    whileTap={{ scale: 0.97 }}
                  >
                    Send another tip
                  </motion.button>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  key="error"
                  className="status-error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span className="font-bold" style={{ color: 'var(--danger)' }}>
                      Transaction failed
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'var(--fg-dim)' }}>{errorMsg}</p>
                  <motion.button
                    onClick={() => {
                      setStatus("idle");
                      setErrorMsg("");
                    }}
                    className="send-btn"
                    id="retry-btn"
                    whileTap={{ scale: 0.97 }}
                  >
                    Try again
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Transaction History ── */}
          <AnimatePresence>
            {history.length > 0 && (
              <motion.div
                className="glass-card rounded-2xl p-5 mt-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              >
                <h2 className="label-upper mb-4">
                  Recent Tips
                </h2>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="spinner" />
                  </div>
                ) : (
                  <div>
                    {history.map((tx, i) => (
                      <motion.div
                        key={tx.txHash}
                        className="tx-row"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                            {truncateAddress(tx.sender)}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                            {tx.timestamp > 0 ? timeAgo(tx.timestamp) : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>
                            ${parseFloat(tx.amount).toFixed(2)}
                          </span>
                          <a
                            href={`https://testnet.arcscan.app/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs transition-colors"
                            style={{ color: 'var(--fg-muted)' }}
                          >
                            ↗
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Footer ── */}
          <motion.div className="mt-10 text-center space-y-2.5" variants={fadeUp}>
            <img
              src="/arcjar-logo.png"
              alt="ArcJar"
              height="32"
              width="32"
              className="mx-auto navbar-logo"
              style={{ height: 32, width: "auto" }}
            />
            <p className="powered-text">
              Powered by <strong>Arc</strong> · <strong>USDC</strong>
            </p>
            <div className="flex items-center justify-center gap-3">
              <a
                href="/"
                className="footer-link"
              >
                Create your own ArcJar
              </a>
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>·</span>
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
                id="faucet-link"
              >
                Get testnet USDC →
              </a>
            </div>
            <div className="flex justify-center pt-1">
              <BuiltByBadge />
            </div>
          </motion.div>
        </motion.div>
      </main>
      </DashboardLayout>
    </>
  );
}
