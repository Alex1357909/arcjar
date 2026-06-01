"use client";

import { useTheme } from "./ThemeProvider";

/* ──────────── Helpers ──────────── */

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/* ──────────── Icons ──────────── */

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ──────────── Component ──────────── */

interface NavbarProps {
  account: string | null;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function Navbar({
  account,
  connecting,
  onConnect,
  onDisconnect,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="arcjar-navbar" id="main-navbar">
      {/* ── Left: Logo + Name ── */}
      <a href="/" className="navbar-brand">
        <img
          src="/arcjar-logo.png"
          alt="ArcJar"
          width="36"
          height="36"
          className="navbar-logo"
        />
        <span className="navbar-title">ArcJar</span>
      </a>

      {/* ── Right: Theme toggle + Wallet ── */}
      <div className="navbar-actions">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          id="theme-toggle-btn"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Wallet button */}
        {!account ? (
          <button
            onClick={onConnect}
            disabled={connecting}
            className="navbar-wallet-btn"
            id="navbar-connect-btn"
          >
            {connecting ? (
              <span className="flex items-center gap-2">
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                <span className="navbar-wallet-text">Connecting…</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <WalletIcon />
                <span className="navbar-wallet-text">Connect Wallet</span>
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={onDisconnect}
            className="navbar-connected-btn"
            id="navbar-connected-btn"
          >
            <span className="navbar-green-dot" />
            <span className="navbar-wallet-text">{truncateAddress(account)}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
