import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header
      dir="rtl"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "18px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(14,15,17,0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(183,37,52,0.3)",
        fontFamily: "'SFMada', sans-serif",
      }}
    >
      <Link to="/" style={{ display: "flex", flexDirection: "column", gap: 1, textDecoration: "none" }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#f2e4d4" }}>
          أحمد حداد
        </span>
        <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#b72534" }}>
          مصور سينمائي · إربد
        </span>
      </Link>
      <nav style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <a
          href="https://ahmadhaddad.lovable.app/"
          style={{ ...navStyle, borderColor: "rgba(183,37,52,0.5)" }}
        >
          ← الموقع الرئيسي
        </a>
        <Link to="/" style={navStyle}>التسعيرات</Link>
        <Link to="/equipment" style={navStyle}>المعدات</Link>
      </nav>
    </header>
  );
}

const navStyle = {
  background: "transparent",
  border: "1px solid rgba(183,37,52,0.3)",
  color: "#b72534",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 1,
  padding: "8px 16px",
  textDecoration: "none",
  transition: "all 0.3s",
} as const;