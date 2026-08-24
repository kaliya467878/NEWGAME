"use client";

import { useCallback, useRef, useState } from "react";
import clsx from "clsx";
import { CheckCircle, XCircle } from "lucide-react";

export type ToastItem = { id: number; message: string; type: "success" | "error" };

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((message: string, type: ToastItem["type"] = "success", duration: number = 2500) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, duration);
  }, []);

  return { toasts, push };
}

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center px-4 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "toast-in w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 shadow-lg",
            t.type === "success" ? "bg-gold text-black" : "bg-red text-[var(--theme-text)]"
          )}
        >
          {t.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
