import Link from "next/link";

export function DailyBonusButton({ count }: { count: number }) {
  return (
    <Link href="/rewards" className="relative" aria-label="Daily bonus">
      <span className="text-xl">🎁</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red text-[var(--theme-text)] text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
