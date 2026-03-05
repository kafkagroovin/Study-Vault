import React, { useState, useEffect, useRef } from "react";

/* ─── Local AI Simulator (works offline, uses patterns & responses) ────── */
const localAI = {
  // Pre-defined responses for different query types
  tips: [
    "Teach concepts out loud — if you can explain it simply, you truly understand it.",
    "Take a 5-minute break every 25 minutes. Your brain needs rest to form memories.",
    "Active recall > passive reading. Quiz yourself instead of just re-reading notes.",
    "Sleep is when your brain consolidates memories. Don't sacrifice sleep for cramming.",
    "The Pomodoro technique: 25 min focus, 5 min break. It trains your attention span.",
    "Explain what you just learned to an imaginary 10-year-old. If you can't, you don't know it well enough.",
    "Your brain remembers what it thinks about first and last. Start and end study sessions with the most important stuff.",
    "Handwrite key concepts. Typing is fast but writing by hand improves memory encoding.",
    "Study in different locations. Your brain forms context cues that help recall.",
    "Before bed, review what you want to remember. Sleep helps consolidate memories."
  ],
  
  studyPatterns: (sessions) => {
    if (sessions.length < 3) {
      return "✨ Log more sessions and I'll spot patterns! For now: try to study at the same time each day to build a habit.";
    }
    
    const subjects = {};
    sessions.forEach(s => { subjects[s.subject] = (subjects[s.subject] || 0) + 1; });
    const topSubject = Object.entries(subjects).sort((a,b) => b[1] - a[1])[0];
    
    const avgMood = sessions.reduce((sum, s) => sum + (s.mood || 3), 0) / sessions.length;
    
    return [
      `📊 Your most studied subject: ${topSubject ? topSubject[0] : 'None yet'}`,
      `😊 Average mood: ${avgMood.toFixed(1)}/5`,
      `💡 Tip: ${avgMood < 3 ? 'Try shorter sessions if you\'re feeling overwhelmed' : 'You\'re in a good zone! Keep going'}`,
      `⏱️ Best time: ${getBestTime(sessions)}`
    ].join('\n\n');
  },
  
  roastSpending: (transactions, budget) => {
    const total = transactions.filter(t => t.type === "expense").reduce((a,t) => a + t.amount, 0);
    const food = transactions.filter(t => t.cat === "Food").reduce((a,t) => a + t.amount, 0);
    
    if (total === 0) return "No spending to roast yet! Go buy some coffee first ☕";
    
    const roasts = [
      `You've spent $${total.toFixed(0)}. That's like ${Math.round(total/5)} lattes! ☕`,
      food > 50 ? `$${food.toFixed(0)} on food? Your fridge is living better than you! 🍕` : `Smart spender on food!`,
      budget.monthly > 0 && total > budget.monthly * 0.8 ? `⚠️ Danger zone: You're at ${Math.round(total/budget.monthly*100)}% of budget!` : `Budget looking healthy 👍`,
      `Pro tip: Wait 24h before buying anything over $50. Future you will thank you.`
    ];
    
    return roasts.join('\n\n');
  },
  
  summarize: (text) => {
    const words = text.split(/\s+/).length;
    return `• Key points from your note (${words} words)\n• Main idea: ${text.substring(0, 100)}...\n• Remember: focus on understanding, not memorizing`;
  },
  
  quiz: (topic) => {
    const quizzes = {
      default: [
        { q: "What's the best way to study?", options: ["Cramming", "Active recall", "Reading only", "Highlighting"], answer: 1 },
        { q: "How often should you take breaks?", options: ["Never", "Every 5 min", "Every 25-30 min", "Once per hour"], answer: 2 },
        { q: "Sleep helps with:", options: ["Wasting time", "Memory consolidation", "Dreaming only", "Nothing"], answer: 1 }
      ],
      math: [
        { q: "What is 7 × 8?", options: ["48", "56", "64", "54"], answer: 1 },
        { q: "What is the square root of 144?", options: ["12", "14", "16", "10"], answer: 0 }
      ]
    };
    return quizzes.default;
  },
  
  flashcards: (text) => {
    return [
      { front: "Active Recall", back: "Testing yourself instead of just re-reading" },
      { front: "Spaced Repetition", back: "Reviewing material at increasing intervals" },
      { front: "Pomodoro", back: "25 min work, 5 min break cycles" },
      { front: "Memory Consolidation", back: "Process where short-term memories become long-term" }
    ];
  }
};

const getBestTime = (sessions) => {
  const hours = sessions.map(s => new Date(s.date).getHours());
  if (hours.length === 0) return "any time works!";
  const avg = hours.reduce((a,b) => a + b, 0) / hours.length;
  if (avg < 12) return "morning 🌅";
  if (avg < 17) return "afternoon ☀️";
  if (avg < 21) return "evening 🌆";
  return "night 🌙";
};

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

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
  if (d < 3600000) return Math.floor(d / 60000) + "m ago";
  if (d < 86400000) return Math.floor(d / 3600000) + "h ago";
  return Math.floor(d / 86400000) + "d ago";
}

function isThisMonth(s) {
  const d = new Date(s), n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function stripHtml(h) {
  const d = document.createElement("div");
  d.innerHTML = h;
  return d.textContent || "";
}

function hueOf(s) {
  let h = 0;
  for (const c of (s || "x")) h = c.charCodeAt(0) + h * 31;
  const cols = ["#7c3aed","#db2777","#059669","#d97706","#2563eb","#dc2626"];
  return cols[Math.abs(h) % cols.length];
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

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start(); o.stop(ctx.currentTime + 0.5);
  } catch {}
}

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const BG   = "#070912";
const BG2  = "#0d1021";
const BG3  = "#131729";
const G1   = "rgba(255,255,255,0.04)";
const G2   = "rgba(255,255,255,0.08)";
const B1   = "rgba(255,255,255,0.09)";
const B2   = "rgba(255,255,255,0.16)";
const ACC  = "#7c3aed";
const ACC2 = "#a78bfa";
const GLOW = "rgba(124,58,237,0.4)";
const RED  = "#f472b6";
const GRN  = "#34d399";
const YEL  = "#fbbf24";
const TX   = "#eef0ff";
const TX2  = "#8b93b8";
const TX3  = "#4a5175";
const NAV  = 68;

/* ─── Global CSS ─────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
@keyframes cfFall  { to { transform:translateY(110vh) rotate(720deg); opacity:0; } }
@keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes popIn   { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
@keyframes spin    { to { transform:rotate(360deg); } }
@keyframes pulse   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
@keyframes orb1    { 0%{transform:translate(0,0)} 100%{transform:translate(40px,25px)} }
@keyframes orb2    { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,-35px)} }
@keyframes bk3     { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
@keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes bkIn    { from{opacity:0} to{opacity:1} }
@keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(10px) scale(0.9)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
* { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
html,body { background:#070912; }
body { font-family:'Plus Jakarta Sans',sans-serif; color:#eef0ff; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
::-webkit-scrollbar { width:3px; }
::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:4px; }
input,textarea,select,button { font-family:'Plus Jakarta Sans',sans-serif; }
[contenteditable]:focus { outline:none; }
[contenteditable] h1 { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; margin:8px 0; }
[contenteditable] h2 { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; margin:6px 0; }
[contenteditable] em { color:#a78bfa; }
[contenteditable] code { background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:5px; font-family:monospace; font-size:13px; color:#34d399; }
[contenteditable] blockquote { border-left:3px solid #7c3aed; padding-left:14px; color:#8b93b8; font-style:italic; margin:10px 0; }
[contenteditable] ul,[contenteditable] ol { padding-left:22px; }
[contenteditable] li { margin-bottom:4px; }
`;

/* ─── Toast ──────────────────────────────────────────────────────────────── */
let _pushToast;
const toast = (msg) => _pushToast && _pushToast(msg);

