export const DURATIONS = [
  { id: "1m", label: "K3 1 Min", icon: "🕒" },
  { id: "3m", label: "K3 3 Min", icon: "🕒" },
  { id: "5m", label: "K3 5 Min", icon: "🕒" },
  { id: "10m", label: "K3 10 Min", icon: "🕒" },
];

export const DURATION_SEC = {
  "1m": 60,
  "3m": 180,
  "5m": 300,
  "10m": 600,
};

export const getDurationMeta = (id) => {
  return DURATIONS.find((d) => d.id === id) || DURATIONS[0];
};

export const formatTimer = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return {
    mm: String(m).padStart(2, "0"),
    ss: String(s).padStart(2, "0"),
  };
};

export const MULTIPLIERS = {
  total_3: 207, total_18: 207,
  total_4: 60, total_17: 60,
  total_5: 30, total_16: 30,
  total_6: 18, total_15: 18,
  total_7: 12, total_14: 12,
  total_8: 8, total_13: 8,
  total_9: 6, total_10: 6, total_11: 6, total_12: 6,
  size: 1.96,
  parity: 1.96,
  "3_same_any": 34,
  "3_same_specific": 207,
  "2_same_specific": 13.8,
  "3_seq_any": 10
};

export const BASE_AMOUNTS = [1, 10, 100, 1000];

// betType/betValue here are whatever "My history" actually receives from
// /api/k3/bets/my — the DB's K3BetType enum lowercased, and the normalized
// `selection` string it was stored with (see app/api/k3/[mode]/bet/route.ts
// for exactly how each UI category maps to these). This must match that
// shape, not the frontend's own chip-category names ("total"/"size"/...),
// which are a different vocabulary used only while building the bet sheet.
export const formatBetLabel = (betType, betValue) => {
  const v = String(betValue ?? "").toUpperCase();
  if (betType === "sum_value") return `Sum ${v}`;
  if (betType === "sum_big_small") return v === "BIG" ? "Big" : "Small";
  if (betType === "sum_odd_even") return v === "ODD" ? "Odd" : "Even";
  if (betType === "any_triple") return "Any 3 Same";
  if (betType === "two_same_specific") return `2 Same (${v})`;
  if (betType === "two_same_unique") {
    const [pair, single] = v.split("_");
    return `2 Same + 1 (${pair}${pair}${single ?? ""})`;
  }
  if (betType === "three_same_specific") return `3 Same (${v})`;
  if (betType === "three_different") return `3 Diff (${v})`;
  if (betType === "two_different") return `2 Diff (${v})`;
  if (betType === "three_continuous") return "3 Continuous";
  return v;
};

export const nChooseK = (n, k) => {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res = res * (n - i + 1) / i;
  }
  return res;
};

// Maps the UI's internal chip category names to the bet types the backend
// actually accepts (app/api/k3/[mode]/bet route + lib/actions/k3.ts). Only
// these four categories have real backend/settlement support today.
const CATEGORY_TO_BET_TYPE = {
  total: "sum_value",
  size: "sum_big_small",
  parity: "sum_odd_even",
};

