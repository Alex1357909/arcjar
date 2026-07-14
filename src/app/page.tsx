"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import BuiltByBadge from "@/components/BuiltByBadge";
import DashboardLayout from "@/components/DashboardLayout";
import { useWallet } from "@/components/WalletProvider";

/* ──────────── Helpers ──────────── */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isValidAddress(addr: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/* ──────────── Motion variants ──────────── */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

/* ━━━━━━━━━━━━━━━━━━━━ Component ━━━━━━━━━━━━━━━━━━━━ */

export default function CreateTipJarPage() {
  const { account } = useWallet();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDesc, setGoalDesc] = useState("");
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
    if (bio.trim()) {
      params.set("bio", bio.trim());
    }
    // Only append goal if BOTH amount and description are filled
    if (goalAmount.trim() && goalDesc.trim()) {
      params.set("goal", goalAmount.trim());
      params.set("goalDesc", goalDesc.trim());
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/tip/${address}?${params.toString()}`;
    setGeneratedUrl(url);
    setCopied(false);
  }, [name, bio, address, goalAmount, goalDesc, canGenerate]);

  const copyLink = useCallback(async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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
    <>
      {/* ── Navbar ── */}
      <Navbar />

      <DashboardLayout>
        <main className="flex-1 flex items-center justify-center px-4 py-12" style={{ paddingTop: 80 }}>
        <motion.div
          className="w-full max-w-[520px]"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* ── Header ── */}
          <motion.div className="text-center mb-10" variants={fadeUp}>
            <h1 className="heading-display text-[2rem] sm:text-[2.375rem]">
              Create your{" "}
              <span className="text-gradient">ArcJar</span>
            </h1>
            <p className="text-[0.9375rem] mt-3 max-w-[400px] mx-auto leading-relaxed" style={{ color: 'var(--fg-dim)' }}>
              Get a shareable link. Receive USDC tips on Arc — instantly, no middlemen.
            </p>
          </motion.div>

          {/* ── Form Card ── */}
          <motion.div className="glass-card rounded-2xl p-7 sm:p-8" variants={scaleIn}>
            {/* Name */}
            <div className="mb-6">
              <label htmlFor="creator-name" className="label-upper mb-2.5 block">
                Your name
              </label>
              <input
                id="creator-name"
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
              <label htmlFor="creator-bio" className="label-upper mb-2.5 block">
                Short bio
              </label>
              <input
                id="creator-bio"
                type="text"
                placeholder="Building on Arc"
                className="custom-input"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={120}
              />
            </div>

            {/* Fundraising Goal */}
            <div className="mb-6">
              <label className="label-upper mb-2.5 block">
                Fundraising Goal <span style={{ color: 'var(--fg-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="goal-amount"
                  type="number"
                  placeholder="Amount in USDC"
                  className="custom-input"
                  style={{ width: 152, flexShrink: 0 }}
                  min="1"
                  value={goalAmount}
                  onChange={(e) => { setGoalAmount(e.target.value); setGeneratedUrl(""); }}
                />
                <input
                  id="goal-desc"
                  type="text"
                  placeholder="e.g. New microphone, Server costs"
                  className="custom-input"
                  style={{ flex: 1 }}
                  value={goalDesc}
                  onChange={(e) => { setGoalDesc(e.target.value); setGeneratedUrl(""); }}
                  maxLength={80}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--fg-muted)' }}>
                Donors will see a progress bar on your tip page
              </p>
            </div>

            {/* Address */}
            <div className="mb-7">
              <label htmlFor="creator-address" className="label-upper mb-2.5 block">
                Your Arc wallet address
              </label>
              <input
                id="creator-address"
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
                <motion.p
                  className="text-xs text-error mt-1.5"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {addressError}
                </motion.p>
              )}
            </div>

            {/* Generate Button */}
            <motion.button
              className="send-btn"
              onClick={generateLink}
              disabled={!name.trim() || !address.trim()}
              id="generate-link-btn"
              whileTap={{ scale: 0.98 }}
            >
              Generate my link
            </motion.button>

            {/* ── Generated URL ── */}
            <AnimatePresence>
              {generatedUrl && (
                <motion.div
                  className="mt-6"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="divider-gradient mb-6" />

                  <label className="label-upper mb-2.5 block">
                    Your tip jar link
                  </label>

                  <div className="flex gap-2">
                    <div className="flex-1 custom-input text-sm break-all cursor-text select-all overflow-hidden" style={{ wordBreak: "break-all", background: 'var(--input-bg)' }}>
                      {generatedUrl}
                    </div>
                    <motion.button
                      onClick={copyLink}
                      className="preset-btn !px-4 !rounded-xl shrink-0 active"
                      id="copy-link-btn"
                      whileTap={{ scale: 0.95 }}
                    >
                      {copied ? (
                        <span className="flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          Copy
                        </span>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Live Preview ── */}
          <AnimatePresence>
            {generatedUrl && (
              <motion.div
                className="mt-5"
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              >
                <p className="label-upper mb-3 text-center">
                  Preview
                </p>
                <div className="glass-card rounded-2xl p-5 scale-[0.92] origin-top">
                  {/* Mini creator card preview */}
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="avatar-ring mb-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
                        <span className="text-sm font-semibold text-primary-light">
                          {getInitials(name || "C")}
                        </span>
                      </div>
                    </div>
                    <p className="heading-section text-[0.9375rem]">
                      {name || "Creator"}
                    </p>
                    {bio && (
                      <p className="text-xs mt-1" style={{ color: 'var(--fg-dim)' }}>{bio}</p>
                    )}
                    <p className="text-xs mt-1 font-mono" style={{ color: 'var(--fg-muted)' }}>
                      {truncateAddress(address)}
                    </p>
                  </div>
                  <div className="divider-gradient mb-4" />
                  {/* Fake preset buttons */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[1, 5, 10, 25].map((a) => (
                      <div key={a} className="preset-btn text-center text-xs pointer-events-none">
                        ${a}
                      </div>
                    ))}
                  </div>
                  {/* Fake send button */}
                  <div className="send-btn text-center text-sm opacity-40 pointer-events-none">
                    Connect Wallet
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Footer ── */}
          <motion.div className="mt-10 text-center space-y-2" variants={fadeUp}>
            <p className="powered-text">
              Powered by <strong>Arc</strong> · <strong>USDC</strong>
            </p>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
              id="faucet-link"
            >
              Get testnet USDC →
            </a>
            <div className="flex justify-center pt-2">
              <BuiltByBadge />
            </div>
          </motion.div>
        </motion.div>
      </main>
      </DashboardLayout>
    </>
  );
}
