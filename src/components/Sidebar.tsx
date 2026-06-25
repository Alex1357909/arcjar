"use client";

import { useState, useEffect } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { arcTestnet } from "@/lib/arcChain";
import { useWallet } from "./WalletProvider";

/* ──────────── Public client (singleton) ──────────── */

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});

/* ──────────── Menu definition ──────────── */

export interface MenuItem {
  id: string;
  icon: string;
  label: string;
  section: string;
  soon?: boolean;
  external?: string; // opens URL instead of switching view
}

export const MENU_ITEMS: MenuItem[] = [
  // CREATOR
  { id: "overview", icon: "📊", label: "Overview", section: "CREATOR" },
  { id: "received", icon: "💰", label: "Received Tips", section: "CREATOR" },
  { id: "links", icon: "🔗", label: "My Links", section: "CREATOR" },
  // ACTIVITY
  { id: "sent", icon: "📤", label: "Sent Tips", section: "ACTIVITY" },
  { id: "top-tippers", icon: "🏆", label: "Top Tippers", section: "ACTIVITY", soon: true },
  // TOOLS
  { id: "create-jar", icon: "➕", label: "Create New Jar", section: "TOOLS" },
  { id: "explorer", icon: "🌐", label: "Explorer", section: "TOOLS", external: "https://testnet.arcscan.app/address/" },
];

/* ──────────── Helpers ──────────── */

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/* ──────────── Component ──────────── */

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  activeView,
  onViewChange,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const { account } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);

  /* ── Fetch native balance ── */
  useEffect(() => {
    if (!account) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    async function fetchBalance() {
      try {
        const bal = await publicClient.getBalance({
          address: account as `0x${string}`,
        });
        if (!cancelled) {
          // viem's getBalance returns the raw 18-decimal value regardless of
          // how the chain's nativeCurrency.decimals is configured.
          setBalance(formatUnits(bal, 18));
        }
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        if (!cancelled) setBalance(null);
      }
    }

    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [account]);

  if (!account) return null;

  /* ── Group items by section ── */
  const sections = MENU_ITEMS.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const handleItemClick = (item: MenuItem) => {
    if (item.external) {
      window.open(`${item.external}${account}`, "_blank", "noopener,noreferrer");
      return;
    }
    onViewChange(item.id);
    onMobileClose();
  };

  const sidebarContent = (
    <>
      {/* ── Header: wallet info ── */}
      <div className="sidebar-header">
        <div className="sidebar-wallet-row">
          <span className="sidebar-green-dot" />
          <span className="sidebar-address">{truncateAddress(account)}</span>
        </div>
        <div className="sidebar-balance">
          {balance !== null ? (
            <>
              <span className="sidebar-balance-value">
                {parseFloat(balance).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="sidebar-balance-label">USDC</span>
            </>
          ) : (
            <span className="sidebar-balance-loading">
              <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
            </span>
          )}
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* ── Menu sections ── */}
      <nav className="sidebar-nav">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="sidebar-section">
            <span className="sidebar-section-label">{section}</span>
            {items.map((item) => (
              <button
                key={item.id}
                className={`sidebar-menu-item ${activeView === item.id && !item.external ? "active" : ""}`}
                onClick={() => handleItemClick(item)}
                id={`sidebar-${item.id}`}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span className="sidebar-item-label">{item.label}</span>
                {item.soon && <span className="sidebar-soon-badge">SOON</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="sidebar" id="dashboard-sidebar">
        {sidebarContent}
      </aside>

      {/* ── Mobile overlay ── */}
      <div
        className={`sidebar-mobile-overlay ${mobileOpen ? "open" : ""}`}
        onClick={onMobileClose}
      />
      <aside className={`sidebar-mobile ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-mobile-handle" />
        {sidebarContent}
      </aside>
    </>
  );
}
