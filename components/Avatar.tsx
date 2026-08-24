const PALETTE = ["#e6c260", "#1ec78a", "#9b6bf5", "#ef4560", "#4aa8f0"];

function colorFromSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({
  seed,
  name,
  size = 40,
}: {
  seed: string;
  name: string;
  size?: number;
}) {
  const bg = colorFromSeed(seed);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-black shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
