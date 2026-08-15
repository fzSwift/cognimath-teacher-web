/* ============================================================
   CogniMath Teacher — PilotStudy.jsx
   This class's start/end of term quizzes, then the Ghana sample
   report. Live practice numbers stay on Today.
   ============================================================ */

import React, { useEffect, useState } from "react";
import { addTermQuiz, deleteAssignment, fetchTermQuizReport } from "../api";
import { Bars, Legend, Lines, Scatter } from "./Charts";
import StudentTable from "./StudentTable";
import { CLASS_STATS, MOCK_STUDENTS } from "../demo";

const COLORS = ["#F0B429", "#D9483A", "#3B82C4", "#1F9D6E"];

function PaperCard({ paper, label, icon, onPost, onDelete, busy, groupId }) {
  if (!paper) {
    return (
      <div className="term-paper">
        <div className="term-paper-head">{icon} {label}</div>
        <p className="note" style={{ marginTop: 4 }}>Not posted yet.</p>
        <button className="btn btn-gold" type="button" disabled={busy || !groupId} onClick={onPost}>
          {busy ? "Posting…" : `Post ${label.toLowerCase()}`}
        </button>
      </div>
    );
  }
  return (
    <div className="term-paper on">
      <div className="term-paper-head">{icon} {paper.title}</div>
      <p className="note" style={{ marginTop: 4 }}>
        Level {paper.level} · {paper.handedIn || 0} handed in
      </p>
      <button className="btn btn-ghost compact" type="button" onClick={() => onDelete(paper.id)}>
        Delete
      </button>
    </div>
  );
}

