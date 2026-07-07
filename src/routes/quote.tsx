import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { submitQuoteRequest } from "@/lib/quote-request.functions";

export const Route = createFileRoute("/quote")({
  head: () => ({
    meta: [
      { title: "اطلب عرض سعر — أحمد حداد" },
      {
        name: "description",
        content:
          "املأ النموذج للحصول على عرض سعر مخصص لتصوير سينمائي، أفلام، ريلز، إعلانات أو إيفنتات في عمّان أو إربد.",
      },
      { property: "og:title", content: "اطلب عرض سعر — أحمد حداد" },
      { property: "og:description", content: "عرض سعر مخصص لتصوير سينمائي في عمّان وإربد." },
      { property: "og:url", content: "https://haddad-rate-card.lovable.app/quote" },
    ],
    links: [{ rel: "canonical", href: "https://haddad-rate-card.lovable.app/quote" }],
  }),
  component: QuotePage,
});

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#f49921",
  letterSpacing: 1,
  marginBottom: 8,
  fontWeight: 600,
};
const input: React.CSSProperties = {
  width: "100%",
  background: "#171a1d",
  border: "1px solid rgba(244,153,33,0.3)",
  color: "#f0ece4",
  padding: "12px 14px",
  borderRadius: 8,
  fontFamily: "inherit",
  fontSize: 15,
};

function QuotePage() {
  const submit = useServerFn(submitQuoteRequest);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      region: (String(fd.get("region") ?? "") || undefined) as "amman" | "irbid" | undefined,
      service: String(fd.get("service") ?? ""),
      event_date: String(fd.get("event_date") ?? ""),
      message: String(fd.get("message") ?? ""),
      website: String(fd.get("website") ?? ""),
    };
    setState("sending");
    setErr("");
    try {
      await submit({ data: payload });
      setState("sent");
      (e.target as HTMLFormElement).reset();
    } catch (e: unknown) {
      setState("error");
      setErr(e instanceof Error ? e.message : "حدث خطأ، حاول مجدداً.");
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#0e0f11",
        color: "#f0ece4",
        padding: "40px 20px",
        fontFamily: "'SFMada', sans-serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          to="/"
          style={{
            color: "#f49921",
            fontSize: 13,
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 24,
          }}
        >
          ← الرجوع للتسعيرات
        </Link>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 36,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          اطلب عرض سعر مخصص
        </h1>
        <p style={{ color: "#c0bab0", marginBottom: 32, lineHeight: 1.8 }}>
          املأ التفاصيل وسأتواصل معك خلال 24 ساعة عمل بعرض سعر مناسب لمشروعك.
        </p>

        {state === "sent" ? (
          <div
            style={{
              background: "rgba(244,153,33,0.1)",
              border: "1px solid rgba(244,153,33,0.4)",
              padding: 24,
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <h2 style={{ fontSize: 20, marginBottom: 8, color: "#f49921" }}>
              تم استلام طلبك
            </h2>
            <p style={{ color: "#c0bab0" }}>
              سأتواصل معك قريباً. للاستعجال:{" "}
              <a
                href="https://wa.me/962799256345"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#f49921" }}
              >
                واتساب مباشر
              </a>
            </p>
            <button
              type="button"
              onClick={() => setState("idle")}
              style={{
                marginTop: 20,
                background: "transparent",
                border: "1px solid rgba(244,153,33,0.4)",
                color: "#f49921",
                padding: "10px 20px",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              إرسال طلب آخر
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 20 }}>
            {/* honeypot */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              style={{ position: "absolute", left: "-9999px", opacity: 0 }}
              aria-hidden="true"
            />

            <div>
              <label style={label} htmlFor="name">الاسم *</label>
              <input style={input} id="name" name="name" required minLength={2} maxLength={120} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={label} htmlFor="phone">رقم الهاتف / واتساب *</label>
                <input style={input} id="phone" name="phone" required type="tel" inputMode="tel" placeholder="+962 7..." />
              </div>
              <div>
                <label style={label} htmlFor="email">البريد الإلكتروني</label>
                <input style={input} id="email" name="email" type="email" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={label} htmlFor="region">المنطقة</label>
                <select style={input} id="region" name="region" defaultValue="">
                  <option value="">اختر —</option>
                  <option value="amman">عمّان</option>
                  <option value="irbid">إربد</option>
                </select>
              </div>
              <div>
                <label style={label} htmlFor="event_date">تاريخ التصوير (تقريبي)</label>
                <input style={input} id="event_date" name="event_date" type="date" />
              </div>
            </div>

            <div>
              <label style={label} htmlFor="service">نوع الخدمة المطلوبة</label>
              <select style={input} id="service" name="service" defaultValue="">
                <option value="">اختر —</option>
                <option>فيلم قصير</option>
                <option>إعلان TVC</option>
                <option>ريلز / سوشيال</option>
                <option>وثائقي</option>
                <option>إيفنت / حفل</option>
                <option>بودكاست</option>
                <option>مونتاج وتلوين</option>
                <option>أخرى</option>
              </select>
            </div>

            <div>
              <label style={label} htmlFor="message">تفاصيل المشروع</label>
              <textarea
                style={{ ...input, minHeight: 140, resize: "vertical" }}
                id="message"
                name="message"
                maxLength={2000}
                placeholder="فكرة المشروع، المدة، الموقع، الميزانية التقديرية..."
              />
            </div>

            {err && (
              <div
                style={{
                  background: "rgba(220,60,60,0.1)",
                  border: "1px solid rgba(220,60,60,0.4)",
                  color: "#ff9a9a",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={state === "sending"}
              style={{
                background: "#f49921",
                color: "#0e0f11",
                border: "none",
                padding: "16px 32px",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 8,
                cursor: state === "sending" ? "wait" : "pointer",
                fontFamily: "inherit",
                opacity: state === "sending" ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {state === "sending" ? "جاري الإرسال..." : "أرسل الطلب"}
            </button>

            <p style={{ fontSize: 12, color: "#9a9890", textAlign: "center" }}>
              أو تواصل مباشرة عبر{" "}
              <a
                href="https://wa.me/962799256345"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#f49921" }}
              >
                واتساب
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}