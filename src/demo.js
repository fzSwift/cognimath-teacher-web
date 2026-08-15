/* ============================================================
   CogniMath Teacher — demo.js
   Pilot-study sample data (shown when the class cloud has no
   sessions yet) and helpers shared with the app's dashboard.
   ============================================================ */

export const TOPICS = [
  { id: "division", name: "Division", icon: "➗", levels: 5 },
  { id: "multiplication", name: "Multiplication", icon: "✖️", levels: 3 },
  { id: "addition", name: "Addition", icon: "➕", levels: 3 },
  { id: "subtraction", name: "Subtraction", icon: "➖", levels: 3 },
];

export const LEVEL_NAMES = {
  division: ["Easy Division", "Middle Division", "Division Challenge", "Big Numbers", "Real-Life Division"],
  multiplication: ["Times Tables", "Big Times", "Super Multiply"],
  addition: ["Small Sums", "Bigger Totals", "Addition Challenge"],
  subtraction: ["Take Away", "Bigger Differences", "Subtraction Challenge"],
};

/* Human label for a concept key like "division:4" */
export function conceptLabel(key) {
  const [topicId, diff] = key.split(":");
  const t = TOPICS.find(x => x.id === topicId);
  if (!t) return key;
  const name = LEVEL_NAMES[topicId] && LEVEL_NAMES[topicId][Number(diff) - 1];
  return `${t.icon} ${t.name} — ${name || "Level " + diff}`;
}

/* Mock students (Chapter 4 / Appendix A) with per-concept struggle stats */
export const MOCK_STUDENTS = [
  { id: "AMA001", name: "Ama", avatar: "🦊", points: 1240, levels: 7, pre: 52, post: 70, accuracy: 72, sessions: 3, duration: 20, problems: 24, x: 24, y: 72, live: false, concepts: { "division:3": { attempts: 9, wrongFinal: 3 }, "division:5": { attempts: 6, wrongFinal: 3 } } },
  { id: "KOFI001", name: "Kofi", avatar: "🐯", points: 1520, levels: 8, pre: 58, post: 78, accuracy: 75, sessions: 5, duration: 25, problems: 30, x: 30, y: 75, live: false, concepts: { "division:2": { attempts: 8, wrongFinal: 2 }, "addition:1": { attempts: 7, wrongFinal: 3 } } },
  { id: "ESI001", name: "Esi", avatar: "🦄", points: 1760, levels: 9, pre: 61, post: 80, accuracy: 81, sessions: 5, duration: 28, problems: 35, x: 35, y: 81, live: false, concepts: { "division:5": { attempts: 5, wrongFinal: 1 }, "multiplication:2": { attempts: 6, wrongFinal: 2 } } },
  { id: "YAW001", name: "Yaw", avatar: "🐼", points: 980, levels: 6, pre: 49, post: 68, accuracy: 70, sessions: 2, duration: 18, problems: 20, x: 20, y: 70, live: false, concepts: { "division:4": { attempts: 10, wrongFinal: 6 }, "division:5": { attempts: 6, wrongFinal: 4 }, "addition:2": { attempts: 5, wrongFinal: 3 } } },
  { id: "ADJ001", name: "Adjoa", avatar: "🦁", points: 2050, levels: 10, pre: 65, post: 84, accuracy: 85, sessions: 6, duration: 30, problems: 40, x: 40, y: 85, live: false, concepts: { "addition:2": { attempts: 6, wrongFinal: 1 }, "division:4": { attempts: 8, wrongFinal: 2 } } },
];

/* Chapter 4 aggregate numbers for the dashboard */
export const CLASS_STATS = {
  n: "20–40",
  weeks: 4,
  grades: "Primary 1–5",
  engagement: { labels: ["Mins", "Problems", "Sess / wk", "Levels"], values: [22.4, 28.6, 4.1, 8.2] },
  pretest: 58.3,
  posttest: 76.5,
  classes: { labels: ["P1", "P2", "P3", "P4", "P5"], pre: [52, 55, 60, 62, 65], post: [70, 73, 78, 80, 83] },
  usage: { accuracy: 74, retries: 1.6, completion: 89 },
  /* Miss share from MOCK_STUDENTS concept rows (Appendix A), not the full n. */
  topics: [
    { id: "division", name: "Division", icon: "➗", miss: 41 },
    { id: "addition", name: "Addition", icon: "➕", miss: 39 },
    { id: "multiplication", name: "Multiplication", icon: "✖️", miss: 33 },
    { id: "subtraction", name: "Subtraction", icon: "➖", miss: null },
  ],
};

/* Blend live Supabase struggles with the pilot rows — live first, like the app */
export function blendStruggles(liveRows, liveStudents) {
  const acc = {};
  const add = (concepts, name, isLive) => {
    if (!concepts) return;
    for (const k in concepts) {
      const s = concepts[k];
      if (!s || !s.attempts) continue;
      if (!acc[k]) acc[k] = { attempts: 0, wrongFinal: 0, timeouts: 0, students: [], live: false };
      const a = acc[k];
      a.attempts += s.attempts;
      a.wrongFinal += s.wrongFinal || 0;
      a.timeouts += s.timeouts || 0;
      if ((s.wrongFinal || 0) / s.attempts >= 0.4) {
        a.students.push(name);
        if (isLive) a.live = true;
      }
    }
  };
  MOCK_STUDENTS.forEach(m => add(m.concepts, m.name, false));
  (liveRows || []).forEach(r => {
    const stu = (liveStudents || []).find(p => p.id === r.student_id);
    add({ [r.concept]: { attempts: r.attempts, wrongFinal: r.wrong_final } }, stu ? stu.name : "Student", true);
  });
  return Object.keys(acc)
    .map(k => ({
      key: k,
      attempts: acc[k].attempts,
      wrongFinal: acc[k].wrongFinal,
      timeouts: acc[k].timeouts,
      rate: acc[k].attempts ? acc[k].wrongFinal / acc[k].attempts : 0,
      students: acc[k].students,
      live: acc[k].live,
    }))
    .sort((a, b) => (b.live - a.live) || b.wrongFinal - a.wrongFinal || b.rate - a.rate)
    .slice(0, 6);
}
