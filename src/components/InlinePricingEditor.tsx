import { useMemo, useState, useEffect } from "react";
import { Check, MapPin, Plus, Trash2, SplitSquareHorizontal, Eye, EyeOff, ArrowUp, ArrowDown, PackageOpen, Info, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  pricingSections,
  regionLabel,
  type PricingItem,
  type PricingRegion,
} from "@/lib/pricing";

export type Draft = Partial<PricingItem>;

type InlinePricingEditorProps = {
  region: Exclude<PricingRegion, "both">;
  items: PricingItem[];
  drafts: Record<string, Draft>;
  updateField: (id: string, field: keyof PricingItem, value: unknown) => void;
  onDelete: (id: string) => void;
  onSplit?: (item: PricingItem) => void;
  onCreateNew: (section: string, region: PricingRegion) => void;
};

const DiffPreview = ({ oldVal, newVal }: { oldVal: any, newVal: any }) => {
  if (newVal === undefined || newVal === oldVal) return null;
  return (
    <div style={{ fontSize: 10, color: "#3ddc97", marginTop: 2, display: "flex", gap: 4 }}>
      <s style={{ color: "#ef6c6c" }}>{oldVal ? String(oldVal) : '(فارغ)'}</s>
      <span>{newVal ? String(newVal) : '(فارغ)'}</span>
    </div>
  );
};