export default function PilotStudy({ teacher, groupId, groupName, refreshKey, onRefresh }) {
  const cs = CLASS_STATS;
  const gain = Math.round(cs.posttest - cs.pretest);
  const [termQuiz, setTermQuiz] = useState(null);
  const [level, setLevel] = useState(2);
  const [busy, setBusy] = useState(null); // 'term_start' | 'term_end'
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!groupId) { setTermQuiz(null); return undefined; }
    let alive = true;
    fetchTermQuizReport(groupId).then(r => {
      if (!alive) return;
      setTermQuiz(r);
      if (r.start && r.start.level) setLevel(r.start.level);
    });
    return () => { alive = false; };
  }, [groupId, refreshKey]);

  const sampleRows = MOCK_STUDENTS.map(m => ({
    id: m.id, name: m.name, avatar: m.avatar, pre: m.pre, post: m.post,
    accuracy: m.accuracy, levels: m.levels, live: false,
  }));
  const scatter = MOCK_STUDENTS.map(m => ({
    x: m.problems, y: m.accuracy, label: m.name, color: "#3B82C4",
  }));

  const live = termQuiz || {};
  const liveGain = live.pretest != null && live.posttest != null
    ? Math.round(live.posttest - live.pretest)
    : null;
  const liveRows = (live.students || [])
    .filter(r => r.pre != null || r.post != null)
    .map(r => ({ ...r, live: true }));

  async function post(kind) {
    if (busy || !groupId) return;
    setBusy(kind);
    setMsg(null);
    const { error } = await addTermQuiz({ groupId, kind, level });
    setBusy(null);
    if (error) { setMsg(error.message || "Couldn't post."); return; }
    if (onRefresh) onRefresh();
  }

  async function remove(id) {
    const { error } = await deleteAssignment(id);
    if (error) { setMsg(error.message); return; }
    if (onRefresh) onRefresh();
  }

  return (
    <div className="study">
      {teacher && (
        <div className="card">
          <div className="card-title">This class · term quizzes</div>
          <p className="note" style={{ marginTop: 0 }}>
            Post a start-of-term paper now, and the same mix at the end of term.
            Students see it on Home. One try each — the mark is the first finish.
            {groupName ? <> For <b>{groupName}</b>.</> : null}
          </p>
          {!groupId ? (
            <p className="note">Create or select a class first.</p>
          ) : (
            <>
              <div className="group-chips">
                {[1, 2, 3].map(l => (
                  <button
                    key={l}
                    type="button"
                    className={`group-chip${l === level ? " on" : ""}`}
                    onClick={() => setLevel(l)}
                    disabled={!!(live.start || live.end)}
                  >
                    Level {l}
                  </button>
                ))}
              </div>
              <div className="term-grid">
                <PaperCard
                  paper={live.start}
                  label="Start of term"
                  icon="📋"
                  busy={busy === "term_start"}
                  groupId={groupId}
                  onPost={() => post("term_start")}
                  onDelete={remove}
                />
                <PaperCard
                  paper={live.end}
                  label="End of term"
                  icon="🏁"
                  busy={busy === "term_end"}
                  groupId={groupId}
                  onPost={() => post("term_end")}
                  onDelete={remove}
                />
              </div>
              {msg && <p className="note" style={{ color: "#D9483A" }}>{msg}</p>}
              {live.error && (
                <p className="note" style={{ color: "#D9483A" }}>
                  {/assignment_id|does not exist|PGRST/i.test(live.error.message || "")
                    ? "Run supabase/schema.sql in the SQL Editor to add term quizzes, then refresh."
                    : (live.error.message || "Couldn't load term scores.")}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {teacher && (live.nPre > 0 || live.nPost > 0) && (
        <div className="study-hero">
          <p className="study-kicker">This class · {live.nPre} sat the start{live.nPost ? ` · ${live.nPost} sat the end` : ""}</p>
          <div className="study-mark">
            <p className="study-gain">
              {liveGain != null ? `+${liveGain}` : "—"}
              <span> points</span>
            </p>
            <p className="study-fromto">
              {live.pretest != null ? `${live.pretest}%` : "—"} to {live.posttest != null ? `${live.posttest}%` : "—"}
            </p>
          </div>
          <p className="study-lead">
            Class average on the term papers. Post the end-of-term quiz when you are ready to measure the gain.
          </p>
        </div>
      )}

      {teacher && liveRows.length > 0 && (
        <StudentTable rows={liveRows} mode="pilot" title="This class · term marks" />
      )}

      <div className="study-hero">
        <p className="study-kicker">Ghana sample · {cs.grades} · {cs.weeks} weeks · {cs.n} students</p>
        <div className="study-mark">
          <p className="study-gain">+{gain}<span> points</span></p>
          <p className="study-fromto">{cs.pretest}% to {cs.posttest}%</p>
        </div>
        <p className="study-lead">
          The original study sample — not this week’s live class. Use the term quizzes above to collect the same before/after marks for your pupils.
        </p>
        <div className="study-facts">
          <div><b>{cs.engagement.values[0]}</b><span>minutes per session</span></div>
          <div><b>{cs.engagement.values[1]}</b><span>problems each time</span></div>
          <div><b>{cs.engagement.values[2]}</b><span>voluntary sessions / week</span></div>
          <div><b>{cs.engagement.values[3]}</b><span>levels in {cs.weeks} weeks</span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Where they stumbled</div>
        <p className="note" style={{ marginTop: 0 }}>
          Share of missed answers among the five named sample students. Division needed the most extra teaching.
        </p>
        <div className="topic-miss">
          {cs.topics.map(t => (
            <div key={t.id} className="topic-miss-row">
              <span className="topic-miss-name">{t.icon} {t.name}</span>
              <div className="bar-track">
                {t.miss == null ? (
                  <div className="bar-fill bar-fill-empty" />
                ) : (
                  <div
                    className="bar-fill"
                    style={{
                      width: `${t.miss}%`,
                      backgroundColor: t.miss >= 38 ? "#D9483A" : t.miss >= 30 ? "#F0B429" : "#1F9D6E",
                    }}
                  />
                )}
              </div>
              <span className="topic-miss-pct">{t.miss == null ? "—" : `${t.miss}%`}</span>
            </div>
          ))}
        </div>
        <p className="note">Subtraction had too few recorded misses in the sample to rank.</p>
      </div>

      <div className="card">
        <div className="card-title">Before and after, by class</div>
        <Lines
          labels={cs.classes.labels}
          series={[
            { name: "Before", color: "#E8871E", values: cs.classes.pre },
            { name: "After", color: "#1F9D6E", values: cs.classes.post },
          ]}
        />
        <Legend items={[{ name: "Before", color: "#E8871E" }, { name: "After", color: "#1F9D6E" }]} />
      </div>

      <div className="today-grid">
        <div className="card">
          <div className="card-title">How they practised</div>
          <Bars labels={cs.engagement.labels} values={cs.engagement.values} colors={COLORS} />
        </div>
        <div className="card">
          <div className="card-title">Accuracy vs practice</div>
          <Scatter points={scatter} xLabel="Problems tried" yLabel="Accuracy %" maxX={45} />
          <p className="note">Each dot is one student in the sample. More practice lined up with higher accuracy.</p>
        </div>
      </div>

      <StudentTable rows={sampleRows} mode="pilot" />
    </div>
  );
}
