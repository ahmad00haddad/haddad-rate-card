export function StatCard({ label, value, accent, wide }: { label: string; value: number | string; accent?: string; wide?: boolean }) {
  return (
    <div style={{ background: '#161616', border: '1px solid rgba(183,37,52,0.18)', borderRadius: 12, padding: '18px 20px', gridColumn: wide ? 'span 2' : undefined }}>
      <p style={{ margin: 0, color: '#bdb3a0', fontSize: 12, letterSpacing: 1 }}>{label}</p>
      <p style={{ margin: '8px 0 0', fontSize: 28, color: accent ?? '#b72534', fontWeight: 700 }}>{value}</p>
    </div>
  );
}
