/* ============================================================
   CogniMath Teacher — AssignmentsCard.jsx
   Post classwork or take-home work under a topic for the class.
   ============================================================ */

import React, { useEffect, useState } from "react";
import { addAssignment, deleteAssignment, fetchTeacherAssignments } from "../api";
import { TOPICS } from "../demo";

export default function AssignmentsCard({ groupId, groupName }) {
  const [topicId, setTopicId] = useState(TOPICS[0].id);
  const [kind, setKind] = useState("classwork");
  const [level, setLevel] = useState(1);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const topic = TOPICS.find(t => t.id === topicId) || TOPICS[0];

  async function load() {
    if (!groupId) { setRows([]); return; }
    const { rows: list, error } = await fetchTeacherAssignments(groupId);
    if (error) {
      const missing = error.code === "PGRST205" || error.status === 404 || /does not exist/i.test(error.message || "");
      setMsg(missing
        ? "Run supabase/schema.sql in the SQL Editor to add assignments."
        : (error.message || "Couldn't load work."));
      setRows([]);
      return;
    }
    setMsg(null);
    setRows(list);
  }

  useEffect(() => { load(); }, [groupId]);

  async function save(e) {
    e.preventDefault();
    if (busy || !groupId) return;
    setBusy(true);
    setMsg(null);
    const { error } = await addAssignment({
      groupId, topic: topicId, kind, title, note, level,
      dueOn: kind === "homework" && dueOn ? dueOn : null,
    });
    setBusy(false);
    if (error) { setMsg(error.message || "Couldn't post."); return; }
    setTitle("");
    setNote("");
    setDueOn("");
    await load();
  }

  async function remove(id) {
    const { error } = await deleteAssignment(id);
    if (error) { setMsg(error.message); return; }
    setRows(r => r.filter(a => a.id !== id));
  }

  const shown = rows.filter(a => a.topic === topicId && (a.kind === "classwork" || a.kind === "homework"));

  return (
    <div className="card">
      <div className="card-title">Classwork and take-home</div>
      <p className="note" style={{ marginTop: 0 }}>
        Post work for {groupName ? <b>{groupName}</b> : "this class"}. Students see it on Home and hand it in by finishing the quiz.
      </p>

      {!groupId ? (
        <p className="note">Create or select a class first.</p>
      ) : (
        <>
          <div className="group-chips">
            <button type="button" className={`group-chip${kind === "classwork" ? " on" : ""}`} onClick={() => setKind("classwork")}>🏫 Classwork</button>
            <button type="button" className={`group-chip${kind === "homework" ? " on" : ""}`} onClick={() => setKind("homework")}>🏠 Take-home</button>
          </div>
          <div className="group-chips">
            {TOPICS.map(t => (
              <button key={t.id} type="button" className={`group-chip${t.id === topicId ? " on" : ""}`} onClick={() => { setTopicId(t.id); setLevel(1); }}>
                {t.icon} {t.name}
              </button>
            ))}
          </div>
          <div className="group-chips">
            {Array.from({ length: topic.levels }, (_, i) => i + 1).map(l => (
              <button key={l} type="button" className={`group-chip${l === level ? " on" : ""}`} onClick={() => setLevel(l)}>
                Level {l}
              </button>
            ))}
          </div>

          <form className="q-form" onSubmit={save}>
            <div className="field">
              <label htmlFor="a-title">Title</label>
              <input id="a-title" value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === "homework" ? "e.g. Addition take-home" : "e.g. Division classwork"} maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="a-note">Note for the class (optional)</label>
              <input id="a-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Finish all 10 questions tonight" maxLength={280} />
            </div>
            {kind === "homework" && (
              <div className="field">
                <label htmlFor="a-due">Due date (optional)</label>
                <input id="a-due" type="date" value={dueOn} onChange={e => setDueOn(e.target.value)} />
              </div>
            )}
            <button className="btn btn-gold" type="submit" disabled={busy}>
              {busy ? "Posting…" : `Post ${kind === "homework" ? "take-home" : "classwork"}`}
            </button>
          </form>
          {msg && <p className="note" style={{ color: "#D9483A" }}>{msg}</p>}

          <div className="group-ungrouped-title" style={{ marginTop: 14 }}>
            {topic.name} · {shown.length} posted
          </div>
          {shown.length === 0 ? (
            <p className="note">Nothing posted for {topic.name} yet.</p>
          ) : shown.map(a => (
            <div key={a.id} className="group-ungrouped-row">
              <div style={{ flex: 1 }}>
                <div className="group-ungrouped-name">{a.kind === "homework" ? "🏠" : "🏫"} {a.title}</div>
                <div className="note" style={{ marginTop: 0 }}>
                  L{a.level}{a.due_on ? ` · due ${a.due_on}` : ""} · {a.handedIn} handed in
                </div>
              </div>
              <button className="btn btn-ghost compact" type="button" onClick={() => remove(a.id)}>
                Delete
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
