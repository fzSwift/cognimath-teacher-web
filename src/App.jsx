import React, { lazy, Suspense, useEffect, useState } from "react";
import { CaptchaBox, botProtectionOn } from "./components/CaptchaBox";
import Mascot from "./components/Mascot";
import { SUPABASE_URL } from "./config";
import { authStorageKey, hasAuthCookie } from "./lib/cookieAuth";
import { email as checkEmail, password as checkPassword } from "./lib/validate";

const Dashboard = lazy(() => import("./Dashboard"));

function hasStoredSession() {
  try {
    if (hasAuthCookie(authStorageKey(SUPABASE_URL))) return true;
    return Object.keys(localStorage).some(k => k.startsWith("sb-") && k.includes("auth-token"));
  } catch (e) {
    return false;
  }
}

export default function App() {
  const [phase, setPhase] = useState(() => (hasStoredSession() ? "boot" : "login"));
  const [teacher, setTeacher] = useState(null);
  const [error, setError] = useState(null);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (phase !== "boot") return undefined;
    let alive = true;
    (async () => {
      const { signOutTeacher } = await import("./api");
      const { supabase } = await import("./lib/supabase");
      if (!supabase) { if (alive) setPhase("login"); return; }
      /* Local JWT — no extra GoTrue round-trip. An expired token fails
         the profiles read below and we send them back to sign in. */
      const { data: sessionRes } = await supabase.auth.getSession();
      const user = sessionRes.session && sessionRes.session.user;
      if (!user) { if (alive) setPhase("login"); return; }
      const { data } = await supabase.from("profiles").select("id, name, avatar, role").eq("id", user.id).maybeSingle();
      if (!alive) return;
      if (data && data.role === "teacher") {
        setTeacher(data);
        setPhase("dashboard");
      } else {
        await signOutTeacher();
        setPhase("login");
      }
    })();
    return () => { alive = false; };
  }, [phase]);

  const handleLogin = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get("website")) return;
    const addr = checkEmail(fd.get("email"));
    if (!addr.ok) { setError(addr.error); return; }
    const pw = checkPassword(fd.get("password"), { min: 1 });
    if (!pw.ok) { setError(pw.error); return; }
    const { signInTeacher } = await import("./api");
    const res = await signInTeacher(addr.value, pw.value, fd.get("captcha") || undefined);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setError(null);
    setTeacher(res.teacher);
    setPhase("dashboard");
  };

  const handleSignOut = async () => {
    const { signOutTeacher } = await import("./api");
    await signOutTeacher();
    setTeacher(null);
    setPhase("login");
  };

  if (phase === "boot") {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (phase === "login") {
    return (
      <Login
        onLogin={handleLogin}
        showPw={showPw}
        onTogglePw={() => setShowPw(v => !v)}
        error={error}
      />
    );
  }

  return (
    <Suspense fallback={
      <div className="login-wrap">
        <div className="login-card"><div className="spinner" /></div>
      </div>
    }>
      <Dashboard teacher={teacher} onSignOut={handleSignOut} />
    </Suspense>
  );
}

function Login({ onLogin, error, showPw, onTogglePw }) {
  const [captcha, setCaptcha] = useState("");
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (error) {
      setCaptcha("");
      setResetKey(n => n + 1);
    }
  }, [error]);

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={e => {
        if (botProtectionOn() && !captcha) {
          e.preventDefault();
          return;
        }
        onLogin(e);
      }} style={{ position: "relative" }}>
        <div className="login-frame">
          <div className="login-board">
            <div className="login-mascot"><Mascot size={92} /></div>
            <div className="login-kicker">Staff room</div>
            <h1 className="login-title">CogniMath Teacher</h1>
            <p className="login-sub">See who’s playing, post classwork, and spot who needs a look — for this class only.</p>
          </div>
        </div>
        <div className="login-body">
          {error && <div className="error-banner">{error}</div>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required placeholder="teacher@school.edu.gh" maxLength={254} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <input id="password" name="password" type={showPw ? "text" : "password"} autoComplete="current-password" required placeholder="••••••••" maxLength={72} />
              <button className="show-btn" type="button" onClick={onTogglePw}>{showPw ? "Hide" : "Show"}</button>
            </div>
          </div>
          <input name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <input type="hidden" name="captcha" value={captcha} />
          <CaptchaBox onToken={setCaptcha} resetKey={resetKey} />
          <button className="btn btn-gold" type="submit">Open my class</button>
          <p className="login-note">
            Teacher accounts are set up by an admin. Student emails can’t sign in here.
          </p>
        </div>
      </form>
    </div>
  );
}
