import type { Tables } from "@/integrations/supabase/types";

export type PricingItem = Tables<"pricing_items">;
export type PricingRegion = "irbid" | "amman" | "both";
export type PricingLanguage = "ar" | "en";

export const pricingQueryKey = ["pricing-items"] as const;
export const PRICING_CHANNEL = "ah-pricing-updates";

import { Smartphone, Film, MonitorPlay, Clapperboard, Mic, Scissors, Calendar } from "lucide-react";
import React from "react";

export const pricingSections = [
  { key: "reels", icon: <Smartphone />, ar: "ريلز انستاجرام", en: "Instagram Reels" },
  { key: "films", icon: <Film />, ar: "أفلام قصيرة", en: "Short Films" },
  { key: "commercials", icon: <MonitorPlay />, ar: "إعلانات", en: "Commercials" },
  { key: "docs", icon: <Clapperboard />, ar: "وثائقيات", en: "Documentaries" },
  { key: "events", icon: <Mic />, ar: "إيفنتات / بودكاست", en: "Events / Podcast" },
  { key: "editing", icon: <Scissors />, ar: "مونتاج وتلوين", en: "Editing & Color" },
  { key: "dayrate", icon: <Calendar />, ar: "اليومية", en: "Day Rate" },
];

export function formatPricingAmount(item: PricingItem) {
  if (item.price_min != null) {
    const min = Number(item.price_min).toLocaleString("en-US");
    if (item.price_max != null && Number(item.price_max) !== Number(item.price_min)) {
      return `${min}–${Number(item.price_max).toLocaleString("en-US")}`;
    }
    return min;
  }
  return item.price_text || "حسب المشروع";
}

export function regionLabel(region: PricingRegion, language: PricingLanguage) {
  if (region === "amman") return language === "ar" ? "عمّان" : "Amman";
  if (region === "irbid") return language === "ar" ? "إربد" : "Irbid";
  return language === "ar" ? "المنطقتان" : "Both regions";
}