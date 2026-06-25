"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createPublicClient,
  http,
  formatUnits,
  parseAbiItem,
} from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { arcTestnet, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/arcChain";
import { useWallet } from "./WalletProvider";

/* ──────────── Public client (singleton) ──────────── */

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});

/* ──────────── ERC-20 Transfer event ABI ──────────── */

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

/* ──────────── Helpers ──────────── */

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/* ──────────── Fade animation ──────────── */

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/* ══════════════════════════════════════════════════
   Chunked getLogs helper
   The Arc Testnet node caps eth_getLogs at a 10,000-block
   range, so we page through history in 10k chunks.
   ══════════════════════════════════════════════════ */

const LOG_CHUNK = 10_000n;
// How far back to scan. Arc Testnet produces blocks fast, so this
// covers plenty of history while staying bounded.
const SCAN_WINDOW = 500_000n;

async function getTransferLogs(args: {
  from?: `0x${string}`;
  to?: `0x${string}`;
}) {
  const latest = await publicClient.getBlockNumber();
  const start = latest > SCAN_WINDOW ? latest - SCAN_WINDOW : 0n;

  const collected: Awaited<ReturnType<typeof publicClient.getLogs>> = [];
  // Walk backwards from the latest block in 10k chunks.
  for (let to = latest; to >= start; to = to - LOG_CHUNK - 1n) {
    const from = to - LOG_CHUNK + 1n < start ? start : to - LOG_CHUNK + 1n;
    try {
      const batch = await publicClient.getLogs({
        address: USDC_ADDRESS,
        event: TRANSFER_EVENT,
        args,
        fromBlock: from,
        toBlock: to,
      });
      collected.push(...batch);
    } catch (err) {
      console.error("getLogs chunk failed:", err);
      // One failed chunk shouldn't abort the whole scan.
    }
  }
  return collected;
}

/* ══════════════════════════════════════════════════
   1. OVERVIEW VIEW
   ══════════════════════════════════════════════════ */

interface TransferLog {
  from: string;
  to: string;
  value: bigint;
  txHash: string;
  blockNumber: bigint;
  timestamp: number;
}

