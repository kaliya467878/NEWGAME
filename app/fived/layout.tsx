import "./fived.css";

export const metadata = {
  title: "5D Lottery - LuckyNova",
  description: "Play 5D Lottery on LuckyNova",
};

export default function FiveDLayout({ children }: { children: React.ReactNode }) {
  return <div className="fived-layout">{children}</div>;
}
