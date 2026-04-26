import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuthContext } from '../contexts/AuthContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { Home, List, Calendar, TrendingUp, Plus, Settings, Wallet, LogOut } from 'lucide-react';
import SetupDialog from './SetupDialog';
import DashboardTab from './DashboardTab';
import TransactionsTab from './TransactionsTab';
import MonthlySummaryTab from './MonthlySummaryTab';
import AnnualSummaryTab from './AnnualSummaryTab';
import ErrorBoundary from './ErrorBoundary';
import AddTransactionDialog from './AddTransactionDialog';
import { Transaction } from '../types';

type Tab = 'dashboard' | 'transactions' | 'monthly' | 'annual';

const NAV_ITEMS: { id: Tab; label: string; shortLabel: string; Icon: React.ElementType }[] = [
  { id: 'dashboard',    label: 'ダッシュボード', shortLabel: 'ホーム', Icon: Home },
  { id: 'transactions', label: '取引履歴',       shortLabel: '取引',   Icon: List },
  { id: 'monthly',      label: '月次サマリー',   shortLabel: '月次',   Icon: Calendar },
  { id: 'annual',       label: '年次サマリー',   shortLabel: '年次',   Icon: TrendingUp },
];

const TAB_TITLES: Record<Tab, string> = {
  dashboard: 'ダッシュボード',
  transactions: '取引履歴',
  monthly: '月次サマリー',
  annual: '年次サマリー',
};

const PRIMARY = '#3347B0';
const BORDER  = '#EAECF0';
const INACTIVE = '#B0B7C3';

const iconBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  background: 'transparent', border: `1px solid ${BORDER}`,
  cursor: 'pointer', color: '#6B7280',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export default function KakeiboApp() {
  const { isInitialSetupDone, loading } = useAppContext();
  const { signOut } = useAuthContext();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [isSetupDialogOpen, setSetupDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!loading && !isInitialSetupDone) setSetupDialogOpen(true);
  }, [isInitialSetupDone, loading]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p>ユーザーデータを読み込んでいます...</p>
      </div>
    );
  }

  if (!isInitialSetupDone && !isSetupDialogOpen) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 16, textAlign: 'center' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>ようこそ！</h2>
        <p>家計簿を始めるために、まずは初期設定を行いましょう。</p>
        <button
          onClick={() => setSetupDialogOpen(true)}
          style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: `linear-gradient(140deg, ${PRIMARY}, ${PRIMARY}BB)`, color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
        >
          設定を開始する
        </button>
        <SetupDialog open={isSetupDialogOpen} onOpenChange={setSetupDialogOpen} />
      </div>
    );
  }

  const openAddSheet  = () => { setTransactionToEdit(null); setIsSheetOpen(true); };
  const openEditSheet = (t: Transaction) => { setTransactionToEdit(t); setIsSheetOpen(true); };
  const closeSheet    = (o: boolean) => { if (!o) setTransactionToEdit(null); setIsSheetOpen(o); };

  const tabContent = (
    <div key={tab} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      <ErrorBoundary fallbackTitle="エラーが発生しました">
        {tab === 'dashboard'    && <DashboardTab onNavigateToTransactions={() => setTab('transactions')} />}
        {tab === 'transactions' && <TransactionsTab onEdit={openEditSheet} />}
        {tab === 'monthly'      && <MonthlySummaryTab />}
        {tab === 'annual'       && <AnnualSummaryTab />}
      </ErrorBoundary>
    </div>
  );

  const dialogs = (
    <>
      <AddTransactionDialog
        key={transactionToEdit?.id ?? 'new'}
        open={isSheetOpen}
        onOpenChange={closeSheet}
        transactionToEdit={transactionToEdit}
      />
      <SetupDialog open={isSetupDialogOpen} onOpenChange={setSetupDialogOpen} />
    </>
  );

  /* ── Desktop ── */
  if (isDesktop) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <nav style={{
          width: 240, flexShrink: 0,
          background: '#fff', borderRight: `1px solid ${BORDER}`,
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
          display: 'flex', flexDirection: 'column',
          boxShadow: '2px 0 16px rgba(0,0,0,0.04)',
        }}>
          {/* Logo */}
          <div style={{ padding: '28px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Wallet size={20} color="#fff" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 700 }}>家計簿</span>
          </div>

          {/* Nav items */}
          <div style={{ padding: '0 12px', flex: 1 }}>
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: active ? `${PRIMARY}15` : 'transparent',
                    color: active ? PRIMARY : '#6B7280',
                    fontWeight: active ? 600 : 400,
                    fontSize: 14, marginBottom: 2, textAlign: 'left',
                  }}
                >
                  <Icon size={18} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Add button */}
          <div style={{ padding: '0 16px 12px' }}>
            <button
              onClick={openAddSheet}
              style={{
                width: '100%', padding: '11px', border: 'none', borderRadius: 12,
                background: `linear-gradient(140deg, ${PRIMARY}, ${PRIMARY}BB)`,
                color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: `0 4px 16px ${PRIMARY}40`,
              }}
            >
              <Plus size={16} />
              取引を追加
            </button>
          </div>

          {/* Settings / Logout */}
          <div style={{ padding: '0 16px 20px', display: 'flex', gap: 8 }}>
            <button onClick={() => setSetupDialogOpen(true)} style={iconBtn} title="設定"><Settings size={16} /></button>
            <button onClick={signOut} style={iconBtn} title="ログアウト"><LogOut size={16} /></button>
          </div>
        </nav>

        {/* Main area */}
        <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <header style={{
            padding: '28px 36px 16px', borderBottom: `1px solid ${BORDER}`,
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{TAB_TITLES[tab]}</h1>
          </header>
          <div style={{ padding: '28px 36px 40px', flex: 1 }}>
            {tabContent}
          </div>
        </div>

        {dialogs}
      </div>
    );
  }

  /* ── Mobile ── */
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      {/* Mobile sticky header */}
      <header style={{
        padding: '14px 16px', background: '#fff', borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{TAB_TITLES[tab]}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setSetupDialogOpen(true)} style={iconBtn} title="設定"><Settings size={16} /></button>
          <button onClick={signOut} style={iconBtn} title="ログアウト"><LogOut size={16} /></button>
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {tabContent}
      </div>

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: `1px solid ${BORDER}`,
        display: 'flex', zIndex: 40, height: 64,
      }}>
        {/* First 2 items */}
        {NAV_ITEMS.slice(0, 2).map(({ id, shortLabel, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <Icon size={22} color={active ? PRIMARY : INACTIVE} />
              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: PRIMARY, marginTop: -1 }} />}
              <span style={{ fontSize: 10, color: active ? PRIMARY : INACTIVE, fontWeight: active ? 600 : 400 }}>{shortLabel}</span>
            </button>
          );
        })}

        {/* FAB */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            onClick={openAddSheet}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `linear-gradient(140deg, ${PRIMARY}, ${PRIMARY}BB)`,
              border: 'none', cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: 'translateY(-10px)',
              boxShadow: '0 5px 20px rgba(51,71,176,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            <Plus size={22} />
          </button>
        </div>

        {/* Last 2 items */}
        {NAV_ITEMS.slice(2).map(({ id, shortLabel, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <Icon size={22} color={active ? PRIMARY : INACTIVE} />
              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: PRIMARY, marginTop: -1 }} />}
              <span style={{ fontSize: 10, color: active ? PRIMARY : INACTIVE, fontWeight: active ? 600 : 400 }}>{shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {dialogs}
    </div>
  );
}
