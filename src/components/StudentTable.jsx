import React from "react";

/* mode: "live" | "pilot"
   live rows: name, avatar, sessions, stars, points, accuracy, levels
   pilot rows: name, avatar, pre, post, accuracy, levels */
export default function StudentTable({ rows, mode = "pilot", title }) {
  if (mode === "live") {
    if (!rows || !rows.length) {
      return (
        <div className="card">
          <div className="card-title">{title || "Class register"}</div>
          <p className="empty">No quizzes yet — the register fills in after the first session.</p>
        </div>
      );
    }
    return (
      <div className="card">
        <div className="card-title">Class register</div>
        <div className="table-scroll">
          <table className="stu-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left", paddingLeft: 8 }}>Student</th>
                <th>Quizzes</th>
                <th>Acc</th>
                <th>Stars</th>
                <th>Points</th>
                <th>Lvl</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id || r.name} className="body">
                  <td className="stu-cell">
                    <span className="ava">{r.avatar}</span>
                    <span className="nm">{r.name}</span>
                  </td>
                  <td>{r.sessions || 0}</td>
                  <td>{r.accuracy}%</td>
                  <td>{r.stars || 0}</td>
                  <td>{r.points || 0}</td>
                  <td>{r.levels}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const scored = (rows || []).filter(r => r.pre != null && r.post != null);
  const avgImp = scored.length
    ? Math.round(scored.reduce((s, r) => s + (r.post - r.pre), 0) / scored.length)
    : 0;

  return (
    <div className="card">
      <div className="card-title">{title || <>Pilot register <span className="tag">study sample</span></>}</div>
      <div className="table-scroll">
        <table className="stu-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left", paddingLeft: 8 }}>Student</th>
              <th>Before</th>
              <th>After</th>
              <th>Δ</th>
              <th>Acc</th>
              <th>Lvl</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map(r => {
              const hasScores = r.pre != null && r.post != null;
              const imp = hasScores ? r.post - r.pre : null;
              return (
                <tr key={r.id || r.name} className={`body ${hasScores && imp < avgImp ? "warn" : ""}`}>
                  <td className="stu-cell">
                    <span className="ava">{r.avatar}</span>
                    <span className="nm">{r.name}</span>
                  </td>
                  <td>{r.pre != null ? `${r.pre}%` : "—"}</td>
                  <td className={r.post != null ? "up" : ""}>{r.post != null ? `${r.post}%` : "—"}</td>
                  <td className={hasScores && imp >= avgImp ? "up" : ""}>{hasScores ? `+${imp}` : "—"}</td>
                  <td>{r.accuracy != null ? `${r.accuracy}%` : "—"}</td>
                  <td>{r.levels != null ? r.levels : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!title && (
        <p className="note">
          Highlighted students improved less than the sample average (+{avgImp}%). This table is the study sample, not your live class.
        </p>
      )}
    </div>
  );
}
