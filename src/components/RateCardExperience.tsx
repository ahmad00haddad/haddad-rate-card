import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin, MessageCircle, Wrench } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import {
  formatPricingAmount,
  pricingSections,
  regionLabel,
  type PricingItem,
  type PricingLanguage,
  type PricingRegion,
} from "@/lib/pricing";

type RateCardExperienceProps = {
  items: PricingItem[];
  compact?: boolean;
  initialRegion?: Exclude<PricingRegion, "both">;
};

const policies = [
  { icon: "✏️", ar: "تعديلان مجاناً", en: "2 free revisions", value: "2", descAr: "ثم 25 JOD لكل جلسة إضافية", descEn: "Then 25 JOD per extra session" },
  { icon: "📦", ar: "مدة التسليم", en: "Delivery", value: "7–14", descAr: "يوم عمل بعد التصوير", descEn: "working days after wrap" },
  { icon: "⚡", ar: "تسليم مستعجل", en: "Rush delivery", value: "+50%", descAr: "خلال 3 أيام أو أقل", descEn: "within 3 days or less" },
  { icon: "🔧", ar: "المعدات", en: "Equipment", value: "✓", descAr: "مشمولة في سعر التصوير", descEn: "Included in shoot price" },
  { icon: "💰", ar: "دفعة مقدمة", en: "Deposit", value: "50%", descAr: "لتأكيد الحجز", descEn: "To confirm booking" },
  { icon: "📍", ar: "خارج إربد", en: "Outside Irbid", value: "+", descAr: "رسوم تنقل حسب المسافة", descEn: "Travel fees by distance" },
];

