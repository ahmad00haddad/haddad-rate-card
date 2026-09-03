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
  { icon: "✂️", ar: "نطاق التعديل", en: "Scope of Edits", value: "القص والألوان", descAr: "التعديل لا يشمل تغيير الفكرة أو إعادة التصوير", descEn: "Edits do not include changing core idea or reshoots" },
  { icon: "⏳", ar: "وقت المراجعة", en: "Feedback Window", value: "7 أيام", descAr: "لإرسال الملاحظات على النسخة الأولية", descEn: "To send feedback after receiving the draft" },
  { icon: "🚫", ar: "تسليم العمل", en: "Final Delivery", value: "بعد الدفع", descAr: "النسخة النهائية تُسلم بعد سداد كامل المبلغ", descEn: "Final video is delivered after full payment" },
  { icon: "💾", ar: "الملفات الخام", en: "Raw Footage", value: "+50%", descAr: "لا تُسلم مجاناً، وتُباع بنصف قيمة المشروع", descEn: "Not free, sold at half the project value" },
  { icon: "🗑️", ar: "حفظ المشاريع", en: "Data Retention", value: "30 يوماً", descAr: "يتم حذف ملفات المشروع بعد 30 يوماً من التسليم", descEn: "Project files are deleted 30 days after delivery" },
  { icon: "🎵", ar: "الأصول الإضافية", en: "Extra Assets", value: "مستقلة", descAr: "التعليق الصوتي والموسيقى الخاصة تكلفتها منفصلة", descEn: "Voiceovers and licensed music are billed separately" },
  { icon: "📦", ar: "مدة التسليم", en: "Delivery", value: "7–14", descAr: "يوم عمل بعد التصوير", descEn: "working days after wrap" },
  { icon: "⚡", ar: "تسليم مستعجل", en: "Rush delivery", value: "+50%", descAr: "خلال 3 أيام أو أقل", descEn: "within 3 days or less" },
  { icon: "🔧", ar: "المعدات", en: "Equipment", value: "✓", descAr: "مشمولة في سعر التصوير", descEn: "Included in shoot price" },
  { icon: "💰", ar: "دفعة مقدمة", en: "Deposit", value: "50%", descAr: "لتأكيد الحجز", descEn: "To confirm booking" },
  { icon: "📍", ar: "خارج إربد", en: "Outside Irbid", value: "+", descAr: "رسوم تنقل حسب المسافة", descEn: "Travel fees by distance" },
];

const sectionColors: Record<string, string> = {
  reels: '#f49921',
  films: '#f49921',
  commercials: '#f49921',
  docs: '#f49921',
  events: '#f49921',
  editing: '#f49921',
  dayrate: '#f49921',
};
const defaultAccent = '#f49921';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return `${parseInt(h.substring(0,2),16)}, ${parseInt(h.substring(2,4),16)}, ${parseInt(h.substring(4,6),16)}`;
}

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

