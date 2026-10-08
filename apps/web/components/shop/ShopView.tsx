"use client";

import { useEffect } from "react";
import { track, type TrackName } from "@/lib/track";

/** Événement analytics de consultation (SHOP_VIEW, PRODUCT_VIEW). */
export function ShopView({ event, product }: { event: Extract<TrackName, "shop_view" | "product_view">; product?: string }) {
  useEffect(() => {
    track(event, product ? { product } : undefined);
  }, [event, product]);
  return null;
}
