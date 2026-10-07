"use client";

import { useEffect } from "react";
import { track, type TrackName } from "@/lib/track";

/** Événement analytics de consultation (EVENT_VIEW, WAR_VIEW, RANKING_VIEW, MAP_VIEW, EMPIRE_VIEW…). */
export function TrackView({ name, id }: { name: TrackName; id?: string }) {
  useEffect(() => {
    track(name, id ? { id } : undefined);
  }, [name, id]);
  return null;
}