export const calculateK3Combinations = (selectedChips) => {
  const bets = [];

  // Total / Size / Parity
  ['total', 'size', 'parity'].forEach(category => {
    if (selectedChips[category]) {
      selectedChips[category].forEach(val => {
        bets.push({ betType: CATEGORY_TO_BET_TYPE[category], betValue: val, label: formatBetLabel(category, val) });
      });
    }
  });

  // 2 same specific (e.g. 11, 22)
  if (selectedChips["2_same_specific"]) {
    selectedChips["2_same_specific"].forEach(val => {
      bets.push({ betType: "2_same_specific", betValue: val, label: `2 same numbers: ${val}` });
    });
  }

  // 2 same unique (e.g. 11 with 2)
  if (selectedChips["2_same_unique_pair"] && selectedChips["2_same_unique_single"]) {
    selectedChips["2_same_unique_pair"].forEach(pair => {
      selectedChips["2_same_unique_single"].forEach(single => {
        // pair is "11", single is "2". Don't allow "11" and "1".
        if (pair[0] !== single) {
          bets.push({ betType: "2_same_unique", betValue: `${pair}_${single}`, label: `2 same and 1 different: ${pair}[${single}]` });
        }
      });
    });
  }

  // 3 same specific
  if (selectedChips["3_same_specific"]) {
    selectedChips["3_same_specific"].forEach(val => {
      bets.push({ betType: "3_same_specific", betValue: val, label: `3 same numbers: ${val}` });
    });
  }

  // 3 same any -> backend's "any_triple" bet type expects selection "triple"
  if (selectedChips["3_same_any"]) {
    bets.push({ betType: "any_triple", betValue: "triple", label: `Any 3 of the same number: odds` });
  }

  // 3 diff
  if (selectedChips["3_diff"] && selectedChips["3_diff"].length >= 3) {
    // We don't submit individual 3-combos to backend, the backend should accept an array or we send 1 bet for each combo.
    // Wait, generating N bets is easiest.
    const nums = selectedChips["3_diff"].sort();
    for (let i=0; i<nums.length; i++) {
      for (let j=i+1; j<nums.length; j++) {
        for (let k=j+1; k<nums.length; k++) {
          bets.push({ betType: "3_diff", betValue: `${nums[i]}${nums[j]}${nums[k]}`, label: `3 different: ${nums[i]},${nums[j]},${nums[k]}` });
        }
      }
    }
  }

  // 2 diff
  if (selectedChips["2_diff"] && selectedChips["2_diff"].length >= 2) {
    const nums = selectedChips["2_diff"].sort();
    for (let i=0; i<nums.length; i++) {
      for (let j=i+1; j<nums.length; j++) {
        bets.push({ betType: "2_diff", betValue: `${nums[i]}${nums[j]}`, label: `2 different: ${nums[i]},${nums[j]}` });
      }
    }
  }

  // 3 cont
  if (selectedChips["3_cont"]) {
    bets.push({ betType: "3_cont", betValue: "any", label: `Any 3 consecutive numbers` });
  }

  return bets;
};

export const groupK3BetsForDisplay = (selectedChips) => {
  const groups = [];
  
  if (selectedChips["total"]?.length) {
    groups.push({ label: "Total", value: selectedChips["total"].join(", ") });
  }
  if (selectedChips["size"]?.length) {
    groups.push({ label: "Size", value: selectedChips["size"].map(v => v==="big"?"Big":"Small").join(", ") });
  }
  if (selectedChips["parity"]?.length) {
    groups.push({ label: "Parity", value: selectedChips["parity"].map(v => v==="odd"?"Odd":"Even").join(", ") });
  }
  
  if (selectedChips["2_same_specific"]?.length) {
    groups.push({ label: "2 same numbers", value: selectedChips["2_same_specific"].join(", ") });
  }
  if (selectedChips["2_same_unique_pair"]?.length && selectedChips["2_same_unique_single"]?.length) {
    const singles = selectedChips["2_same_unique_single"].join(",");
    const pairs = selectedChips["2_same_unique_pair"].map(p => `${p}[${singles}]`).join(", ");
    groups.push({ label: "2 same and 1 different numbers", value: pairs });
  }
  
  if (selectedChips["3_same_specific"]?.length) {
    groups.push({ label: "3 same numbers", value: selectedChips["3_same_specific"].join(", ") });
  }
  if (selectedChips["3_same_any"]) {
    groups.push({ label: "Any 3 same numbers", value: "Any 3 of the same number: odds" });
  }
  
  if (selectedChips["3_diff"]?.length >= 3) {
    groups.push({ label: "3 different numbers", value: selectedChips["3_diff"].join(", ") });
  }
  if (selectedChips["3_cont"]) {
    groups.push({ label: "Any 3 consecutive numbers", value: "Any 3 consecutive numbers" });
  }
  if (selectedChips["2_diff"]?.length >= 2) {
    groups.push({ label: "2 different numbers", value: selectedChips["2_diff"].join(", ") });
  }

  return groups;
};

export const getBetTheme = (betType, betValue) => {
  if (betType === "size" && betValue === "big") return "orange";
  if (betType === "size" && betValue === "small") return "blue";
  if (betType === "parity" && betValue === "odd") return "green";
  if (betType === "parity" && betValue === "even") return "red";
  if (betType === "total") return "violet";
  return "indigo";
};
