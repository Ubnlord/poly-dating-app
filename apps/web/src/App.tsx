import { useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ArrowRight, BadgeCheck, BookOpen, Heart, LockKeyhole, MailCheck, ShieldCheck, Sparkles } from "lucide-react";
import { calculateAge, logIn, logOut, resendVerification, signUp } from "./lib/auth";
import { auth, firebaseConfigured, firebaseSetupHint } from "./lib/firebase";
import type { AuthView } from "./types";

const schools = ["Federal Polytechnic Oko", "Yaba College of Technology", "Federal Polytechnic Nekede", "The Polytechnic, Ibadan", "Other Nigerian Polytechnic"];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState<AuthView>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [school, setSchool] = useState(schools[0]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth) { setAuthReady(true); return; }
    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) { setUser(null); setAuthReady(true); return; }
      await nextUser.reload().catch(() => undefined);
      if (nextUser.emailVerified) setUser(nextUser);
      else { setUser(null); setView("verify-email"); }
      setAuthReady(true);
    });
  }, []);

  function resetMessages() { setError(""); setNotice(""); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); resetMessages(); setBusy(true);
    try {
      if (view === "signup") {
        if (!name.trim()) throw new Error("Enter your name to continue.");
        if (calculateAge(dob) < 18) throw new Error("You must be at least 18 years old to use PolyConnect.");
        const created = await signUp(email, password, name, dob);
        setUser(null); setView("verify-email");
        setNotice(`We sent a verification link to ${created.email}. Verify your email, then sign in.`);
      } else {
        await logIn(email, password);
        setNotice("Signed in successfully.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  async function handleResend() {
    resetMessages(); setBusy(true);
    try {
      if (!auth?.currentUser) throw new Error("Sign in again to resend the verification email.");
      await resendVerification(auth.currentUser); setNotice("Verification email sent. Check your inbox and spam folder.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not resend the email."); }
    finally { setBusy(false); }
  }

  async function handleLogout() {
    resetMessages(); setBusy(true);
    try { await logOut(); setUser(null); setView("login"); setNotice("You have signed out."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not sign out."); }
    finally { setBusy(false); }
  }

  if (!authReady) return <main className="loading-screen"><div className="brand-mark"><Heart fill="currentColor" /></div><p>Getting your space ready…</p></main>;

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/" aria-label="PolyConnect home"><span className="brand-mark"><Heart fill="currentColor" size={19} /></span><span>polyconnect<span className="brand-dot">.</span></span></a>
      <span className="topbar-note"><ShieldCheck size={16} /> Connection starts with safety</span>
    </header>

    <main className="main-layout">
      <section className="hero-panel">
        <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
        <div className="hero-content">
          <span className="eyebrow"><Sparkles size={15} /> MADE FOR CAMPUS LIFE</span>
          <h1>Real people.<br /><span>Real connection.</span></h1>
          <p className="hero-copy">A fresh space to meet people, discover shared interests, and build something genuine — one campus at a time.</p>
          <div className="hero-points">
            <div><span className="point-icon"><BadgeCheck size={18} /></span><span><strong>Safety first</strong><small>Account security from day one</small></span></div>
            <div><span className="point-icon"><BookOpen size={18} /></span><span><strong>Campus-minded</strong><small>Designed with Nigerian polytechnic life in mind</small></span></div>
            <div><span className="point-icon"><LockKeyhole size={18} /></span><span><strong>Your account, yours</strong><small>Private sign-in with email verification</small></span></div>
          </div>
          <p className="hero-footnote">For adults aged 18+. Please be kind, be honest, and protect your personal information.</p>
        </div>
        <div className="hero-decoration"><div className="decoration-heart"><Heart size={44} fill="currentColor" /></div><span className="floating-chip chip-top">Meet with intention ✨</span><span className="floating-chip chip-bottom">Your next chapter starts here</span></div>
      </section>

      <section className="auth-panel">
        {user ? <div className="signed-in-card">
          <div className="success-icon"><BadgeCheck size={30} /></div>
          <span className="eyebrow">EMAIL VERIFIED</span>
          <h2>Welcome{user.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}.</h2>
          <p>You’re signed in as <strong>{user.email}</strong>.</p>
          <div className="notice info"><ShieldCheck size={18} /><span>Your secure sign-in is working. Profile setup and discovery will be enabled after the profile data model and access rules are implemented.</span></div>
          <button className="primary-button" onClick={handleLogout} disabled={busy}>{busy ? "Signing out…" : "Sign out"} <ArrowRight size={17} /></button>
        </div> : view === "verify-email" ? <div className="auth-card">
          <div className="form-icon"><MailCheck size={24} /></div>
          <span className="eyebrow">ONE QUICK STEP</span><h2>Check your inbox.</h2>
          <p className="form-intro">Verify your email before continuing. This helps confirm you can access the email address — it does not verify your age or student identity.</p>
          {notice && <div className="notice info">{notice}</div>}{error && <div className="notice error">{error}</div>}
          <button className="primary-button" onClick={handleResend} disabled={busy}>{busy ? "Sending…" : "Resend verification email"} <ArrowRight size={17} /></button>
          <button className="text-button" onClick={() => { setView("login"); resetMessages(); }}>Back to sign in</button>
        </div> : <div className="auth-card">
          <span className="eyebrow">{view === "signup" ? "YOUR STORY STARTS HERE" : "WELCOME BACK"}</span>
          <h2>{view === "signup" ? "Create your account" : "Find your kind of connection."}</h2>
          <p className="form-intro">{view === "signup" ? "Start with the basics. You must be 18 or older to join." : "Sign in to continue your PolyConnect journey."}</p>
          <div className="auth-tabs"><button className={view === "login" ? "active" : ""} onClick={() => { setView("login"); resetMessages(); }}>Sign in</button><button className={view === "signup" ? "active" : ""} onClick={() => { setView("signup"); resetMessages(); }}>Create account</button></div>
          {notice && <div className="notice info">{notice}</div>}{error && <div className="notice error">{error}</div>}
          {!firebaseConfigured && <div className="notice warning">{firebaseSetupHint} The interface is ready, but authentication stays disabled until configuration is supplied. No demo login or local-password fallback is used.</div>}
          <form onSubmit={handleSubmit}>
            {view === "signup" && <>
              <label>Your name<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="How should we call you?" required /></label>
              <label>Date of birth<input type="date" value={dob} max={new Date().toISOString().slice(0,10)} onChange={e=>setDob(e.target.value)} required /><small className="field-hint">18+ only. This is a self-declared date, not independent age verification.</small></label>
              <label>Polytechnic<select value={school} onChange={e=>setSchool(e.target.value)}>{schools.map(item=><option key={item}>{item}</option>)}</select><small className="field-hint">School selection is not proof of student status yet.</small></label>
            </>}
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required /></label>
            <label>Password<input type="password" autoComplete={view === "signup" ? "new-password" : "current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={view === "signup" ? "At least 8 characters" : "Your password"} minLength={view === "signup" ? 8 : 1} required /></label>
            <button className="primary-button" type="submit" disabled={busy || !firebaseConfigured}>{busy ? "Please wait…" : view === "signup" ? "Create account" : "Sign in"} <ArrowRight size={17} /></button>
          </form>
          <p className="legal-note">By continuing, you agree to use PolyConnect respectfully. Terms and Privacy Policy must be published before public launch.</p>
        </div>}
        <footer className="auth-footer"><span>© {new Date().getFullYear()} PolyConnect</span><span><ShieldCheck size={14} /> Built around respect and safety</span></footer>
      </section>
    </main>
  </div>;
}
