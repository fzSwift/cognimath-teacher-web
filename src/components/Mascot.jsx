/* ============================================================
   CogniMath Teacher — Mascot.jsx
   The abacus mascot from the app icon (scripts/generate-assets.js
   in cognimath-app), drawn as an inline SVG so branding matches
   the student app exactly. `size` is the rendered box.
   ============================================================ */

export default function Mascot({ size = 64, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      className={className}
      role="img"
      aria-label="CogniMath abacus mascot"
      focusable="false"
    >
      <rect x="170" y="246" width="684" height="564" rx="80" fill="#15513B" opacity="0.18" />
      <rect x="170" y="230" width="684" height="564" rx="80" fill="#FFFCF4" stroke="#E3D8BB" strokeWidth="8" />
      <rect x="206" y="282" width="26" height="460" rx="13" fill="#E4572E" />
      <rect x="258" y="286" width="508" height="452" rx="44" fill="none" stroke="#C89B5A" strokeWidth="24" />
      <rect x="288" y="316" width="448" height="392" rx="30" fill="#FBF6E9" />
      <line x1="318" y1="400" x2="706" y2="400" stroke="#A96F3A" strokeWidth="10" strokeLinecap="round" />
      <line x1="318" y1="512" x2="706" y2="512" stroke="#A96F3A" strokeWidth="10" strokeLinecap="round" />
      <line x1="318" y1="624" x2="706" y2="624" stroke="#A96F3A" strokeWidth="10" strokeLinecap="round" />
      <circle cx="348" cy="400" r="30" fill="#F0B429" />
      <circle cx="396" cy="400" r="30" fill="#1F9D6E" />
      <circle cx="628" cy="400" r="30" fill="#3B82C4" />
      <circle cx="676" cy="400" r="30" fill="#D9483A" />
      <circle cx="348" cy="512" r="30" fill="#3B82C4" />
      <circle cx="396" cy="512" r="30" fill="#D9483A" />
      <circle cx="628" cy="512" r="30" fill="#1F9D6E" />
      <circle cx="676" cy="512" r="30" fill="#F0B429" />
      <circle cx="348" cy="624" r="30" fill="#1F9D6E" />
      <circle cx="396" cy="624" r="30" fill="#F0B429" />
      <circle cx="628" cy="624" r="30" fill="#D9483A" />
      <circle cx="676" cy="624" r="30" fill="#3B82C4" />
      <circle cx="512" cy="512" r="88" fill="#FFFCF4" stroke="#C89B5A" strokeWidth="10" />
      <circle cx="484" cy="500" r="13" fill="#33302B" />
      <circle cx="540" cy="500" r="13" fill="#33302B" />
      <circle cx="478" cy="492" r="4.5" fill="#ffffff" />
      <circle cx="534" cy="492" r="4.5" fill="#ffffff" />
      <circle cx="462" cy="522" r="11" fill="#E4572E" opacity="0.45" />
      <circle cx="562" cy="522" r="11" fill="#E4572E" opacity="0.45" />
      <path d="M494 528 Q 512 546 530 528" fill="none" stroke="#33302B" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
