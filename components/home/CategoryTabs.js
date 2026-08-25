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
      // Lottery (Gift)
      return (
        <svg {...svgProps}>
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M12 8v13" />
          <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
        </svg>
      );
    case "slots":
      // Slots (Crown)
      return (
        <svg {...svgProps}>
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
        </svg>
      );
    case "dealer":
      // Live Casino (Casino Chip)
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
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
