import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Eye, EyeOff, History, Plus, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { RateCardExperience } from "@/components/RateCardExperience";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { announcePricingUpdate, usePricingItems } from "@/hooks/use-pricing-items";
import { createPricingItem, getPricingAuditLog, savePricingItem } from "@/lib/pricing.functions";
import { pricingQueryKey, pricingSections, type PricingItem } from "@/lib/pricing";
import { useStickyScroll, useStickyState } from "@/hooks/use-sticky-state";

type Draft = Partial<PricingItem>;
type AuditRow = Awaited<ReturnType<ReturnType<typeof useServerFn<typeof getPricingAuditLog>>>>[number];

const emptyItem = (): Record<string, unknown> => ({
  section: "reels", region: "irbid", name_ar: "بند جديد", name_en: "New item",
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
  const auditFn = useServerFn(getPricingAuditLog);
  useStickyScroll("pricing-admin");
  const [drafts, setDrafts] = useStickyState<Record<string, Draft>>("pricing-drafts", {});
  const [query, setQuery] = useStickyState("pricing-query", "");
  const [section, setSection] = useStickyState("pricing-section", "all");
  const [region, setRegion] = useStickyState("pricing-region", "all");
  const [selectedId, setSelectedId] = useStickyState<string | null>("pricing-selected", null);
  const [tab, setTab] = useStickyState("pricing-tab", "editor");
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "success" | "error" | "sync"; text: string } | null>(null);
  const [previewRegion, setPreviewRegion] = useStickyState<"irbid" | "amman">("pricing-preview-region", "irbid");


  const filtered = useMemo(() => data.filter((item) => {
    const needle = query.trim().toLocaleLowerCase("ar");
    return (!needle || `${item.name_ar} ${item.name_en} ${item.desc_ar}`.toLocaleLowerCase("ar").includes(needle))
      && (section === "all" || item.section === section)
      && (region === "all" || item.region === region);
  }), [data, query, region, section]);
  const selected = data.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const selectedDraft = selected ? drafts[selected.id] ?? {} : {};
  const current = selected ? { ...selected, ...selectedDraft } : null;
  const dirtyIds = Object.keys(drafts);

  function update(field: keyof PricingItem, value: unknown) {
    if (!selected) return;
    setDrafts((old: Record<string, Draft>) => ({ ...old, [selected.id]: { ...old[selected.id], [field]: value } }));
  }

  function discard(id: string) {
    setDrafts((old: Record<string, Draft>) => { const next = { ...old }; delete next[id]; return next; });
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

  async function saveOne(item: PricingItem) {
    const patch = drafts[item.id];
    if (!patch) return;
    setSaving(item.id); setStatus({ kind: "sync", text: "جارٍ الحفظ والنشر…" });
    try {
      await persist(item, patch);
      discard(item.id);
      await queryClient.invalidateQueries({ queryKey: pricingQueryKey });
      announcePricingUpdate();
      setStatus({ kind: "success", text: "محفوظ ومنشور فوراً على الصفحة الرئيسية." });
    } catch (caught) {
      setStatus({ kind: "error", text: caught instanceof Error ? caught.message : "تعذّر الحفظ." });
    } finally { setSaving(null); }
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
    } catch (caught) {
      setStatus({ kind: "error", text: caught instanceof Error ? caught.message : "تعذّر الحفظ الجماعي." });
    } finally { setSaving(null); }
  }

  async function createNew(source?: PricingItem) {
    setSaving("create"); setStatus({ kind: "sync", text: "جارٍ إنشاء البند…" });
    try {
      const payload = source ? { ...source, item_key: `${source.item_key}_copy_${Date.now()}`, name_ar: `${source.name_ar} — نسخة`, name_en: `${source.name_en} — Copy` } : emptyItem();
      const created = await createFn({ data: { item: payload } });
      await queryClient.invalidateQueries({ queryKey: pricingQueryKey });
      announcePricingUpdate();
      setSelectedId(created.id);
      setStatus({ kind: "success", text: "تم إنشاء البند. يمكنك تعديل تفاصيله الآن." });
    } catch (caught) { setStatus({ kind: "error", text: caught instanceof Error ? caught.message : "تعذّر الإنشاء." }); }
    finally { setSaving(null); }
  }

  async function setVisibility(item: PricingItem, hidden: boolean) {
    setDrafts((old: Record<string, Draft>) => ({ ...old, [item.id]: { ...old[item.id], is_hidden: hidden } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    setSaving(item.id); setStatus({ kind: "sync", text: hidden ? "جارٍ إخفاء البند…" : "جارٍ نشر البند…" });
    try {
      await persist(item, { is_hidden: hidden });
      discard(item.id);
      await queryClient.invalidateQueries({ queryKey: pricingQueryKey });
      announcePricingUpdate();
      setStatus({ kind: "success", text: hidden ? "تم إخفاء البند فوراً." : "تم نشر البند فوراً." });
    } catch (caught) { setStatus({ kind: "error", text: caught instanceof Error ? caught.message : "تعذّر التحديث." }); }
    finally { setSaving(null); }
  }

  return (
    <section className="pricing-admin">
      <div className="pricing-admin__head">
        <div><span>نظام النشر المباشر</span><h2>إدارة الأسعار والخدمات</h2><p>كل حقل هنا يرسم مباشرة في الصفحة الرئيسية من المصدر نفسه.</p></div>
        <div className="pricing-admin__head-actions">
          <Button variant="outline" onClick={() => void createNew()} disabled={saving === "create"}><Plus />بند جديد</Button>
          <Button onClick={() => void saveAll()} disabled={!dirtyIds.length || saving !== null}><Save />حفظ الكل ({dirtyIds.length})</Button>
        </div>
      </div>
      {status && <div className={`pricing-admin__status is-${status.kind}`}>{status.text}</div>}

      <Tabs value={tab} onValueChange={setTab} dir="rtl">
        <TabsList className="pricing-admin__tabs">
          <TabsTrigger value="editor">المحرر</TabsTrigger><TabsTrigger value="preview">المعاينة المباشرة</TabsTrigger><TabsTrigger value="history">سجل التغييرات</TabsTrigger>
        </TabsList>
        <TabsContent value="editor">
          <div className="pricing-admin__filters">
            <label><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالاسم أو الوصف…" /></label>
            <select value={section} onChange={(event) => setSection(event.target.value)}><option value="all">كل الخدمات</option>{pricingSections.map((entry) => <option value={entry.key} key={entry.key}>{entry.ar}</option>)}</select>
            <select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">كل المناطق</option><option value="irbid">إربد</option><option value="amman">عمّان</option><option value="both">المنطقتان</option></select>
          </div>
          {error && <p className="pricing-admin__error">تعذّر تحميل البنود: {error.message}</p>}
          <div className="pricing-admin__workspace">
            <aside className="pricing-admin__list">
              {isLoading && <p>جارٍ التحميل…</p>}
              {filtered.map((item) => <button className={`${selected?.id === item.id ? "is-selected" : ""} ${item.is_hidden ? "is-hidden" : ""}`} key={item.id} onClick={() => setSelectedId(item.id)}><span>{pricingSections.find((entry) => entry.key === item.section)?.icon}</span><div><strong>{drafts[item.id]?.name_ar ?? item.name_ar}</strong><small>{item.region === "irbid" ? "إربد" : item.region === "amman" ? "عمّان" : "المنطقتان"} · {item.price_min == null ? item.price_text : `${item.price_min}${item.price_max != null ? `–${item.price_max}` : ""}`}</small></div>{drafts[item.id] && <i />}</button>)}
            </aside>
            {current ? <Editor item={current} original={selected} update={update} onSave={() => selected && void saveOne(selected)} onDiscard={() => selected && discard(selected.id)} onCopy={() => selected && void createNew(selected)} onVisibility={() => selected && void setVisibility(selected, !current.is_hidden)} saving={saving === selected?.id} dirty={Boolean(selected && drafts[selected.id])} /> : <div className="pricing-admin__empty">لا توجد بنود مطابقة.</div>}
          </div>
        </TabsContent>
        <TabsContent value="preview">
          <div className="pricing-admin__preview-toolbar"><strong>المعاينة تستخدم مكوّن الصفحة الرئيسية نفسه</strong><div><Button size="sm" variant={previewRegion === "irbid" ? "default" : "outline"} onClick={() => setPreviewRegion("irbid")}>إربد</Button><Button size="sm" variant={previewRegion === "amman" ? "default" : "outline"} onClick={() => setPreviewRegion("amman")}>عمّان</Button></div></div>
          <div className="pricing-admin__preview"><RateCardExperience compact initialRegion={previewRegion} items={data.filter((item) => !item.is_hidden && !item.deleted_at)} key={previewRegion} /></div>
        </TabsContent>
        <TabsContent value="history"><AuditLog queryFn={auditFn} /></TabsContent>
      </Tabs>
    </section>
  );
}

function Editor({ item, original, update, onSave, onDiscard, onCopy, onVisibility, saving, dirty }: { item: PricingItem; original: PricingItem | null; update: (field: keyof PricingItem, value: unknown) => void; onSave: () => void; onDiscard: () => void; onCopy: () => void; onVisibility: () => void; saving: boolean; dirty: boolean }) {
  const numberValue = (value: number | null) => value == null ? "" : String(value);
  return <div className="pricing-editor">
    <div className="pricing-editor__title"><div><span>{item.item_key}</span><h3>{item.name_ar || "بند دون اسم"}</h3></div><div><Button size="icon" variant="outline" title="نسخ البند" onClick={onCopy}><Copy /></Button><Button size="icon" variant="outline" title={item.is_hidden ? "إظهار" : "إخفاء"} onClick={onVisibility}>{item.is_hidden ? <Eye /> : <EyeOff />}</Button></div></div>
    <div className="pricing-editor__grid">
      <Field label="المنطقة"><select value={item.region} onChange={(event) => update("region", event.target.value)}><option value="irbid">إربد</option><option value="amman">عمّان</option><option value="both">المنطقتان</option></select></Field>
      <Field label="القسم"><select value={item.section} onChange={(event) => update("section", event.target.value)}>{pricingSections.map((entry) => <option value={entry.key} key={entry.key}>{entry.ar}</option>)}</select></Field>
      <Field label="الترتيب"><Input type="number" value={item.sort_order} onChange={(event) => update("sort_order", Number(event.target.value))} /></Field>
      <Field label="العملة"><select value={item.currency} onChange={(event) => update("currency", event.target.value)}><option value="JOD">JOD</option><option value="USD">USD</option></select></Field>
      <Field label="السعر الأدنى"><Input type="number" min="0" value={numberValue(item.price_min)} onChange={(event) => update("price_min", event.target.value === "" ? null : Number(event.target.value))} /></Field>
      <Field label="السعر الأعلى (اختياري)"><Input type="number" min="0" value={numberValue(item.price_max)} onChange={(event) => update("price_max", event.target.value === "" ? null : Number(event.target.value))} /></Field>
      <Field label="اسم البند — عربي"><Input value={item.name_ar} onChange={(event) => update("name_ar", event.target.value)} /></Field>
      <Field label="اسم البند — English"><Input dir="ltr" value={item.name_en} onChange={(event) => update("name_en", event.target.value)} /></Field>
      <Field label="تسمية السعر — عربي"><Input value={item.price_label_ar} onChange={(event) => update("price_label_ar", event.target.value)} /></Field>
      <Field label="Price label — English"><Input dir="ltr" value={item.price_label_en} onChange={(event) => update("price_label_en", event.target.value)} /></Field>
      <Field label="الوحدة — عربي"><Input value={item.unit_ar} onChange={(event) => update("unit_ar", event.target.value)} /></Field>
      <Field label="Unit — English"><Input dir="ltr" value={item.unit_en} onChange={(event) => update("unit_en", event.target.value)} /></Field>
      <Field label="الوصف — عربي" wide><Textarea rows={3} value={item.desc_ar} onChange={(event) => update("desc_ar", event.target.value)} /></Field>
      <Field label="Description — English" wide><Textarea dir="ltr" rows={3} value={item.desc_en} onChange={(event) => update("desc_en", event.target.value)} /></Field>
      <Field label="الشارة — عربي"><Input value={item.tag_ar} onChange={(event) => update("tag_ar", event.target.value)} /></Field>
      <Field label="Badge — English"><Input dir="ltr" value={item.tag_en} onChange={(event) => update("tag_en", event.target.value)} /></Field>
      <Field label="الملاحظة أسفل السعر — عربي"><Input value={item.note_ar} onChange={(event) => update("note_ar", event.target.value)} /></Field>
      <Field label="Note under price — English"><Input dir="ltr" value={item.note_en} onChange={(event) => update("note_en", event.target.value)} /></Field>
    </div>
    <div className="pricing-editor__toggles"><label><input type="checkbox" checked={item.is_featured} onChange={(event) => update("is_featured", event.target.checked)} /> تمييز البند بصرياً</label><label><input type="checkbox" checked={item.is_hidden} onChange={(event) => update("is_hidden", event.target.checked)} /> إخفاؤه عن الزوار</label></div>
    <div className="pricing-editor__actions"><Button variant="outline" onClick={onDiscard} disabled={!dirty}><RotateCcw />تراجع</Button><Button onClick={onSave} disabled={!dirty || saving}><Save />{saving ? "جارٍ النشر…" : "حفظ ونشر"}</Button></div>
  </div>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? "is-wide" : ""}><span>{label}</span>{children}</label>; }

function AuditLog({ queryFn }: { queryFn: () => Promise<AuditRow[]> }) {
  const { data = [], isLoading } = useQuery({ queryKey: ["pricing-audit"], queryFn });
  if (isLoading) return <div className="pricing-admin__empty">جارٍ تحميل سجل التغييرات…</div>;
  return <div className="pricing-audit"><div className="pricing-audit__head"><History /><div><h3>سجل التغييرات</h3><p>آخر 100 عملية محفوظة في النظام.</p></div></div>{data.map((row) => { const values = row.new_values && typeof row.new_values === "object" && !Array.isArray(row.new_values) ? row.new_values as Record<string, unknown> : {}; return <article key={row.id}><span>{row.action === "create" ? "إنشاء" : row.action === "hide" ? "إخفاء" : row.action === "restore" ? "استرجاع" : "تعديل"}</span><div><strong>{String(values.name_ar ?? row.pricing_item_id)}</strong><small>{new Date(row.created_at).toLocaleString("ar-JO")}</small></div></article>; })}</div>;
}