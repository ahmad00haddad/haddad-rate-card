import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { announcePricingUpdate, usePricingItems } from "@/hooks/use-pricing-items";
import { createPricingItem, getPricingAuditLog, savePricingItem } from "@/lib/pricing.functions";
import { pricingQueryKey, type PricingItem, type PricingRegion } from "@/lib/pricing";
import { useStickyState } from "@/hooks/use-sticky-state";
import { InlinePricingEditor, type Draft } from "./InlinePricingEditor";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { supabase } from "@/integrations/supabase/client";

const emptyItem = (region: PricingRegion, section: string): Record<string, unknown> => ({
  section, region, name_ar: "بند جديد", name_en: "New item",
  desc_ar: "", desc_en: "", tag_ar: "", tag_en: "", price_label_ar: "السعر",
  price_label_en: "Price", price_min: null, price_max: null, currency: "JOD",
  unit_ar: "JOD", unit_en: "JOD", note_ar: "", note_en: "", sort_order: 999,
  is_featured: false, is_hidden: false, price_text: "",
});

export default function PricingAdmin() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, error } = usePricingItems(true);
  const saveFn = useServerFn(savePricingItem);
  const createFn = useServerFn(createPricingItem);
  
  const [drafts, setDrafts] = useStickyState<Record<string, Draft>>("pricing-drafts", {});
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "success" | "error" | "sync"; text: string } | null>(null);

  const dirtyIds = Object.keys(drafts);

  function updateField(id: string, field: keyof PricingItem, value: unknown) {
    setDrafts((old: Record<string, Draft>) => ({ 
      ...old, 
      [id]: { ...(old[id] || {}), [field]: value } 
    }));
  }

  function syncLegacyFields(patch: Draft) {
    const next: Record<string, unknown> = { ...patch };
    if (typeof patch.name_ar === "string") next.label = patch.name_ar;
    if ("unit_ar" in patch) next.unit_text = patch.unit_ar ?? "";
    if ("note_ar" in patch) next.note_text = patch.note_ar ?? "";
    const min = patch.price_min;
    const max = patch.price_max;
    if (min !== undefined || max !== undefined) next.price_text = min == null ? "" : max != null && Number(max) !== Number(min) ? `${min}–${max}` : String(min);
    return next;
  }

  async function persist(item: PricingItem, patch: Draft) {
    const min = patch.price_min ?? item.price_min;
    const max = patch.price_max ?? item.price_max;
    if (min != null && max != null && Number(max) < Number(min)) throw new Error("الحد الأعلى يجب أن يكون أكبر من أو يساوي الحد الأدنى.");
    return saveFn({ data: { id: item.id, patch: syncLegacyFields(patch) } });
  }

  async function saveAll() {
    setSaving("all"); setStatus({ kind: "sync", text: `جارٍ نشر ${dirtyIds.length} تعديلات…` });
    try {
      for (const id of dirtyIds) {
        const item = data.find((entry) => entry.id === id);
        if (item) await persist(item, drafts[id] ?? {});
      }
      setDrafts({});
      await queryClient.invalidateQueries({ queryKey: pricingQueryKey });
      announcePricingUpdate();
      setStatus({ kind: "success", text: "تم حفظ ونشر جميع التعديلات." });
      setTimeout(() => setStatus(null), 3000);
    } catch (caught) {
      setStatus({ kind: "error", text: caught instanceof Error ? caught.message : "تعذّر الحفظ الجماعي." });
    } finally { setSaving(null); }
  }

  async function handleCreateNew(section: string, region: PricingRegion) {
    setSaving("create"); setStatus({ kind: "sync", text: "جارٍ إنشاء البند…" });
    try {
      const payload = emptyItem(region, section);
      await createFn({ data: { item: payload } });
      await queryClient.invalidateQueries({ queryKey: pricingQueryKey });
      announcePricingUpdate();
      setStatus({ kind: "success", text: "تم إنشاء البند الجديد." });
      setTimeout(() => setStatus(null), 3000);
    } catch (caught) { 
      setStatus({ kind: "error", text: caught instanceof Error ? caught.message : "تعذّر الإنشاء." }); 
    } finally { setSaving(null); }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا البند نهائياً؟")) return;
    setSaving("delete"); setStatus({ kind: "sync", text: "جارٍ الحذف…" });
    try {
      // Direct supabase call since there isn't a delete function in pricing.functions.ts yet
      const { error } = await supabase.rpc("admin_update_pricing_item", {
        _item_id: id,
        _patch: { deleted_at: new Date().toISOString() }
      });
      if (error) throw new Error(error.message);
      
      const nextDrafts = { ...drafts };
      delete nextDrafts[id];
      setDrafts(nextDrafts);
      
      await queryClient.invalidateQueries({ queryKey: pricingQueryKey });
      announcePricingUpdate();
      setStatus({ kind: "success", text: "تم حذف البند." });
      setTimeout(() => setStatus(null), 3000);
    } catch (caught) {
      setStatus({ kind: "error", text: caught instanceof Error ? caught.message : "تعذّر الحذف." });
    } finally { setSaving(null); }
  }

  async function handleSplitBoth(item: PricingItem) {
    if (!confirm("هل تريد فصل هذا البند المشترك إلى بندين منفصلين (واحد لإربد والآخر لعمّان)؟")) return;
    
    setSaving("split"); setStatus({ kind: "sync", text: "جارٍ فصل البند…" });
    try {
      // 1. Change current item to 'irbid'
      await persist(item, { region: "irbid", ...drafts[item.id] });
      
      // 2. Create a new copy for 'amman'
      const currentData = { ...item, ...(drafts[item.id] || {}) };
      const { id: _id, item_key, created_at, updated_at, deleted_at, label, unit_text, note_text, ...copyData } = currentData;
      
      const payload = {
        ...copyData,
        region: "amman",
        item_key: `${item_key}_amman_${Date.now()}`,
      };
      
      await createFn({ data: { item: payload } });
      
      // Clear draft for original
      const nextDrafts = { ...drafts };
      delete nextDrafts[item.id];
      setDrafts(nextDrafts);

      await queryClient.invalidateQueries({ queryKey: pricingQueryKey });
      announcePricingUpdate();
      setStatus({ kind: "success", text: "تم فصل البند بنجاح." });
      setTimeout(() => setStatus(null), 3000);
    } catch (caught) {
      setStatus({ kind: "error", text: caught instanceof Error ? caught.message : "تعذّر الفصل." });
    } finally { setSaving(null); }
  }

  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<PricingRegion>("amman");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <section className="pricing-admin" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
      <div className="pricing-admin__head" style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, color: "#f49921", fontWeight: "bold" }}>مقارنة وتعديل مباشر</span>
          <h2 style={{ fontSize: 24, margin: "4px 0" }}>إدارة أسعار إربد وعمّان</h2>
          <p style={{ margin: 0, color: "#9b948a", fontSize: 14 }}>عدّل النصوص والأسعار مباشرة كما تظهر للزبون.</p>
        </div>
        <div className="pricing-admin__head-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isMobile && (
            <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(244,153,33,0.3)" }}>
              <button onClick={() => setMobileTab("amman")} style={{ padding: "6px 16px", fontSize: 13, fontWeight: mobileTab === "amman" ? "bold" : "normal", background: mobileTab === "amman" ? "#f49921" : "transparent", color: mobileTab === "amman" ? "#000" : "#fff", transition: "all 0.2s" }}>عمّان</button>
              <button onClick={() => setMobileTab("irbid")} style={{ padding: "6px 16px", fontSize: 13, fontWeight: mobileTab === "irbid" ? "bold" : "normal", background: mobileTab === "irbid" ? "#f49921" : "transparent", color: mobileTab === "irbid" ? "#000" : "#fff", transition: "all 0.2s" }}>إربد</button>
            </div>
          )}
          <Button 
            onClick={saveAll} 
            disabled={!dirtyIds.length || saving !== null} 
            style={{ 
              background: status?.kind === "success" ? "#3ddc97" : "#f49921", 
              color: "#000", 
              fontWeight: "bold",
              transition: "all 0.3s ease",
            }}
            className={dirtyIds.length > 0 && saving === null ? "animate-pulse" : ""}
          >
            {saving === "all" ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : status?.kind === "success" ? (
              <Check size={18} style={{ marginRight: 6 }} /> 
            ) : (
              <Save size={18} style={{ marginRight: 6 }} />
            )}
            {saving === "all" ? "جارٍ الحفظ..." : status?.kind === "success" ? "تم الحفظ بنجاح!" : `حفظ التعديلات (${dirtyIds.length})`}
          </Button>
        </div>
      </div>
      
      {status && (
        <div className={`pricing-admin__status is-${status.kind}`} style={{ marginBottom: 16 }}>
          {status.text}
        </div>
      )}

      {error && <p className="pricing-admin__error">تعذّر تحميل البنود: {error.message}</p>}
      
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {isLoading && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,15,17,0.7)", zIndex: 100 }}>جارٍ التحميل…</div>}
        
        {isMobile ? (
          <div style={{ height: "100%" }}>
            <InlinePricingEditor
              region={mobileTab as Exclude<PricingRegion, "both">}
              items={data}
              drafts={drafts}
              updateField={updateField}
              onDelete={handleDelete}
              onSplit={handleSplitBoth}
              onCreateNew={handleCreateNew}
            />
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" style={{ height: "100%" }}>
            <ResizablePanel defaultSize={50} minSize={30}>
              <div style={{ height: "100%", paddingRight: 8 }}>
                <InlinePricingEditor
                  region="irbid"
                  items={data}
                  drafts={drafts}
                  updateField={updateField}
                  onDelete={handleDelete}
                  onSplit={handleSplitBoth}
                  onCreateNew={handleCreateNew}
                />
              </div>
            </ResizablePanel>
            
            <ResizableHandle style={{ width: 8, cursor: "col-resize", background: "transparent", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 2, height: 40, background: "rgba(244,153,33,0.3)", borderRadius: 2 }} />
            </ResizableHandle>
            
            <ResizablePanel defaultSize={50} minSize={30}>
              <div style={{ height: "100%", paddingLeft: 8 }}>
                <InlinePricingEditor
                  region="amman"
                  items={data}
                  drafts={drafts}
                  updateField={updateField}
                  onDelete={handleDelete}
                  onSplit={handleSplitBoth}
                  onCreateNew={handleCreateNew}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </section>
  );
}