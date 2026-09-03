import { useMemo, useState } from "react";
import { Check, MapPin, Plus, Trash2, SplitSquareHorizontal, Eye, EyeOff } from "lucide-react";
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

  const visibleItems = useMemo(
    () => items.filter((item) => item.section === section && (item.region === region || item.region === "both")),
    [items, region, section],
  );

  const currentSection = pricingSections.find((entry) => entry.key === section);

  return (
    <div className="ratecard ratecard--compact" dir="rtl" style={{ height: "100%", overflowY: "auto", border: "1px solid rgba(244,153,33,0.2)", borderRadius: 8, background: "#0e0f11", display: "flex", flexDirection: "column" }}>
      <header className="ratecard__header" style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(14,15,17,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(244,153,33,0.15)" }}>
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
              {entry.icon} {entry.ar}
            </button>
          ))}
        </div>
      </header>

      <main className="ratecard__main" style={{ padding: 16, flex: 1 }}>
        <div className="ratecard__section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, margin: 0, display: "flex", gap: 8, alignItems: "center", color: "#f0ece4" }}>{currentSection?.icon} {currentSection?.ar}</h2>
          <Button size="sm" variant="outline" onClick={() => onCreateNew(section, region)}>
            <Plus size={16} style={{ marginLeft: 4 }} /> إضافة بند
          </Button>
        </div>

        <div className="ratecard__pricing-list" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {visibleItems.map((item) => {
            const draft = drafts[item.id] || {};
            const current = { ...item, ...draft };
            const isBoth = item.region === "both";

            return (
              <div key={item.id} style={{ position: "relative" }}>
                {isBoth && (
                  <div style={{ background: "rgba(244,153,33,0.1)", color: "#f49921", padding: "8px 12px", fontSize: 12, borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(244,153,33,0.3)", borderBottom: "none" }}>
                    <span>⚠️ هذا البند مشترك بين إربد وعمّان. تعديله هنا سيؤثر على المنطقتين.</span>
                    {onSplit && (
                      <Button size="sm" variant="outline" style={{ height: 26, fontSize: 11, borderColor: "#f49921", color: "#f49921" }} onClick={() => onSplit(item)}>
                        <SplitSquareHorizontal size={14} style={{ marginLeft: 6 }} /> فصل إربد عن عمّان
                      </Button>
                    )}
                  </div>
                )}
                
                <article className={`ratecard__price-row ${current.is_featured ? "is-featured" : ""} ${current.is_hidden ? "is-hidden" : ""}`} style={{ opacity: current.is_hidden ? 0.6 : 1, borderTopLeftRadius: isBoth ? 0 : undefined, borderTopRightRadius: isBoth ? 0 : undefined, position: "relative" }}>
                  <div className="ratecard__price-copy" style={{ flex: 1, position: "relative", zIndex: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <input 
                        value={current.name_ar} 
                        onChange={(e) => updateField(item.id, "name_ar", e.target.value)}
                        placeholder="اسم البند..."
                        style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 4, color: "#f0ece4", fontSize: 18, fontWeight: 700, width: "100%", padding: "4px 8px" }}
                      />
                    </div>
                    <textarea 
                      value={current.desc_ar || ""} 
                      onChange={(e) => updateField(item.id, "desc_ar", e.target.value)}
                      placeholder="الوصف..."
                      rows={2}
                      style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 4, color: "#9b948a", fontSize: 14, width: "100%", padding: "6px 8px", resize: "vertical", fontFamily: "inherit" }}
                    />
                  </div>
                  
                  <div className="ratecard__price-value" style={{ minWidth: 140, position: "relative", zIndex: 2 }}>
                    <input 
                      value={current.price_label_ar || ""} 
                      onChange={(e) => updateField(item.id, "price_label_ar", e.target.value)}
                      placeholder="تسمية السعر..."
                      style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 4, color: "#9b948a", fontSize: 12, textAlign: "center", width: "100%", padding: "2px 4px", marginBottom: 4 }}
                    />
                    
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
                      <input 
                        type="number"
                        value={current.price_min === null ? "" : current.price_min} 
                        onChange={(e) => updateField(item.id, "price_min", e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="0"
                        style={{ background: "transparent", border: "1px dashed rgba(244,153,33,0.5)", borderRadius: 4, color: "#f49921", fontSize: 26, fontWeight: 800, width: 70, textAlign: "center", padding: "0 4px" }}
                      />
                      <span style={{ color: "#f49921", fontWeight: "bold" }}>-</span>
                      <input 
                        type="number"
                        value={current.price_max === null ? "" : current.price_max} 
                        onChange={(e) => updateField(item.id, "price_max", e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="أعلى"
                        style={{ background: "transparent", border: "1px dashed rgba(244,153,33,0.5)", borderRadius: 4, color: "#f49921", fontSize: 16, fontWeight: 700, width: 60, textAlign: "center", padding: "2px 4px" }}
                      />
                    </div>

                    <input 
                      value={current.unit_ar || ""} 
                      onChange={(e) => updateField(item.id, "unit_ar", e.target.value)}
                      placeholder="الوحدة (JOD)"
                      style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 4, color: "#cfc8bd", fontSize: 13, textAlign: "center", width: "100%", padding: "2px 4px" }}
                    />
                  </div>

                  {/* Actions overlay */}
                  <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 10 }}>
                    <Button size="icon" variant="outline" style={{ width: 32, height: 32, background: "rgba(14,15,17,0.8)" }} onClick={() => updateField(item.id, "is_hidden", !current.is_hidden)} title={current.is_hidden ? "إظهار" : "إخفاء"}>
                      {current.is_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                    <Button size="icon" variant="outline" style={{ width: 32, height: 32, color: "#ef6c6c", borderColor: "#ef6c6c50", background: "rgba(14,15,17,0.8)" }} onClick={() => onDelete(item.id)} title="حذف">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </article>
              </div>
            );
          })}
          {visibleItems.length === 0 && <div className="ratecard__empty">لا توجد بنود هنا. اضغط على "إضافة بند" للبدء.</div>}
        </div>
      </main>
    </div>
  );
}
