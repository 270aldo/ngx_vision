"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RefreshClient({
  shareId,
  active,
}: {
  shareId: string;
  active: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    // Poll every 5 seconds for video generation updates
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [active, shareId, router]);

  return null;
}
