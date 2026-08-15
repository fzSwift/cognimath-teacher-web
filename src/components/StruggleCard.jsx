import React from "react";
import { conceptLabel } from "../demo";

export default function StruggleCard({ rows }) {
  if (!rows || !rows.length) {
    return (
      <div className="card">
        <div className="card-title">Who needs a look</div>
        <p className="empty">Nothing flagged yet. Missed questions show up here with the students’ names.</p>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-title">Who needs a look</div>
      {rows.map(r => {
        const pct = Math.round(r.rate * 100);
        const cls = pct >= 40 ? "hot" : pct >= 25 ? "warm" : "cool";
        const barColor = cls === "hot" ? "#D9483A" : cls === "warm" ? "#F0B429" : "#1F9D6E";
        return (
          <div key={r.key} className="str-row">
            <div className="str-top">
              <span className="str-label">{conceptLabel(r.key)}</span>
              <span className="str-tags">
                {r.live && <span className="pill pill-live">live</span>}
                <span className={`pill pill-${cls}`}>{pct}% missed</span>
              </span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.max(6, pct)}%`, backgroundColor: barColor }} />
            </div>
            <div className="str-meta">
              <span>{r.attempts} tries · {r.wrongFinal} missed{r.timeouts ? ` · ${r.timeouts} timed out` : ""}</span>
              {r.students.length > 0 && <span className="who">{r.students.join(", ")}</span>}
            </div>
          </div>
        );
      })}
      <p className="note">Start the next lesson with the names on the right.</p>
    </div>
  );
}
