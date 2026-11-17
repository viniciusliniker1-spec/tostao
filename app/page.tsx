"use client";

import { DataProvider } from "@/lib/store";
import { Shell } from "@/components/Shell";

export default function Page() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
