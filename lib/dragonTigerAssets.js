export const DT_ASSETS = {
  art: {
    stageBg: "/design/dragon-tiger/stage-bg.png",
    cardBackPng: "/design/dragon-tiger/cards/back.png",
    cardBackSvg: "/design/dragon-tiger/cards/back.svg",
    tieEmblem: "/design/dragon-tiger/tie-emblem.png",
    dragonEmblem: "/design/dragon-tiger/dragon-emblem.png",
    tigerEmblem: "/design/dragon-tiger/tiger-emblem.png",
    tableRim: "/design/dragon-tiger/table-rim.png",
    dealer: "/design/dragon-tiger/dealer.png",
    tile: "/design/dragon-tiger/tile.png",
  },
  icons: {
    clock: "/design/dragon-tiger/icons/clock.svg",
    plus: "/design/dragon-tiger/icons/plus.svg",
    globe: "/design/dragon-tiger/icons/globe.svg",
    sound: "/design/dragon-tiger/icons/sound.svg",
  },
  zones: {
    dragon: "/design/dragon-tiger/zones/dragon.svg",
    tiger: "/design/dragon-tiger/zones/tiger.svg",
    tie: "/design/dragon-tiger/zones/tie.svg",
  },
};

export function dtCardSrc(rank, suit) {
  if (!rank || !suit) return "/design/dragon-tiger/cards/back.png";
  const r = String(rank).trim().toUpperCase();
  const s = String(suit).trim().toUpperCase();
  return `/design/dragon-tiger/cards/${r}${s}.svg`;
}

export function dtChipSrc(val) {
  return `/design/dragon-tiger/chips/chip-${val}.svg`;
}

export function dtHistorySrc(outcome) {
  const o = String(outcome || "").toLowerCase();
  if (o === "tie") return "/design/dragon-tiger/history/tie.svg";
  if (o === "dragon") return "/design/dragon-tiger/history/d.svg";
  if (o === "tiger") return "/design/dragon-tiger/history/t.svg";
  return "/design/dragon-tiger/history/d.svg";
}