export function InlinePricingEditor({
  region,
  items,
  drafts,
  updateField,
  onDelete,
  onSplit,
  onCreateNew,
}: InlinePricingEditorProps) {
  const [section, setSection] = useState<string>(pricingSections[0].key);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [shownHints, setShownHints] = useState<Set<string>>(new Set());
  const [activeHint, setActiveHint] = useState<{ id: string; field: string; message: string } | null>(null);

  // Clear delete confirm after 3s
  useEffect(() => {
    if (deleteConfirmId) {
      const timer = setTimeout(() => setDeleteConfirmId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirmId]);

  const visibleItems = useMemo(
    () => {
      const filtered = items.filter((item) => item.section === section && (item.region === region || item.region === "both"));
      // We apply draft sort_order if it exists to reflect live sorting
      return filtered.sort((a, b) => {
        const orderA = drafts[a.id]?.sort_order ?? a.sort_order ?? 999;
        const orderB = drafts[b.id]?.sort_order ?? b.sort_order ?? 999;
        return orderA - orderB;
      });
    },
    [items, region, section, drafts],
  );

  const sectionAverage = useMemo(() => {
    const itemsInSection = items.filter(i => i.section === section && (i.region === region || i.region === "both"));
    let sum = 0;
    let count = 0;
    itemsInSection.forEach(i => {
      const p = drafts[i.id]?.price_min ?? i.price_min;
      if (typeof p === 'number') {
        sum += p;
        count++;
      }
    });
    return count > 0 ? sum / count : 0;
  }, [items, section, drafts, region]);

  const currentSection = pricingSections.find((entry) => entry.key === section);

  function moveItem(index: number, direction: -1 | 1) {
    if (index + direction < 0 || index + direction >= visibleItems.length) return;
    
    // We swap the sort_order of the two items
    const itemA = visibleItems[index];
    const itemB = visibleItems[index + direction];
    
    const orderA = drafts[itemA.id]?.sort_order ?? itemA.sort_order ?? 999;
    const orderB = drafts[itemB.id]?.sort_order ?? itemB.sort_order ?? 999;

    // If they have the same sort_order, just force a difference
    if (orderA === orderB) {
      updateField(itemA.id, "sort_order", orderA + (direction === -1 ? -1 : 1));
      updateField(itemB.id, "sort_order", orderB + (direction === -1 ? 1 : -1));
    } else {
      updateField(itemA.id, "sort_order", orderB);
      updateField(itemB.id, "sort_order", orderA);
    }
  }

  const handleFocus = (id: string, field: string, message: string) => {
    if (!shownHints.has(field)) {
      setActiveHint({ id, field, message });
      setShownHints(prev => new Set(prev).add(field));
      setTimeout(() => {
        setActiveHint(current => (current?.id === id && current?.field === field) ? null : current);
      }, 4000);
    }
  };

  const handleKeyDown = () => {
    if (activeHint) setActiveHint(null);
  };

  return (
    <div className="ratecard ratecard--compact" dir="rtl" style={{ height: "100%", overflowY: "auto", border: "1px solid rgba(244,153,33,0.2)", borderRadius: 8, background: "#0e0f11", display: "flex", flexDirection: "column" }} onKeyDown={handleKeyDown}>
      <header className="ratecard__header" style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(14,15,17,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(244,153,33,0.15)" }}>
        <div className="ratecard__brand">
          <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MapPin size={16} color="#f49921" /> {regionLabel(region, "ar")}
          </strong>
        </div>
        <div className="ratecard__services" style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto" }}>
          {pricingSections.map((entry) => (
            <button
              key={entry.key}
              onClick={() => setSection(entry.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: section === entry.key ? "#f49921" : "transparent",
                color: section === entry.key ? "#000" : "#f0ece4",
                border: "1px solid #f49921",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: 13,
                fontWeight: section === entry.key ? 700 : 500,
                transition: "all 0.2s"
              }}
            >
              <span className="[&>svg]:w-4 [&>svg]:h-4">{entry.icon}</span> {entry.ar}
            </button>
          ))}
        </div>
        <div style={{ padding: "0 16px 12px 16px" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#9b948a" }} />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن بند..."
              style={{ background: "#15171a", border: "1px solid rgba(244,153,33,0.3)", borderRadius: 6, color: "#f0ece4", fontSize: 14, width: "100%", padding: "8px 12px 8px 36px", paddingRight: 36 }}
              className="focus:border-[#f49921] outline-none"
            />
          </div>
        </div>
      </header>

      <main className="ratecard__main" style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="ratecard__section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, margin: 0, display: "flex", gap: 8, alignItems: "center", color: "#f0ece4" }}>
            <span style={{ color: "#f49921" }} className="[&>svg]:w-5 [&>svg]:h-5">{currentSection?.icon}</span>
            {currentSection?.ar}
          </h2>
          <Button size="sm" onClick={() => onCreateNew(section, region)} style={{ background: "#f49921", color: "#000", fontWeight: "bold" }}>
            <Plus size={16} style={{ marginLeft: 4 }} /> إضافة بند
          </Button>
        </div>

        <div className="ratecard__pricing-list" style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          {visibleItems.map((item, index) => {
            const draft = drafts[item.id] || {};
            const current = { ...item, ...draft };
            const isBoth = item.region === "both";
            
            const descLength = (current.desc_ar || "").length;
            const isDescLong = descLength > 120;
            
            const isMatch = !searchQuery || current.name_ar?.includes(searchQuery);

            const price = current.price_min || 0;
            let dotColor = "bg-green-500";
            let diffRatio = sectionAverage > 0 ? Math.abs(price - sectionAverage) / sectionAverage : 0;
            if (diffRatio > 0.6) dotColor = "bg-red-500";
            else if (diffRatio > 0.3) dotColor = "bg-yellow-500";
            const isPriceWarning = price && sectionAverage > 0 && (price < 0.2 * sectionAverage || price > 3 * sectionAverage);

            return (
              <div key={item.id} style={{ position: "relative" }} className="group">
                {isBoth && (
                  <div style={{ background: "rgba(244,153,33,0.1)", color: "#f49921", padding: "8px 12px", fontSize: 12, borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(244,153,33,0.3)", borderBottom: "none" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} /> هذا البند مشترك. تعديله سيؤثر على المنطقتين.</span>
                    {onSplit && (
                      <Button size="sm" variant="outline" style={{ height: 26, fontSize: 11, borderColor: "#f49921", color: "#f49921", transition: "all 0.3s" }} onClick={() => onSplit(item)} className="hover:bg-[#f49921] hover:text-[#000]">
                        <SplitSquareHorizontal size={14} style={{ marginLeft: 6 }} /> فصل إربد عن عمّان
                      </Button>
                    )}
                  </div>
                )}
                
                <article 
                  className={`ratecard__price-row transition-all duration-300 ${current.is_featured ? "is-featured" : ""} ${current.is_hidden ? "is-hidden grayscale" : ""}`} 
                  style={{ 
                    opacity: current.is_hidden ? 0.4 : (!isMatch ? 0.15 : 1), 
                    borderTopLeftRadius: isBoth ? 0 : undefined, 
                    borderTopRightRadius: isBoth ? 0 : undefined, 
                    position: "relative",
                    border: "1px solid rgba(244,153,33,0.1)",
                  }}
                >
                  {/* Sorting controls */}
                  <div style={{ position: "absolute", right: -12, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 4, zIndex: 10, opacity: 0 }} className="group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveItem(index, -1)} disabled={index === 0} style={{ background: "#15171a", border: "1px solid rgba(244,153,33,0.4)", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: index === 0 ? "#555" : "#f49921", cursor: index === 0 ? "default" : "pointer" }}><ArrowUp size={14} /></button>
                    <button onClick={() => moveItem(index, 1)} disabled={index === visibleItems.length - 1} style={{ background: "#15171a", border: "1px solid rgba(244,153,33,0.4)", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: index === visibleItems.length - 1 ? "#555" : "#f49921", cursor: index === visibleItems.length - 1 ? "default" : "pointer" }}><ArrowDown size={14} /></button>
                  </div>

                  <div className="ratecard__price-copy" style={{ flex: 1, position: "relative", zIndex: 2 }}>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div className="relative w-full group/input">
                        {activeHint?.id === item.id && activeHint?.field === 'name_ar' && (
                          <div style={{ position: "absolute", top: -28, right: 0, background: "#f49921", color: "#000", padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold", zIndex: 30, whiteSpace: "nowrap" }}>
                            {activeHint.message}
                          </div>
                        )}
                        <input 
                          value={current.name_ar} 
                          onChange={(e) => updateField(item.id, "name_ar", e.target.value)}
                          onFocus={() => handleFocus(item.id, "name_ar", "اجعله قصيراً وواضحاً — العميل يقرأه في ثانيتين")}
                          placeholder="اسم البند..."
                          style={{ background: "transparent", border: "1px solid transparent", borderRadius: 4, color: "#f0ece4", fontSize: 18, fontWeight: 700, width: "100%", padding: "4px 8px", transition: "all 0.2s", textDecoration: current.is_hidden ? "line-through" : "none" }}
                          className="hover:border-dashed hover:border-[rgba(244,153,33,0.5)] focus:border-solid focus:border-[#f49921] focus:bg-[#15171a]"
                          title="اضغط للتعديل"
                        />
                        <DiffPreview oldVal={item.name_ar} newVal={draft.name_ar} />
                      </div>
                    </div>
                    
                    <div className="relative w-full group/desc mb-3">
                      {activeHint?.id === item.id && activeHint?.field === 'desc_ar' && (
                        <div style={{ position: "absolute", top: -28, right: 0, background: "#f49921", color: "#000", padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold", zIndex: 30, whiteSpace: "nowrap" }}>
                          {activeHint.message}
                        </div>
                      )}
                      <textarea 
                        value={current.desc_ar || ""} 
                        onChange={(e) => updateField(item.id, "desc_ar", e.target.value)}
                        onFocus={() => handleFocus(item.id, "desc_ar", "صف ما يحصل عليه العميل، وليس ما تفعله أنت")}
                        placeholder="الوصف..."
                        rows={2}
                        style={{ background: "transparent", border: "1px solid transparent", borderRadius: 4, color: "#9b948a", fontSize: 14, width: "100%", padding: "6px 8px", resize: "vertical", fontFamily: "inherit", transition: "all 0.2s" }}
                        className="hover:border-dashed hover:border-[rgba(244,153,33,0.5)] focus:border-solid focus:border-[#f49921] focus:bg-[#15171a]"
                        title="اضغط للتعديل"
                      />
                      <DiffPreview oldVal={item.desc_ar} newVal={draft.desc_ar} />
                      <div style={{ position: "absolute", bottom: -14, right: 8, fontSize: 10, color: isDescLong ? "#ef6c6c" : "#555", display: "flex", alignItems: "center", gap: 4, opacity: 0 }} className="group-focus-within/desc:opacity-100 transition-opacity">
                        <div style={{ width: 40, height: 2, background: "#333", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, (descLength / 120) * 100)}%`, height: "100%", background: isDescLong ? "#ef6c6c" : "#3ddc97" }} />
                        </div>
                        {descLength}/120
                      </div>
                    </div>

                    <div className="relative w-1/2 group/badge mt-4">
                      {activeHint?.id === item.id && activeHint?.field === 'tag_ar' && (
                        <div style={{ position: "absolute", top: -28, right: 0, background: "#f49921", color: "#000", padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold", zIndex: 30, whiteSpace: "nowrap" }}>
                          {activeHint.message}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "#9b948a" }}>الشارة:</span>
                        <input 
                          value={current.tag_ar || ""} 
                          onChange={(e) => updateField(item.id, "tag_ar", e.target.value)}
                          onFocus={() => handleFocus(item.id, "tag_ar", "مثال: الأكثر طلباً، جديد، عرض محدود")}
                          placeholder="مثال: جديد، الأكثر مبيعاً"
                          style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 4, color: "#f49921", fontSize: 11, padding: "2px 6px", width: "100%" }}
                          className="focus:border-[#f49921] focus:bg-[#15171a]"
                        />
                      </div>
                      <DiffPreview oldVal={item.tag_ar} newVal={draft.tag_ar} />
                    </div>
                  </div>
                  
                  <div className="ratecard__price-value" style={{ minWidth: 140, position: "relative", zIndex: 2 }}>
                    <input 
                      value={current.price_label_ar || ""} 
                      onChange={(e) => updateField(item.id, "price_label_ar", e.target.value)}
                      placeholder="تسمية السعر..."
                      style={{ background: "transparent", border: "1px solid transparent", borderRadius: 4, color: "#9b948a", fontSize: 12, textAlign: "center", width: "100%", padding: "2px 4px", marginBottom: 4, transition: "all 0.2s" }}
                      className="hover:border-dashed hover:border-[rgba(244,153,33,0.5)] focus:border-solid focus:border-[#f49921] focus:bg-[#15171a]"
                    />
                    <DiffPreview oldVal={item.price_label_ar} newVal={draft.price_label_ar} />
                    
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4, position: "relative" }}>
                      <div title={`متوسط القسم: ${Math.round(sectionAverage)}`} className={`w-2 h-2 rounded-full ${dotColor} absolute -right-2 top-1/2 -translate-y-1/2 cursor-help`} />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <input 
                          type="number"
                          value={current.price_min === null ? "" : current.price_min} 
                          onChange={(e) => updateField(item.id, "price_min", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="0"
                          style={{ background: "transparent", border: "1px solid transparent", borderRadius: 4, color: "#f49921", fontSize: 26, fontWeight: 800, width: 70, textAlign: "center", padding: "0 4px", transition: "all 0.2s" }}
                          className="hover:border-dashed hover:border-[rgba(244,153,33,0.5)] focus:border-solid focus:border-[#f49921] focus:bg-[#15171a]"
                        />
                        <DiffPreview oldVal={item.price_min} newVal={draft.price_min} />
                      </div>
                      <span style={{ color: "#f49921", fontWeight: "bold" }}>-</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        {activeHint?.id === item.id && activeHint?.field === 'price_max' && (
                          <div style={{ position: "absolute", top: -28, right: "50%", transform: "translateX(50%)", background: "#f49921", color: "#000", padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold", zIndex: 30, whiteSpace: "nowrap" }}>
                            {activeHint.message}
                          </div>
                        )}
                        <input 
                          type="number"
                          value={current.price_max === null ? "" : current.price_max} 
                          onChange={(e) => updateField(item.id, "price_max", e.target.value === "" ? null : Number(e.target.value))}
                          onFocus={() => handleFocus(item.id, "price_max", "اتركه فارغاً إذا كان السعر ثابتاً")}
                          placeholder="أعلى"
                          style={{ background: "transparent", border: "1px solid transparent", borderRadius: 4, color: "#f49921", fontSize: 16, fontWeight: 700, width: 60, textAlign: "center", padding: "2px 4px", transition: "all 0.2s" }}
                          className="hover:border-dashed hover:border-[rgba(244,153,33,0.5)] focus:border-solid focus:border-[#f49921] focus:bg-[#15171a]"
                        />
                        <DiffPreview oldVal={item.price_max} newVal={draft.price_max} />
                      </div>
                    </div>
                    {isPriceWarning && (
                      <div style={{ fontSize: 10, color: "#f49921", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, position: "absolute", bottom: -24, width: "100%" }}>
                        ⚠️ هذا السعر بعيد عن متوسط أسعارك في هذا القسم
                      </div>
                    )}

                    <input 
                      value={current.unit_ar || ""} 
                      onChange={(e) => updateField(item.id, "unit_ar", e.target.value)}
                      placeholder="الوحدة (JOD)"
                      style={{ background: "transparent", border: "1px solid transparent", borderRadius: 4, color: "#cfc8bd", fontSize: 13, textAlign: "center", width: "100%", padding: "2px 4px", transition: "all 0.2s" }}
                      className="hover:border-dashed hover:border-[rgba(244,153,33,0.5)] focus:border-solid focus:border-[#f49921] focus:bg-[#15171a]"
                    />
                    <DiffPreview oldVal={item.unit_ar} newVal={draft.unit_ar} />
                  </div>

                  {/* Actions overlay */}
                  <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 10, opacity: 0 }} className="group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="outline" style={{ width: 32, height: 32, background: "rgba(14,15,17,0.8)" }} onClick={() => updateField(item.id, "is_hidden", !current.is_hidden)} title={current.is_hidden ? "إظهار" : "إخفاء"}>
                      {current.is_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                    
                    {deleteConfirmId === item.id ? (
                      <Button size="sm" variant="destructive" style={{ height: 32, fontSize: 11, background: "#ef6c6c", color: "#fff", whiteSpace: "nowrap", position: "absolute", left: 0, top: 38 }} onClick={() => onDelete(item.id)}>
                        تأكيد الحذف؟
                      </Button>
                    ) : (
                      <Button size="icon" variant="outline" style={{ width: 32, height: 32, color: "#ef6c6c", borderColor: "#ef6c6c50", background: "rgba(14,15,17,0.8)" }} onClick={() => setDeleteConfirmId(item.id)} title="حذف">
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </article>
              </div>
            );
          })}
          
          {visibleItems.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, color: "#9b948a", textAlign: "center", border: "1px dashed rgba(244,153,33,0.2)", borderRadius: 12 }}>
              <div className="hover:animate-bounce cursor-pointer mb-4" onClick={() => onCreateNew(section, region)}>
                <PackageOpen size={48} color="#f49921" opacity={0.6} />
              </div>
              <h3 style={{ fontSize: 18, color: "#f0ece4", marginBottom: 8 }}>لا يوجد أسعار هنا بعد</h3>
              <p style={{ fontSize: 13, maxWidth: 200, marginBottom: 16 }}>اضغط على الزر في الأعلى أو على الصندوق لإضافة تسعيرة جديدة.</p>
              <Button variant="outline" onClick={() => onCreateNew(section, region)} style={{ borderColor: "#f49921", color: "#f49921" }}>
                <Plus size={16} style={{ marginLeft: 6 }} /> إضافة بند
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
