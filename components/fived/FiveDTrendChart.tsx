"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import "./FiveDTrendChart.css";

interface GameResult {
  periodId: string;
  resultNumber: string; // "12345"
}

interface FiveDTrendChartProps {
  results: GameResult[];
}

const TABS = ["A", "B", "C", "D", "E"];

export default function FiveDTrendChart({ results }: FiveDTrendChartProps) {
  const [activeTab, setActiveTab] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineCoordinates, setLineCoordinates] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  // Reverse results to show oldest at top, newest at bottom, or keep it newest at top?
  // Usually trend charts show oldest at top, newest at bottom to draw the line flowing down.
  // Wait, standard charts often show newest at top (like history).
  // The first photo shows period IDs descending (newest at top).
  const sortedResults = useMemo(() => {
    // Sort descending by periodId (newest first)
    return [...results].sort((a, b) => b.periodId.localeCompare(a.periodId)).slice(0, 30);
  }, [results]);

  // Extract the specific digit for the active tab for each result
  // If resultNumber is "52341", activeTab=0 -> '5' (number)
  const tabResults = useMemo(() => {
    return sortedResults.map((r) => {
      const digit = r.resultNumber && r.resultNumber.length === 5 
        ? parseInt(r.resultNumber[activeTab], 10) 
        : -1;
      return { ...r, digit };
    });
  }, [sortedResults, activeTab]);

  // Calculate stats
  // Missing: the number of rows since the digit last appeared (top down)
  // Avg missing: average gap
  // Frequency: total times appeared
  // Max consecutive: max consecutive times appeared
  const stats = useMemo(() => {
    const s = Array.from({ length: 10 }, () => ({
      missing: 0,
      avgMissing: 0,
      frequency: 0,
      maxConsecutive: 0,
      currentConsecutive: 0,
      gaps: [] as number[],
      lastSeenAt: -1,
    }));

    // Calculate from bottom (oldest) to top (newest) to get correct current missing
    const reversed = [...tabResults].reverse();
    
    reversed.forEach((r, rowIndex) => {
      if (r.digit === -1) return;
      for (let i = 0; i < 10; i++) {
        if (i === r.digit) {
          s[i].frequency += 1;
          s[i].currentConsecutive += 1;
          if (s[i].currentConsecutive > s[i].maxConsecutive) {
            s[i].maxConsecutive = s[i].currentConsecutive;
          }
          if (s[i].lastSeenAt !== -1) {
            s[i].gaps.push(rowIndex - s[i].lastSeenAt - 1);
          } else {
            s[i].gaps.push(rowIndex);
          }
          s[i].lastSeenAt = rowIndex;
        } else {
          s[i].currentConsecutive = 0;
        }
      }
    });

    const totalRows = reversed.length;
    for (let i = 0; i < 10; i++) {
      s[i].missing = totalRows - 1 - s[i].lastSeenAt;
      if (s[i].lastSeenAt === -1) s[i].missing = totalRows;
      
      const sumGaps = s[i].gaps.reduce((acc, val) => acc + val, 0);
      s[i].avgMissing = s[i].gaps.length > 0 ? Math.floor(sumGaps / s[i].gaps.length) : totalRows;
    }

    return s;
  }, [tabResults]);

  // Draw lines
  useEffect(() => {
    const updateLines = () => {
      if (!containerRef.current) return;
      const elements = containerRef.current.querySelectorAll('.fdt-hit-circle');
      if (elements.length < 2) {
        setLineCoordinates([]);
        return;
      }

      const newCoords = [];
      for (let i = 0; i < elements.length - 1; i++) {
        const el1 = elements[i] as HTMLElement;
        const el2 = elements[i + 1] as HTMLElement;
        
        const parentRect = containerRef.current.getBoundingClientRect();
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();

        const x1 = rect1.left - parentRect.left + rect1.width / 2;
        const y1 = rect1.top - parentRect.top + rect1.height / 2;
        const x2 = rect2.left - parentRect.left + rect2.width / 2;
        const y2 = rect2.top - parentRect.top + rect2.height / 2;

        newCoords.push({ x1, y1, x2, y2 });
      }
      setLineCoordinates(newCoords);
    };

    updateLines();
    window.addEventListener('resize', updateLines);
    return () => window.removeEventListener('resize', updateLines);
  }, [tabResults, activeTab]);

  return (
    <div className="fdt-container">
      <div className="fdt-tabs">
        {TABS.map((tab, idx) => (
          <button
            key={tab}
            className={`fdt-tab ${activeTab === idx ? "active" : ""}`}
            onClick={() => setActiveTab(idx)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="fdt-chart-wrapper" ref={containerRef}>
        <div className="fdt-header">
          <div className="fdt-period-col">Period</div>
          <div className="fdt-numbers-col">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <div key={num} className="fdt-num-header">{num}</div>
            ))}
          </div>
        </div>

        <div className="fdt-body">
          {tabResults.map((r, rowIndex) => (
            <div key={r.periodId} className="fdt-row">
              <div className="fdt-period-val">{r.periodId.slice(-6)}</div>
              <div className="fdt-numbers-row">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                  const isHit = num === r.digit;
                  return (
                    <div key={num} className="fdt-cell">
                      {isHit ? (
                        <div className="fdt-hit-circle">{num}</div>
                      ) : (
                        <span className="fdt-miss-val">
                          {/* Calculate how many rows since this number appeared looking UPWARDS from current row? 
                              Usually the grid shows the current missing value AT THAT TIME.
                              But a simpler implementation just shows empty for non-hits or the actual number.
                              Actually, standard charts just show the missing gap at that exact point in time.
                              For simplicity, we can show the number if it's not a hit, or empty.
                              Let's show the missing count at that row. */}
                          {/* We will leave it blank or show missing count. Let's show empty for a cleaner look. */}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* SVG Line Overlay */}
        <svg className="fdt-svg-overlay">
          {lineCoordinates.map((c, i) => (
            <line
              key={i}
              x1={c.x1}
              y1={c.y1}
              x2={c.x2}
              y2={c.y2}
              stroke="#F05E60"
              strokeWidth="2"
            />
          ))}
        </svg>

        <div className="fdt-stats">
          <div className="fdt-stats-row">
            <div className="fdt-stats-label">Missing</div>
            <div className="fdt-numbers-row">
              {stats.map((s, i) => <div key={i} className="fdt-cell">{s.missing}</div>)}
            </div>
          </div>
          <div className="fdt-stats-row">
            <div className="fdt-stats-label">Avg missing</div>
            <div className="fdt-numbers-row">
              {stats.map((s, i) => <div key={i} className="fdt-cell">{s.avgMissing}</div>)}
            </div>
          </div>
          <div className="fdt-stats-row">
            <div className="fdt-stats-label">Frequency</div>
            <div className="fdt-numbers-row">
              {stats.map((s, i) => <div key={i} className="fdt-cell">{s.frequency}</div>)}
            </div>
          </div>
          <div className="fdt-stats-row">
            <div className="fdt-stats-label">Max consecutive</div>
            <div className="fdt-numbers-row">
              {stats.map((s, i) => <div key={i} className="fdt-cell">{s.maxConsecutive}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
