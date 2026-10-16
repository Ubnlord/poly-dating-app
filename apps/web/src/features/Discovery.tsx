import { useEffect, useState } from "react";
import { addDoc, collection, doc, getDocs, limit, query, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { Ban, Compass, Flag, Heart, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { db } from "../lib/firebase";

type PublicProfile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  school: string;
  bio: string;
  interests: string[];
  image: string;
  verified: false;
};

export default function Discovery({ user }: { user: User }) {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [schoolFilter, setSchoolFilter] = useState("All campuses");
  const [minimumAge, setMinimumAge] = useState(18);
  const [maximumAge, setMaximumAge] = useState(40);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [actionMessage, setActionMessage] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      if (!db) { setError("Configure Firebase to discover profiles."); setLoading(false); return; }
      try {
        // Rules allow only email-verified users to read the public projection.
        // No private profile documents or messages are queried here.
        const [snapshot, blockSnapshot] = await Promise.all([
          getDocs(query(collection(db, "publicProfiles"), limit(60))),
          getDocs(collection(db, "users", user.uid, "blocks")),
        ]);
        const blocked = blockSnapshot.docs.map(item => item.id);
        if (active) setBlockedIds(blocked);
        const found = snapshot.docs
          .filter(item => item.id !== user.uid)
          .map(item => {
            const data = item.data();
            return {
              id: item.id,
              name: typeof data.name === "string" ? data.name : "PolyConnect member",
              age: typeof data.age === "number" ? data.age : 0,
              gender: typeof data.gender === "string" ? data.gender : "",
              school: typeof data.school === "string" ? data.school : "",
              bio: typeof data.bio === "string" ? data.bio : "",
              interests: Array.isArray(data.interests) ? data.interests.filter((v): v is string => typeof v === "string") : [],
              image: typeof data.image === "string" ? data.image : "",
              verified: false as const,
            };
          })
          .filter(profile => profile.age >= 18 && profile.age <= 120);
        if (active) setProfiles(found);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load discovery profiles.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [user.uid, reloadKey]);

  async function blockProfile(profile: PublicProfile) {
    if (!db) return;
    setActionBusy(profile.id); setActionMessage("");
    try {
      await setDoc(doc(db, "users", user.uid, "blocks", profile.id), { targetUid: profile.id, createdAt: serverTimestamp() });
      setBlockedIds(current => [...current, profile.id]);
      setActionMessage("Profile blocked. It has been removed from your discovery results.");
    } catch (e) { setActionMessage(e instanceof Error ? e.message : "Could not block this profile."); }
    finally { setActionBusy(""); }
  }

  async function reportProfile(profile: PublicProfile) {
    if (!db) return;
    setActionBusy(profile.id); setActionMessage("");
    try {
      await addDoc(collection(db, "reports"), { reporterUid: user.uid, targetUid: profile.id, reason: "other", details: "Reported from the discovery screen.", status: "pending", createdAt: serverTimestamp() });
      setActionMessage("Report submitted. Thank you for helping keep PolyConnect safer.");
    } catch (e) { setActionMessage(e instanceof Error ? e.message : "Could not submit this report."); }
    finally { setActionBusy(""); }
  }

  const filtered = profiles.filter(profile => !blockedIds.includes(profile.id) &&
    profile.age >= minimumAge && profile.age <= maximumAge &&
    (schoolFilter === "All campuses" || profile.school === schoolFilter)
  );
  const schools = ["All campuses", ...Array.from(new Set(profiles.map(p => p.school).filter(Boolean))).sort()];

  return <section className="discovery-page">
    <div className="discovery-heading">
      <div><span className="eyebrow"><Compass size={14}/> YOUR CAMPUS, YOUR CONNECTIONS</span><h2>Discover people.</h2><p>Meet adults with shared interests. Take your time and keep your boundaries.</p></div>
      <button className="secondary-button discovery-refresh" onClick={() => setReloadKey(v => v + 1)} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>
    <div className="discovery-filters">
      <span><SlidersHorizontal size={16}/> Filters</span>
      <label>Campus<select value={schoolFilter} onChange={e=>setSchoolFilter(e.target.value)}>{schools.map(s=><option key={s}>{s}</option>)}</select></label>
      <label>Age range <strong>{minimumAge}–{maximumAge}</strong><div className="age-sliders"><input aria-label="Minimum age" type="range" min="18" max={maximumAge} value={minimumAge} onChange={e=>setMinimumAge(Math.min(Number(e.target.value),maximumAge))}/><input aria-label="Maximum age" type="range" min={minimumAge} max="80" value={maximumAge} onChange={e=>setMaximumAge(Math.max(Number(e.target.value),minimumAge))}/></div></label>
    </div>
    {error && <div className="notice error">{error}</div>}{actionMessage && <div className="notice info" role="status">{actionMessage}</div>}
    {loading ? <div className="discovery-empty">Loading profiles…</div> : filtered.length === 0 ? <div className="discovery-empty"><Heart size={28}/><h3>No profiles to show just yet</h3><p>As more verified members create profiles, they’ll appear here. Try changing your filters later.</p></div> :
      <div className="discovery-grid">{filtered.map(profile=><article className="discovery-card" key={profile.id}>
        <div className="discovery-photo">{profile.image ? <img src={profile.image} alt="" loading="lazy"/> : <div className="discovery-placeholder"><Heart size={36}/></div>}<span className="age-pill">{profile.age}</span></div>
        <div className="discovery-card-body"><h3>{profile.name}, {profile.age}</h3><p className="discovery-school">{profile.school}</p>{profile.gender && <span className="discovery-gender">{profile.gender}</span>}{profile.bio && <p className="discovery-bio">{profile.bio}</p>}{profile.interests.length>0&&<div className="interest-list">{profile.interests.slice(0,5).map(i=><span key={i}>{i}</span>)}</div>}<div className="discovery-safety"><ShieldCheck size={14}/> Email verified · Age not independently verified</div><div className="discovery-actions"><button type="button" onClick={() => void reportProfile(profile)} disabled={!!actionBusy}><Flag size={13}/> Report</button><button type="button" onClick={() => void blockProfile(profile)} disabled={!!actionBusy}><Ban size={13}/> Block</button></div></div>
      </article>)}</div>
    }
    <p className="discovery-disclaimer">Discovery is read-only for now. Likes, matching, and messaging will be enabled only after their authorization rules and abuse-prevention controls are implemented.</p>
  </section>;
}
