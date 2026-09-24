import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminLoginCard } from '@/components/admin/AdminLoginCard';
import { EquipmentAdmin } from '@/components/admin/EquipmentAdmin';
import { AnalyticsAdmin } from '@/components/admin/AnalyticsAdmin';
import PricingAdmin from '@/components/PricingAdmin';

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [{ title: 'لوحة الإدارة — أحمد حداد' }, { name: 'robots', content: 'noindex' }] }),
  component: AdminPage,
});

type Tab = 'pricing' | 'equipment' | 'analytics';

function AdminPage() {
  const { session, isAdmin, checking } = useAdminAuth();
  const [tab, setTab] = useState<Tab>('pricing');

  if (checking) return <LoadingScreen />;
  if (!session) return <div dir="rtl" style={{ minHeight: '100vh', background: '#0e0e0e', color: '#f2e4d4', fontFamily: "'SFMada', system-ui, sans-serif" }}><AdminLoginCard /></div>;
  if (!isAdmin) return <NotAuthorized />;

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#0e0e0e', color: '#f2e4d4', fontFamily: "'SFMada', system-ui, sans-serif" }}>
      <AdminNav session={session} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
        <TabBar active={tab} onChange={setTab} />
        <div style={{ marginTop: 28 }}>
          {tab === 'pricing' && <PricingAdmin />}
          {tab === 'equipment' && <EquipmentAdmin />}
          {tab === 'analytics' && <AnalyticsAdmin />}
        </div>
      </div>
    </div>
  );
}

function AdminNav({ session }: { session: Session | null }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(14,14,14,0.9)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(183,37,52,0.25)" }}>
      <Link to="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#f2e4d4" }}>أحمد حداد</span>
        <span style={{ fontSize: 11, letterSpacing: 2, color: "#b72534" }}>لوحة الإدارة</span>
      </Link>
      <nav style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {session && (
          <button onClick={() => supabase.auth.signOut()} style={{ padding: "8px 16px", border: "1px solid rgba(183,37,52,0.35)", color: "#b72534", textDecoration: "none", fontSize: 13, fontWeight: 600, letterSpacing: 1, borderRadius: 6, cursor: "pointer", background: "transparent" }}>خروج</button>
        )}
      </nav>
    </header>
  );
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'pricing', label: 'التسعيرات', icon: '💰' },
    { id: 'equipment', label: 'المعدات', icon: '🎥' },
    { id: 'analytics', label: 'التحليلات', icon: '📊' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(242,228,212,0.1)', paddingBottom: 0, overflowX: 'auto' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{
            background: 'none', border: 'none', borderBottom: active === t.id ? '2px solid #b72534' : '2px solid transparent',
            color: active === t.id ? '#f2e4d4' : '#bdb3a0',
            padding: '12px 20px', cursor: 'pointer', fontSize: 14, fontWeight: active === t.id ? 700 : 400,
            fontFamily: 'inherit', marginBottom: -1, transition: 'all 0.2s ease', whiteSpace: 'nowrap'
          }}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#0e0e0e', color: '#bdb3a0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'SFMada', system-ui, sans-serif" }}>
      <p>جاري التحقق…</p>
    </div>
  );
}

function NotAuthorized() {
  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#0e0e0e', color: '#f2e4d4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'SFMada', system-ui, sans-serif" }}>
      <h2>لا توجد صلاحيات</h2>
      <p style={{ color: '#bdb3a0', marginBottom: 20 }}>حسابك ليس مديراً.</p>
      <button onClick={() => supabase.auth.signOut()} style={{ background: "#b72534", color: "#f2e4d4", border: "none", padding: "10px 18px", fontWeight: 700, cursor: "pointer", borderRadius: 6, fontSize: 13 }}>تسجيل الخروج</button>
    </div>
  );
}