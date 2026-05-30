"use client";

import { useState, useCallback } from "react";

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

/* ━━━━━━━━━━━━━━━━━━━━ Component ━━━━━━━━━━━━━━━━━━━━ */

export default function CreateTipJarPage() {
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
    if (bio.trim()) {
      params.set("bio", bio.trim());
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/tip/${address}?${params.toString()}`;
    setGeneratedUrl(url);
    setCopied(false);
  }, [name, bio, address, canGenerate]);

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
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[520px] animate-fade-in">
        {/* ── Header ── */}
        <div className="text-center mb-8">
          <img
            src="/arcjar-logo.png"
            alt="ArcJar"
            height="80"
            width="80"
            className="mx-auto mb-4"
            style={{ height: 80, width: "auto" }}
          />
          <h1 className="text-2xl font-semibold text-foreground">
            Create your ArcJar
          </h1>
          <p className="text-sm text-subtle mt-2 max-w-[360px] mx-auto">
            Get a shareable link. Receive USDC tips on Arc Testnet — instantly, no middlemen.
          </p>
        </div>

        {/* ── Form Card ── */}
        <div className="glass-card rounded-2xl p-8">
          {/* Name */}
          <div className="mb-5">
            <label htmlFor="creator-name" className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
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
          <div className="mb-5">
            <label htmlFor="creator-bio" className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
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

          {/* Address */}
          <div className="mb-6">
            <label htmlFor="creator-address" className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
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
              <p className="text-xs text-error mt-1.5">{addressError}</p>
            )}
          </div>

          {/* Generate Button */}
          <button
            className="send-btn"
            onClick={generateLink}
            disabled={!name.trim() || !address.trim()}
            id="generate-link-btn"
          >
            Generate my link
          </button>

          {/* ── Generated URL ── */}
          {generatedUrl && (
            <div className="mt-6 animate-slide-up">
              <div className="h-px bg-border mb-6" />

              <label className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
                Your tip jar link
              </label>

              <div className="flex gap-2">
                <div className="flex-1 custom-input !bg-surface/80 text-sm break-all cursor-text select-all overflow-hidden" style={{ wordBreak: "break-all" }}>
                  {generatedUrl}
                </div>
                <button
                  onClick={copyLink}
                  className="preset-btn !px-4 !rounded-xl shrink-0 active"
                  id="copy-link-btn"
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
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Live Preview ── */}
        {generatedUrl && (
          <div className="mt-4 animate-fade-in" style={{ animationDelay: "0.15s", opacity: 0 }}>
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3 text-center">
              Preview
            </p>
            <div className="glass-card rounded-2xl p-6 scale-[0.92] origin-top">
              {/* Mini creator card preview */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mb-3">
                  <span className="text-sm font-semibold text-primary-light">
                    {getInitials(name || "C")}
                  </span>
                </div>
                <p className="text-base font-semibold text-foreground">
                  {name || "Creator"}
                </p>
                {bio && (
                  <p className="text-xs text-subtle mt-1">{bio}</p>
                )}
                <p className="text-xs text-muted mt-1 font-mono">
                  {truncateAddress(address)}
                </p>
              </div>
              <div className="h-px bg-border mb-4" />
              {/* Fake preset buttons */}
              <div className="flex gap-2 mb-4">
                {[1, 5, 10, 25].map((a) => (
                  <div key={a} className="preset-btn flex-1 text-center text-xs pointer-events-none">
                    ${a}
                  </div>
                ))}
              </div>
              {/* Fake send button */}
              <div className="send-btn text-center text-sm opacity-60 pointer-events-none">
                Connect Wallet
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-6 text-center space-y-1.5 animate-fade-in" style={{ animationDelay: "0.3s", opacity: 0 }}>
          <p className="text-xs text-muted">
            Powered by{" "}
            <span className="text-subtle font-medium">Arc</span>
            {" · "}
            <span className="text-subtle font-medium">USDC</span>
          </p>
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
      </div>
    </main>
  );
}
