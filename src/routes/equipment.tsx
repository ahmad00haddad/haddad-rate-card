import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpLeft, Camera, Search, SlidersHorizontal, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { normalizeAr } from "@/lib/ar-normalize";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "معدات التصوير السينمائي — أحمد حداد" },
      { name: "description", content: "معرض معدات أحمد حداد السينمائية: كاميرات، عدسات، إضاءة، صوت وإكسسوارات احترافية." },
      { property: "og:title", content: "معدات التصوير السينمائي — أحمد حداد" },
      { property: "og:description", content: "تصفح مجموعة الكاميرات والعدسات والإضاءة والصوت المستخدمة في إنتاجات أحمد حداد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquipmentPage,
  errorComponent: ({ error, reset }) => (
    <div className="equipment-state" dir="rtl">
      <Wrench aria-hidden="true" />
      <h1>تعذّر تحميل المعدات</h1>
      <p>{error.message}</p>
      <Button onClick={reset}>إعادة المحاولة</Button>
    </div>
  ),
  notFoundComponent: () => <div className="equipment-state" dir="rtl"><h1>لا توجد معدات</h1></div>,
});

type Equipment = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  image_path: string | null;
  is_available: boolean;
};

type Language = "ar" | "en";

function EquipmentPage() {
  const [language, setLanguage] = useState<Language>("ar");
  const [active, setActive] = useState("الكل");
  const [query, setQuery] = useState("");
  const rtl = language === "ar";
  const text = <T,>(ar: T, en: T) => rtl ? ar : en;

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id,name,description,category,image_path,is_available")
        .eq("is_available", true)
        .order("category")
        .order("id");
      if (error) throw error;
      return data as Equipment[];
    },
  });

  useEffect(() => {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, rtl]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    data.forEach((item) => item.category && values.add(item.category));
    return ["الكل", ...Array.from(values)];
  }, [data]);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeAr(query);
    return data.filter((item) => {
      if (active !== "الكل" && item.category !== active) return false;
      return !normalizedQuery || normalizeAr(`${item.name} ${item.description ?? ""} ${item.category ?? ""}`).includes(normalizedQuery);
    });
  }, [active, data, query]);

  return (
    <div className="equipment-page" dir={rtl ? "rtl" : "ltr"}>
      <div className="ratecard-grain" />
      <header className="ratecard__header">
        <Link to="/" className="ratecard__brand equipment-brand-link">
          <strong>{text("أحمد حداد", "Ahmad Haddad")}</strong>
          <span>{text("مصور سينمائي · الأردن", "Cinematic filmmaker · Jordan")}</span>
        </Link>
        <div className="ratecard__actions">
          <a className="ratecard__text-link" href="https://ahmadhaddad.lovable.app/">{text("الموقع الرئيسي", "Portfolio")}</a>
          <Button asChild variant="ghost" size="sm"><Link to="/">{text("التسعيرات", "Rate card")}</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/equipment"><Wrench />{text("المعدات", "Equipment")}</Link></Button>
          <Button variant="outline" size="sm" onClick={() => setLanguage(rtl ? "en" : "ar")}>{rtl ? "EN" : "عربي"}</Button>
        </div>
      </header>

      <section className="equipment-hero">
        <p className="ratecard__eyebrow">CINEMATIC EQUIPMENT · JORDAN</p>
        <h1>{text("معرض ", "Equipment ")}<span>{text("المعدات", "Gallery")}</span></h1>
        <p>{text("الأدوات السينمائية التي نعتمد عليها لصناعة الصورة", "The cinematic tools behind every frame we create")}</p>
        <div className="equipment-hero__meta">
          <Camera aria-hidden="true" />
          <span>{isLoading ? text("جاري تجهيز المعرض…", "Preparing the gallery…") : text(`${data.length} قطعة في المجموعة`, `${data.length} items in the collection`)}</span>
        </div>
      </section>

      <main className="equipment-main">
        <section className="equipment-toolbar" aria-label={text("البحث والتصفية", "Search and filters")}>
          <label className="equipment-search">
            <Search aria-hidden="true" />
            <span className="sr-only">{text("البحث", "Search")}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text("ابحث بالاسم أو الوصف…", "Search by name or description…")} />
          </label>
          <label className="equipment-filter">
            <SlidersHorizontal aria-hidden="true" />
            <span className="sr-only">{text("الفئة", "Category")}</span>
            <select value={active} onChange={(event) => setActive(event.target.value)}>
              {categories.map((category) => <option key={category} value={category}>{category === "الكل" ? text("كل الفئات", "All categories") : category}</option>)}
            </select>
          </label>
          <span className="equipment-results">{text(`${filtered.length} نتيجة`, `${filtered.length} results`)}</span>
        </section>

        {isLoading && <EquipmentSkeleton />}

        {error && (
          <div className="equipment-inline-state">
            <p>{text("تعذّر تحميل المعدات حالياً.", "Equipment could not be loaded right now.")}</p>
            <Button variant="outline" onClick={() => void refetch()}>{text("إعادة المحاولة", "Try again")}</Button>
          </div>
        )}

        {!isLoading && !error && (
          <div className="equipment-grid">
            {filtered.map((item, index) => (
              <article className="equipment-card" key={item.id} style={{ "--card-delay": `${Math.min(index, 8) * 45}ms` } as React.CSSProperties}>
                <div className="equipment-card__image">
                  <span className="equipment-card__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <EquipmentImage src={item.image_path} alt={item.name} fallback={text("الصورة قريباً", "Image coming soon")} />
                </div>
                <div className="equipment-card__body">
                  {item.category && <span className="equipment-card__category">{item.category}</span>}
                  <h2>{item.name}</h2>
                  {item.description && <p>{item.description}</p>}
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="equipment-inline-state"><Search aria-hidden="true" /><p>{text("لا توجد معدات تطابق بحثك.", "No equipment matches your search.")}</p></div>
        )}
      </main>
    </div>
  );
}

function EquipmentSkeleton() {
  return <div className="equipment-grid" aria-hidden="true">{Array.from({ length: 6 }).map((_, index) => <div className="equipment-card equipment-card--skeleton" key={index}><div /><span /><span /></div>)}</div>;
}

function getCleanImageUrl(url: string | null) {
  if (!url) return null;
  let clean = url;
  if (clean.includes('/cdn-cgi/image/')) {
    const parts = clean.split('/https://');
    if (parts.length > 1) clean = 'https://' + parts[1];
  }
  return clean.replace('www.bhphotovideo.com', 'static.bhphoto.com');
}

function EquipmentImage({ src, alt, fallback }: { src: string | null; alt: string; fallback: string }) {
  const cleanSrc = getCleanImageUrl(src);
  const [failed, setFailed] = useState(!cleanSrc);

  useEffect(() => setFailed(!cleanSrc), [cleanSrc]);

  if (failed || !cleanSrc) {
    return <div className="equipment-card__placeholder"><Camera aria-hidden="true" /><span>{fallback}</span></div>;
  }

  return <img src={cleanSrc} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}