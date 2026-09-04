import { BlackjackGameScreen } from "@/components/casino/blackjack/BlackjackGameScreen";

export const metadata = {
  title: "Blackjack Live | OCEAN 7",
  description: "Live Blackjack table game with standard 52-card deck, Hit, Stand, Double Down, Split.",
};

export default function BlackjackPage() {
  return <BlackjackGameScreen />;
}
