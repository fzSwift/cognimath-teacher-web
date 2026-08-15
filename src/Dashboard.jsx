import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  aggregateLiveStudents, assignStudentToGroup, createTeacherGroup, fetchClassData,
  fetchTeacherGroups, fetchUngroupedStudents, liveKpis, subscribeClassChanges,
} from "./api";
import LiveCard from "./components/LiveCard";
import Mascot from "./components/Mascot";
import StudentTable from "./components/StudentTable";
import StruggleCard from "./components/StruggleCard";
import { blendStruggles, CLASS_STATS, MOCK_STUDENTS } from "./demo";

const GroupsCard = lazy(() => import("./components/GroupsCard"));
const QuestionsCard = lazy(() => import("./components/QuestionsCard"));
const AssignmentsCard = lazy(() => import("./components/AssignmentsCard"));
const PilotStudy = lazy(() => import("./components/PilotStudy"));

function TabFallback() {
  return <div className="card"><p className="note">Loading…</p></div>;
}

export default function Dashboard({ teacher, onSignOut }) {
  const [tab, setTab] = useState("today");
  const [live, setLive] = useState(null);
  const [liveState, setLiveState] = useState("loading");
  const [liveStudents, setLiveStudents] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [struggles, setStruggles] = useState([]);
  const [reloadTick, setReloadTick] = useState(0);
  const [groups, setGroups] = useState([]);
  const [selGroup, setSelGroup] = useState(null);
  const [ungrouped, setUngrouped] = useState([]);
  const [groupsReady, setGroupsReady] = useState(false);
  const loading = useRef(false);
  const rerun = useRef(false);

  const loadLive = useCallback(async () => {
    if (loading.current) { rerun.current = true; return; }
    loading.current = true;
    try {
      const data = await fetchClassData(selGroup);
      if (!data) {
        setLiveState("offline");
        setLive(null);
        setStruggles(blendStruggles([], []));
        return;
      }
      if (data.error) {
        setLiveState("error");
        setLive({ error: data.error });
        setStruggles(blendStruggles([], []));
        return;
      }
      setLive(data);
      const rows = aggregateLiveStudents(data);
      setLiveStudents(rows);
      setKpis(liveKpis(data));
      setStruggles(blendStruggles(data.struggles, rows));
      setLiveState(rows.length ? "ready" : "empty");
    } finally {
      loading.current = false;
      if (rerun.current) { rerun.current = false; loadLive(); }
    }
  }, [selGroup]);

  const loadGroups = useCallback(async () => {
    const gs = await fetchTeacherGroups();
    setGroups(gs);
    if (gs.length) setSelGroup(prev => (prev && gs.some(g => g.id === prev) ? prev : gs[0].id));
    setGroupsReady(true);
    fetchUngroupedStudents().then(setUngrouped);
  }, []);

  useEffect(() => { loadGroups(); }, [reloadTick, loadGroups]);
  /* Wait until classes are known so we don't download every group, then one class. */
  useEffect(() => { if (groupsReady) loadLive(); }, [reloadTick, loadLive, groupsReady]);

  useEffect(() => {
    if (!teacher) return;
    let t;
    const onChange = () => {
      clearTimeout(t);
      t = setTimeout(() => loadLive(), 400);
    };
    const unsub = subscribeClassChanges(onChange);
    return () => { clearTimeout(t); unsub(); };
  }, [teacher, loadLive]);

  const handleCreateGroup = useCallback(async name => {
    const res = await createTeacherGroup(name);
    if (!res.error && res.group) setSelGroup(res.group.group_id);
    return res;
  }, []);

  const handleAssignStudent = useCallback(async (studentId, groupId) => {
    return assignStudentToGroup(studentId, groupId);
  }, []);

  const bump = () => setReloadTick(n => n + 1);
  const cs = CLASS_STATS;
  const sel = groups.find(g => g.id === selGroup) || null;
  const groupName = sel ? sel.name : null;
  const liveRows = liveStudents.map(p => ({
    id: p.id, name: p.name, avatar: p.avatar,
    sessions: p.sessions, stars: p.stars, points: p.points,
    accuracy: p.accuracy, levels: p.level, live: true,
  }));
  const pilotRows = MOCK_STUDENTS.map(m => ({
    id: m.id, name: m.name, avatar: m.avatar, pre: m.pre, post: m.post,
    accuracy: m.accuracy, levels: m.levels, live: false,
  }));
  const liveStruggles = live ? struggles.filter(s => s.live) : [];
  const tabs = [
    { id: "today", label: "Today" },
    { id: "work", label: "Set work" },
    { id: "register", label: "Register" },
    { id: "pilot", label: "Pilot study" },
  ];

  return (
    <div className="wrap">
      {!teacher && (
        <div className="sample-banner">You’re looking at sample data. Sign in to see your own class.</div>
      )}

      <header className="board-frame">
        <div className="board">
          <div className="board-head">
            <div className="board-brand">
              <Mascot size={74} className="board-mascot" />
              <div>
                <div className="board-kicker">Today’s class</div>
                <h1 className="board-title">{groupName || <span>CogniMath <span className="board-em">Teacher</span></span>}</h1>
                <div className="board-sub">
                  {teacher ? "Numbers update when a student finishes a quiz." : "Sample class from the CogniMath pilot."}
                </div>
              </div>
            </div>
            <div className="board-tools">
              {sel && sel.join_code && <span className="stamp" title="Students type this on their profile">{sel.join_code}</span>}
              {teacher && (
                <span className="chalk-chip">
                  <span className="ava">{teacher.avatar || "👩‍🏫"}</span>
                  {teacher.name}
                </span>
              )}
              {teacher && <button className="chalk-btn" type="button" onClick={bump}>Refresh</button>}
              {teacher && <button className="chalk-btn" type="button" onClick={onSignOut}>Sign out</button>}
              {!teacher && <button className="chalk-btn" type="button" onClick={onSignOut}>Back to sign in</button>}
            </div>
          </div>
          <div className="board-kpis">
            {kpis ? (
              <>
                <div className="board-kpi"><b>{kpis.students}</b><span>In this class</span></div>
                <div className="board-kpi"><b>{kpis.sessions}</b><span>Quizzes done</span></div>
                <div className="board-kpi"><b>{kpis.avgAccuracy}%</b><span>Avg accuracy</span></div>
                <div className="board-kpi up"><b>{kpis.activeToday}</b><span>Played today</span></div>
              </>
            ) : (
              <>
                <div className="board-kpi"><b>{cs.pretest}%</b><span>Pre-test avg</span></div>
                <div className="board-kpi up"><b>{cs.posttest}%</b><span>Post-test avg</span></div>
                <div className="board-kpi up"><b>+{Math.round(cs.posttest - cs.pretest)}pp</b><span>Improvement</span></div>
                <div className="board-kpi"><b>{cs.usage.accuracy}%</b><span>Avg accuracy</span></div>
              </>
            )}
          </div>
          {groups.length > 1 && (
            <div className="board-classes">
              {groups.map(g => (
                <button
                  key={g.id}
                  type="button"
                  className={`group-chip${g.id === selGroup ? " on" : ""}`}
                  onClick={() => setSelGroup(g.id)}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <nav className="desk-nav" aria-label="Desk sections">
        {tabs.map(t => (
          <button key={t.id} type="button" className={`desk-tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "today" && (
        <div className="today-grid">
          {liveState === "offline" ? (
            <div className="live-card">
              <div className="live-head"><span className="t">Who’s here</span></div>
              <p className="empty">This is a sample class. Sign in to see students as they play.</p>
            </div>
          ) : (
            <LiveCard state={liveState} students={liveStudents} note={live && live.error} />
          )}
          <StruggleCard rows={liveState === "offline" ? struggles : (liveStruggles.length ? liveStruggles : struggles)} compact />
        </div>
      )}

      {tab === "work" && (
        <Suspense fallback={<TabFallback />}>
          <AssignmentsCard groupId={selGroup} groupName={groupName} />
          <QuestionsCard groupId={selGroup} groupName={groupName} />
        </Suspense>
      )}

      {tab === "register" && (
        <Suspense fallback={<TabFallback />}>
          <GroupsCard
            groups={groups}
            selGroup={selGroup}
            ungrouped={ungrouped}
            onSelect={setSelGroup}
            onRefresh={bump}
            onCreate={handleCreateGroup}
            onAssignStudent={handleAssignStudent}
          />
          {teacher ? (
            <StudentTable rows={liveRows} mode="live" />
          ) : (
            <StudentTable rows={pilotRows} mode="pilot" />
          )}
        </Suspense>
      )}

      {tab === "pilot" && (
        <Suspense fallback={<TabFallback />}>
          <PilotStudy
            teacher={teacher}
            groupId={selGroup}
            groupName={groupName}
            refreshKey={reloadTick}
            onRefresh={bump}
          />
        </Suspense>
      )}

      <p className="footer-note">
        CogniMath Teacher · same class as the student app ·{" "}
        <a href="http://localhost:8081/">Open student app</a>
      </p>
    </div>
  );
}