export function RateCardExperience({ items, compact = false, initialRegion }: RateCardExperienceProps) {
  const [language, setLanguage] = useState<PricingLanguage>("ar");
  const [region, setRegion] = useState<Exclude<PricingRegion, "both"> | null>(initialRegion ?? null);
  const [section, setSection] = useState<string | null>(null);
  const rtl = language === "ar";
  const visibleItems = useMemo(
    () => items.filter((item) => item.section === section && (item.region === region || item.region === "both")),
    [items, region, section],
  );
  const currentSection = pricingSections.find((entry) => entry.key === section);

  function chooseRegion(next: Exclude<PricingRegion, "both">) {
    setRegion(next);
    setSection(null);
    void trackEvent("region_select", next);
  }

  function chooseSection(next: string) {
    setSection(next);
    void trackEvent("service_select", next);
  }

  const step = !region ? 1 : !section ? 2 : 3;
  const text = <T,>(ar: T, en: T) => language === "ar" ? ar : en;

  return (
    <div className={`ratecard ${compact ? "ratecard--compact" : ""}`} dir={rtl ? "rtl" : "ltr"}>
      <header className="ratecard__header">
        <div className="ratecard__brand">
          <strong>{text("أحمد حداد", "Ahmad Haddad")}</strong>
          <span>{text("مصور سينمائي · الأردن", "Cinematic filmmaker · Jordan")}</span>
        </div>
        <div className="ratecard__actions">
          {!compact && <a className="ratecard__text-link" href="https://ahmadhaddad.lovable.app/">{text("الموقع الرئيسي", "Portfolio")}</a>}
          {!compact && <Button asChild variant="outline" size="sm"><Link to="/equipment"><Wrench />{text("المعدات", "Equipment")}</Link></Button>}
          <Button variant="outline" size="sm" onClick={() => setLanguage(rtl ? "en" : "ar")}>{rtl ? "EN" : "عربي"}</Button>
          {!compact && <Button asChild size="sm"><a href="https://wa.me/962799256345" target="_blank" rel="noreferrer"><MessageCircle />{text("تواصل معنا", "Contact")}</a></Button>}
        </div>
      </header>

      <section className="ratecard__hero">
        <p className="ratecard__eyebrow">CINEMATIC FILMMAKER · JORDAN</p>
        <h1>{text("قائمة ", "Rate ")}<span>{text("التسعيرات", "Card")}</span></h1>
        <p>{text("اختر المنطقة والخدمة واعرف السعر فوراً", "Choose your region and service to view pricing")}</p>
        <div className="ratecard__steps" aria-label={text("خطوات عرض السعر", "Pricing steps")}>
          {[text("المنطقة", "Region"), text("الخدمة", "Service"), text("السعر", "Price")].map((label, index) => (
            <div className={step >= index + 1 ? "is-active" : ""} key={String(label)}><span>{index + 1}</span><small>{label}</small></div>
          ))}
        </div>
      </section>

      <main className="ratecard__main">
        {!region && (
          <section className="ratecard__stage">
            <div className="ratecard__section-title"><h2>{text("أين سيتم التصوير؟", "Where will the shoot take place?")}</h2><p>{text("اختر المنطقة لعرض أسعارها فقط", "Choose a region to see its prices only")}</p></div>
            <div className="ratecard__regions">
              <button onClick={() => chooseRegion("irbid")}><MapPin /><strong>{text("إربد", "Irbid")}</strong><span>{text("شمال الأردن", "Northern Jordan")}</span></button>
              <button onClick={() => chooseRegion("amman")}><span className="ratecard__city-icon">🏙️</span><strong>{text("عمّان", "Amman")}</strong><span>{text("العاصمة", "The capital")}</span></button>
            </div>
          </section>
        )}

        {region && !section && (
          <section className="ratecard__stage">
            <RegionButton region={region} language={language} onClick={() => setRegion(null)} />
            <div className="ratecard__section-title"><h2>{text("ما الخدمة التي تحتاجها؟", "Which service do you need?")}</h2><p>{text("اضغط على الخدمة لعرض الأسعار", "Select a service to view pricing")}</p></div>
            <div className="ratecard__services">
              {pricingSections.map((entry) => (
                <button key={entry.key} onClick={() => chooseSection(entry.key)}><span>{entry.icon}</span><strong>{text(entry.ar, entry.en)}</strong><small>{entry.en}</small></button>
              ))}
            </div>
            {!compact && <PolicyStrip language={language} />}
          </section>
        )}

        {region && section && (
          <section className="ratecard__stage">
            <button className="ratecard__back" onClick={() => setSection(null)}>
              {rtl ? <ArrowRight /> : <ArrowLeft />}{text("العودة لقائمة الخدمات", "Back to services")}
            </button>
            <RegionButton region={region} language={language} onClick={() => { setRegion(null); setSection(null); }} />
            <div className="ratecard__section-title"><h2>{currentSection?.icon} {text(currentSection?.ar ?? "", currentSection?.en ?? "")}</h2><p>{text("الأسعار التالية خاصة بالمنطقة المختارة", "Pricing for your selected region")}</p></div>
            <div className="ratecard__pricing-list">
              {visibleItems.map((item) => <PricingRow key={item.id} item={item} language={language} />)}
              {visibleItems.length === 0 && <div className="ratecard__empty">{text("لا توجد بنود منشورة لهذه الخدمة حالياً.", "No published items for this service yet.")}</div>}
            </div>
            
            {section === "reels" && (
              <div style={{ 
                marginTop: 16, 
                padding: "12px 16px", 
                background: "#15171a", 
                border: "1px solid rgba(244,153,33,0.3)", 
                borderRight: rtl ? "3px solid #f49921" : "1px solid rgba(244,153,33,0.3)",
                borderLeft: !rtl ? "3px solid #f49921" : "1px solid rgba(244,153,33,0.3)",
                borderRadius: 4, 
                color: "#f0ece4", 
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span>✍️</span>
                <div>
                  <strong style={{ color: "#f49921", fontWeight: 700 }}>{text("كتابة السيناريو:", "Scriptwriting:")}</strong> {text("متاحة عبر كاتب خارجي متعاون — 50 إلى 100 JOD إضافية حسب المشروع.", "Available through an external collaborating writer — 50 to 100 JOD additional depending on the project.")}
                </div>
              </div>
            )}

            <div className="ratecard__notice"><Check />{text("المعدات الأساسية مشمولة. السعر النهائي يعتمد على تفاصيل المشروع ويمكن التفاوض عليه.", "Core equipment is included. Final pricing depends on project details and can be negotiated.")}</div>
          </section>
        )}
      </main>

      {!compact && <a className="ratecard__whatsapp" href="https://wa.me/962799256345" target="_blank" rel="noreferrer" aria-label={text("واتساب", "WhatsApp")}><MessageCircle /></a>}
    </div>
  );
}

function RegionButton({ region, language, onClick }: { region: Exclude<PricingRegion, "both">; language: PricingLanguage; onClick: () => void }) {
  return <button className="ratecard__region-pill" onClick={onClick}><MapPin /><span>{language === "ar" ? "المنطقة:" : "Region:"}</span><strong>{regionLabel(region, language)}</strong><small>{language === "ar" ? "تغيير" : "Change"}</small></button>;
}

function PricingRow({ item, language }: { item: PricingItem; language: PricingLanguage }) {
  const ar = language === "ar";
  const unit = ar ? item.unit_ar : item.unit_en;
  const note = ar ? item.note_ar : item.note_en;
  return (
    <article className={`ratecard__price-row ${item.is_featured ? "is-featured" : ""}`}>
      <div className="ratecard__price-copy">
        {item.is_featured && (ar ? item.tag_ar : item.tag_en) && <span className="ratecard__tag">{ar ? item.tag_ar : item.tag_en}</span>}
        <h3>{ar ? item.name_ar : item.name_en}</h3>
        <p>{ar ? item.desc_ar : item.desc_en}</p>
      </div>
      <div className="ratecard__price-value">
        <small>{ar ? item.price_label_ar : item.price_label_en}</small>
        <strong>{formatPricingAmount(item)}</strong>
        <span>{unit || item.currency}</span>
        {note && <em>{note}</em>}
      </div>
    </article>
  );
}

function PolicyStrip({ language }: { language: PricingLanguage }) {
  const ar = language === "ar";
  return <section className="ratecard__policies"><h2>{ar ? "السياسات والشروط" : "Policies & terms"}</h2><div>{policies.map((policy) => <article key={policy.en}><span>{policy.icon}</span><h3>{ar ? policy.ar : policy.en}</h3><strong>{policy.value}</strong><p>{ar ? policy.descAr : policy.descEn}</p></article>)}</div></section>;
}