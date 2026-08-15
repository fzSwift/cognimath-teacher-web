/* ============================================================
   CogniMath Teacher — api.js
   Teacher-only gateway to the CogniMath Supabase project.

   Security model (defense in depth):
   1. This app only ever calls signInWithPassword (no sign-up).
   2. After auth, it demands profiles.role = 'teacher' — anyone
      else is signed out and blocked.
   3. Even if a student used their own token directly, RLS lets
      them read only their own rows — never the class.
   ============================================================ */

import { isSupabaseConfigured, supabase } from "./lib/supabase";
import * as V from "./lib/validate";

function fail(r) { return { error: { message: r.error } }; }

const ready = () => isSupabaseConfigured && supabase;

/* Sign in and verify the account is a teacher. Returns { teacher, error }. */
export async function signInTeacher(email, password, captchaToken) {
  if (!ready()) return { teacher: null, error: { message: "Supabase is not configured yet (src/config.js)." } };
  const addr = V.email(email);
  if (!addr.ok) return { teacher: null, error: { message: addr.error } };
  const pw = V.password(password, { min: 1 });
  if (!pw.ok) return { teacher: null, error: { message: pw.error } };
  const { data, error } = await supabase.auth.signInWithPassword({
    email: addr.value,
    password: pw.value,
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (error) {
    if (/captcha/i.test(error.message || "")) {
      return { teacher: null, error: { message: "Couldn't verify you're a person — try the check again." } };
    }
    return { teacher: null, error };
  }

  const { profile, schemaMissing } = await fetchMyProfile(data.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    return {
      teacher: null,
      error: schemaMissing
        ? { message: "Cloud tables aren't set up — run supabase/schema.sql in the Supabase SQL Editor, then create and provision your teacher account (see the schema header)." }
        : { message: "No teacher profile found for this account. Provision it first (see schema.sql header)." },
    };
  }
  if (profile.role !== "teacher") {
    await supabase.auth.signOut();
    return { teacher: null, error: { message: "This portal is for teachers only. Student accounts are not allowed here." } };
  }
  return { teacher: profile, error: null };
}

export async function fetchMyProfile(userId) {
  if (!ready() || !userId) return { profile: null };
  const { data, error } = await supabase.from("profiles").select("id, name, avatar, role").eq("id", userId).maybeSingle();
  if (error && (error.code === "PGRST205" || error.status === 404 || /does not exist/i.test(error.message || ""))) {
    return { profile: null, schemaMissing: true };
  }
  return { profile: data || null };
}

export async function signOutTeacher() {
  if (!ready()) return;
  await supabase.auth.signOut();
}

/* Current session user (null when signed out) */
export async function currentUser() {
  if (!ready()) return null;
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

/* ---------- Class data ----------
   Returns { profiles, totals, struggles, todaySessions } or null when
   unconfigured, or { error } on failure. Teachers can read everything
   thanks to RLS.

   Scaling note: per-student numbers come from the student_totals view
   (aggregation happens in Postgres), not from downloading raw session
   rows — so a class of 150 students costs ~150 rows per refresh instead
   of every session ever played. Struggles are fetched raw because they're
   naturally bounded (one row per student × concept) and the card needs
   per-student names. "Active today" is a count query on an indexed
   column. */
export async function fetchClassData(groupId = null) {
  if (!ready()) return null;
  try {
    // profiles are filtered server-side (RLS + the group filter). Totals /
    // struggles / active-today are then asked for those student ids only so
    // a teacher with several classes doesn't download the others on each tick.
    let q = supabase
      .from("profiles")
      .select("id, name, avatar, points, level, streak, created_at, role, group_id")
      .order("points", { ascending: false })
      .limit(500);
    if (groupId) q = q.eq("group_id", groupId);
    const profilesRes = await q;
    const ids = (profilesRes.data || []).map(p => p.id);
    if (profilesRes.error) return { error: profilesRes.error.message };
    const today = new Date().toISOString().slice(0, 10) + "T00:00:00Z";
    const [totals, struggles, todayRes] = await Promise.all([
      ids.length
        ? supabase.from("student_totals").select("student_id, sessions, avg_accuracy, points, stars").in("student_id", ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? supabase.from("concept_struggles").select("student_id, concept, attempts, wrong_first, wrong_final, timeouts").in("student_id", ids).limit(2000)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? supabase.from("sessions").select("student_id", { count: "exact", head: true }).in("student_id", ids).gte("played_at", today)
        : Promise.resolve({ count: 0 }),
    ]);
    const err = totals.error || struggles.error || todayRes.error;
    if (err) return { error: err.message };
    return {
      profiles: profilesRes.data || [],
      totals: totals.data || [],
      struggles: struggles.data || [],
      todaySessions: todayRes.count || 0,
    };
  } catch (e) {
    return { error: e.message || "network error" };
  }
}

/* Live students: session counts, accuracy, stars, points per profile.
   Per-student numbers come from the student_totals view. */
export function aggregateLiveStudents(data) {
  const totals = {};
  (data.totals || []).forEach(t => { totals[t.student_id] = t; });
  return (data.profiles || [])
    .filter(p => p.role !== "teacher")
    .map(p => {
      const t = totals[p.id] || {};
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar || "🦉",
        points: Number(t.points) || p.points || 0,
        level: p.level || 1,
        streak: p.streak || 0,
        sessions: Number(t.sessions) || 0,
        accuracy: t.sessions ? Math.round(Number(t.avg_accuracy)) : 0,
        stars: Number(t.stars) || 0,
        live: true,
      };
    })
    .sort((a, b) => b.points - a.points);
}

/* ---------- Groups (classes) ----------
   Teachers create groups, assign students, and view group membership.
   All writes go through RPCs — RLS + the enforce_group_change trigger
   block direct group_id tampering. */
export async function fetchTeacherGroups() {
  if (!ready()) return [];
  const { data, error } = await supabase.rpc("teacher_groups");
  if (error) return [];
  return Array.isArray(data) ? data : [];
}

export async function fetchUngroupedStudents() {
  if (!ready()) return [];
  const { data, error } = await supabase.rpc("ungrouped_students");
  if (error) return [];
  return Array.isArray(data) ? data : [];
}

export async function createTeacherGroup(name) {
  if (!ready()) return { error: { message: "Supabase is not configured yet (src/config.js)." } };
  const n = V.groupName(name);
  if (!n.ok) return { group: null, error: { message: n.error } };
  const { data, error } = await supabase.rpc("create_group", { p_name: n.value });
  return { group: data || null, error };
}

export async function assignStudentToGroup(studentId, groupId) {
  if (!ready()) return { error: { message: "Supabase is not configured yet (src/config.js)." } };
  const sid = V.uuid(studentId, "That student is missing.");
  if (!sid.ok) return fail(sid);
  const gid = V.uuid(groupId);
  if (!gid.ok) return fail(gid);
  const { error } = await supabase.rpc("assign_to_group", { p_student_id: sid.value, p_group_id: gid.value });
  return { error };
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function fetchTeacherQuestions(groupId) {
  if (!ready() || !groupId) return { rows: [], error: null };
  const { data, error } = await supabase
    .from("teacher_questions")
    .select("id, group_id, topic, level, prompt, answer, options, created_at")
    .eq("group_id", groupId)
    .order("topic", { ascending: true })
    .order("level", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return { rows: [], error };
  return { rows: data || [], error: null };
}

export async function addTeacherQuestion({ groupId, topic, level, prompt, answer, wrongs }) {
  if (!ready()) return { error: { message: "Supabase is not configured yet (src/config.js)." } };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: { message: "Sign in first." } };
  const gid = V.uuid(groupId);
  if (!gid.ok) return fail(gid);
  const top = V.topic(topic);
  if (!top.ok) return fail(top);
  const lv = V.level(level);
  if (!lv.ok) return fail(lv);
  const text = V.prompt(prompt);
  if (!text.ok) return fail(text);
  const a = V.answerNum(answer);
  if (!a.ok) return fail(a);
  const wr = V.distractors(wrongs, a.value);
  if (!wr.ok) return fail(wr);
  let options = null;
  if (wr.value.length) options = shuffle([a.value, ...wr.value]).slice(0, 4);
  const { error } = await supabase.from("teacher_questions").insert({
    group_id: gid.value,
    topic: top.value,
    level: lv.value,
    prompt: text.value,
    answer: a.value,
    options,
  });
  return { error };
}

export async function deleteTeacherQuestion(id) {
  const rid = V.rowId(id);
  if (!ready() || !rid.ok) return { error: { message: "Couldn't delete that question." } };
  const { error } = await supabase.from("teacher_questions").delete().eq("id", rid.value);
  return { error };
}

export async function fetchTeacherAssignments(groupId) {
  if (!ready() || !groupId) return { rows: [], error: null };
  const { data, error } = await supabase
    .from("assignments")
    .select("id, group_id, topic, kind, title, note, level, due_on, created_at, assignment_completions(student_id)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { rows: [], error };
  const rows = (data || []).map(a => ({
    ...a,
    handedIn: Array.isArray(a.assignment_completions) ? a.assignment_completions.length : 0,
  }));
  return { rows, error: null };
}

export async function addAssignment({ groupId, topic, kind, title, note, level, dueOn }) {
  if (!ready()) return { error: { message: "Supabase is not configured yet (src/config.js)." } };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: { message: "Sign in first." } };
  const gid = V.uuid(groupId);
  if (!gid.ok) return fail(gid);
  const top = V.topic(topic);
  if (!top.ok) return fail(top);
  const k = V.workKind(kind);
  if (!k.ok) return fail(k);
  const heading = V.assignmentTitle(title, k.value === "homework" ? "Take-home work" : "Classwork");
  if (!heading.ok) return fail(heading);
  const memo = V.assignmentNote(note);
  if (!memo.ok) return fail(memo);
  const lv = V.level(level);
  if (!lv.ok) return fail(lv);
  const due = V.dueDate(dueOn);
  if (!due.ok) return fail(due);
  const { error } = await supabase.from("assignments").insert({
    group_id: gid.value,
    topic: top.value,
    kind: k.value,
    title: heading.value,
    note: memo.value,
    level: lv.value,
    due_on: due.value,
  });
  return { error };
}

export async function addTermQuiz({ groupId, kind, level, note }) {
  if (!ready()) return { error: { message: "Supabase is not configured yet (src/config.js)." } };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: { message: "Sign in first." } };
  const gid = V.uuid(groupId);
  if (!gid.ok) return fail(gid);
  const k = V.termKind(kind);
  if (!k.ok) return fail(k);
  const lv = V.level(level);
  if (!lv.ok) return fail(lv);
  const memo = V.assignmentNote(note);
  if (!memo.ok) return fail(memo);
  const heading = k.value === "term_end" ? "End of term quiz" : "Start of term quiz";
  const { error } = await supabase.from("assignments").insert({
    group_id: gid.value,
    topic: "mixed",
    kind: k.value,
    title: heading,
    note: memo.value || (k.value === "term_end"
      ? "Same mix of sums as the start-of-term quiz. One try."
      : "A short mix of division, multiplication, addition and subtraction. One try."),
    level: lv.value,
    due_on: null,
  });
  if (error && (error.code === "23505" || /duplicate|unique/i.test(error.message || ""))) {
    return { error: { message: "This class already has that term quiz. Delete it first to post a new one." } };
  }
  return { error };
}

/* First attempt per student per paper. Keep in lockstep with cognimath-app/src/core/sync.js. */
export function aggregateTermQuiz(assignments, sessions, students) {
  const start = (assignments || []).find(a => a.kind === "term_start") || null;
  const end = (assignments || []).find(a => a.kind === "term_end") || null;
  const firstBy = {};
  (sessions || []).forEach(s => {
    const k = `${s.student_id}:${s.assignment_id}`;
    if (!firstBy[k] || s.played_at < firstBy[k].played_at) {
      firstBy[k] = { accuracy: Number(s.accuracy), played_at: s.played_at };
    }
  });
  const rows = (students || [])
    .filter(p => p.role !== "teacher")
    .map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar || "🦉",
      pre: start && firstBy[`${p.id}:${start.id}`] ? Math.round(firstBy[`${p.id}:${start.id}`].accuracy) : null,
      post: end && firstBy[`${p.id}:${end.id}`] ? Math.round(firstBy[`${p.id}:${end.id}`].accuracy) : null,
    }));
  const pres = rows.map(r => r.pre).filter(v => v != null);
  const posts = rows.map(r => r.post).filter(v => v != null);
  const avg = xs => xs.length ? Math.round((xs.reduce((s, v) => s + v, 0) / xs.length) * 10) / 10 : null;
  return {
    start, end, students: rows,
    pretest: avg(pres), posttest: avg(posts),
    nPre: pres.length, nPost: posts.length,
  };
}

