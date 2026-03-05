/* ─── BROWSER ADAPTATION ─── */
const { useState, useEffect, useRef } = React;

/* ─── AI ─────────────────────────────────────────────────────────────────── */
async function ai(messages, system) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: system || "You are StudyBot, a witty friendly AI tutor for students. Be concise, helpful, encouraging.",
      messages: Array.isArray(messages) ? messages : [{ role: "user", content: messages }],
    }),
  });
  const d = await r.json();
  return d.content?.[0]?.text || "Couldn't get a response. Try again!";
}

/* ─── Storage ────────────────────────────────────────────────────────────── */
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
function fmtDur(s) {
  if (s < 60) return s + "s";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? h + "h " + m + "m" : m + "m";
}
function confetti() {
  const cols = ["#7c3aed","#f472b6","#34d399","#fbbf24","#60a5fa","#fb923c"];
  for (let i = 0; i < 55; i++) {
    setTimeout(() => {
      const e = document.createElement("div");
      const sz = 6 + Math.random() * 8;
      e.style.cssText = "position:fixed;left:" + (Math.random() * 100) + "%;top:-20px;width:" + sz + "px;height:" + sz + "px;background:" + cols[Math.floor(Math.random() * cols.length)] + ";border-radius:" + (Math.random() > 0.5 ? "50%" : "3px") + ";z-index:9999;pointer-events:none;animation:cfFall " + (1.5 + Math.random() * 2) + "s linear forwards";
      document.body.appendChild(e);
      setTimeout(() => e.remove(), 4000);
    }, i * 25);
  }
}

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const BG   = "#070912"; const BG2  = "#0d1021"; const BG3  = "#131729";
const G1   = "rgba(255,255,255,0.04)"; const G2   = "rgba(255,255,255,0.08)";
const B1   = "rgba(255,255,255,0.09)"; const B2   = "rgba(255,255,255,0.16)";
const ACC  = "#7c3aed"; const ACC2 = "#a78bfa"; const GLOW = "rgba(124,58,237,0.4)";
const YEL  = "#fbbf24"; const TX   = "#eef0ff"; const TX2  = "#8b93b8";
const NAV  = 68;

/* ─── Components ─────────────────────────────────────────────────────────── */
function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{ background:G1, border:"1px solid " + B1, borderRadius:18, padding:18, ...(onClick ? { cursor:"pointer" } : {}), ...style }}>{children}</div>;
}
function Btn({ children, onClick, variant, size, disabled, style }) {
  const sz = size === "sm" ? { padding:"7px 14px", fontSize:12 } : { padding:"12px 22px", fontSize:14 };
  const vr = variant === "ghost" ? { background:G2, color:TX, border:"1px solid " + B1 } : { background:"linear-gradient(135deg," + ACC + ",#5b21b6)", color:"#fff", border:"none", boxShadow:"0 4px 18px " + GLOW };
  return <button onClick={disabled ? undefined : onClick} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7, borderRadius:50, fontWeight:700, cursor:"pointer", ...sz, ...vr, ...style }}>{children}</button>;
}
function Field({ label, style, ...p }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", marginBottom:6 }}>{label}</div>}
      <input style={{ width:"100%", background:G1, border:"1px solid " + B1, borderRadius:12, padding:"12px 16px", color:TX, fontSize:14, outline:"none", ...style }} {...p} />
    </div>
  );
}

/* ─── Auth ───────────────────────────────────────────────────────────────── */
function Auth({ onAuth }) {
  const [name, setName] = useState("");
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:BG }}>
      <div style={{ width:"100%", maxWidth:380, textAlign:"center" }}>
        <h1 style={{ color:TX, fontSize:42, marginBottom:10, fontFamily:"sans-serif" }}>StudyVault</h1>
        <div style={{ background:BG2, padding:26, borderRadius:24, border:"1px solid "+B2 }}>
          <Field label="What's your name?" value={name} onChange={e => setName(e.target.value)} />
          <Btn style={{ width:"100%" }} onClick={() => { if(name) { onAuth({name, avatar:"🎓"}); confetti(); } }}>Enter Vault 🚀</Btn>
        </div>
      </div>
    </div>
  );
}

/* ─── Home ───────────────────────────────────────────────────────────────── */
function Home({ user, sessions, streak }) {
  return (
    <div style={{ padding:20, color:TX }}>
      <h2 style={{ fontSize:26 }}>Hey, {user.name}! 👋</h2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:20 }}>
        <Card style={{ background:"rgba(251,191,36,0.08)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:TX2 }}>Streak 🔥</div>
          <div style={{ fontSize:40, fontWeight:800, color:YEL }}>{streak.current}</div>
        </Card>
        <Card>
          <div style={{ fontSize:11, fontWeight:700, color:TX2 }}>Study Time ⏱️</div>
          <div style={{ fontSize:20, fontWeight:800, marginTop:10 }}>{fmtDur(sessions.reduce((a,s)=>a+s.duration, 0))}</div>
        </Card>
      </div>
    </div>
  );
}

/* ─── APP SHELL ──────────────────────────────────────────────────────────── */
function App() {
  const [user, setUser] = useState(LS.get("user", null));
  const [sessions] = useState(LS.get("sessions", []));
  const [streak] = useState(LS.get("streak", { current: 1 }));

  if (!user) return <Auth onAuth={(u) => { LS.set("user", u); setUser(u); }} />;

  return (
    <div style={{ minHeight:"100vh", background:BG }}>
      <Home user={user} sessions={sessions} streak={streak} />
      <div style={{ position:"fixed", bottom:20, width:"100%", textAlign:"center" }}>
         <Btn variant="ghost" onClick={() => { LS.set("user", null); setUser(null); }}>Logout</Btn>
      </div>
    </div>
  );
}

/* ─── THE RENDER CALL ─── */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

