import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function AdminLoginCard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMsg(error.message);
  }

  return (
    <div style={{
      maxWidth: 400, margin: '80px auto', background: '#161616',
      padding: 36, border: '1px solid rgba(183,37,52,0.25)', borderRadius: 12,
      boxShadow: '0 24px 48px rgba(0,0,0,0.6)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: 4, color: '#b72534', textTransform: 'uppercase' }}>لوحة الإدارة</p>
        <h1 style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 800, color: '#f2e4d4' }}>أحمد حداد</h1>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني"
          style={{ background: '#0e0e0e', border: '1px solid rgba(242,228,212,0.15)', color: '#f2e4d4',
            padding: '11px 14px', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const }} />
        <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          style={{ background: '#0e0e0e', border: '1px solid rgba(242,228,212,0.15)', color: '#f2e4d4',
            padding: '11px 14px', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const }} />
        <button type="submit" disabled={loading}
          style={{ background: '#b72534', color: '#f2e4d4', border: 'none', padding: '12px',
            fontWeight: 700, cursor: 'pointer', borderRadius: 6, fontSize: 14,
            opacity: loading ? 0.6 : 1, fontFamily: 'inherit' }}>
          {loading ? '...' : 'دخول'}
        </button>
      </form>
      {msg && <p style={{ color: '#ef6c6c', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{msg}</p>}
    </div>
  );
}
