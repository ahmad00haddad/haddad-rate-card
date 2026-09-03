import { useMemo, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, Plus, Check, ArrowRightLeft, X, Undo, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { announcePricingUpdate, usePricingItems } from "@/hooks/use-pricing-items";
import { createPricingItem, getPricingAuditLog, savePricingItem } from "@/lib/pricing.functions";
import { pricingQueryKey, type PricingItem, type PricingRegion, pricingSections } from "@/lib/pricing";
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
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const dirtyIds = Object.keys(drafts);

  // 1. Session Timer State
  const [timeSinceEdit, setTimeSinceEdit] = useState(0);
  const maxTime = 15 * 60; // 15 mins = 900 seconds
  const isTimerRunning = dirtyIds.length > 0;

  useEffect(() => {
    if (!isTimerRunning) {
      setTimeSinceEdit(0);
      return;
    }
    const interval = setInterval(() => setTimeSinceEdit(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  let timerColor = "#3ddc97";
  if (timeSinceEdit > 5 * 60) timerColor = "#fdcb6e";
  if (timeSinceEdit > 10 * 60) timerColor = "#f49921";
  const timerWidth = Math.min(100, (timeSinceEdit / maxTime) * 100);

  // 2. Undo Toast State
  const [undoToast, setUndoToast] = useState<{ id: string, name: string, time: number } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 3. Compare Overlay State
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareSection, setCompareSection] = useState(pricingSections[0].key);

  // 4. Command Palette State
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [cmdkSearch, setCmdkSearch] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cmdkOptions = useMemo(() => {
    return [
      ...pricingSections.map(s => ({
        label: `الانتقال إلى قسم: ${s.ar}`,
        action: () => window.dispatchEvent(new CustomEvent('cmdk-section', { detail: s.key }))
      })),
      { label: 'التبديل إلى عمّان (Amman)', action: () => setMobileTab('amman') },
      { label: 'التبديل إلى إربد (Irbid)', action: () => setMobileTab('irbid') }
    ];
  }, []);

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
      setTimeSinceEdit(0);
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

  // Optimized Undo Deletion
  async function handleDelete(id: string) {
    const item = data.find(i => i.id === id);
    if (!item) return;

    if (undoToast) {
      commitDelete(undoToast.id); // commit previous if pending
    }

    setDeletedIds(prev => new Set(prev).add(id));
    setUndoToast({ id, name: item.name_ar || 'بند غير معروف', time: 5 });
    
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    undoTimerRef.current = setInterval(() => {
      setUndoToast(prev => {
        if (!prev) return null;
        if (prev.time <= 1) {
          clearInterval(undoTimerRef.current!);
          commitDelete(id);
          return null;
        }
        return { ...prev, time: prev.time - 1 };
      });
    }, 1000);
  }

  async function commitDelete(id: string) {
    try {
      const { error } = await supabase.from("pricing_items").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
      
      const nextDrafts = { ...drafts };
      delete nextDrafts[id];
      setDrafts(nextDrafts);
      
      await queryClient.invalidateQueries({ queryKey: pricingQueryKey });
      announcePricingUpdate();
    } catch (caught) {
      console.error(caught);
      setDeletedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      setStatus({ kind: "error", text: "تعذّر الحذف. قد لا تملك صلاحية، أو حدث خطأ في الشبكة." });
      setTimeout(() => setStatus(null), 4000);
    }
  }

  function handleUndo() {
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    if (undoToast) {
      setDeletedIds(prev => { const n = new Set(prev); n.delete(undoToast.id); return n; });
    }
    setUndoToast(null);
  }

  async function handleSplitBoth(item: PricingItem) {
    if (!confirm("هل تريد فصل هذا البند المشترك إلى بندين منفصلين (واحد لإربد والآخر لعمّان)؟")) return;
    
    setSaving("split"); setStatus({ kind: "sync", text: "جارٍ فصل البند…" });
    try {
      await persist(item, { region: "irbid", ...drafts[item.id] });
      const currentData = { ...item, ...(drafts[item.id] || {}) };
      const { id: _id, item_key, created_at, updated_at, deleted_at, label, unit_text, note_text, ...copyData } = currentData;
      const payload = {
        ...copyData,
        region: "amman",
        item_key: `${item_key}_amman_${Date.now()}`,
      };
      await createFn({ data: { item: payload } });
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
  const [viewMode, setViewMode] = useState<"single" | "split">("single");

  useEffect(() => {
    const checkMobile = () => {
      const isMob = window.innerWidth < 768;
      setIsMobile(isMob);
      if (isMob) setViewMode("single");
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const visibleData = useMemo(() => data.filter(i => !deletedIds.has(i.id)), [data, deletedIds]);

  return (
    <section className="pricing-admin" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", position: "relative" }}>
      {/* 1. Session Timer Bar */}
      <div style={{ position: "absolute", top: -16, left: -16, right: -16, height: 2, background: "rgba(255,255,255,0.05)" }}>
        <div style={{ height: "100%", width: `${timerWidth}%`, background: timerColor, transition: "width 1s linear, background-color 1s" }} />
      </div>

      <div className="pricing-admin__head" style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", paddingTop: 8 }}>
        <div>
          <span style={{ fontSize: 12, color: "#f49921", fontWeight: "bold" }}>مقارنة وتعديل مباشر</span>
          <h2 style={{ fontSize: 24, margin: "4px 0" }}>إدارة أسعار إربد وعمّان</h2>
          <p style={{ margin: 0, color: "#9b948a", fontSize: 14 }}>عدّل النصوص والأسعار مباشرة كما تظهر للزبون.</p>
          
          {timeSinceEdit > 14 * 60 && (
            <p style={{ margin: "4px 0 0 0", color: "#f49921", fontSize: 13, fontWeight: "bold", animation: "pulse 2s infinite" }}>
              💡 لديك تعديلات غير محفوظة منذ 14 دقيقة
            </p>
          )}
        </div>
        <div className="pricing-admin__head-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          
          {viewMode === "single" && (
            <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(244,153,33,0.3)" }}>
              <button onClick={() => setMobileTab("amman")} style={{ padding: "6px 16px", fontSize: 13, fontWeight: mobileTab === "amman" ? "bold" : "normal", background: mobileTab === "amman" ? "#f49921" : "transparent", color: mobileTab === "amman" ? "#000" : "#fff", transition: "all 0.2s" }}>عمّان</button>
              <button onClick={() => setMobileTab("irbid")} style={{ padding: "6px 16px", fontSize: 13, fontWeight: mobileTab === "irbid" ? "bold" : "normal", background: mobileTab === "irbid" ? "#f49921" : "transparent", color: mobileTab === "irbid" ? "#000" : "#fff", transition: "all 0.2s" }}>إربد</button>
            </div>
          )}

          {!isMobile && (
            <Button 
              variant="outline"
              onClick={() => setViewMode(viewMode === "single" ? "split" : "single")}
              style={{ borderColor: "#f49921", color: "#f49921" }}
            >
              <ArrowRightLeft size={16} style={{ marginLeft: 6 }} /> {viewMode === "single" ? "عرض جانبي (مقارنة)" : "عرض مفرد (شاشة كاملة)"}
            </Button>
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
        
        {viewMode === "single" ? (
          <div style={{ height: "100%" }}>
            <InlinePricingEditor
              region={mobileTab as Exclude<PricingRegion, "both">}
              items={visibleData}
              drafts={drafts}
              updateField={updateField}
              onDelete={handleDelete}
              onSplit={handleSplitBoth}
              onCreateNew={handleCreateNew}
            />
          </div>
        ) : (
          <ResizablePanelGroup orientation="horizontal" style={{ height: "100%" }}>
            <ResizablePanel defaultSize={50} minSize={30}>
              <div style={{ height: "100%", paddingRight: 8 }}>
                <InlinePricingEditor
                  region="irbid"
                  items={visibleData}
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
                  items={visibleData}
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

      {/* 2. Undo Toast */}
      {undoToast && (
        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0e0f11", border: "1px solid rgba(244,153,33,0.3)", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 16, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Trash2 size={16} color="#ef6c6c" />
            <span style={{ color: "#f0ece4", fontSize: 14 }}>تم حذف "{undoToast.name}"</span>
          </div>
          <Button size="sm" variant="outline" onClick={handleUndo} style={{ borderColor: "#3ddc97", color: "#3ddc97", height: 28 }}>
            <Undo size={14} style={{ marginLeft: 6 }} /> تراجع
          </Button>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.1)", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(undoToast.time / 5) * 100}%`, background: "#f49921", transition: "width 1s linear" }} />
          </div>
        </div>
      )}

      {/* 3. Compare Overlay */}
      {isCompareOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setIsCompareOpen(false)}>
          <div style={{ background: "#0e0f11", border: "1px solid rgba(244,153,33,0.3)", borderRadius: 12, width: "90%", maxWidth: 800, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 12px 48px rgba(0,0,0,0.8)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#f49921", display: "flex", alignItems: "center", gap: 8 }}>
                <ArrowRightLeft size={20} /> مقارنة أسعار المنطقتين
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsCompareOpen(false)} style={{ color: "#9b948a" }}>
                <X size={20} />
              </Button>
            </div>
            
            <div style={{ padding: "12px 24px", display: "flex", gap: 8, overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {pricingSections.map(s => (
                <button
                  key={s.key}
                  onClick={() => setCompareSection(s.key)}
                  style={{
                    background: compareSection === s.key ? "#f49921" : "transparent",
                    color: compareSection === s.key ? "#000" : "#f0ece4",
                    border: "1px solid #f49921",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    whiteSpace: "nowrap"
                  }}
                >
                  {s.ar}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={{ textAlign: "center", fontWeight: "bold", color: "#f0ece4", borderBottom: "2px solid rgba(244,153,33,0.5)", paddingBottom: 8 }}>عمّان</div>
                <div style={{ textAlign: "center", fontWeight: "bold", color: "#f0ece4", borderBottom: "2px solid rgba(244,153,33,0.5)", paddingBottom: 8 }}>إربد</div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(() => {
                  const itemsInSection = data.filter(i => i.section === compareSection && !i.is_hidden && !deletedIds.has(i.id));
                  const ammanItems = itemsInSection.filter(i => i.region === "amman" || i.region === "both");
                  const irbidItems = itemsInSection.filter(i => i.region === "irbid" || i.region === "both");
                  
                  // Group by name_ar for easy comparison
                  const nameMap = new Map<string, { amman?: PricingItem, irbid?: PricingItem }>();
                  
                  ammanItems.forEach(i => {
                    const name = i.name_ar || "";
                    if (!nameMap.has(name)) nameMap.set(name, {});
                    nameMap.get(name)!.amman = i;
                  });
                  irbidItems.forEach(i => {
                    const name = i.name_ar || "";
                    if (!nameMap.has(name)) nameMap.set(name, {});
                    nameMap.get(name)!.irbid = i;
                  });

                  return Array.from(nameMap.entries()).map(([name, group], idx) => {
                    const ammanDraftPrice = group.amman ? drafts[group.amman.id]?.price_min : undefined;
                    const ammanPrice = ammanDraftPrice ?? group.amman?.price_min ?? 0;
                    
                    const irbidDraftPrice = group.irbid ? drafts[group.irbid.id]?.price_min : undefined;
                    const irbidPrice = irbidDraftPrice ?? group.irbid?.price_min ?? 0;
                    
                    const hasDiff = ammanPrice !== irbidPrice && group.amman && group.irbid;

                    return (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "8px 0", borderBottom: "1px dashed rgba(255,255,255,0.05)" }}>
                        <div style={{ background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: group.amman ? "#f0ece4" : "#555" }}>{group.amman ? name : "-"}</span>
                          {group.amman && (
                            <span style={{ fontWeight: "bold", color: hasDiff ? "#f49921" : "#3ddc97" }}>{ammanPrice} {group.amman.unit_ar}</span>
                          )}
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: group.irbid ? "#f0ece4" : "#555" }}>{group.irbid ? name : "-"}</span>
                          {group.irbid && (
                            <span style={{ fontWeight: "bold", color: hasDiff ? "#f49921" : "#3ddc97" }}>{irbidPrice} {group.irbid.unit_ar}</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Command Palette */}
      {cmdkOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", justifyContent: "center", paddingTop: "15vh" }} onClick={() => setCmdkOpen(false)}>
          <div style={{ background: "#15171a", width: "90%", maxWidth: 500, borderRadius: 12, border: "1px solid #f49921", padding: 16, boxShadow: "0 12px 48px rgba(244,153,33,0.15)", height: "fit-content" }} onClick={e => e.stopPropagation()}>
            <input 
              autoFocus
              placeholder="ابحث عن قسم أو منطقة... (مثال: إربد)"
              value={cmdkSearch}
              onChange={e => setCmdkSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') setCmdkOpen(false);
                if (e.key === 'Enter') {
                   const match = cmdkOptions.find(o => o.label.toLowerCase().includes(cmdkSearch.toLowerCase()));
                   if (match) { match.action(); setCmdkOpen(false); }
                }
              }}
              style={{ width: "100%", padding: "12px 16px", background: "#0e0f11", border: "1px solid rgba(244,153,33,0.3)", borderRadius: 8, color: "#f0ece4", marginBottom: 12, outline: "none" }}
            />
            <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {cmdkOptions.filter(o => o.label.toLowerCase().includes(cmdkSearch.toLowerCase())).map((o, i) => (
                <div 
                  key={i} 
                  onClick={() => { o.action(); setCmdkOpen(false); }} 
                  style={{ padding: "10px 16px", cursor: "pointer", borderRadius: 6, color: "#f0ece4", background: "rgba(255,255,255,0.02)", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(244,153,33,0.1)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                >
                  {o.label}
                </div>
              ))}
              {cmdkOptions.filter(o => o.label.toLowerCase().includes(cmdkSearch.toLowerCase())).length === 0 && (
                <div style={{ padding: "10px 16px", color: "#555", textAlign: "center" }}>لا توجد نتائج</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}