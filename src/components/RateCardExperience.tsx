import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin, Wrench, Lock, ShieldCheck } from "lucide-react";
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
  isLoading?: boolean;
};

const policies = [
  { icon: "✏️", ar: "تعديلان مجاناً", en: "2 free revisions", value: "2", descAr: "ثم 25 JOD لكل جلسة إضافية", descEn: "Then 25 JOD per extra session" },
  { icon: "📦", ar: "مدة التسليم", en: "Delivery", value: "7–14", descAr: "يوم عمل بعد التصوير", descEn: "working days after wrap" },
  { icon: "⚡", ar: "تسليم مستعجل", en: "Rush delivery", value: "+50%", descAr: "خلال 3 أيام أو أقل", descEn: "within 3 days or less" },
  { icon: "🔧", ar: "المعدات", en: "Equipment", value: "✓", descAr: "مشمولة في سعر التصوير", descEn: "Included in shoot price" },
  { icon: "💰", ar: "دفعة مقدمة", en: "Deposit", value: "50%", descAr: "لتأكيد الحجز", descEn: "To confirm booking" },
  { icon: "📍", ar: "خارج إربد", en: "Outside Irbid", value: "+", descAr: "رسوم تنقل حسب المسافة", descEn: "Travel fees by distance" },
];

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function AnimatedNumber({ value }: { value: string }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const numbers = Array.from(value.matchAll(/\d+/g)).map(m => ({
      val: parseInt(m[0], 10),
      index: m.index!,
      length: m[0].length
    }));
    
    if (numbers.length === 0) {
      setDisplayValue(value);
      return;
    }
    
    let startTimestamp: number;
    const duration = 600;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = easeOutCubic(progress);
      
      let newStr = value;
      for (let i = numbers.length - 1; i >= 0; i--) {
        const { val, index, length } = numbers[i];
        const currentVal = Math.round(val * ease);
        newStr = newStr.substring(0, index) + currentVal + newStr.substring(index + length);
      }
      
      setDisplayValue(newStr);
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };
    
    animationFrameId = requestAnimationFrame(step);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <>{displayValue}</>;
}

