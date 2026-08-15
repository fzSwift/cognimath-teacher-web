import React from "react";

/* state: loading | nosession | error | empty | ready */
export default function LiveCard({ state, students, note }) {
  return (
    <div className="live-card">
      <div className="live-head">
        <span className="t">Who’s here</span>
        {state === "ready" && <span className="live-tag">updates live</span>}
      </div>

      {state === "loading" && <div className="spinner" />}

      {state === "nosession" && (
        <p className="empty">Sign in with your teacher email to see this class as they play.</p>
      )}

      {state === "error" && (
        <p className="empty">
          Couldn’t load the class. Check the connection, then tap Refresh on the board.
          {note ? ` (${note})` : ""}
        </p>
      )}

      {state === "empty" && (
        <p className="empty">No one has finished a quiz yet. When they do, they appear here.</p>
      )}

      {state === "ready" && students.map(p => (
        <div key={p.id} className="live-stu">
          <span className="ava">{p.avatar}</span>
          <div className="meta">
            <div className="nm">{p.name}</div>
            <div className="sub">{p.sessions} {p.sessions === 1 ? "quiz" : "quizzes"} · {p.stars} ★ · {p.points} pts</div>
          </div>
          <span className="acc">{p.accuracy}%</span>
        </div>
      ))}
    </div>
  );
}