export function OverviewView() {
  const { account } = useWallet();
  const [loading, setLoading] = useState(true);
  const [totalReceived, setTotalReceived] = useState("0");
  const [tipCount, setTipCount] = useState(0);
  const [uniqueTippers, setUniqueTippers] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;

    async function fetchStats() {
      setLoading(true);
      try {
        const logs = await getTransferLogs({
          to: account as `0x${string}`,
        });

        if (cancelled) return;

        let total = 0n;
        const senders = new Set<string>();

        for (const log of logs) {
          total += (log.args.value as bigint) ?? 0n;
          if (log.args.from) senders.add((log.args.from as string).toLowerCase());
        }

        setTotalReceived(formatUnits(total, USDC_DECIMALS));
        setTipCount(logs.length);
        setUniqueTippers(senders.size);
      } catch (err) {
        console.error("Failed to fetch overview stats:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, [account]);

  const tipPageUrl = `https://arcjar.vercel.app/tip/${account}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(tipPageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
      const input = document.createElement("input");
      input.value = tipPageUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" exit="exit" key="overview">
      <h2 className="dashboard-heading">Your ArcJar Pages</h2>
      <p className="dashboard-subheading">Tip pages linked to your wallet</p>

      {loading ? (
        <div className="dashboard-loading">
          <span className="spinner" />
          <span style={{ color: "var(--fg-muted)", fontSize: "0.8125rem" }}>Loading stats…</span>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="dashboard-stats-grid">
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Total Received</span>
              <span className="dashboard-stat-value text-gradient">
                ${parseFloat(totalReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="dashboard-stat-unit">USDC</span>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Tips Count</span>
              <span className="dashboard-stat-value">{tipCount}</span>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-label">Unique Tippers</span>
              <span className="dashboard-stat-value">{uniqueTippers}</span>
            </div>
          </div>

          {/* Quick link card */}
          <div className="dashboard-link-card">
            <span className="dashboard-link-label">Your tip page</span>
            <div className="dashboard-link-url-row">
              <span className="dashboard-link-url">{tipPageUrl}</span>
              <div className="dashboard-link-actions">
                <button className="dashboard-link-btn" onClick={copyLink} id="overview-copy-btn">
                  {copied ? "✓ Copied" : "Copy"}
                </button>
                <a
                  href={tipPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dashboard-link-btn"
                  id="overview-open-btn"
                >
                  Open
                </a>
              </div>
            </div>
          </div>

          {tipCount === 0 && (
            <div className="dashboard-empty-state">
              <span className="dashboard-empty-icon">💡</span>
              <p>No tips received yet. Share your ArcJar link to get started.</p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   2. RECEIVED TIPS VIEW
   ══════════════════════════════════════════════════ */

export function ReceivedTipsView() {
  const { account } = useWallet();
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<TransferLog[]>([]);

  const fetchTips = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const logs = await getTransferLogs({
        to: account as `0x${string}`,
      });

      // Get block timestamps for the last 20
      const last20 = logs.slice(-20).reverse();
      const blockNumbers = [...new Set(last20.map((l) => l.blockNumber))];
      const blockTimestamps = new Map<bigint, number>();

      await Promise.all(
        blockNumbers.map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps.set(bn, Number(block.timestamp));
          } catch {
            blockTimestamps.set(bn, Math.floor(Date.now() / 1000));
          }
        })
      );

      setTips(
        last20.map((log) => ({
          from: (log.args.from as string) ?? "0x",
          to: (log.args.to as string) ?? "0x",
          value: (log.args.value as bigint) ?? 0n,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: blockTimestamps.get(log.blockNumber) ?? 0,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch received tips:", err);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" exit="exit" key="received">
      <h2 className="dashboard-heading">Received Tips</h2>
      <p className="dashboard-subheading">Last 20 incoming USDC transfers</p>

      {loading ? (
        <div className="dashboard-loading">
          <span className="spinner" />
          <span style={{ color: "var(--fg-muted)", fontSize: "0.8125rem" }}>Loading tips…</span>
        </div>
      ) : tips.length === 0 ? (
        <div className="dashboard-empty-state">
          <span className="dashboard-empty-icon">📭</span>
          <p>No tips received yet.</p>
        </div>
      ) : (
        <div className="dashboard-tips-list glass-card rounded-2xl p-1">
          {tips.map((tx, i) => (
            <motion.div
              key={tx.txHash + i}
              className="tx-row"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium" style={{ color: "var(--fg)" }}>
                  {truncateAddress(tx.from)}
                </span>
                <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                  {tx.timestamp > 0 ? timeAgo(tx.timestamp) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: "var(--accent-text)" }}>
                  ${parseFloat(formatUnits(tx.value, USDC_DECIMALS)).toFixed(2)}
                </span>
                <a
                  href={`https://testnet.arcscan.app/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs transition-colors"
                  style={{ color: "var(--fg-muted)" }}
                >
                  ↗
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   3. MY LINKS VIEW
   ══════════════════════════════════════════════════ */

export function MyLinksView() {
  const { account } = useWallet();
  const [copied, setCopied] = useState(false);
  const tipPageUrl = `https://arcjar.vercel.app/tip/${account}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(tipPageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = tipPageUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" exit="exit" key="links">
      <h2 className="dashboard-heading">My Links</h2>
      <p className="dashboard-subheading">Your tip page URL</p>

      <div className="dashboard-link-card large">
        <span className="dashboard-link-label">Tip Page</span>
        <div className="dashboard-link-url-row">
          <span className="dashboard-link-url mono">{tipPageUrl}</span>
        </div>
        <div className="dashboard-link-actions mt-3">
          <button className="dashboard-link-btn" onClick={copyLink} id="links-copy-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? "Copied!" : "Copy"}
          </button>
          <a
            href={tipPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dashboard-link-btn"
            id="links-open-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open
          </a>
        </div>
      </div>

      {/* QR Placeholder */}
      <div className="dashboard-qr-placeholder">
        <div className="dashboard-qr-box">
          <span style={{ color: "var(--fg-muted)", fontSize: "0.75rem" }}>QR coming soon</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   4. SENT TIPS VIEW
   ══════════════════════════════════════════════════ */

export function SentTipsView() {
  const { account } = useWallet();
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<TransferLog[]>([]);

  const fetchTips = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const logs = await getTransferLogs({
        from: account as `0x${string}`,
      });

      const last20 = logs.slice(-20).reverse();
      const blockNumbers = [...new Set(last20.map((l) => l.blockNumber))];
      const blockTimestamps = new Map<bigint, number>();

      await Promise.all(
        blockNumbers.map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps.set(bn, Number(block.timestamp));
          } catch {
            blockTimestamps.set(bn, Math.floor(Date.now() / 1000));
          }
        })
      );

      setTips(
        last20.map((log) => ({
          from: (log.args.from as string) ?? "0x",
          to: (log.args.to as string) ?? "0x",
          value: (log.args.value as bigint) ?? 0n,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: blockTimestamps.get(log.blockNumber) ?? 0,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch sent tips:", err);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" exit="exit" key="sent">
      <h2 className="dashboard-heading">Sent Tips</h2>
      <p className="dashboard-subheading">Last 20 outgoing USDC transfers</p>

      {loading ? (
        <div className="dashboard-loading">
          <span className="spinner" />
          <span style={{ color: "var(--fg-muted)", fontSize: "0.8125rem" }}>Loading…</span>
        </div>
      ) : tips.length === 0 ? (
        <div className="dashboard-empty-state">
          <span className="dashboard-empty-icon">📤</span>
          <p>No tips sent yet.</p>
        </div>
      ) : (
        <div className="dashboard-tips-list glass-card rounded-2xl p-1">
          {tips.map((tx, i) => (
            <motion.div
              key={tx.txHash + i}
              className="tx-row"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium" style={{ color: "var(--fg)" }}>
                  To: {truncateAddress(tx.to)}
                </span>
                <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                  {tx.timestamp > 0 ? timeAgo(tx.timestamp) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: "var(--accent-text)" }}>
                  ${parseFloat(formatUnits(tx.value, USDC_DECIMALS)).toFixed(2)}
                </span>
                <a
                  href={`https://testnet.arcscan.app/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs transition-colors"
                  style={{ color: "var(--fg-muted)" }}
                >
                  ↗
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   5. TOP TIPPERS VIEW (Coming Soon)
   ══════════════════════════════════════════════════ */

export function TopTippersView() {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" exit="exit" key="top-tippers">
      <h2 className="dashboard-heading">
        Top Tippers <span className="sidebar-soon-badge" style={{ marginLeft: 8, verticalAlign: "middle" }}>SOON</span>
      </h2>
      <p className="dashboard-subheading">Leaderboard of your biggest supporters</p>

      <div className="dashboard-empty-state coming-soon">
        <span className="dashboard-empty-icon">🏆</span>
        <p>This feature is coming soon.</p>
        <p className="dashboard-empty-sub">
          We&apos;re building a leaderboard to showcase your top supporters.
        </p>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   6. CREATE NEW JAR VIEW
   ══════════════════════════════════════════════════ */

function isValidAddress(addr: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export function CreateJarView() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [addressError, setAddressError] = useState("");

  const canGenerate = name.trim() && address.trim() && isValidAddress(address);

  const generateLink = useCallback(() => {
    if (!canGenerate) {
      if (address && !isValidAddress(address)) {
        setAddressError("Invalid address. Must be 0x followed by 40 hex characters.");
      }
      return;
    }
    setAddressError("");

    const params = new URLSearchParams();
    params.set("name", name.trim());
    if (bio.trim()) params.set("bio", bio.trim());

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setGeneratedUrl(`${origin}/tip/${address}?${params.toString()}`);
    setCopied(false);
  }, [name, bio, address, canGenerate]);

  const copyLink = useCallback(async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = generatedUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedUrl]);

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" exit="exit" key="create-jar">
      <h2 className="dashboard-heading">Create New Jar</h2>
      <p className="dashboard-subheading">Generate a new tip page link</p>

      <div className="glass-card rounded-2xl p-7">
        {/* Name */}
        <div className="mb-6">
          <label htmlFor="jar-name" className="label-upper mb-2.5 block">Your name</label>
          <input
            id="jar-name"
            type="text"
            placeholder="Alex"
            className="custom-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label htmlFor="jar-bio" className="label-upper mb-2.5 block">Short bio</label>
          <input
            id="jar-bio"
            type="text"
            placeholder="Building on Arc"
            className="custom-input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={120}
          />
        </div>

        {/* Address */}
        <div className="mb-7">
          <label htmlFor="jar-address" className="label-upper mb-2.5 block">Wallet address</label>
          <input
            id="jar-address"
            type="text"
            placeholder="0x..."
            className={`custom-input font-mono text-sm ${addressError ? "!border-error" : ""}`}
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setAddressError("");
              setGeneratedUrl("");
            }}
            spellCheck={false}
          />
          {addressError && (
            <p className="text-xs mt-1.5" style={{ color: "var(--danger)" }}>{addressError}</p>
          )}
        </div>

        {/* Generate Button */}
        <button
          className="send-btn"
          onClick={generateLink}
          disabled={!name.trim() || !address.trim()}
          id="jar-generate-btn"
        >
          Generate my link
        </button>

        {/* Generated URL */}
        <AnimatePresence>
          {generatedUrl && (
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="divider-gradient mb-4" />
              <label className="label-upper mb-2 block">Your tip jar link</label>
              <div className="flex gap-2">
                <div className="flex-1 custom-input text-sm break-all select-all overflow-hidden" style={{ wordBreak: "break-all", background: "var(--input-bg)" }}>
                  {generatedUrl}
                </div>
                <button onClick={copyLink} className="preset-btn !px-4 !rounded-xl shrink-0 active" id="jar-copy-btn">
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
