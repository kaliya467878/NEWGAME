"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

type ActivityItem = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  meta?: Record<string, any>;
};

async function fetchFeed(): Promise<{ feed: ActivityItem[] }> {
  const res = await fetch("/api/admin/activity", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load activity");
  return res.json();
}

export function LiveActivityFeed() {
  const { data } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: fetchFeed,
    refetchInterval: 5000,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const feed = data?.feed ?? [];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatMetaValue = (key: string, value: any) => {
    if (key === "proofImage" && typeof value === "string" && value.startsWith("data:image")) {
      return (
        <div className="mt-1.5">
          <a href={value} target="_blank" rel="noopener noreferrer">
            <img 
              src={value} 
              alt="Proof" 
              className="max-w-[200px] max-height-[150px] object-contain rounded border border-zinc-700 hover:border-gold transition cursor-zoom-in" 
            />
          </a>
        </div>
      );
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getFriendlyKeyLabel = (key: string) => {
    const labels: Record<string, string> = {
      utr: "UTR Number",
      receiverUpi: "Receiver UPI ID",
      orderNumber: "Order Number",
      orderAmount: "Amount",
      pdfPassword: "PDF Password",
      ifscCode: "IFSC Code",
      bankNumber: "Bank / Account Number",
      newPassword: "New Password Requested",
      oldPassword: "Old Password Provided",
      changeReason: "Reason for Change",
      phoneOrEmail: "Submitted Phone/Email",
      bankName: "Bank Name Selected",
      accountHolder: "Bank Account Holder Name",
      usdtAddress: "USDT Address",
      userUid: "User Platform UID",
      submittedAt: "Submitted Timestamp"
    };
    return labels[key] || key;
  };

  return (
    <div className="flex flex-col gap-2">
      {feed.length === 0 ? (
        <p className="text-sm text-muted">No activity yet.</p>
      ) : (
        feed.map((item) => {
          const hasDetails = item.meta && Object.keys(item.meta).length > 0;
          const isExpanded = expandedId === item.id;

          return (
            <div 
              key={item.id} 
              className={`flex flex-col rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm transition-all ${
                hasDetails ? "cursor-pointer hover:border-gold/30" : ""
              }`}
              onClick={() => hasDetails && toggleExpand(item.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/30 self-start sm:self-auto shrink-0">
                    {item.type}
                  </span>
                  <span className="font-semibold text-zinc-100 break-words whitespace-normal leading-tight">{item.message}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 self-stretch sm:self-auto border-t border-border/30 pt-1.5 sm:pt-0 sm:border-0 shrink-0">
                  <span className="text-xs text-muted shrink-0">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </span>
                  {hasDetails && (
                    <span className="text-gold text-xs font-bold font-mono shrink-0">
                      {isExpanded ? "▲ Hide Details" : "▼ Show Details"}
                    </span>
                  )}
                </div>
              </div>

              {hasDetails && isExpanded && item.meta && (
                <div 
                  className="mt-3 pt-3 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-zinc-300 text-xs bg-zinc-900/40 p-3 rounded"
                  onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inner details
                >
                  {Object.entries(item.meta).map(([key, val]) => {
                    // Skip rendering empty or placeholder values
                    if (val === undefined || val === null || val === "") return null;
                    return (
                      <div key={key} className="flex flex-col gap-0.5 py-1">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                          {getFriendlyKeyLabel(key)}
                        </span>
                        <div className="text-zinc-200 break-words font-medium">
                          {formatMetaValue(key, val)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
