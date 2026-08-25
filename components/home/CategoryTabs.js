"use client";

const CATEGORIES = [
  { id: "all", label: "All Games", icon: "clover" },
  { id: "lottery", label: "Lottery", icon: "ball" },
  { id: "slots", label: "Slots", icon: "slots" },
  { id: "live", label: "Live Casino", icon: "dealer" },
  { id: "sports", label: "Sports", icon: "sports" },
  { id: "mini", label: "Mini Games", icon: "controller" },
];

const renderCategoryIcon = (iconName) => {
  const svgProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "category-svg",
    style: { width: "24px", height: "24px" }
  };

  switch (iconName) {
    case "clover":
      // Grid/All
      return (
        <svg {...svgProps}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "ball":
      // Lottery Ticket
      return (
        <svg {...svgProps}>
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 9v6" />
        </svg>
      );
    case "slots":
      // Slots / Arcade
      return (
        <svg {...svgProps}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M4 8h16M4 14h16" />
          <circle cx="12" cy="18" r="1.5" fill="currentColor" />
          <path d="M8 11h.01M12 11h.01M16 11h.01" />
        </svg>
      );
    case "dealer":
      // Live Casino / Spades / Cards
      return (
        <svg {...svgProps}>
          <rect x="2" y="5" width="16" height="16" rx="2" />
          <path d="M22 10v9a2 2 0 0 1-2 2h-2" />
          <path d="M8 9h.01M8 17h.01M12 13h.01" />
        </svg>
      );
    case "sports":
      // Sports / Ball
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20" />
          <path d="M2 12a14.5 14.5 0 0 0 20 0" />
        </svg>
      );
    case "controller":
      // Mini Games / Gamepad
      return (
        <svg {...svgProps}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 12h4M8 10v4M15 13h.01M18 11h.01" />
        </svg>
      );
    default:
      return null;
  }
};

export default function CategoryTabs({ active, onChange }) {
  return (
    <div className="club-categories">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`club-category-tab ${active === cat.id ? "active" : ""}`}
          onClick={() => onChange(cat.id)}
        >
          <span className="club-category-icon-wrap">
            {renderCategoryIcon(cat.icon)}
          </span>

          <span className="club-category-label">
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  );
}