function Toasts() {
  const [list, setList] = useState([]);
  _pushToast = (msg) => {
    const id = uid();
    setList(l => [...l, { id, msg }]);
    setTimeout(() => setList(l => l.filter(x => x.id !== id)), 3000);
  };
  return (
    <div style={{ position:"fixed", bottom:NAV + 14, left:"50%", transform:"translateX(-50%)", zIndex:9900, display:"flex", flexDirection:"column", gap:6, pointerEvents:"none" }}>
      {list.map(t => (
        <div key={t.id} style={{ background:BG3, border:"1px solid " + B2, borderRadius:50, padding:"10px 20px", fontSize:13, fontWeight:600, color:TX, whiteSpace:"nowrap", boxShadow:"0 8px 28px rgba(0,0,0,0.5)", animation:"toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>{t.msg}</div>
      ))}
    </div>
  );
}

/* ─── Components ─────────────────────────────────────────────────────────── */
function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background:G1, border:"1px solid " + B1, borderRadius:18, padding:18, ...(onClick ? { cursor:"pointer" } : {}), ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant, size, disabled, style }) {
  const v = variant || "primary";
  const sz = size === "sm" ? { padding:"7px 14px", fontSize:12 } : { padding:"12px 22px", fontSize:14 };
  const vr = v === "ghost"
    ? { background:G2, color:TX, border:"1px solid " + B1 }
    : v === "danger"
    ? { background:"rgba(239,68,68,0.12)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.35)" }
    : { background:"linear-gradient(135deg," + ACC + ",#5b21b6)", color:"#fff", border:"none", boxShadow:"0 4px 18px " + GLOW };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7, borderRadius:50, fontWeight:700, cursor:disabled ? "not-allowed" : "pointer", transition:"all 0.2s", opacity:disabled ? 0.5 : 1, ...sz, ...vr, ...style }}>
      {children}
    </button>
  );
}

function Field({ label, style, ...p }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>{label}</div>}
      <input style={{ width:"100%", background:G1, border:"1px solid " + B1, borderRadius:12, padding:"12px 16px", color:TX, fontSize:14, outline:"none", ...style }}
        onFocus={e => { e.target.style.borderColor = ACC; e.target.style.boxShadow = "0 0 0 3px " + GLOW; }}
        onBlur={e  => { e.target.style.borderColor = B1;  e.target.style.boxShadow = "none"; }} {...p} />
    </div>
  );
}

function Spin() {
  return <div style={{ width:18, height:18, border:"2px solid " + B2, borderTopColor:ACC2, borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />;
}

function Empty({ em, title, sub }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"44px 20px", textAlign:"center", gap:10 }}>
      <div style={{ fontSize:46, animation:"pulse 2.5s infinite" }}>{em}</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700 }}>{title}</div>
      <div style={{ fontSize:13, color:TX2, maxWidth:200, lineHeight:1.65 }}>{sub}</div>
    </div>
  );
}

