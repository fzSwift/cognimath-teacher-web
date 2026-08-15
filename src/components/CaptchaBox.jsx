import React, { useEffect, useRef } from "react";
import { TURNSTILE_SITE_KEY } from "../config";

export function botProtectionOn() {
  return Boolean(TURNSTILE_SITE_KEY);
}

let _script = null;
function loadTurnstile() {
  if (typeof document === "undefined") return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (_script) return _script;
  _script = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve(window.turnstile);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _script;
}

export function CaptchaBox({ onToken, resetKey }) {
  const host = useRef(null);
  const widget = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined;
    let gone = false;
    (async () => {
      const ts = await loadTurnstile();
      if (gone || !ts || !host.current) return;
      if (widget.current != null) {
        try { ts.remove(widget.current); } catch (e) { /* reset */ }
      }
      host.current.innerHTML = "";
      widget.current = ts.render(host.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: token => onToken && onToken(token),
        "expired-callback": () => onToken && onToken(""),
        "error-callback": () => onToken && onToken(""),
        theme: "light",
      });
    })();
    return () => {
      gone = true;
      try {
        if (window.turnstile && widget.current != null) window.turnstile.remove(widget.current);
      } catch (e) { /* unmount */ }
      widget.current = null;
    };
  }, [onToken, resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div className="captcha-box" ref={host} />;
}