export async function fetchTermQuizReport(groupId, students) {
  const empty = { start: null, end: null, students: [], pretest: null, posttest: null, nPre: 0, nPost: 0, error: null };
  if (!ready() || !groupId) return empty;
  const [asgRes, rosterRes] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, kind, title, note, level, created_at, assignment_completions(student_id)")
      .eq("group_id", groupId)
      .in("kind", ["term_start", "term_end"]),
    students
      ? Promise.resolve({ data: students, error: null })
      : supabase.from("profiles").select("id, name, avatar, role").eq("group_id", groupId),
  ]);
  if (asgRes.error) return { ...empty, error: asgRes.error };
  const assignments = (asgRes.data || []).map(a => ({
    ...a,
    handedIn: Array.isArray(a.assignment_completions) ? a.assignment_completions.length : 0,
  }));
  const ids = assignments.map(a => a.id);
  let sessions = [];
  if (ids.length) {
    const { data: sess, error: e2 } = await supabase
      .from("sessions")
      .select("student_id, assignment_id, accuracy, played_at")
      .in("assignment_id", ids)
      .order("played_at", { ascending: true })
      .limit(500);
    if (e2) return { ...empty, start: assignments.find(a => a.kind === "term_start") || null, end: assignments.find(a => a.kind === "term_end") || null, error: e2 };
    sessions = sess || [];
  }
  return { ...aggregateTermQuiz(assignments, sessions, rosterRes.data || students || []), error: null };
}

