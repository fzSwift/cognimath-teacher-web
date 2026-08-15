/* ============================================================
   CogniMath Teacher — QuestionsCard.jsx
   Author questions for the selected class, one category at a time.
   ============================================================ */

import React, { useEffect, useState } from "react";
import { addTeacherQuestion, deleteTeacherQuestion, fetchTeacherQuestions } from "../api";
import { TOPICS } from "../demo";

export default function QuestionsCard({ groupId, groupName }) {
  const [topicId, setTopicId] = useState(TOPICS[0].id);
  const [level, setLevel] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [wrongs, setWrongs] = useState("");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const topic = TOPICS.find(t => t.id === topicId) || TOPICS[0];

  async function load() {
    if (!groupId) { setRows([]); return; }
    const { rows: list, error } = await fetchTeacherQuestions(groupId);
    if (error) {
      const missing = error.code === "PGRST205" || error.status === 404 || /does not exist/i.test(error.message || "");
      setNote(missing
        ? "Run supabase/schema.sql in the SQL Editor to add the questions table."
        : (error.message || "Couldn't load questions."));
      setRows([]);
      return;
    }
    setNote(null);
    setRows(list);
  }

  useEffect(() => { load(); }, [groupId]);

  async function save(e) {
    e.preventDefault();
    if (busy || !groupId) return;
    setBusy(true);
    setNote(null);
    const distractors = wrongs.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    const { error } = await addTeacherQuestion({
      groupId, topic: topicId, level, prompt, answer, wrongs: distractors,
    });
    setBusy(false);
    if (error) {
      setNote(error.message || "Couldn't save.");
      return;
    }
    setPrompt("");
    setAnswer("");
    setWrongs("");
    await load();
  }

  async function remove(id) {
    const { error } = await deleteTeacherQuestion(id);
    if (error) { setNote(error.message); return; }
    setRows(r => r.filter(q => q.id !== id));
  }

  const shown = rows.filter(q => q.topic === topicId);

  return (
    <div className="card">
      <div className="card-title">Questions for this class</div>
      <p className="note" style={{ marginTop: 0 }}>
        These are what {groupName ? <b>{groupName}</b> : "the class"} sees for each topic. If a topic is empty, they get the built-in practice questions.
      </p>

      {!groupId ? (
        <p className="note">Pick a class first — questions belong to one class.</p>
      ) : (
        <>
          <div className="group-chips">
            {TOPICS.map(t => (
              <button
                key={t.id}
                type="button"
                className={`group-chip${t.id === topicId ? " on" : ""}`}
                onClick={() => { setTopicId(t.id); setLevel(1); }}
              >
                {t.icon} {t.name}
              </button>
            ))}
          </div>
          <div className="group-chips">
            {Array.from({ length: topic.levels }, (_, i) => i + 1).map(l => (
              <button
                key={l}
                type="button"
                className={`group-chip${l === level ? " on" : ""}`}
                onClick={() => setLevel(l)}
              >
                Level {l}
              </button>
            ))}
          </div>

          <form className="q-form" onSubmit={save}>
            <div className="field">
              <label htmlFor="q-prompt">Question</label>
              <input id="q-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. 12 + 8 = ?" maxLength={280} />
            </div>
            <div className="q-form-row">
              <div className="field">
                <label htmlFor="q-answer">Answer (number)</label>
                <input id="q-answer" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="20" inputMode="decimal" maxLength={16} />
              </div>
              <div className="field">
                <label htmlFor="q-wrongs">Wrong options (optional)</label>
                <input id="q-wrongs" value={wrongs} onChange={e => setWrongs(e.target.value)} placeholder="18, 21, 28" maxLength={80} />
              </div>
            </div>
            <button className="btn btn-gold" type="submit" disabled={busy || !prompt.trim() || !answer}>
              {busy ? "Saving…" : `Add to ${topic.name}`}
            </button>
          </form>
          {note && <p className="note" style={{ color: "#D9483A" }}>{note}</p>}

          <div className="group-ungrouped-title" style={{ marginTop: 14 }}>
            {topic.name} · {shown.length} question{shown.length === 1 ? "" : "s"}
          </div>
          {shown.length === 0 ? (
            <p className="note">None yet — students get generated {topic.name.toLowerCase()} until you add some.</p>
          ) : shown.map(q => (
            <div key={q.id} className="group-ungrouped-row">
              <div style={{ flex: 1 }}>
                <div className="group-ungrouped-name">{q.prompt}</div>
                <div className="note" style={{ marginTop: 0 }}>L{q.level} · answer {q.answer}{q.options ? " · multiple choice" : ""}</div>
              </div>
              <button className="btn btn-ghost compact" type="button" onClick={() => remove(q.id)}>
                Delete
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