function ScrambleText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState(text);
  const chars = "!<>-_\\/[]{}—=+*^?#________";
  
  useEffect(() => {
    let frame: number;
    let iteration = 0;
    
    const tick = () => {
      setDisplayText(text.split("").map((letter, index) => {
        if (index < iteration) {
          return text[index];
        }
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(""));
      
      if (iteration >= text.length) {
        cancelAnimationFrame(frame);
      } else {
        iteration += 1 / 3;
        frame = requestAnimationFrame(tick);
      }
    };
    
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text]);
  
  return <span>{displayText}</span>;
}

function MagneticButton({ children, onClick, className }: { children: React.ReactNode, onClick: () => void, className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = (e.clientX - (left + width / 2)) * 0.2;
    const y = (e.clientY - (top + height / 2)) * 0.2;
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  };
  
  const handleMouseLeave = () => {
    if (ref.current) {
      ref.current.style.transform = '';
    }
  };
  
  return (
    <button ref={ref} onClick={onClick} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className={className} style={{ transition: "transform 0.1s ease-out" }}>
      {children}
    </button>
  );
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
  const [showFab, setShowFab] = useState(false);

  const rtl = language === "ar";
  
  const currentAccent = section && sectionColors[section] ? sectionColors[section] : defaultAccent;
  const [isMobile, setIsMobile] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    const isSwipeBack = rtl ? deltaX < -80 : deltaX > 80;
    
    if (isSwipeBack) {
      if (step === 3) setSection(null);
      else if (step === 2) setRegion(null);
    }
    setTouchStartX(null);
  };

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
      setShowFab(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleServicesMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cards = document.querySelectorAll('.spotlight-card');
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    }
  };

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
    <div 
      className={`ratecard ${compact ? "ratecard--compact" : ""}`} 
      dir={rtl ? "rtl" : "ltr"}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ "--accent-rgb": hexToRgb(currentAccent) } as React.CSSProperties}
    >
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1,
        background: 'radial-gradient(circle at 50% 50%, rgba(var(--accent-rgb), 0.15), transparent 60%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        transition: 'background 1s ease',
        animation: 'moveGlow 10s ease-in-out infinite'
      }} />
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

      {isMobile && step > 1 && (
        <div 
          style={{ 
            position: 'fixed', bottom: 0, left: 0, right: 0, 
            background: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}
        >
          <button onClick={() => step === 3 ? setSection(null) : setRegion(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f0ece4' }}>
            {rtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            <span>{text("رجوع", "Back")}</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: currentAccent }}>
            {region && <span>📍 {regionLabel(region, language)}</span>}
            {section && currentSection && (
              <>
                <span style={{ color: '#9b948a' }}>/</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="[&>svg]:w-4 [&>svg]:h-4">{currentSection.icon}</span>
                  {text(currentSection.ar, currentSection.en)}
                </span>
              </>
            )}
          </div>
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
        <h1>{text("قائمة ", "Rate ")}<span><ScrambleText text={text("التسعيرات", "Card")} /></span></h1>
        <p>{text("اختر المنطقة والخدمة واعرف السعر فوراً", "Choose your region and service to view pricing")}</p>
        
        {/* Breadcrumb Progress */}
        <div 
          aria-label={text("خطوات عرض السعر", "Pricing steps")} 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: 16,
            marginTop: 32,
            flexWrap: "wrap"
          }}
        >
          <div 
            onClick={() => { setRegion(null); setSection(null); }}
            style={{ 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              color: step === 1 ? currentAccent : (step > 1 ? "#f0ece4" : "#9b948a"),
              fontWeight: step === 1 ? 700 : (step > 1 ? 500 : 400),
              transition: "all 0.3s ease"
            }}
          >
            <span>📍</span>
            <span>{region ? regionLabel(region, language) : text("المنطقة", "Region")}</span>
          </div>

          <div style={{ position: "relative", width: 40, height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ 
              position: "absolute", top: 0, bottom: 0, 
              left: rtl ? "auto" : 0, right: rtl ? 0 : "auto",
              width: step >= 2 ? "100%" : "0%", 
              background: currentAccent, 
              transition: "width 0.5s ease-out" 
            }} />
          </div>

          <div 
            onClick={() => { if (region) setSection(null); }}
            style={{ 
              cursor: region ? "pointer" : "default", 
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              color: step === 2 ? currentAccent : (step > 2 ? "#f0ece4" : "#9b948a"),
              fontWeight: step === 2 ? 700 : (step > 2 ? 500 : 400),
              transition: "all 0.3s ease",
              opacity: step >= 2 ? 1 : 0.5
            }}
          >
            <span className="[&>svg]:w-4 [&>svg]:h-4">{currentSection?.icon || "🎬"}</span>
            <span>{section && currentSection ? text(currentSection.ar, currentSection.en) : text("الخدمة", "Service")}</span>
          </div>

          <div style={{ position: "relative", width: 40, height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ 
              position: "absolute", top: 0, bottom: 0, 
              left: rtl ? "auto" : 0, right: rtl ? 0 : "auto",
              width: step >= 3 ? "100%" : "0%", 
              background: currentAccent, 
              transition: "width 0.5s ease-out" 
            }} />
          </div>

          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              color: step === 3 ? currentAccent : "#9b948a",
              fontWeight: step === 3 ? 700 : 400,
              transition: "all 0.3s ease",
              opacity: step >= 3 ? 1 : 0.5
            }}
          >
            <span>💰</span>
            <span>{text("الأسعار", "Price")}</span>
          </div>
        </div>
      </section>

      <main className="ratecard__main">
        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .ratecard__stage-enter {
            animation: fadeSlideIn 0.4s ease-out forwards;
          }
          @keyframes moveGlow {
            0% { transform: translate(-5%, -5%) scale(1); }
            50% { transform: translate(5%, 5%) scale(1.1); }
            100% { transform: translate(-5%, -5%) scale(1); }
          }
          button:active, .ratecard__region-pill:active, .spotlight-card:active {
            transform: scale(0.95);
            transition: transform 0.1s;
          }
          .spotlight-card::before {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border-radius: inherit;
            background: radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.1), transparent 40%);
            opacity: 0;
            transition: opacity 500ms;
            pointer-events: none;
            z-index: 1;
          }
          .ratecard__services:hover .spotlight-card::before {
            opacity: 1;
          }
        `}</style>
        <div key={step} className="ratecard__stage-enter">
          {!region && (
          <section className="ratecard__stage">
            <div className="ratecard__section-title"><h2>{text("أين سيتم التصوير؟", "Where will the shoot take place?")}</h2><p>{text("اختر المنطقة لعرض أسعارها فقط", "Choose a region to see its prices only")}</p></div>
            <div className="ratecard__regions">
              <MagneticButton onClick={() => chooseRegion("irbid")}><MapPin /><strong>{text("إربد", "Irbid")}</strong><span>{text("شمال الأردن", "Northern Jordan")}</span></MagneticButton>
              <MagneticButton onClick={() => chooseRegion("amman")}><span className="ratecard__city-icon">🏙️</span><strong>{text("عمّان", "Amman")}</strong><span>{text("العاصمة", "The capital")}</span></MagneticButton>
            </div>
          </section>
        )}

        {region && !section && (
          <section className="ratecard__stage">
            <RegionButton region={region} language={language} onClick={() => setRegion(null)} />
            <div className="ratecard__section-title"><h2>{text("ما الخدمة التي تحتاجها؟", "Which service do you need?")}</h2><p>{text("اضغط على الخدمة لعرض الأسعار", "Select a service to view pricing")}</p></div>
            
            <div className="ratecard__services" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }} onMouseMove={handleServicesMouseMove}>
              {pricingSections.map((entry) => {
                const sectionItems = items.filter(item => item.section === entry.key && (item.region === region || item.region === "both") && !item.is_hidden);
                const itemCount = sectionItems.length;
                const minPrice = Math.min(...sectionItems.map(i => i.price_min ?? Infinity).filter(p => p !== Infinity));
                const minPriceStr = minPrice !== Infinity ? `${minPrice} ${currency}` : "";

                const previewAr = `${itemCount} خيارات ${minPriceStr ? `· من ${minPriceStr}` : ""}`;
                const previewEn = `${itemCount} options ${minPriceStr ? `· from ${minPriceStr}` : ""}`;

                const entryAccent = sectionColors[entry.key] || defaultAccent;
                return (
                  <button 
                    key={entry.key} 
                    onClick={() => chooseSection(entry.key)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "32px 16px",
                      background: "rgba(255,255,255,0.03)", border: `1px solid rgba(${hexToRgb(entryAccent)}, 0.2)`, borderRadius: 12, transition: "all 0.3s ease",
                      position: "relative",
                      "--hover-text": entryAccent,
                    } as React.CSSProperties}
                    className="hover:-translate-y-1 group spotlight-card"
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = `rgba(${hexToRgb(entryAccent)}, 0.6)`; e.currentTarget.style.background = `rgba(${hexToRgb(entryAccent)}, 0.05)`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = `rgba(${hexToRgb(entryAccent)}, 0.2)`; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  >
                    <span style={{ color: "#9b948a", transition: "color 0.3s" }} className="group-hover:!text-[var(--hover-text)] [&>svg]:w-10 [&>svg]:h-10">
                      {entry.icon}
                    </span>
                    <div style={{ textAlign: "center" }}>
                      <strong style={{ display: "block", fontSize: 18, color: "#f0ece4", transition: "color 0.3s" }} className="group-hover:text-white">{text(entry.ar, entry.en)}</strong>
                      <small style={{ color: "#9b948a", fontSize: 13, transition: "color 0.3s" }} className="group-hover:!text-[var(--hover-text)]">{entry.en}</small>
                    </div>
                    {/* Hover preview */}
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 absolute -bottom-4 left-0 right-0 flex justify-center translate-y-2 group-hover:translate-y-0" style={{ pointerEvents: 'none', zIndex: 10 }}>
                      <span style={{ fontSize: 12, color: entryAccent, background: "#15171a", border: `1px solid rgba(${hexToRgb(entryAccent)}, 0.3)`, padding: "4px 10px", borderRadius: 12, whiteSpace: "nowrap", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
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
                <span style={{ color: currentAccent }} className="[&>svg]:w-7 [&>svg]:h-7">{currentSection?.icon}</span>
                {text(currentSection?.ar ?? "", currentSection?.en ?? "")}
              </h2>
              <p>{text("الأسعار التالية خاصة بالمنطقة المختارة", "Pricing for your selected region")}</p>
            </div>
            
            <div className="ratecard__pricing-list">
              {visibleItems.map((item, index) => (
                <StaggerItem key={item.id} delayIndex={index}>
                  <PricingRow item={item} language={language} currency={currency} region={region} accent={currentAccent} />
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
        </div>
      </main>

      {showFab && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed', bottom: 24, right: rtl ? 'auto' : 24, left: rtl ? 24 : 'auto', zIndex: 100,
            background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%',
            width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease'
          }}
          className="hover:bg-[rgba(255,255,255,0.2)] hover:scale-110"
        >
          ↑
        </button>
      )}
    </div>
  );
}

function RegionButton({ region, language, onClick }: { region: Exclude<PricingRegion, "both">; language: PricingLanguage; onClick: () => void }) {
  return <button className="ratecard__region-pill" onClick={onClick}><MapPin /><span>{language === "ar" ? "المنطقة:" : "Region:"}</span><strong>{regionLabel(region, language)}</strong><small>{language === "ar" ? "تغيير" : "Change"}</small></button>;
}

function PricingRow({ item, language, currency, region, accent = '#f49921' }: { item: PricingItem; language: PricingLanguage, currency: "JOD" | "USD", region: Exclude<PricingRegion, "both">, accent?: string }) {
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
    <article 
      className={`ratecard__price-row group ${item.is_featured ? "is-featured" : ""}`} 
      style={{ 
        paddingBottom: 24,
        paddingTop: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        borderLeft: !ar ? `3px solid rgba(${hexToRgb(accent)}, 0.3)` : "none",
        borderRight: ar ? `3px solid rgba(${hexToRgb(accent)}, 0.3)` : "none",
        paddingLeft: !ar ? 16 : 0,
        paddingRight: ar ? 16 : 0,
        transition: "all 0.3s ease",
        position: "relative",
      }}
    >
      <div style={{ margin: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        
        {/* VALUE FIRST: Title and Description take precedence */}
        <div style={{ flex: "1 1 300px" }}>
          {item.is_featured && (ar ? item.tag_ar : item.tag_en) && (
            <span style={{ display: "inline-block", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, background: `rgba(${hexToRgb(accent)}, 0.1)`, color: accent, padding: "4px 8px", borderRadius: 4, marginBottom: 8 }}>
              {ar ? item.tag_ar : item.tag_en}
            </span>
          )}
          <h3 style={{ fontSize: 24, fontWeight: 800, color: "#f0ece4", margin: "0 0 8px 0", lineHeight: 1.3 }}>{title}</h3>
          <p style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 15, fontWeight: 400, color: "#9b948a", margin: 0, lineHeight: 1.6 }}>
            {ar ? item.desc_ar : item.desc_en}
          </p>
        </div>

        {/* PRICE SECOND: Muted until hovered/focused */}
        <div 
          className="opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105"
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: ar ? "flex-end" : "flex-start", 
            transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            background: "rgba(255,255,255,0.03)",
            padding: "16px 24px",
            borderRadius: 12,
            border: `1px solid rgba(${hexToRgb(accent)}, 0.2)`,
            minWidth: 140
          }}
        >
          <small style={{ color: "#9b948a", fontSize: 13, marginBottom: 4 }}>{ar ? item.price_label_ar : item.price_label_en}</small>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <strong style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}><AnimatedNumber value={formattedPrice} /></strong>
            <span style={{ fontSize: 14, color: accent, fontWeight: 600 }}>{currency === "USD" ? "USD" : (unit || item.currency)}</span>
          </div>
          {note && <em style={{ fontSize: 12, color: "#9b948a", marginTop: 6, fontStyle: "normal" }}>{note}</em>}
        </div>
      </div>
    </article>
  );
}

function PolicyStrip({ language }: { language: PricingLanguage }) {
  const ar = language === "ar";
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      style={{ display: "block", marginTop: 32, padding: isOpen ? 24 : 16, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", transition: "all 0.3s ease" }} 
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
    </div>
  );
}