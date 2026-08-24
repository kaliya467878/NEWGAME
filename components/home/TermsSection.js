"use client";

import { useToasts } from "@/components/ui/Toast";
import { ChevronRight } from "lucide-react";

export default function TermsSection() {
  const { push: pushToast } = useToasts();

  const handleAddToDesktop = () => {
    pushToast({
      title: "Add to Desktop",
      message: "To add LuckyNova to your desktop, click the Share button in your browser and select 'Add to Home Screen'.",
      variant: "success" });
  };

  return (
    <section className="terms-premium-section-flat">
      {/* Lobby Buttons */}
      <div className="terms-flat-header-buttons">
        <div className="badge-btn-round age-18">+18</div>
      </div>

      {/* Lobby Description Text customized for LuckyNova */}
      <div className="terms-flat-content">
        <ul className="terms-flat-list-v2">
          <li>
            <ChevronRight className="w-4 h-4 text-gold mt-1 shrink-0" />
            <span>The platform advocates fairness, justice, and openness. We mainly operate fair lottery, blockchain games, live casinos, and slot machine games.</span>
          </li>
          <li>
            <ChevronRight className="w-4 h-4 text-gold mt-1 shrink-0" />
            <span>LuckyNova works with more than 10,000 online live game dealers and slot games, all of which are verified fair games.</span>
          </li>
          <li>
            <ChevronRight className="w-4 h-4 text-gold mt-1 shrink-0" />
            <span>LuckyNova supports fast deposit and withdrawal, and looks forward to your visit.</span>
          </li>
        </ul>

        <div className="terms-flat-warning-text-v2">
          <p className="warning-addiction">Gambling can be addictive, please play rationally.</p>
          <p className="warning-age-limit">LuckyNova only accepts customers above the age of 18.</p>
        </div>


      </div>
    </section>
  );
}