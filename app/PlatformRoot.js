"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MaintenanceBanner from "@/components/platform/MaintenanceBanner";
import { PlatformStatusProvider } from "@/components/platform/PlatformStatusProvider";
import RechargePopupWrapper from "@/components/platform/RechargePopupWrapper";

export default function PlatformRoot({ children }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <PlatformStatusProvider>
        <MaintenanceBanner />
        <RechargePopupWrapper>{children}</RechargePopupWrapper>
      </PlatformStatusProvider>
    </QueryClientProvider>
  );
}
