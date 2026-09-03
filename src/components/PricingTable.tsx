import React, { useMemo, useState, useRef } from "react";
import { Plus, Search, Trash2, Eye, EyeOff, AlertTriangle, SplitSquareHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricingSections, type PricingItem, type PricingRegion } from "@/lib/pricing";

type PricingTableProps = {
  items: PricingItem[];
  drafts: Record<string, Partial<PricingItem>>;
  updateField: (id: string, field: keyof PricingItem, value: any) => void;
  onDelete: (id: string) => void;
  onSplit: (item: PricingItem) => void;
  onCreateNew: (section: string | null, region: Exclude<PricingRegion, "both"> | "both") => void;
};

type MergedRow = {
  key: string;
  name_ar: string;
  section: string;
  ammanItem: PricingItem | null;
  irbidItem: PricingItem | null;
  isBoth: boolean;
  sort_order: number;
};

export function PricingTable({ items, drafts, updateField, onDelete, onSplit, onCreateNew }: PricingTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const groupedRows = useMemo(() => {
    const map = new Map<string, MergedRow>();
    
    items.forEach(item => {
      const name = drafts[item.id]?.name_ar ?? item.name_ar;
      const key = `${item.section}_${name}`;
      
      if (!map.has(key)) {
        map.set(key, {
          key,
          name_ar: name,
          section: item.section,
          ammanItem: null,
          irbidItem: null,
          isBoth: false,
          sort_order: item.sort_order ?? 999,
        });
      }
      
      const row = map.get(key)!;
      row.sort_order = Math.min(row.sort_order, item.sort_order ?? 999);
      
      if (item.region === 'both') {
        row.ammanItem = item;
        row.irbidItem = item;
        row.isBoth = true;
      } else if (item.region === 'amman') {
        row.ammanItem = item;
      } else if (item.region === 'irbid') {
        row.irbidItem = item;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.sort_order - b.sort_order);
  }, [items, drafts]);

  const visibleRows = useMemo(() => {
    return groupedRows.filter(row => {
      if (activeSection && row.section !== activeSection) return false;
      if (searchQuery && !row.name_ar.includes(searchQuery)) return false;
      return true;
    });
  }, [groupedRows, activeSection, searchQuery]);

  const toggleSelection = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateRowField = (row: MergedRow, field: keyof PricingItem, value: any) => {
    if (row.isBoth && row.ammanItem) {
      updateField(row.ammanItem.id, field, value);
    } else {
      if (row.ammanItem) updateField(row.ammanItem.id, field, value);
      if (row.irbidItem) updateField(row.irbidItem.id, field, value);
    }
  };

  const deleteRow = (row: MergedRow) => {
    if (row.isBoth && row.ammanItem) {
      onDelete(row.ammanItem.id);
    } else {
      if (row.ammanItem) onDelete(row.ammanItem.id);
      if (row.irbidItem) onDelete(row.irbidItem.id);
    }
  };

  const CellInput = ({ value, onChange, placeholder = "", width = "100%", type = "text" }: any) => (
    <input 
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
      placeholder={placeholder}
      style={{ 
        background: "transparent", border: "1px solid transparent", borderRadius: 4, 
        color: "#f0ece4", fontSize: 14, width, padding: "6px 8px", transition: "all 0.2s" 
      }}
      className="hover:border-[rgba(244,153,33,0.5)] focus:border-[#f49921] focus:bg-[#15171a]"
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0e0f11", border: "1px solid rgba(244,153,33,0.2)", borderRadius: 8, overflow: "hidden", position: "relative" }}>
      
      <header style={{ padding: "16px", background: "rgba(14,15,17,0.95)", borderBottom: "1px solid rgba(244,153,33,0.15)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", flex: 1, paddingRight: 16 }}>
            <button
              onClick={() => { setActiveSection(null); setSelectedKeys(new Set()); }}
              style={{ padding: "6px 12px", borderRadius: 6, fontSize: 13, background: !activeSection ? "#f49921" : "transparent", color: !activeSection ? "#000" : "#f0ece4", border: "1px solid #f49921", transition: "all 0.2s" }}
            >
              ????
            </button>
            {pricingSections.map((entry) => (
              <button
                key={entry.key}
                onClick={() => { setActiveSection(entry.key); setSelectedKeys(new Set()); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: activeSection === entry.key ? "#f49921" : "transparent",
                  color: activeSection === entry.key ? "#000" : "#f0ece4",
                  border: "1px solid #f49921",
                  padding: "6px 12px", borderRadius: 6, fontSize: 13, whiteSpace: "nowrap",
                  transition: "all 0.2s"
                }}
              >
                <span className="[&>svg]:w-4 [&>svg]:h-4">{entry.icon}</span> {entry.ar}
              </button>
            ))}
          </div>
          <Button onClick={() => onCreateNew(activeSection, "both")} style={{ background: "#f49921", color: "#000", fontWeight: "bold", whiteSpace: "nowrap", transition: "all 0.2s" }} className="hover:scale-105">
            <Plus size={16} style={{ marginLeft: 6 }} /> ????? ??? ????
          </Button>
        </div>
        
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#9b948a" }} />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="???? ?? ??????..."
            style={{ background: "#15171a", border: "1px solid rgba(244,153,33,0.3)", borderRadius: 6, color: "#f0ece4", fontSize: 14, width: "100%", padding: "8px 12px 8px 36px", paddingRight: 36 }}
            className="focus:border-[#f49921] outline-none"
          />
        </div>
      </header>

      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
          <thead style={{ position: "sticky", top: 0, background: "#15171a", zIndex: 10 }}>
            <tr style={{ color: "#9b948a", fontSize: 13, borderBottom: "1px solid rgba(244,153,33,0.2)" }}>
              <th style={{ padding: "12px 16px", width: 40 }}></th>
              <th style={{ padding: "12px 16px" }}>?????? (?????)</th>
              <th style={{ padding: "12px 16px", width: "15%" }}>?????</th>
              <th style={{ padding: "12px 16px", width: "15%" }}>??? ???? (JOD)</th>
              <th style={{ padding: "12px 16px", width: "15%" }}>??? ????? (JOD)</th>
              <th style={{ padding: "12px 16px", width: "10%" }}>??????</th>
              <th style={{ padding: "12px 16px", width: "10%" }}>???????</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const isSelected = selectedKeys.has(row.key);
              const isHidden = (row.ammanItem && (drafts[row.ammanItem.id]?.is_hidden ?? row.ammanItem.is_hidden)) || (row.irbidItem && (drafts[row.irbidItem.id]?.is_hidden ?? row.irbidItem.is_hidden));
              
              const ammanPrice = row.ammanItem ? (drafts[row.ammanItem.id]?.price_min ?? row.ammanItem.price_min) : null;
              const irbidPrice = row.irbidItem ? (drafts[row.irbidItem.id]?.price_min ?? row.irbidItem.price_min) : null;
              const sectionAr = pricingSections.find(s => s.key === row.section)?.ar ?? row.section;

              return (
                <tr 
                  key={row.key} 
                  style={{ 
                    background: isSelected ? "rgba(244,153,33,0.1)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    transition: "background 0.2s",
                    opacity: isHidden ? 0.5 : 1
                  }}
                  className="hover:bg-[rgba(255,255,255,0.02)] group"
                >
                  <td style={{ padding: "12px 16px" }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(row.key)} style={{ cursor: "pointer", accentColor: "#f49921" }} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <CellInput 
                      value={row.name_ar} 
                      onChange={(val: string) => updateRowField(row, "name_ar", val)} 
                      placeholder="??? ??????..." 
                    />
                  </td>
                  <td style={{ padding: "12px 16px", color: "#9b948a", fontSize: 13 }}>
                    {sectionAr}
                  </td>
                  
                  <td style={{ padding: "12px 16px" }}>
                    {row.irbidItem ? (
                      <CellInput 
                        type="number"
                        value={irbidPrice} 
                        onChange={(val: number | null) => updateField(row.irbidItem!.id, "price_min", val)} 
                        placeholder="0" 
                        width="80px"
                      />
                    ) : <span style={{ color: "#555", fontSize: 12 }}>-</span>}
                  </td>

                  <td style={{ padding: "12px 16px", position: "relative" }}>
                    {row.isBoth ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#f49921", fontSize: 13, opacity: 0.8 }}>????? ??</span>
                        <Button size="sm" variant="ghost" onClick={() => onSplit(row.ammanItem!)} style={{ height: 24, fontSize: 11, padding: "0 6px", color: "#9b948a" }} title="??? ?????">
                          <SplitSquareHorizontal size={12} />
                        </Button>
                      </div>
                    ) : row.ammanItem ? (
                      <CellInput 
                        type="number"
                        value={ammanPrice} 
                        onChange={(val: number | null) => updateField(row.ammanItem!.id, "price_min", val)} 
                        placeholder="0"
                        width="80px"
                      />
                    ) : <span style={{ color: "#555", fontSize: 12 }}>-</span>}
                  </td>

                  <td style={{ padding: "12px 16px" }}>
                    <button 
                      onClick={() => updateRowField(row, "is_hidden", !isHidden)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: isHidden ? "#ef6c6c" : "#3ddc97", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                      className="hover:scale-105 transition-transform"
                    >
                      {isHidden ? <><EyeOff size={14} /> ????</> : <><Eye size={14} /> ????</>}
                    </button>
                  </td>

                  <td style={{ padding: "12px 16px" }}>
                    <button 
                      onClick={() => {
                        if (confirm(`?? ??? ????? ?? ??? ${row.name_ar}?`)) deleteRow(row);
                      }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef6c6c", opacity: 0.7 }}
                      className="hover:opacity-100 hover:scale-110 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "80px 20px", color: "#9b948a" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <Search size={48} opacity={0.2} />
                    <p>?? ???? ?????? ??????. ???? ??? "????? ??? ????".</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div 
        className={`transition-transform duration-300 ${selectedKeys.size > 0 ? "translate-y-0" : "translate-y-full"}`}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(14,15,17,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(244,153,33,0.3)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 30, boxShadow: "0 -4px 12px rgba(0,0,0,0.5)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#f49921", fontWeight: "bold" }}>
            <Check size={18} /> {selectedKeys.size} ???? ?????
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedKeys(new Set())} style={{ color: "#9b948a" }}>????? ???????</Button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button 
            variant="outline" size="sm" 
            onClick={() => {
              selectedKeys.forEach(key => {
                const r = groupedRows.find(x => x.key === key);
                if (r) updateRowField(r, "is_hidden", true);
              });
              setSelectedKeys(new Set());
            }}
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "#f0ece4" }}
          >
            <EyeOff size={16} style={{ marginLeft: 6 }} /> ????? ????
          </Button>
          <Button 
            variant="destructive" size="sm" 
            onClick={() => {
              if (confirm(`?? ??? ????? ?? ??? ${selectedKeys.size} ?????`)) {
                selectedKeys.forEach(key => {
                  const r = groupedRows.find(x => x.key === key);
                  if (r) deleteRow(r);
                });
                setSelectedKeys(new Set());
              }
            }}
            style={{ background: "#ef6c6c", color: "#fff" }}
          >
            <Trash2 size={16} style={{ marginLeft: 6 }} /> ??? ????
          </Button>
        </div>
      </div>
    </div>
  );
}
