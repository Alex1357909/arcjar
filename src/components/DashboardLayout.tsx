"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWallet } from "./WalletProvider";
import Sidebar from "./Sidebar";
import {
  OverviewView,
  ReceivedTipsView,
  MyLinksView,
  SentTipsView,
  TopTippersView,
  CreateJarView,
} from "./DashboardViews";

/* ──────────── View Router ──────────── */

function DashboardContent({ activeView }: { activeView: string }) {
  return (
    <AnimatePresence mode="wait">
      {activeView === "overview" && <OverviewView key="overview" />}
      {activeView === "received" && <ReceivedTipsView key="received" />}
      {activeView === "links" && <MyLinksView key="links" />}
      {activeView === "sent" && <SentTipsView key="sent" />}
      {activeView === "top-tippers" && <TopTippersView key="top-tippers" />}
      {activeView === "create-jar" && <CreateJarView key="create-jar" />}
    </AnimatePresence>
  );
}

/* ──────────── Layout Component ──────────── */

interface DashboardLayoutProps {
  children: React.ReactNode;
  /** If true, always show the page children (e.g. tip page), sidebar alongside */
  alwaysShowChildren?: boolean;
}

export default function DashboardLayout({
  children,
  alwaysShowChildren = false,
}: DashboardLayoutProps) {
  const { account } = useWallet();
  const [activeView, setActiveView] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const isConnected = !!account;

  /* If not connected, just render children normally */
  if (!isConnected) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Mobile hamburger button */}
      <button
        className="mobile-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Open dashboard menu"
        id="mobile-menu-btn"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Main content area — shifts right on desktop */}
      <motion.div
        className="dashboard-main"
        initial={{ marginLeft: 0 }}
        animate={{ marginLeft: 260 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {alwaysShowChildren ? (
          /* Tip page: always show children, sidebar is just for navigation */
          children
        ) : (
          /* Homepage: show dashboard view content */
          <main className="flex-1 flex items-start justify-center px-4 py-12" style={{ paddingTop: 80 }}>
            <div className="w-full max-w-[680px]">
              <DashboardContent activeView={activeView} />
            </div>
          </main>
        )}
      </motion.div>
    </>
  );
}