export async function deleteAssignment(id) {
  const rid = V.rowId(id);
  if (!ready() || !rid.ok) return { error: { message: "Couldn't delete that." } };
  const { error } = await supabase.from("assignments").delete().eq("id", rid.value);
  return { error };
}

/* ---------- Realtime ----------
   Fire onChange whenever class data changes — a student's submit_session
   lands (sessions insert + struggle upserts) or a profile updates on
   login. RLS scopes the stream to what this user can see (teachers: the
   whole class). The dashboard treats events as a refetch trigger only;
   the payload is ignored. Returns an unsubscribe function. */
export function subscribeClassChanges(onChange) {
  if (!ready()) return () => {};
  const channel = supabase
    .channel("teacher-dashboard")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "sessions" }, onChange)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "concept_struggles" }, onChange)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "concept_struggles" }, onChange)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, onChange)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

/* KPI summary from live data. avgAccuracy is the session-weighted mean
   computed from the view's per-student aggregates (equals the plain mean
   over all sessions). activeToday comes from the indexed count query. */
export function liveKpis(data) {
  const students = aggregateLiveStudents(data);
  const totals = data.totals || [];
  const sessions = totals.reduce((s, t) => s + Number(t.sessions || 0), 0);
  const accWeighted = totals.reduce((s, t) => s + Number(t.avg_accuracy || 0) * Number(t.sessions || 0), 0);
  return {
    students: students.length,
    sessions,
    avgAccuracy: sessions ? Math.round(accWeighted / sessions) : 0,
    points: students.reduce((s, p) => s + p.points, 0),
    activeToday: data.todaySessions || 0,
  };
}