function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", zIndex:600, display:"flex", alignItems:"flex-end", justifyContent:"center", animation:"bkIn 0.25s ease" }}>
      <div style={{ background:BG2, border:"1px solid " + B2, borderRadius:"24px 24px 0 0", padding:"24px 20px 40px", width:"100%", maxWidth:500, animation:"slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)", maxHeight:"88vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800 }}>{title}</div>
          <button onClick={onClose} style={{ background:G2, border:"1px solid " + B1, color:TX2, borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, cursor:"pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  AUTH                                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Auth({ onAuth }) {
  const [step, setStep]   = useState("main");
  const [email, setEmail] = useState("");
  const [otp, setOtp]     = useState("");
  const [name, setName]   = useState("");
  const [stype, setStype] = useState("University");
  const [pUser, setPUser] = useState(null);

  const types = [["🏫","High School"],["🎓","University"],["📖","Self-learning"],["💼","Professional"]];

  const goGuest = () => { setPUser({ method:"guest", email:"" }); setStep("onboard"); };
  const goMagic = () => {
    if (!email.trim()) { toast("Enter your email 📧"); return; }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    LS.set("_otp", code);
    toast("Demo code: " + code);
    setPUser({ method:"magic", email: email.trim() });
    setStep("otp");
  };
  const verifyOtp = () => {
    if (otp === LS.get("_otp", "")) { LS.set("_otp", ""); setStep("onboard"); }
    else toast("Wrong code ❌");
  };
  const finish = () => {
    if (!name.trim()) { toast("Tell us your name 😊"); return; }
    onAuth({ ...pUser, name: name.trim(), type: stype, avatar: "🎓" });
    confetti();
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", position:"relative", overflow:"hidden", background:BG }}>
      <div style={{ position:"absolute", top:"-25%", left:"-20%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,0.22) 0%,transparent 70%)", animation:"orb1 7s ease-in-out infinite alternate", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"-20%", right:"-15%", width:420, height:420, borderRadius:"50%", background:"radial-gradient(circle,rgba(244,114,182,0.15) 0%,transparent 70%)", animation:"orb2 5s ease-in-out infinite alternate", pointerEvents:"none" }} />

      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:380, animation:"fadeUp 0.6s ease" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:46, fontWeight:800, lineHeight:1 }}>
            Study<span style={{ color:ACC2, textShadow:"0 0 40px " + ACC }}>Vault</span>
          </div>
          <div style={{ fontSize:14, color:TX2, marginTop:8 }}>Your studies, supercharged ⚡</div>
        </div>

        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid " + B2, borderRadius:24, padding:26, backdropFilter:"blur(24px)" }}>

          {step === "main" && (
            <div>
              <p style={{ fontSize:13, color:TX2, marginBottom:16, lineHeight:1.65 }}>No passwords. No hassle. Pick your way in 👇</p>
              {[
                { icon:"⚡", bg:"rgba(251,191,36,0.15)", title:"Continue as Guest", sub:"Instant access, zero signup", fn: goGuest },
                { icon:"✉️", bg:"rgba(124,58,237,0.2)",  title:"Magic Link",       sub:"One-time code to your email", fn:() => setStep("magic") },
              ].map(o => (
                <button key={o.title} onClick={o.fn}
                  style={{ display:"flex", alignItems:"center", gap:14, width:"100%", padding:15, background:G1, border:"1px solid " + B1, borderRadius:14, marginBottom:10, textAlign:"left", color:TX, cursor:"pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ACC; e.currentTarget.style.background = "rgba(124,58,237,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = B1;  e.currentTarget.style.background = G1; }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:o.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{o.icon}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700 }}>{o.title}</div>
                    <div style={{ fontSize:12, color:TX2, marginTop:2 }}>{o.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === "magic" && (
            <div>
              <button onClick={() => setStep("main")} style={{ background:"none", border:"none", color:TX2, fontSize:13, marginBottom:14, cursor:"pointer" }}>← Back</button>
              <Field label="Your email" type="email" placeholder="student@uni.edu" value={email} onChange={e => setEmail(e.target.value)} />
              <Btn style={{ width:"100%" }} onClick={goMagic}>Send Code ✨</Btn>
            </div>
          )}

          {step === "otp" && (
            <div>
              <p style={{ fontSize:13, color:TX2, marginBottom:16 }}>Enter the 6-digit code:</p>
              <Field type="text" maxLength={6} placeholder="000000" value={otp} onChange={e => setOtp(e.target.value)} style={{ textAlign:"center", fontSize:28, fontFamily:"'Syne',sans-serif", letterSpacing:8 }} />
              <Btn style={{ width:"100%" }} onClick={verifyOtp}>Verify →</Btn>
            </div>
          )}

          {step === "onboard" && (
            <div>
              <div style={{ textAlign:"center", fontSize:34, marginBottom:14 }}>👋</div>
              <Field label="What's your name?" placeholder="e.g. Alex" value={name} onChange={e => setName(e.target.value)} />
              <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:10 }}>I'm studying…</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
                {types.map(([em, lb]) => (
                  <button key={lb} onClick={() => setStype(lb)} style={{ padding:"8px 14px", borderRadius:50, fontSize:12, fontWeight:600, border:"1px solid " + (stype === lb ? ACC : B1), background:stype === lb ? "rgba(124,58,237,0.2)" : G1, color:stype === lb ? ACC2 : TX2, cursor:"pointer" }}>
                    {em} {lb}
                  </button>
                ))}
              </div>
              <Btn style={{ width:"100%" }} onClick={finish}>Let's Go 🚀</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  HOME                                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Home({ user, sessions, transactions, notes, streak, budget }) {
  const [tip, setTip]         = useState("");
  const [tipLoad, setTipLoad] = useState(true);

  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning ☀️" : hr < 17 ? "Good afternoon 🌤" : hr < 21 ? "Good evening 🌆" : "Late night grind 🌙";
  const today = new Date().toDateString();
  const todaySecs = sessions.filter(s => new Date(s.date).toDateString() === today).reduce((a,s) => a + s.duration, 0);
  const spent = transactions.filter(t => t.type === "expense" && isThisMonth(t.date)).reduce((a,t) => a + t.amount, 0);
  const bleft = budget.monthly > 0 ? budget.monthly - spent : null;
  const bpct  = budget.monthly > 0 ? Math.min(100, (spent / budget.monthly) * 100) : 0;

  const wk = [0,0,0,0,0,0,0];
  sessions.forEach(s => {
    const d = new Date(s.date), now = new Date(), df = Math.floor((now - d) / 86400000);
    if (df < 7) { let dw = d.getDay(); dw = dw === 0 ? 6 : dw - 1; wk[dw] += s.duration / 3600; }
  });
  const maxW = Math.max(...wk, 0.1);
  const recent = [...notes].sort((a,b) => b.updated - a.updated).slice(0, 3);

  useEffect(() => {
    setTipLoad(true);
    setTimeout(() => {
      const randomTip = localAI.tips[Math.floor(Math.random() * localAI.tips.length)];
      setTip(randomTip);
      setTipLoad(false);
    }, 800);
  }, []);

  return (
    <div style={{ paddingBottom:16 }}>
      <div style={{ padding:"22px 18px 6px", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{greet}</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800 }}>Hey, {user.name}! 👋</div>
        </div>
        <div style={{ width:46, height:46, borderRadius:"50%", background:"linear-gradient(135deg," + ACC + ",#5b21b6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, border:"2px solid " + B2 }}>{user.avatar}</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"14px 14px 0" }}>
        <Card style={{ background:"rgba(251,191,36,0.08)", borderColor:"rgba(251,191,36,0.2)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>Streak 🔥</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:40, fontWeight:800, color:YEL, lineHeight:1 }}>{streak.current}</div>
          <div style={{ fontSize:12, color:TX2, marginTop:4 }}>days in a row</div>
        </Card>

        <Card>
          <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>Today ⏱</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:30, fontWeight:800, color:ACC2, lineHeight:1 }}>{fmtDur(todaySecs)}</div>
          <div style={{ fontSize:12, color:TX2, marginTop:4 }}>studied today</div>
        </Card>

        <Card style={{ gridColumn:"1/-1" }}>
          <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>Budget Left 💸</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:bleft === null ? TX3 : bleft > 0 ? GRN : "#ef4444", marginBottom:10 }}>
            {bleft === null ? "Set budget →" : (budget.currency || "$") + Math.max(0, bleft).toFixed(0) + " left"}
          </div>
          {budget.monthly > 0 && (
            <div style={{ background:G2, borderRadius:50, height:5, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:50, width:bpct + "%", background:bpct > 80 ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg," + GRN + "," + ACC + ")", transition:"width 1s" }} />
            </div>
          )}
        </Card>

        <Card style={{ gridColumn:"1/-1", background:"rgba(124,58,237,0.07)", borderColor:"rgba(124,58,237,0.22)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:ACC2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>✦ Tip of the Day</div>
          {tipLoad
            ? <div style={{ display:"flex", gap:10, alignItems:"center", color:TX2, fontSize:13 }}><Spin /> Loading…</div>
            : <div style={{ fontSize:14, lineHeight:1.75 }}>{tip}</div>}
        </Card>

        <Card style={{ gridColumn:"1/-1" }}>
          <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:14 }}>This Week 📊</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
            {wk.map((h, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                <div style={{ width:"100%", borderRadius:6, background:h > 0 ? "linear-gradient(180deg," + ACC + ",rgba(124,58,237,0.3))" : G2, height:Math.max(4, (h / maxW) * 68), transition:"height 1s cubic-bezier(0.34,1.56,0.64,1)" }} />
                <div style={{ fontSize:10, color:TX3, fontWeight:600 }}>{"MTWTFSS"[i]}</div>
              </div>
            ))}
          </div>
        </Card>

        {recent.length > 0 && (
          <Card style={{ gridColumn:"1/-1" }}>
            <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:12 }}>Recent Notes 📝</div>
            {recent.map((n, i) => (
              <div key={n.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:i < recent.length - 1 ? "1px solid " + B1 : "none" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:ACC, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n.title || "Untitled"}</div>
                  <div style={{ fontSize:11, color:TX2, marginTop:2 }}>{n.subject || "No subject"} · {timeAgo(n.updated)}</div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  STUDY                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Study({ sessions, onAdd }) {
  const [mode, setMode] = useState("pomo");
  const [rem, setRem]   = useState(25 * 60);
  const [tot, setTot]   = useState(25 * 60);
  const [run, setRun]   = useState(false);
  const [sub, setSub]   = useState("");
  const [mood, setMood] = useState(false);
  const [pDur, setPDur] = useState(0);
  const [aiRes, setAiRes]   = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const iv = useRef(null);

  const MODES = { pomo:{ dur:25*60, lbl:"FOCUS 🍅" }, sht:{ dur:10*60, lbl:"SHORT ⚡" }, free:{ dur:0, lbl:"FREE ⏱" } };

  const switchMode = m => {
    clearInterval(iv.current); setRun(false); setMood(false);
    const d = MODES[m].dur;
    setMode(m); setRem(d); setTot(d);
  };

  const startTimer = () => {
    setRun(true); setMood(false);
    iv.current = setInterval(() => {
      setRem(r => {
        if (mode === "free") return r + 1;
        if (r <= 1) { clearInterval(iv.current); setRun(false); done(tot); return 0; }
        return r - 1;
      });
    }, 1000);
  };

  const pause = () => { clearInterval(iv.current); setRun(false); };
  const reset = () => { clearInterval(iv.current); setRun(false); setMood(false); const d = MODES[mode].dur; setRem(d); setTot(d); };
  const done  = dur => { setPDur(dur || rem); setMood(true); beep(); confetti(); };

  const logMood = m => {
    onAdd({ id:uid(), subject:sub.trim() || "General", duration:pDur, date:new Date().toISOString(), mood:m });
    setMood(false); toast("✅ " + fmtDur(pDur) + " logged!");
  };

  const R = 88, circ = 2 * Math.PI * R;
  const pct = tot > 0 ? (mode === "free" ? ((rem % 3600) / 3600) : (rem / tot)) : 0;
  const mm = String(Math.floor(rem / 60)).padStart(2, "0");
  const ss = String(rem % 60).padStart(2, "0");

  const analyze = async () => {
    if (sessions.length < 2) { toast("Log at least 2 sessions first!"); return; }
    setAiLoad(true); setAiRes("");
    setTimeout(() => {
      setAiRes(localAI.studyPatterns(sessions));
      setAiLoad(false);
    }, 800);
  };

  return (
    <div style={{ paddingBottom:16 }}>
      <div style={{ padding:"20px 18px 8px", fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800 }}>
        Study <span style={{ color:ACC2 }}>Timer</span>
      </div>

      <div style={{ display:"flex", gap:6, margin:"0 16px 14px", padding:4, background:G1, borderRadius:50, border:"1px solid " + B1 }}>
        {[["pomo","🍅 Pomodoro"],["sht","⚡ Short"],["free","⏱ Free"]].map(([m, lb]) => (
          <button key={m} onClick={() => switchMode(m)} style={{ flex:1, padding:"8px 0", borderRadius:50, fontSize:12, fontWeight:700, border:"none", cursor:"pointer", background:mode === m ? ACC : "none", color:mode === m ? "#fff" : TX2, boxShadow:mode === m ? "0 2px 12px " + GLOW : "none", transition:"all 0.2s" }}>{lb}</button>
        ))}
      </div>

      <div style={{ padding:"0 16px 14px" }}>
        <input value={sub} onChange={e => setSub(e.target.value)} placeholder="📚 What are you studying?" style={{ width:"100%", background:G1, border:"1px solid " + B1, borderRadius:50, padding:"11px 20px", color:TX, fontSize:14, outline:"none" }} onFocus={e => e.target.style.borderColor = ACC} onBlur={e => e.target.style.borderColor = B1} />
      </div>

      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"4px 0 14px" }}>
        <div style={{ position:"relative", width:200, height:200, marginBottom:18 }}>
          <svg width="200" height="200" style={{ transform:"rotate(-90deg)" }}>
            <circle cx="100" cy="100" r={R} fill="none" stroke={G2} strokeWidth={8} />
            <circle cx="100" cy="100" r={R} fill="none" stroke={ACC} strokeWidth={8} strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
              style={{ filter:"drop-shadow(0 0 8px " + ACC + ")", transition:"stroke-dashoffset 1s linear" }} />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:44, fontWeight:800, letterSpacing:-2 }}>{mm}:{ss}</div>
            <div style={{ fontSize:10, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:2, marginTop:2 }}>{MODES[mode].lbl}</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:14, alignItems:"center" }}>
          <button onClick={reset} style={{ width:50, height:50, borderRadius:"50%", background:G2, border:"1px solid " + B1, color:TX2, fontSize:22, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>↺</button>
          <button onClick={run ? pause : startTimer} style={{ width:70, height:70, borderRadius:"50%", background:"linear-gradient(135deg," + ACC + ",#5b21b6)", border:"none", color:"#fff", fontSize:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 6px 28px " + GLOW }}>
            {run ? "⏸" : "▶"}
          </button>
          <button onClick={() => { if (run) done(tot - rem); }} style={{ width:50, height:50, borderRadius:"50%", background:G2, border:"1px solid " + B1, color:TX2, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>⏭</button>
        </div>

        {mood && (
          <div style={{ marginTop:22, textAlign:"center", animation:"popIn 0.4s ease" }}>
            <div style={{ fontSize:13, color:TX2, marginBottom:12 }}>How was that session?</div>
            <div style={{ display:"flex", gap:14, fontSize:30 }}>
              {["😫","😕","😐","😊","🤩"].map((e, i) => (
                <span key={i} onClick={() => logMood(i + 1)} style={{ cursor:"pointer", transition:"transform 0.2s", display:"inline-block" }}
                  onMouseEnter={ev => ev.target.style.transform = "scale(1.3)"}
                  onMouseLeave={ev => ev.target.style.transform = "scale(1)"}>{e}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding:"0 16px 10px" }}>
        <Btn variant="ghost" style={{ width:"100%", marginBottom:10 }} onClick={analyze} disabled={aiLoad}>
          {aiLoad ? <><Spin /> Analyzing…</> : "✦ Analyze My Patterns"}
        </Btn>
        {aiRes && <Card style={{ background:"rgba(124,58,237,0.07)", borderColor:"rgba(124,58,237,0.22)", fontSize:14, lineHeight:1.75, whiteSpace:"pre-wrap" }}>{aiRes}</Card>}
      </div>

      <div style={{ padding:"4px 16px 0" }}>
        <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>Session Log</div>
        {sessions.length === 0
          ? <Empty em="⏰" title="No sessions yet" sub="Start the timer and log your first study session!" />
          : [...sessions].reverse().slice(0, 15).map(s => (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", background:G1, border:"1px solid " + B1, borderRadius:14, marginBottom:8 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:hueOf(s.subject), flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>{s.subject}</div>
                <div style={{ fontSize:11, color:TX2, marginTop:2 }}>{new Date(s.date).toLocaleDateString()} · {"⭐".repeat(s.mood || 3)}</div>
              </div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:ACC2 }}>{fmtDur(s.duration)}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MONEY                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Money({ transactions, budget, onAddTxn, onDelTxn, onSetBudget }) {
  const [addOpen, setAddOpen]     = useState(false);
  const [budOpen, setBudOpen]     = useState(false);
  const [roast, setRoast]         = useState("");
  const [roastLoad, setRoastLoad] = useState(false);
  const [form, setForm]           = useState({ type:"expense", amount:"", desc:"", cat:"Food", emoji:"🍕" });
  const [budF, setBudF]           = useState({ monthly:budget.monthly || "", currency:budget.currency || "$" });

  const CATS = [["🍕","Food"],["📚","Books"],["🚌","Transport"],["🎮","Entertainment"],["🏠","Housing"],["💊","Health"],["🛒","Shopping"],["☕","Coffee"],["💰","Other"]];
  const c = budget.currency || "$";
  const totalInc = transactions.filter(t => t.type === "income").reduce((a,t) => a + t.amount, 0);
  const totalExp = transactions.filter(t => t.type === "expense").reduce((a,t) => a + t.amount, 0);
  const monthExp = transactions.filter(t => t.type === "expense" && isThisMonth(t.date)).reduce((a,t) => a + t.amount, 0);
  const bal  = totalInc - totalExp;
  const bpct = budget.monthly > 0 ? Math.min(100, (monthExp / budget.monthly) * 100) : 0;

  const catMap = {};
  transactions.filter(t => t.type === "expense").forEach(t => { const k = t.emoji + " " + t.cat; catMap[k] = (catMap[k] || 0) + t.amount; });
  const catRows = Object.entries(catMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
  const maxCat  = Math.max(...catRows.map(r => r[1]), 1);

  const submit = () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { toast("Enter a valid amount"); return; }
    onAddTxn({ id:uid(), ...form, amount:amt, date:new Date().toISOString() });
    setAddOpen(false); setForm({ type:"expense", amount:"", desc:"", cat:"Food", emoji:"🍕" });
    toast("Added ✅");
  };

  const doRoast = async () => {
    const exp = transactions.filter(t => t.type === "expense" && isThisMonth(t.date));
    if (exp.length < 2) { toast("Add more expenses first!"); return; }
    setRoastLoad(true); setRoast("");
    setTimeout(() => {
      setRoast(localAI.roastSpending(exp, budget));
      setRoastLoad(false);
    }, 800);
  };

  return (
    <div style={{ paddingBottom:16 }}>
      <div style={{ padding:"20px 18px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800 }}>Money <span style={{ color:ACC2 }}>Tracker</span></div>
        <Btn size="sm" onClick={() => setAddOpen(true)}>+ Add</Btn>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, padding:"0 14px 14px" }}>
        {[["Income", c + totalInc.toFixed(2), GRN],["Spent", c + totalExp.toFixed(2), RED],["Balance", c + Math.abs(bal).toFixed(2), bal >= 0 ? GRN : "#ef4444"]].map(([l,v,col]) => (
          <Card key={l} style={{ textAlign:"center", padding:"14px 8px" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, color:col }}>{v}</div>
            <div style={{ fontSize:10, color:TX2, fontWeight:700, textTransform:"uppercase", marginTop:3, letterSpacing:0.5 }}>{l}</div>
          </Card>
        ))}
      </div>

      <div style={{ padding:"0 14px 14px" }}>
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Monthly Budget</div>
            <button onClick={() => setBudOpen(true)} style={{ background:"none", border:"none", color:ACC2, fontSize:12, fontWeight:700, cursor:"pointer" }}>Edit</button>
          </div>
          {budget.monthly > 0 ? (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, color:TX2 }}>{c}{monthExp.toFixed(2)} of {c}{budget.monthly}</span>
                <span style={{ fontSize:12, fontWeight:700, color:bpct > 80 ? "#ef4444" : bpct > 50 ? YEL : GRN }}>{bpct.toFixed(0)}%</span>
              </div>
              <div style={{ background:G2, borderRadius:50, height:7, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:50, width:bpct + "%", background:bpct > 80 ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg," + GRN + "," + ACC + ")", transition:"width 1s" }} />
              </div>
            </div>
          ) : <div style={{ fontSize:13, color:TX2 }}>Tap <b style={{ color:ACC2 }}>Edit</b> to set your monthly budget</div>}
        </Card>
      </div>

      {catRows.length > 0 && (
        <div style={{ padding:"0 14px 14px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>By Category</div>
          <Card>
            {catRows.map(([k, v]) => (
              <div key={k} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:13 }}>{k}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:RED }}>{c}{v.toFixed(2)}</span>
                </div>
                <div style={{ background:G2, borderRadius:50, height:5, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:50, width:(v / maxCat * 100) + "%", background:"linear-gradient(90deg," + ACC + "," + RED + ")", transition:"width 1s" }} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      <div style={{ padding:"0 14px 14px" }}>
        <Btn variant="ghost" style={{ width:"100%", background:"rgba(244,114,182,0.08)", borderColor:"rgba(244,114,182,0.3)", color:RED }} onClick={doRoast} disabled={roastLoad}>
          {roastLoad ? <><Spin /> Roasting…</> : "🔥 Roast My Spending"}
        </Btn>
        {roast && <Card style={{ marginTop:10, background:"rgba(244,114,182,0.06)", borderColor:"rgba(244,114,182,0.2)", fontSize:14, lineHeight:1.75, whiteSpace:"pre-wrap", marginTop:10 }}>{roast}</Card>}
      </div>

      <div style={{ padding:"0 14px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>Transactions</div>
        {transactions.length === 0
          ? <Empty em="💸" title="No transactions" sub="Add your first expense or income" />
          : [...transactions].reverse().map(t => (
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", background:G1, border:"1px solid " + B1, borderRadius:14, marginBottom:8 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:G2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{t.emoji || "💰"}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.desc || t.cat}</div>
                <div style={{ fontSize:11, color:TX2, marginTop:2 }}>{t.cat} · {new Date(t.date).toLocaleDateString()}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:t.type === "income" ? GRN : RED }}>{t.type === "income" ? "+" : "-"}{c}{t.amount.toFixed(2)}</div>
                <button onClick={() => { onDelTxn(t.id); toast("Deleted 🗑"); }} style={{ background:"none", border:"none", color:TX3, fontSize:11, cursor:"pointer" }}>✕</button>
              </div>
            </div>
          ))
        }
      </div>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Transaction">
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {["expense","income"].map(tp => (
            <button key={tp} onClick={() => setForm(f => ({ ...f, type:tp }))} style={{ flex:1, padding:"11px 0", borderRadius:12, border:"1px solid " + (form.type === tp ? (tp === "expense" ? "rgba(244,114,182,0.5)" : "rgba(52,211,153,0.5)") : B1), background:form.type === tp ? (tp === "expense" ? "rgba(244,114,182,0.12)" : "rgba(52,211,153,0.12)") : G1, color:form.type === tp ? (tp === "expense" ? RED : GRN) : TX2, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              {tp === "expense" ? "− Expense" : "+ Income"}
            </button>
          ))}
        </div>
        <Field label="Amount" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount:e.target.value }))} />
        <Field label="Description" placeholder="e.g. Lunch at café" value={form.desc} onChange={e => setForm(f => ({ ...f, desc:e.target.value }))} />
        <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Category</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:18 }}>
          {CATS.map(([em, nm]) => (
            <button key={nm} onClick={() => setForm(f => ({ ...f, cat:nm, emoji:em }))} style={{ padding:"7px 12px", borderRadius:50, fontSize:12, fontWeight:600, border:"1px solid " + (form.cat === nm ? ACC : B1), background:form.cat === nm ? "rgba(124,58,237,0.2)" : G1, color:form.cat === nm ? ACC2 : TX2, cursor:"pointer" }}>
              {em} {nm}
            </button>
          ))}
        </div>
        <Btn style={{ width:"100%" }} onClick={submit}>Add Transaction</Btn>
      </Sheet>

      <Sheet open={budOpen} onClose={() => setBudOpen(false)} title="Set Budget">
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Currency</div>
          <select value={budF.currency} onChange={e => setBudF(f => ({ ...f, currency:e.target.value }))} style={{ width:"100%", background:G1, border:"1px solid " + B1, borderRadius:12, padding:"12px 16px", color:TX, fontSize:14, outline:"none" }}>
            {["$","€","£","₹","¥","₦","R"].map(cv => <option key={cv} value={cv} style={{ background:BG2 }}>{cv}</option>)}
          </select>
        </div>
        <Field label="Monthly Budget" type="number" placeholder="e.g. 500" value={budF.monthly} onChange={e => setBudF(f => ({ ...f, monthly:e.target.value }))} />
        <Btn style={{ width:"100%" }} onClick={() => { onSetBudget({ monthly:parseFloat(budF.monthly) || 0, currency:budF.currency }); setBudOpen(false); toast("Budget set! 💰"); }}>Save Budget</Btn>
      </Sheet>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  NOTES                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Notes({ notes, onSave }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch]   = useState("");

  const ACCENT = { violet:"#7c3aed", coral:"#f472b6", lime:"#34d399", gold:"#fbbf24" };

  const filtered = [...notes]
    .filter(n => !search || (n.title||"").toLowerCase().includes(search.toLowerCase()) || stripHtml(n.content||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => b.updated - a.updated);

  if (editing) {
    return (
      <NoteEditor
        note={editing}
        onSave={n => { onSave(n); setEditing(null); }}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div style={{ paddingBottom:16 }}>
      <div style={{ padding:"20px 18px 10px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800 }}>My <span style={{ color:ACC2 }}>Notes</span></div>
        <Btn size="sm" onClick={() => setEditing({ id:uid(), title:"", content:"", subject:"", color:"violet", updated:Date.now() })}>+ New</Btn>
      </div>
      <div style={{ padding:"0 14px 14px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search notes…" style={{ width:"100%", background:G1, border:"1px solid " + B1, borderRadius:50, padding:"11px 20px", color:TX, fontSize:14, outline:"none" }} />
      </div>
      {filtered.length === 0
        ? <Empty em="📝" title={search ? "No results" : "No notes yet"} sub={search ? "Try a different search" : "Tap + New to create your first note"} />
        : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 14px" }}>
            {filtered.map(n => (
              <div key={n.id} onClick={() => setEditing({ ...n })}
                style={{ background:G1, border:"1px solid " + B1, borderRadius:18, padding:16, cursor:"pointer", minHeight:140, display:"flex", flexDirection:"column", position:"relative", overflow:"hidden", transition:"transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:ACCENT[n.color] || ACC }} />
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, marginBottom:6, lineHeight:1.3 }}>{n.title || "Untitled"}</div>
                <div style={{ fontSize:12, color:TX2, lineHeight:1.6, flex:1, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical" }}>{stripHtml(n.content) || "Empty note…"}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
                  <div style={{ fontSize:10, color:TX3 }}>{timeAgo(n.updated)}</div>
                  {n.subject && <div style={{ fontSize:10, fontWeight:700, color:ACC2, background:"rgba(124,58,237,0.15)", padding:"2px 8px", borderRadius:20 }}>{n.subject}</div>}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

/* ─── Note Editor ────────────────────────────────────────────────────────── */
function NoteEditor({ note, onSave, onClose }) {
  const [title, setTitle]     = useState(note.title || "");
  const [subject, setSubject] = useState(note.subject || "");
  const [color, setColor]     = useState(note.color || "violet");
  const [aiPanel, setAiPanel] = useState(null);
  const [aiLoad, setAiLoad]   = useState(false);
  const [quiz, setQuiz]       = useState(null);
  const [fc, setFc]           = useState(null);
  const [fcI, setFcI]         = useState(0);
  const [fcFlip, setFcFlip]   = useState(false);
  const edRef  = useRef(null);
  const saveT  = useRef(null);

  const getContent = () => edRef.current ? edRef.current.innerHTML : "";
  const autoSave = () => {
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => onSave({ ...note, title, subject, color, content:getContent(), updated:Date.now() }), 1800);
  };
  const cmd = c => { document.execCommand(c, false, null); edRef.current && edRef.current.focus(); };
  const blk = t => { document.execCommand("formatBlock", false, t); edRef.current && edRef.current.focus(); };
  const COLORS = { violet:"#7c3aed", coral:"#f472b6", lime:"#34d399", gold:"#fbbf24" };

  const doAi = async action => {
    const txt = stripHtml(getContent());
    if (txt.length < 15 && action !== "quiz" && action !== "flashcards") { 
      toast("Write some content first! 📝"); 
      return; 
    }
    setAiLoad(true); setAiPanel(null); setQuiz(null); setFc(null);
    
    setTimeout(() => {
      try {
        if (action === "summarize") {
          setAiPanel({ type:"text", content:localAI.summarize(txt) });
        } else if (action === "explain") {
          setAiPanel({ type:"text", content:"Think of it like this: " + txt.substring(0, 50) + "...\n\nThe key idea is to break complex topics into smaller chunks and connect them to things you already know." });
        } else if (action === "expand") {
          if (edRef.current) edRef.current.innerHTML += "<br><hr style='border:none;border-top:1px solid rgba(255,255,255,0.1);margin:14px 0'><strong style='color:#a78bfa'>✦ Expanded Ideas</strong><br><br>Here are some related concepts to explore: active recall, spaced repetition, and the Feynman technique.";
          autoSave(); toast("Expanded ✅");
        } else if (action === "grammar") {
          toast("Grammar check complete! (This is a demo - no actual changes made)");
        } else if (action === "quiz") {
          setQuiz({ qs:localAI.quiz(subject || "general"), i:0, score:0, sel:null, done:false, answered:false });
        } else if (action === "flashcards") {
          setFc(localAI.flashcards(txt)); setFcI(0); setFcFlip(false);
        }
        setAiLoad(false);
      } catch {
        toast("Something went wrong");
        setAiLoad(false);
      }
    }, 600);
  };

  const answerQuiz = idx => {
    if (!quiz || quiz.answered) return;
    const correct = idx === quiz.qs[quiz.i].answer;
    setQuiz(q => ({ ...q, answered:true, sel:idx, score:q.score + (correct ? 1 : 0) }));
  };
  
  const nextQ = () => {
    const ni = quiz.i + 1;
    if (ni >= quiz.qs.length) {
      const s = quiz.score + (quiz.sel === quiz.qs[quiz.i].answer ? 1 : 0);
      setQuiz(q => ({ ...q, done:true, score:s }));
      if (s >= 4) confetti();
    } else {
      setQuiz(q => ({ ...q, i:ni, sel:null, answered:false }));
    }
  };

  const save = () => { clearTimeout(saveT.current); onSave({ ...note, title, subject, color, content:getContent(), updated:Date.now() }); };

  return (
    <div style={{ position:"fixed", inset:0, background:BG, zIndex:300, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", borderBottom:"1px solid " + B1, flexShrink:0 }}>
        <button onClick={() => { save(); onClose(); }} style={{ background:"none", border:"none", color:TX2, cursor:"pointer", padding:4, display:"flex" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <input value={title} onChange={e => { setTitle(e.target.value); autoSave(); }} placeholder="Note title…" style={{ flex:1, background:"none", border:"none", fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:TX, outline:"none" }} />
        <Btn size="sm" onClick={() => { save(); toast("Saved ✅"); }}>Save</Btn>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", borderBottom:"1px solid " + B1, flexShrink:0 }}>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject…" style={{ flex:1, background:G1, border:"1px solid " + B1, borderRadius:50, padding:"7px 14px", color:TX, fontSize:12, outline:"none" }} />
        <div style={{ display:"flex", gap:8 }}>
          {Object.entries(COLORS).map(([k, v]) => (
            <div key={k} onClick={() => setColor(k)} style={{ width:22, height:22, borderRadius:"50%", background:v, cursor:"pointer", border:"2px solid " + (color === k ? TX : "transparent"), transform:color === k ? "scale(1.25)" : "scale(1)", transition:"all 0.2s" }} />
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:5, padding:"8px 12px", borderBottom:"1px solid " + B1, overflowX:"auto", scrollbarWidth:"none", flexShrink:0, background:BG2 }}>
        {[["B","bold"],["I","italic"],["U","underline"]].map(([l, c]) => (
          <button key={c} onClick={() => cmd(c)} style={{ width:32, height:32, borderRadius:7, background:"none", border:"1px solid " + B1, color:TX2, fontWeight:700, fontSize:13, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={c === "italic" ? { fontStyle:"italic" } : c === "underline" ? { textDecoration:"underline" } : { fontWeight:"bold" }}>{l}</span>
          </button>
        ))}
        {[["H1","h1"],["H2","h2"]].map(([l, t]) => (
          <button key={t} onClick={() => blk(t)} style={{ padding:"0 9px", height:32, borderRadius:7, background:"none", border:"1px solid " + B1, color:TX2, fontWeight:700, fontSize:11, cursor:"pointer", flexShrink:0 }}>{l}</button>
        ))}
        <button onClick={() => cmd("insertUnorderedList")} style={{ width:32, height:32, borderRadius:7, background:"none", border:"1px solid " + B1, color:TX2, fontSize:18, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>•</button>
        <button onClick={() => cmd("insertOrderedList")} style={{ width:32, height:32, borderRadius:7, background:"none", border:"1px solid " + B1, color:TX2, fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>1.</button>
        <button onClick={() => blk("blockquote")} style={{ width:32, height:32, borderRadius:7, background:"none", border:"1px solid " + B1, color:TX2, fontSize:16, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>❝</button>
        <button onClick={() => cmd("removeFormat")} style={{ width:32, height:32, borderRadius:7, background:"none", border:"1px solid " + B1, color:TX3, fontSize:13, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
      </div>

      <div ref={edRef} contentEditable onInput={autoSave}
        style={{ flex:1, padding:"18px", outline:"none", fontSize:15, lineHeight:1.85, color:TX, overflowY:"auto", fontFamily:"'Plus Jakarta Sans',sans-serif", minHeight:0 }}
        dangerouslySetInnerHTML={{ __html:note.content || "" }} suppressContentEditableWarning />

      {(aiLoad || aiPanel || quiz || fc) && (
        <div style={{ borderTop:"1px solid " + B1, padding:16, maxHeight:260, overflowY:"auto", background:BG2, flexShrink:0 }}>
          {aiLoad && <div style={{ display:"flex", gap:10, alignItems:"center", color:TX2, fontSize:13 }}><Spin /> Working…</div>}

          {aiPanel && !quiz && !fc && (
            <div>
              <div style={{ fontSize:13, lineHeight:1.75, whiteSpace:"pre-wrap", marginBottom:12 }}>{aiPanel.content}</div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn size="sm" onClick={() => {
                  if (edRef.current) edRef.current.innerHTML += "<br><hr style='border:none;border-top:1px solid rgba(255,255,255,0.1);margin:14px 0'><strong style='color:#a78bfa'>✦ AI Result</strong><br><br>" + aiPanel.content.replace(/\n/g,"<br>");
                  setAiPanel(null); autoSave(); toast("Inserted ✅");
                }}>Insert into note</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setAiPanel(null)}>Dismiss</Btn>
              </div>
            </div>
          )}

          {quiz && !quiz.done && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>Question {quiz.i + 1} / {quiz.qs.length}</div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:14, lineHeight:1.4 }}>{quiz.qs[quiz.i].q}</div>
              {quiz.qs[quiz.i].options.map((opt, i) => {
                let bg = G1, border = B1, col = TX;
                if (quiz.answered) {
                  if (i === quiz.qs[quiz.i].answer) { bg = "rgba(52,211,153,0.12)"; border = GRN; col = GRN; }
                  else if (i === quiz.sel) { bg = "rgba(239,68,68,0.12)"; border = "#ef4444"; col = "#ef4444"; }
                }
                return <div key={i} onClick={() => answerQuiz(i)} style={{ padding:"11px 14px", background:bg, border:"1px solid " + border, borderRadius:12, marginBottom:8, cursor:quiz.answered ? "default" : "pointer", fontSize:13, color:col }}>{String.fromCharCode(65 + i)}. {opt}</div>;
              })}
              {quiz.answered && <Btn size="sm" style={{ marginTop:8 }} onClick={nextQ}>Next →</Btn>}
            </div>
          )}
          {quiz && quiz.done && (
            <div style={{ textAlign:"center", padding:"12px 0" }}>
              <div style={{ fontSize:38, marginBottom:8 }}>{quiz.score >= 4 ? "🏆" : quiz.score >= 3 ? "😊" : "📖"}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:ACC2 }}>{Math.round((quiz.score / quiz.qs.length) * 100)}%</div>
              <div style={{ fontSize:13, color:TX2, marginTop:4 }}>{quiz.score}/{quiz.qs.length} correct</div>
              <Btn size="sm" style={{ marginTop:12 }} onClick={() => setQuiz(null)}>Done</Btn>
            </div>
          )}

          {fc && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>Card {fcI + 1} / {fc.length} · Tap to flip</div>
              <div onClick={() => setFcFlip(f => !f)} style={{ height:150, perspective:1000, cursor:"pointer" }}>
                <div style={{ position:"relative", width:"100%", height:"100%", transformStyle:"preserve-3d", transition:"transform 0.5s cubic-bezier(0.34,1.56,0.64,1)", transform:fcFlip ? "rotateY(180deg)" : "none" }}>
                  <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.3)", borderRadius:16, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:18, textAlign:"center" }}>
                    <div style={{ fontSize:10, color:TX3, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>TERM</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700 }}>{fc[fcI].front}</div>
                  </div>
                  <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", transform:"rotateY(180deg)", background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.3)", borderRadius:16, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:18, textAlign:"center" }}>
                    <div style={{ fontSize:10, color:TX3, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>DEFINITION</div>
                    <div style={{ fontSize:13, lineHeight:1.6 }}>{fc[fcI].back}</div>
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:10 }}>
                <Btn size="sm" variant="ghost" onClick={() => { if (fcI > 0) { setFcI(f => f - 1); setFcFlip(false); } }}>← Prev</Btn>
                <Btn size="sm" onClick={() => {
                  if (fcI < fc.length - 1) { setFcI(f => f + 1); setFcFlip(false); }
                  else { setFc(null); confetti(); toast("Complete! 🎉"); }
                }}>{fcI < fc.length - 1 ? "Next →" : "Done 🎉"}</Btn>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display:"flex", gap:6, padding:"10px 12px", borderTop:"1px solid " + B1, overflowX:"auto", scrollbarWidth:"none", flexShrink:0, background:BG }}>
        {[["✦ Summarize","summarize"],["🧠 Quiz","quiz"],["🃏 Flashcards","flashcards"],["📝 Expand","expand"],["✓ Grammar","grammar"],["💡 Explain","explain"]].map(([lb, ac]) => (
          <button key={ac} onClick={() => doAi(ac)} disabled={aiLoad} style={{ whiteSpace:"nowrap", padding:"7px 14px", borderRadius:50, fontSize:11, fontWeight:700, background:"rgba(124,58,237,0.12)", border:"1px solid rgba(124,58,237,0.28)", color:ACC2, cursor:aiLoad ? "not-allowed" : "pointer", flexShrink:0, opacity:aiLoad ? 0.5 : 1 }}>
            {lb}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  AI CHAT                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
function AiChat({ user }) {
  const [msgs, setMsgs]     = useState([{ role:"assistant", content:"Hey! I'm StudyBot (offline mode) 👋 Ask me anything — I'll give you study tips and help!" }]);
  const [input, setInput]   = useState("");
  const [load, setLoad]     = useState(false);
  const bottomRef           = useRef(null);

  useEffect(() => { bottomRef.current && bottomRef.current.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const getResponse = (msg) => {
    msg = msg.toLowerCase();
    if (msg.includes("study tip") || msg.includes("how to study")) {
      return localAI.tips[Math.floor(Math.random() * localAI.tips.length)];
    }
    if (msg.includes("pomodoro")) {
      return "🍅 Pomodoro: 25 minutes of focus, then a 5-minute break. After 4 cycles, take a longer 15-30 min break. It helps maintain focus and prevents burnout!";
    }
    if (msg.includes("memory") || msg.includes("remember")) {
      return "🧠 Memory tips: Use active recall (test yourself), spaced repetition (review at intervals), and teach others. Sleep is also crucial for memory consolidation!";
    }
    if (msg.includes("procrastinate") || msg.includes("motivation")) {
      return "⚡ Beat procrastination: Break tasks into tiny 5-minute chunks, use the 2-minute rule (if it takes <2 min, do it now), and reward yourself after each study session!";
    }
    return "That's a great question! Here's a study tip: " + localAI.tips[Math.floor(Math.random() * localAI.tips.length)];
  };

  const send = text => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput(""); setLoad(true);
    
    const newMsgs = [...msgs, { role:"user", content:msg }];
    setMsgs(newMsgs);
    
    setTimeout(() => {
      const reply = getResponse(msg);
      setMsgs(m => [...m, { role:"assistant", content:reply }]);
      setLoad(false);
    }, 800);
  };

  const CHIPS = ["💡 Give me a study tip","🍅 Explain Pomodoro","🧠 How to remember better","⚡ Beat procrastination"];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - " + NAV + "px)", overflow:"hidden" }}>
      <div style={{ padding:"16px 18px", borderBottom:"1px solid " + B1, flexShrink:0 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800 }}>✦ StudyBot (offline)</div>
        <div style={{ fontSize:12, color:TX2, marginTop:2 }}>AI works locally — no internet needed!</div>
      </div>

      <div style={{ display:"flex", gap:8, padding:"10px 12px", overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
        {CHIPS.map(c => (
          <button key={c} onClick={() => send(c)} style={{ whiteSpace:"nowrap", padding:"8px 14px", borderRadius:50, background:G1, border:"1px solid " + B1, color:TX2, fontSize:12, fontWeight:600, cursor:"pointer", flexShrink:0 }}
            onMouseEnter={e => { e.target.style.background = "rgba(124,58,237,0.15)"; e.target.style.borderColor = ACC; e.target.style.color = ACC2; }}
            onMouseLeave={e => { e.target.style.background = G1; e.target.style.borderColor = B1; e.target.style.color = TX2; }}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"10px 14px", display:"flex", flexDirection:"column", gap:12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display:"flex", gap:10, flexDirection:m.role === "user" ? "row-reverse" : "row" }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:m.role === "assistant" ? "linear-gradient(135deg," + ACC + ",#5b21b6)" : G2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0, border:"1px solid " + B1 }}>
              {m.role === "assistant" ? "✦" : (user.avatar || "👤")}
            </div>
            <div style={{ maxWidth:"80%", padding:"12px 16px", borderRadius:m.role === "assistant" ? "4px 18px 18px 18px" : "18px 4px 18px 18px", fontSize:14, lineHeight:1.7, background:m.role === "assistant" ? G2 : "linear-gradient(135deg," + ACC + ",#5b21b6)", border:m.role === "assistant" ? "1px solid " + B1 : "none", color:"#fff", whiteSpace:"pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {load && (
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg," + ACC + ",#5b21b6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>✦</div>
            <div style={{ padding:"14px 18px", background:G2, border:"1px solid " + B1, borderRadius:"4px 18px 18px 18px", display:"flex", gap:5, alignItems:"center" }}>
              {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:ACC2, animation:"bk3 1.2s " + (i * 0.2) + "s infinite" }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding:"12px 14px", borderTop:"1px solid " + B1, display:"flex", gap:10, alignItems:"flex-end", flexShrink:0, background:BG }}>
        <textarea value={input} rows={1}
          onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask anything…" style={{ flex:1, background:G1, border:"1px solid " + B1, borderRadius:20, padding:"12px 16px", color:TX, fontSize:14, outline:"none", resize:"none", maxHeight:120, lineHeight:1.5 }}
          onFocus={e => e.target.style.borderColor = ACC} onBlur={e => e.target.style.borderColor = B1} />
        <button onClick={() => send()} disabled={load || !input.trim()} style={{ width:46, height:46, borderRadius:"50%", background:"linear-gradient(135deg," + ACC + ",#5b21b6)", border:"none", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 16px " + GLOW, cursor:load || !input.trim() ? "not-allowed" : "pointer", opacity:load || !input.trim() ? 0.5 : 1 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SETTINGS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Settings({ user, onUpdateUser, onClearData, budget }) {
  const [name, setName] = useState(user.name || "");
  const AVS = ["🎓","🧑‍💻","🦊","🐼","🌟","🚀","🧠","🎯","🦁","🐉","🌈","⚡"];

  const exportAll = () => {
    const data = { user, sessions:LS.get("sv_sessions",[]), transactions:LS.get("sv_transactions",[]), notes:LS.get("sv_notes",[]), budget };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type:"application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "studyvault-backup.json"; a.click(); URL.revokeObjectURL(url);
    toast("Exported 📦");
  };

  return (
    <div style={{ paddingBottom:20 }}>
      <div style={{ padding:"20px 18px 16px", fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800 }}>Settings</div>

      <div style={{ padding:"0 14px 16px" }}>
        <Card>
          <div style={{ textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:54, marginBottom:8 }}>{user.avatar || "🎓"}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800 }}>{user.name}</div>
            <div style={{ fontSize:12, color:TX2, marginTop:4 }}>{user.type} · {user.method === "guest" ? "Guest" : "Logged in"}</div>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", marginBottom:16 }}>
            {AVS.map(a => <span key={a} onClick={() => onUpdateUser({ ...user, avatar:a })} style={{ fontSize:26, cursor:"pointer", opacity:user.avatar === a ? 1 : 0.4, transform:user.avatar === a ? "scale(1.2)" : "scale(1)", transition:"all 0.2s", display:"inline-block" }}>{a}</span>)}
          </div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ width:"100%", background:G1, border:"1px solid " + B1, borderRadius:12, padding:"11px 16px", color:TX, fontSize:14, outline:"none", marginBottom:12, textAlign:"center" }} />
          <div style={{ textAlign:"center" }}>
            <Btn size="sm" onClick={() => { if (name.trim()) { onUpdateUser({ ...user, name:name.trim() }); toast("Saved ✅"); } else toast("Enter a name!"); }}>Save Profile</Btn>
          </div>
        </Card>
      </div>

      <div style={{ padding:"0 14px 14px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:TX2, textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>Data</div>
        {[
          { icon:"📦", title:"Export All Data", sub:"Download as JSON backup", action:exportAll, danger:false },
          { icon:"🗑", title:"Clear All Data",  sub:"Permanently delete everything", action:() => { if (window.confirm("Delete all data? This cannot be undone.")) onClearData(); }, danger:true },
        ].map(item => (
          <div key={item.title} onClick={item.action} style={{ display:"flex", alignItems:"center", gap:14, padding:16, background:G1, border:"1px solid " + (item.danger ? "rgba(239,68,68,0.22)" : B1), borderRadius:14, marginBottom:10, cursor:"pointer" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = item.danger ? "#ef4444" : B2}
            onMouseLeave={e => e.currentTarget.style.borderColor = item.danger ? "rgba(239,68,68,0.22)" : B1}>
            <div style={{ width:40, height:40, borderRadius:12, background:item.danger ? "rgba(239,68,68,0.1)" : "rgba(124,58,237,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{item.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:item.danger ? "#ef4444" : TX }}>{item.title}</div>
              <div style={{ fontSize:12, color:TX2, marginTop:2 }}>{item.sub}</div>
            </div>
            <div style={{ color:TX3, fontSize:20 }}>›</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign:"center", padding:"8px 24px", color:TX3, fontSize:12 }}>StudyVault v2.0 (Offline) ✦ Local AI ✦ No API needed 💜</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROOT                                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [user,         setUser]         = useState(() => LS.get("sv_user", null));
  const [tab,          setTab]          = useState("home");
  const [sessions,     setSessions]     = useState(() => LS.get("sv_sessions", []));
  const [transactions, setTransactions] = useState(() => LS.get("sv_transactions", []));
  const [notes,        setNotes]        = useState(() => LS.get("sv_notes", []));
  const [budget,       setBudget]       = useState(() => LS.get("sv_budget", { monthly:0, currency:"$" }));
  const [streak,       setStreak]       = useState(() => LS.get("sv_streak", { current:0, lastDate:null }));

  const saveSessions     = v => { setSessions(v);     LS.set("sv_sessions", v); };
  const saveTransactions = v => { setTransactions(v); LS.set("sv_transactions", v); };
  const saveNotes        = v => { setNotes(v);        LS.set("sv_notes", v); };
  const saveBudget       = v => { setBudget(v);       LS.set("sv_budget", v); };

  const addSession = s => {
    saveSessions([...sessions, s]);
    const today = new Date().toDateString(), yesterday = new Date(Date.now() - 86400000).toDateString();
    const ns = { ...streak };
    if (ns.lastDate !== today) { ns.current = ns.lastDate === yesterday ? ns.current + 1 : 1; ns.lastDate = today; }
    setStreak(ns); LS.set("sv_streak", ns);
  };

  const saveNote = note => {
    const next = notes.findIndex(n => n.id === note.id) >= 0
      ? notes.map(n => n.id === note.id ? note : n)
      : [...notes, note];
    saveNotes(next);
  };

  const handleAuth = u => { setUser(u); LS.set("sv_user", u); };
  const clearData  = () => { localStorage.clear(); window.location.reload(); };

  const NAV_ITEMS = [
    { id:"home",     label:"Home",  icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id:"study",    label:"Study", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { id:"money",    label:"Money", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { id:"notes",    label:"Notes", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    { id:"ai",       label:"AI",    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> },
    { id:"settings", label:"Me",    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ];

  // Error boundary for production
  try {
    if (!user) return (
      <>
        <style>{CSS}</style>
        <Toasts />
        <Auth onAuth={handleAuth} />
      </>
    );

    const VIEW = {
      home:     <Home user={user} sessions={sessions} transactions={transactions} notes={notes} streak={streak} budget={budget} />,
      study:    <Study sessions={sessions} onAdd={addSession} />,
      money:    <Money transactions={transactions} budget={budget} onAddTxn={t => saveTransactions([...transactions, t])} onDelTxn={id => saveTransactions(transactions.filter(t => t.id !== id))} onSetBudget={saveBudget} />,
      notes:    <Notes notes={notes} onSave={saveNote} />,
      ai:       <AiChat user={user} />,
      settings: <Settings user={user} onUpdateUser={u => { setUser(u); LS.set("sv_user", u); }} onClearData={clearData} budget={budget} />,
    };

    return (
      <>
        <style>{CSS}</style>
        <Toasts />
        <div style={{ background:BG, minHeight:"100vh", paddingBottom:NAV }}>
          <div key={tab} style={{ animation:"fadeUp 0.35s ease" }}>
            {VIEW[tab]}
          </div>
          <nav style={{ position:"fixed", bottom:0, left:0, right:0, height:NAV, background:"rgba(7,9,18,0.92)", backdropFilter:"blur(24px)", borderTop:"1px solid " + B1, display:"flex", alignItems:"center", justifyContent:"space-around", zIndex:200, paddingBottom:4 }}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"8px 2px", background:"none", border:"none", color:tab === item.id ? ACC2 : TX3, cursor:"pointer", transition:"all 0.25s", borderRadius:12 }}>
                <div style={{ transform:tab === item.id ? "scale(1.15)" : "scale(1)", transition:"all 0.25s", filter:tab === item.id ? "drop-shadow(0 0 6px " + ACC + ")" : "none" }}>
                  {item.icon}
                </div>
                <div style={{ fontSize:10, fontWeight:tab === item.id ? 700 : 500, letterSpacing:0.3 }}>{item.label}</div>
              </button>
            ))}
          </nav>
        </div>
      </>
    );
  } catch (error) {
    console.error("App error:", error);
    return (
      <div style={{ padding:20, textAlign:"center", color:TX }}>
        <h1>Something went wrong</h1>
        <button onClick={() => window.location.reload()} style={{ padding:"10px 20px", marginTop:20, background:ACC, color:"white", border:"none", borderRadius:8 }}>
          Reload App
        </button>
      </div>
    );
  }
                                                        }
