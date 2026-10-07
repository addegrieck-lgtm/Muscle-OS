"use client";

import { BRAND } from "@vaeloria/config";
import { CopyIpButton } from "@vaeloria/ui/client";
import { track } from "@/lib/track";

export function CopyIp({ className, compact }: { className?: string; compact?: boolean }) {
  return <CopyIpButton ip={BRAND.serverIp} className={className} compact={compact} onCopied={() => track("copy_ip")} />;
}
