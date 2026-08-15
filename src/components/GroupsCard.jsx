/* ============================================================
   CogniMath Teacher — GroupsCard.jsx
   Class management: create groups (classes), pick the one you're
   viewing, share its join code, and assign students who signed
   up but haven't joined a class yet.
   ============================================================ */

import React, { useState } from "react";

export default function GroupsCard({ groups, selGroup, onSelect, onRefresh, ungrouped, onCreate, onAssignStudent }) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const sel = groups.find(g => g.id === selGroup) || null;

  async function create(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setMsg(null);
    const { group, error } = await onCreate(newName.trim());
    setCreating(false);
    if (error || !group) { setMsg(error ? error.message : "Couldn't create the class."); return; }
    setNewName("");
    onRefresh(); // refetch groups + ungrouped; App selects the new group
    setMsg(`Class created — share code ${group.join_code} with your students.`);
  }

  async function assign(studentId) {
    if (assigning) return;
    setAssigning(studentId);
    const { error } = await onAssignStudent(studentId, selGroup);
    setAssigning(null);
    if (error) { setMsg(error.message); return; }
    setMsg(null);
    onRefresh();
  }

  return (
    <div className="card">
      <div className="card-title">Your classes</div>
      <p className="note" style={{ marginTop: 2 }}>
        Students join with the class code, or you add them below. You only see your own classes.
      </p>

      {groups.length > 1 && (
        <div className="group-chips">
          {groups.map(g => (
            <button
              key={g.id}
              className={`group-chip${g.id === selGroup ? " on" : ""}`}
              onClick={() => onSelect(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div className="group-code">
          <span className="group-code-label">Class code</span>
          <span className="group-code-value">{sel.join_code}</span>
          <span className="group-code-hint">students type this on their profile</span>
        </div>
      )}

      <form className="group-create" onSubmit={create}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New class name, e.g. Primary 4A"
          maxLength={60}
        />
        <button className="btn btn-gold" type="submit" disabled={creating || !newName.trim()}>
          {creating ? "Creating…" : "Create class"}
        </button>
      </form>

      {msg && <p className="note" style={{ color: /created/i.test(msg) ? "#1F9D6E" : "#D9483A" }}>{msg}</p>}

      {ungrouped.length > 0 && (
        <div className="group-ungrouped">
          <div className="group-ungrouped-title">
            Students who haven't joined a class yet ({ungrouped.length})
          </div>
          {ungrouped.map(s => (
            <div key={s.id} className="group-ungrouped-row">
              <span className="ava">{s.avatar || "🦉"}</span>
              <span className="group-ungrouped-name">{s.name}</span>
              <button
                className="btn btn-ghost compact"
                disabled={!selGroup || assigning === s.id}
                onClick={() => assign(s.id)}
              >
                {assigning === s.id ? "Adding…" : "Add to " + (sel ? sel.name : "class")}
              </button>
            </div>
          ))}
        </div>
      )}

      {ungrouped.length === 0 && groups.length > 0 && (
        <p className="note" style={{ marginTop: 8 }}>Everyone is in a class.</p>
      )}
    </div>
  );
}
