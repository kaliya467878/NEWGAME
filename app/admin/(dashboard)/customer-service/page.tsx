import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/permissions";
import { format } from "date-fns";
import { resolveSupportIssueAction } from "@/lib/actions/admin";
import { getAdminPathPrefix } from "@/lib/admin/path";
import { DeleteSupportTicketButton } from "./DeleteSupportTicketButton";
import Link from "next/link";
import clsx from "clsx";

export default async function CustomerServicePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; type?: string; sort?: string }>;
}) {
  const staff = await requirePermission("users.view");
  const { q = "", tab = "pending", type = "all", sort = "desc" } = await searchParams;

  // Retrieve top 500 support issue activity feed records to filter
  const allIssues = await prisma.activityFeed.findMany({
    where: { type: "SUPPORT_ISSUE" },
    orderBy: { createdAt: sort === "asc" ? "asc" : "desc" },
    take: 500,
  });

  const notedUsers = await prisma.user.findMany({
    where: { adminNote: { not: null } },
    select: { uid: true, adminNote: true }
  });
  const notedUsersMap: Record<string, string> = {};
  notedUsers.forEach((u) => {
    notedUsersMap[String(u.uid)] = u.adminNote!;
  });

  const queryLower = q.trim().toLowerCase();

  // Filter in-memory to be DB-agnostic (handles JSON structures cleanly across Neon/Postgres and SQLite)
  const processedIssues = allIssues.map((issue) => {
    let meta: any = {};
    try {
      meta = typeof issue.meta === "object" && issue.meta !== null ? issue.meta : JSON.parse(issue.meta as string || "{}");
    } catch {}

    if (!meta || typeof meta !== "object") {
      meta = {};
    }

    const isResolved = Boolean(meta.resolved);
    const userUid = String(meta.userUid || "");
    const phone = String(meta.phone || meta.phoneOrEmail || "");
    const email = String(meta.email || "");
    const displayName = String(meta.displayName || "");
    const utr = String(meta.utr || "");
    const orderNumber = String(meta.orderNumber || "");

    const title = issue.message.replace("[Self Service] User submitted issue: ", "") || "Support Query";

    const matchQuery =
      !queryLower ||
      userUid.toLowerCase().includes(queryLower) ||
      phone.toLowerCase().includes(queryLower) ||
      email.toLowerCase().includes(queryLower) ||
      displayName.toLowerCase().includes(queryLower) ||
      utr.toLowerCase().includes(queryLower) ||
      orderNumber.toLowerCase().includes(queryLower) ||
      issue.message.toLowerCase().includes(queryLower);

    const userAdminNote = notedUsersMap[userUid] || null;

    return {
      id: issue.id,
      message: issue.message,
      createdAt: issue.createdAt,
      meta,
      isResolved,
      userUid,
      phone,
      displayName,
      title,
      userAdminNote,
      matchQuery,
    };
  });

  const getTicketCategory = (title: string) => {
    const t = String(title || "").toLowerCase();
    if (t.includes("deposit")) return "recharge";
    if (t.includes("withdraw")) return "withdraw";
    if (t.includes("password")) return "password";
    if (t.includes("usdt")) return "usdt";
    if (t.includes("upi") || t.includes("ifsc") || t.includes("bank")) return "bank_upi";
    return "other";
  };

  // Filter based on active tab, category & query search
  const filteredIssues = processedIssues.filter((issue) => {
    if (type && type !== "all") {
      const cat = getTicketCategory(issue.title);
      if (cat !== type) return false;
    }
    return issue.matchQuery && (tab === "resolved" ? issue.isResolved : !issue.isResolved);
  });

  const pendingCount = processedIssues.filter((i) => !i.isResolved).length;
  const resolvedCount = processedIssues.filter((i) => i.isResolved).length;

  const prefix = getAdminPathPrefix();

  const getFilterUrl = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (q) params.set("q", q);
    if (type && type !== "all") params.set("type", type);
    if (sort && sort !== "desc") params.set("sort", sort);

    Object.entries(overrides).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const queryStr = params.toString();
    return queryStr ? `?${queryStr}` : "?";
  };

  const getFriendlyKeyLabel = (key: string) => {
    const labels: Record<string, string> = {
      utr: "UTR Number",
      receiverUpi: "Receiver UPI ID",
      orderNumber: "Order Number",
      orderAmount: "Amount",
      pdfPassword: "PDF Password",
      ifscCode: "IFSC Code",
      bankNumber: "Bank Account Number",
      newPassword: "New Password",
      oldPassword: "Old Password",
      changeReason: "Reason for Change",
      phoneOrEmail: "Phone / Email",
      bankName: "Bank Name",
      accountHolder: "Account Holder Name",
      usdtAddress: "USDT Address",
      oldUpiId: "Old UPI ID",
      oldUpiName: "Old UPI Name",
      newUpiId: "New UPI ID",
      newUpiName: "New UPI Name",
      manualBankName: "Manual Bank Name",
    };
    return labels[key] || key;
  };

  const getTicketColor = (title: string) => {
    const t = String(title || "").toLowerCase();
    if (t.includes("deposit")) return "border-green/30 bg-green/5 text-green-400";
    if (t.includes("withdraw")) return "border-red/30 bg-red/5 text-red-400";
    if (t.includes("password")) return "border-purple-500/30 bg-purple-500/5 text-purple-400";
    return "border-gold/30 bg-gold/5 text-gold";
  };

  return (
    <div className="flex flex-col gap-6 text-foreground text-left">
      <div>
        <h1 className="text-2xl font-bold text-[var(--theme-text)] tracking-tight">Customer Service (ग्राहक सेवा सहायता)</h1>
        <p className="text-sm text-muted mt-1">Review, resolve and manage self-service complaints submitted by users.</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3 flex-wrap gap-4">
        <div className="flex gap-2">
          <Link
            href={getFilterUrl({ tab: "pending" })}
            className={clsx(
              "px-4 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-2",
              tab === "pending"
                ? "bg-gold/10 border-gold text-gold font-bold shadow-md shadow-gold/5"
                : "border-transparent text-muted hover:text-[var(--theme-text)]"
            )}
          >
            ❌ Active Pending ({pendingCount})
          </Link>
          <Link
            href={getFilterUrl({ tab: "resolved" })}
            className={clsx(
              "px-4 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-2",
              tab === "resolved"
                ? "bg-green/10 border-green text-green font-bold shadow-md shadow-green/5"
                : "border-transparent text-muted hover:text-green-400"
            )}
          >
            ✅ Resolved Issues ({resolvedCount})
          </Link>
        </div>

        {/* Search Field */}
        <form method="get" className="flex items-center gap-2 w-full max-w-sm">
          <input type="hidden" name="tab" value={tab} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="sort" value={sort} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search UID, Phone, UTR, Name..."
            className="flex-1 bg-surface-2 border border-border px-3 py-1.5 rounded-lg text-xs outline-none focus:border-gold/50 text-[var(--theme-text)] font-medium"
          />
          {q && (
            <Link
              href={getFilterUrl({ q: null })}
              className="text-xs text-muted hover:text-[var(--theme-text)] border border-border bg-surface-2 px-2.5 py-1.5 rounded-lg transition"
            >
              Clear
            </Link>
          )}
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-[var(--theme-text)] font-semibold text-xs px-3 py-1.5 rounded-lg shadow transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {/* Filters bar */}
      <div className="bg-surface-1 border border-border/60 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Categories list */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted uppercase font-bold tracking-wider mr-2">Filter category:</span>
          {[
            { key: "all", label: "All Problems (सभी)" },
            { key: "recharge", label: "Recharge (रिचार्ज)" },
            { key: "withdraw", label: "Withdrawal (निकासी)" },
            { key: "password", label: "Password (पासवर्ड)" },
            { key: "bank_upi", label: "Bank/UPI" },
            { key: "usdt", label: "USDT" },
          ].map((cat) => {
            const active = type === cat.key;
            return (
              <Link
                key={cat.key}
                href={getFilterUrl({ type: cat.key === "all" ? null : cat.key })}
                className={clsx(
                  "px-3 py-1.5 text-xs rounded-lg transition-all border font-medium",
                  active
                    ? "bg-gold/10 border-gold/60 text-gold font-semibold"
                    : "border-border/60 bg-surface-2/40 text-muted hover:text-[var(--theme-text)] hover:border-border"
                )}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>

        {/* Sort direction controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted uppercase font-bold tracking-wider mr-1">Sort order:</span>
          {[
            { key: "desc", label: "🆕 New First" },
            { key: "asc", label: "⏳ Old First" },
          ].map((opt) => {
            const active = sort === opt.key;
            return (
              <Link
                key={opt.key}
                href={getFilterUrl({ sort: opt.key === "desc" ? null : opt.key })}
                className={clsx(
                  "px-3 py-1.5 text-xs rounded-lg transition-all border font-medium flex items-center gap-1",
                  active
                    ? "bg-gold/10 border-gold/60 text-gold font-semibold"
                    : "border-border/60 bg-surface-2/40 text-muted hover:text-[var(--theme-text)] hover:border-border"
                )}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="bg-surface-2/30 border border-dashed border-border/80 rounded-2xl p-12 text-center">
          <p className="text-sm text-muted">No customer service tickets found matching your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredIssues.map((issue) => {
            const meta = issue.meta && typeof issue.meta === "object" ? issue.meta : {};
            const title = issue.title;
            const proof = meta.proofImage;
            const hasProof = typeof proof === "string" && proof.startsWith("data:image");

            // Extract detail values excluding system metadata keys
            const detailEntries = Object.entries(meta).filter(
              ([key]) =>
                ![
                  "formTitle",
                  "resolved",
                  "resolvedById",
                  "resolvedByName",
                  "resolvedAt",
                  "proofImage",
                  "displayName",
                  "userUid",
                  "phone",
                  "email",
                  "submittedAt",
                ].includes(key)
            );

            return (
              <div
                key={issue.id}
                className="bg-surface-1 border border-border/70 rounded-2xl p-5 shadow-xl flex flex-col justify-between gap-4 hover:border-gold/20 transition duration-300"
              >
                <div className="flex flex-col gap-3">
                  {/* Header: Title & Timestamp */}
                  <div className="flex justify-between items-start gap-4 border-b border-border/40 pb-3 flex-wrap">
                    <span className={clsx("text-xs font-bold px-3 py-1 rounded-full border tracking-wide uppercase", getTicketColor(title))}>
                      {title}
                    </span>
                    <span className="text-[11px] text-muted font-mono font-medium">
                      {(() => {
                        try {
                          return format(new Date(issue.createdAt), "d MMM yyyy, h:mm a");
                        } catch {
                          return "—";
                        }
                      })()}
                    </span>
                  </div>

                  {/* Player Profiler Info */}
                  <div className="bg-surface-2/60 border border-border/40 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">User Name</span>
                      <span className="text-zinc-100 font-semibold text-sm">{issue.displayName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Phone / Contact</span>
                      <span className="text-zinc-300 font-mono select-all">{issue.phone || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">User UID</span>
                      {issue.userUid !== "GUEST" ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-gold font-bold font-mono text-sm select-all">{issue.userUid}</span>
                          {issue.userAdminNote && (
                            <span className="text-[9px] font-extrabold text-red bg-red/10 border border-red/40 px-1 py-0.5 rounded animate-pulse">{issue.userAdminNote}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted font-semibold">GUEST</span>
                      )}
                    </div>
                  </div>

                  {/* Form Details Grid */}
                  <div className="flex flex-col gap-1.5 text-xs">
                    <p className="text-[10px] text-gold/80 uppercase font-bold tracking-wider mb-0.5">Submitted Details:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 bg-surface-2/30 border border-border/40 rounded-xl p-3.5">
                      {detailEntries.length === 0 ? (
                        <span className="text-muted text-xs col-span-2">No custom form variables submitted.</span>
                      ) : (
                        detailEntries.map(([key, value]) => {
                          if (!value) return null;
                          return (
                            <div key={key} className="flex flex-col gap-0.5 border-b border-border/20 sm:border-0 pb-1.5 sm:pb-0">
                              <span className="text-[10px] text-muted font-semibold uppercase">{getFriendlyKeyLabel(key)}</span>
                              <span className="text-zinc-100 font-mono select-all break-all">{String(value)}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Proof Image Box */}
                  {hasProof && (
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Proof Image (पेमेंट स्क्रीनशॉट):</span>
                      <div className="relative mt-1 self-start group">
                        <a href={proof} target="_blank" rel="noopener noreferrer">
                          <img
                            src={proof}
                            alt="Payment Proof Screen"
                            className="max-w-[280px] max-h-[200px] object-contain rounded-xl border border-border bg-surface-2 cursor-zoom-in group-hover:border-gold/50 transition duration-300 shadow-md"
                          />
                        </a>
                        <span className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[9px] text-zinc-300 opacity-0 group-hover:opacity-100 transition duration-300">
                          Click to zoom 🔍
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Resolution Audit Trail */}
                  {issue.isResolved && (
                    <div className="bg-green/5 border border-green/20 rounded-xl p-3 text-xs flex flex-col gap-0.5 text-green-400/90 font-medium">
                      <p className="text-[10px] font-bold text-green uppercase tracking-wider">Resolved Details:</p>
                      <p>Resolved by: <span className="text-[var(--theme-text)] font-bold">{meta.resolvedByName}</span></p>
                      <p>Resolved at: <span className="font-mono text-[var(--theme-text)]">
                        {(() => {
                          try {
                            return meta.resolvedAt ? format(new Date(meta.resolvedAt), "d MMM yyyy, h:mm a") : "—";
                          } catch {
                            return "—";
                          }
                        })()}
                      </span></p>
                    </div>
                  )}
                </div>

                {/* Operations Actions Footer */}
                <div className="flex justify-end items-center gap-3 border-t border-border/40 pt-4 flex-wrap mt-2">
                  {!issue.isResolved && (
                    <form action={resolveSupportIssueAction}>
                      <input type="hidden" name="id" value={issue.id} />
                      <button
                        type="submit"
                        className="bg-green hover:bg-green-600 text-[var(--theme-text)] font-bold text-xs px-4 py-2 rounded-xl shadow-lg transition duration-200"
                      >
                        ✓ Mark Resolved (सुलझ गया)
                      </button>
                    </form>
                  )}
                  <DeleteSupportTicketButton id={issue.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