function StaggerItem({ children, delayIndex = 0 }: { children: React.ReactNode, delayIndex?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        if (ref.current) observer.unobserve(ref.current);
      }
    }, { threshold: 0.1 });

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 400ms ease-out, transform 400ms ease-out`,
        transitionDelay: `${delayIndex * 80}ms`
      }}
    >
      {children}
    </div>
  );
}

export function RateCardExperience({ items, compact = false, initialRegion, isLoading = false }: RateCardExperienceProps) {
  const [language, setLanguage] = useState<PricingLanguage>("ar");
  const [region, setRegion] = useState<Exclude<PricingRegion, "both"> | null>(initialRegion ?? null);
  const [section, setSection] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"JOD" | "USD">("JOD");
  const [isSticky, setIsSticky] = useState(false);

  const rtl = language === "ar";
  
  const [autoDetected, setAutoDetected] = useState(false);
  
  // Auto-detect Jordan region
  useEffect(() => {
    if (!initialRegion && !region && !autoDetected) {
      setAutoDetected(true);
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz === 'Asia/Amman') {
          // Default to Amman to save user click (progressive enhancement)
          setRegion('amman');
        }
      } catch (e) {
        // ignore
      }
    }
  }, [initialRegion, region, autoDetected]);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 150);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const visibleItems = useMemo(
    () => items.filter((item) => item.section === section && (item.region === region || item.region === "both") && !item.is_hidden),
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

  // Render Skeleton Loader if loading
  if (isLoading) {
    return (
      <div className={`ratecard ${compact ? "ratecard--compact" : ""}`} dir={rtl ? "rtl" : "ltr"}>
         <main className="ratecard__main" style={{ opacity: 0.5 }}>
           <div className="animate-pulse flex flex-col gap-4">
             <div className="h-10 bg-gray-800 rounded w-1/3 mb-8"></div>
             <div className="h-32 bg-gray-800 rounded w-full"></div>
             <div className="h-32 bg-gray-800 rounded w-full"></div>
           </div>
         </main>
      </div>
    );
  }

  return (
    <div className={`ratecard ${compact ? "ratecard--compact" : ""}`} dir={rtl ? "rtl" : "ltr"}>
      {isSticky && step === 3 && region && section && (
        <div style={{ 
          position: "fixed", top: 0, left: 0, right: 0, background: "rgba(10, 10, 10, 0.95)", 
          backdropFilter: "blur(12px)", padding: "12px 24px", zIndex: 50, 
          borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", 
          justifyContent: "center", alignItems: "center", gap: 12, color: "#f0ece4",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
        }}>
          <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            📍 {regionLabel(region, language)} · <span className="[&>svg]:w-4 [&>svg]:h-4">{currentSection?.icon}</span> {text(currentSection?.ar, currentSection?.en)} · {visibleItems.length} {text("خيارات", "options")}
          </span>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ marginLeft: rtl ? 0 : 'auto', marginRight: rtl ? 'auto' : 0, fontSize: 12, background: "rgba(244,153,33,0.15)", color: "#f49921", padding: "4px 8px", borderRadius: 4, transition: "background 0.2s" }} className="hover:bg-[rgba(244,153,33,0.25)]">
            {text("العودة للأعلى ↑", "Back to top ↑")}
          </button>
        </div>
      )}

      <header className="ratecard__header">
        <div className="ratecard__brand">
          <strong>{text("أحمد حداد", "Ahmad Haddad")}</strong>
          <span>{text("مصور سينمائي · الأردن", "Cinematic filmmaker · Jordan")}</span>
        </div>
        <div className="ratecard__actions">
          {!compact && <a className="ratecard__text-link" href="https://ahmadhaddad.lovable.app/">{text("الموقع الرئيسي", "Portfolio")}</a>}
          {!compact && <Button asChild variant="outline" size="sm"><Link to="/equipment"><Wrench />{text("المعدات", "Equipment")}</Link></Button>}
          
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
            <button onClick={() => setCurrency("JOD")} style={{ padding: "4px 8px", fontSize: 11, fontWeight: currency === "JOD" ? "bold" : "normal", background: currency === "JOD" ? "#f49921" : "transparent", color: currency === "JOD" ? "#000" : "#fff" }}>JOD</button>
            <button onClick={() => setCurrency("USD")} style={{ padding: "4px 8px", fontSize: 11, fontWeight: currency === "USD" ? "bold" : "normal", background: currency === "USD" ? "#f49921" : "transparent", color: currency === "USD" ? "#000" : "#fff" }}>USD</button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setLanguage(rtl ? "en" : "ar")}>{rtl ? "EN" : "عربي"}</Button>
        </div>
      </header>

      <section className="ratecard__hero">
        <p className="ratecard__eyebrow">CINEMATIC FILMMAKER · JORDAN</p>
        <h1>{text("قائمة ", "Rate ")}<span>{text("التسعيرات", "Card")}</span></h1>
        <p>{text("اختر المنطقة والخدمة واعرف السعر فوراً", "Choose your region and service to view pricing")}</p>
        
        {/* Interactive Stepper */}
        <div className="ratecard__steps" aria-label={text("خطوات عرض السعر", "Pricing steps")} style={{ cursor: "pointer" }}>
          <div className={step >= 1 ? "is-active" : ""} onClick={() => { setRegion(null); setSection(null); }}><span>1</span><small>{text("المنطقة", "Region")}</small></div>
          <div className={step >= 2 ? "is-active" : ""} onClick={() => { if (region) setSection(null); }}><span>2</span><small>{text("الخدمة", "Service")}</small></div>
          <div className={step >= 3 ? "is-active" : ""}><span>3</span><small>{text("السعر", "Price")}</small></div>
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
            
            <div className="ratecard__services" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {pricingSections.map((entry) => {
                const sectionItems = items.filter(item => item.section === entry.key && (item.region === region || item.region === "both") && !item.is_hidden);
                const itemCount = sectionItems.length;
                const minPrice = Math.min(...sectionItems.map(i => i.price_min ?? Infinity).filter(p => p !== Infinity));
                const minPriceStr = minPrice !== Infinity ? `${minPrice} ${currency}` : "";

                const previewAr = `${itemCount} خيارات ${minPriceStr ? `· من ${minPriceStr}` : ""}`;
                const previewEn = `${itemCount} options ${minPriceStr ? `· from ${minPriceStr}` : ""}`;

                return (
                  <button 
                    key={entry.key} 
                    onClick={() => chooseSection(entry.key)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "32px 16px",
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(244,153,33,0.2)", borderRadius: 12, transition: "all 0.3s ease",
                      position: "relative"
                    }}
                    className="hover:bg-[rgba(244,153,33,0.1)] hover:-translate-y-1 group"
                  >
                    <span className="text-[#9b948a] group-hover:text-[#f49921] transition-colors [&>svg]:w-10 [&>svg]:h-10">
                      {entry.icon}
                    </span>
                    <div style={{ textAlign: "center" }}>
                      <strong style={{ display: "block", fontSize: 18, color: "#f0ece4" }} className="group-hover:text-white transition-colors">{text(entry.ar, entry.en)}</strong>
                      <small style={{ color: "#9b948a", fontSize: 13 }} className="group-hover:text-[#f49921] transition-colors">{entry.en}</small>
                    </div>
                    {/* Hover preview */}
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 absolute -bottom-4 left-0 right-0 flex justify-center translate-y-2 group-hover:translate-y-0" style={{ pointerEvents: 'none', zIndex: 10 }}>
                      <span style={{ fontSize: 12, color: "#f49921", background: "#15171a", border: "1px solid rgba(244,153,33,0.3)", padding: "4px 10px", borderRadius: 12, whiteSpace: "nowrap", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
                        {text(previewAr, previewEn)}
                      </span>
                    </div>
                  </button>
                )
              })}
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
            
            <div className="ratecard__section-title" style={{ marginTop: 24 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#f0ece4' }}>
                <span style={{ color: '#f49921' }} className="[&>svg]:w-7 [&>svg]:h-7">{currentSection?.icon}</span>
                {text(currentSection?.ar ?? "", currentSection?.en ?? "")}
              </h2>
              <p>{text("الأسعار التالية خاصة بالمنطقة المختارة", "Pricing for your selected region")}</p>
            </div>
            
            <div className="ratecard__pricing-list">
              {visibleItems.map((item, index) => (
                <StaggerItem key={item.id} delayIndex={index}>
                  <PricingRow item={item} language={language} currency={currency} region={region} />
                </StaggerItem>
              ))}
              {visibleItems.length === 0 && <div className="ratecard__empty">{text("لا توجد بنود منشورة لهذه الخدمة حالياً.", "No published items for this service yet.")}</div>}
            </div>
            
            {section === "reels" && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#15171a", border: "1px solid rgba(244,153,33,0.3)", borderRight: rtl ? "3px solid #f49921" : "1px solid rgba(244,153,33,0.3)", borderLeft: !rtl ? "3px solid #f49921" : "1px solid rgba(244,153,33,0.3)", borderRadius: 4, color: "#f0ece4", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span>✍️</span>
                <div><strong style={{ color: "#f49921", fontWeight: 700 }}>{text("كتابة السيناريو:", "Scriptwriting:")}</strong> {text("متاحة عبر كاتب خارجي متعاون — 50 إلى 100 JOD إضافية حسب المشروع.", "Available through an external collaborating writer — 50 to 100 JOD additional depending on the project.")}</div>
              </div>
            )}

            {/* Trust Signal */}
            <div className="ratecard__notice" style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(61, 220, 151, 0.05)", border: "1px solid rgba(61, 220, 151, 0.2)", borderRadius: 8, padding: 16, marginTop: 24 }}>
              <ShieldCheck color="#3ddc97" size={24} />
              <div>
                <strong style={{ color: "#3ddc97", display: "block" }}>{text("لا رسوم خفية", "No hidden fees")}</strong>
                <span style={{ fontSize: 13 }}>{text("المعدات الأساسية مشمولة. السعر النهائي يعتمد على تفاصيل المشروع ويمكن التفاوض عليه.", "Core equipment is included. Final pricing depends on project details and can be negotiated.")}</span>
              </div>
            </div>
          </section>
        )}
      </main>

    </div>
  );
}

function RegionButton({ region, language, onClick }: { region: Exclude<PricingRegion, "both">; language: PricingLanguage; onClick: () => void }) {
  return <button className="ratecard__region-pill" onClick={onClick}><MapPin /><span>{language === "ar" ? "المنطقة:" : "Region:"}</span><strong>{regionLabel(region, language)}</strong><small>{language === "ar" ? "تغيير" : "Change"}</small></button>;
}

function PricingRow({ item, language, currency, region }: { item: PricingItem; language: PricingLanguage, currency: "JOD" | "USD", region: Exclude<PricingRegion, "both"> }) {
  const ar = language === "ar";
  const unit = ar ? item.unit_ar : item.unit_en;
  const note = ar ? item.note_ar : item.note_en;
  const title = ar ? item.name_ar : item.name_en;
  
  // Format price based on currency
  const convert = (val: number | null) => val ? Math.round(val * 1.41) : null;
  let formattedPrice = "";
  
  if (currency === "USD") {
    const min = convert(item.price_min);
    const max = convert(item.price_max);
    if (min !== null || max !== null) {
      formattedPrice = min == null ? "" : max != null && max !== min ? `${min}–${max}` : String(min);
    }
  } else {
    formattedPrice = formatPricingAmount(item);
  }

  return (
    <article className={`ratecard__price-row ${item.is_featured ? "is-featured" : ""}`} style={{ paddingBottom: 24 }}>
      <div className="ratecard__price-copy">
        {item.is_featured && (ar ? item.tag_ar : item.tag_en) && <span className="ratecard__tag">{ar ? item.tag_ar : item.tag_en}</span>}
        <h3>{title}</h3>
        
        {/* Progressive Disclosure for long descriptions (using simple CSS line-clamp) */}
        <p style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {ar ? item.desc_ar : item.desc_en}
        </p>
        

      </div>
      
      <div className="ratecard__price-value">
        <small>{ar ? item.price_label_ar : item.price_label_en}</small>
        <strong><AnimatedNumber value={formattedPrice} /></strong>
        <span>{currency === "USD" ? "USD" : (unit || item.currency)}</span>
        {note && <em>{note}</em>}
      </div>
    </article>
  );
}

function PolicyStrip({ language }: { language: PricingLanguage }) {
  const ar = language === "ar";
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section 
      className="ratecard__policies" 
      style={{ marginTop: 32, padding: isOpen ? 24 : 16, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", transition: "all 0.3s ease" }} 
      onClick={() => setIsOpen(!isOpen)}
    >
      {!isOpen ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#f0ece4", fontSize: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>📋</span> 
            <strong>{ar ? "السياسات:" : "Policies:"}</strong> 
            <span style={{ opacity: 0.8 }}>
              {ar ? "تعديلان مجاناً · التسليم 7-14 يوم · المعدات مشمولة" : "2 free revisions · Delivery 7-14 days · Equipment included"}
            </span>
          </div>
          <span style={{ color: "#f49921", fontSize: 13, whiteSpace: "nowrap", marginLeft: 16 }}>{ar ? "عرض التفاصيل ↓" : "View details ↓"}</span>
        </div>
      ) : (
        <div style={{ opacity: 1, transition: "opacity 0.3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: '#f0ece4' }}>{ar ? "السياسات والشروط" : "Policies & terms"}</h2>
            <span style={{ color: "#f49921", fontSize: 13, padding: "4px 8px", background: "rgba(244,153,33,0.1)", borderRadius: 4 }}>{ar ? "إخفاء ↑" : "Hide ↑"}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {policies.map((policy) => (
              <article key={policy.en} style={{ padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ display: "block", fontSize: 24, marginBottom: 8 }}>{policy.icon}</span>
                <h3 style={{ margin: "0 0 4px 0", fontSize: 15, color: "#f0ece4" }}>{ar ? policy.ar : policy.en}</h3>
                <strong style={{ display: "block", color: "#f49921", marginBottom: 4 }}>{policy.value}</strong>
                <p style={{ margin: 0, fontSize: 13, color: "#9b948a", lineHeight: 1.5 }}>{ar ? policy.descAr : policy.descEn}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}