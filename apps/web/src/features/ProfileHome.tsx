import { useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { ArrowRight, BadgeCheck, Heart, LoaderCircle } from "lucide-react";
import { calculateAge } from "../lib/auth";
import { getMyProfile, loadProfilePhoto, saveMyProfile, uploadProfilePhoto, type SavedProfile } from "../lib/profiles";
import Discovery from "./Discovery";

const schools = ["Federal Polytechnic Oko", "Yaba College of Technology", "Federal Polytechnic Nekede", "The Polytechnic, Ibadan", "Other Nigerian Polytechnic"];
const interestOptions = ["Music", "Movies", "Tech", "Travel", "Fitness", "Books", "Fashion", "Food", "Gaming", "Art", "Sports", "Business"];

export default function ProfileHome({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const [profile, setProfile] = useState<SavedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.displayName ?? "");
  const [dob, setDob] = useState("");
  const [school, setSchool] = useState(schools[0]);
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [savedPhotoUrl, setSavedPhotoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "discover">("profile");

  useEffect(() => {
    let active = true;
    getMyProfile(user.uid).then(saved => {
      if (!active) return;
      setProfile(saved);
      if (saved) {
        setName(saved.name); setSchool(saved.school); setGender(saved.gender);
        setBio(saved.bio); setInterests(saved.interests);
        if (saved.imagePath) loadProfilePhoto(saved.imagePath).then(url => { if (active) setSavedPhotoUrl(url); else URL.revokeObjectURL(url); }).catch(() => {});
      } else setEditing(true);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not load your profile."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.uid]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const age = dob ? calculateAge(dob) : profile?.age ?? -1;
    if (age < 18) { setError("PolyConnect is for adults aged 18 and over. Enter your date of birth to establish your age."); return; }
    if (!name.trim() || !gender) { setError("Enter your display name and choose a gender."); return; }
    setBusy(true);
    try {
      const imagePath = photoFile ? await uploadProfilePhoto(user.uid, photoFile) : profile?.imagePath;
      await saveMyProfile(user.uid, { name, age, gender, school, bio, interests, imagePath });
      const next = await getMyProfile(user.uid);
      setProfile(next); setEditing(false); setNotice("Your profile has been saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your profile. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="signed-in-card"><LoaderCircle className="spin" /><p>Loading your profile…</p></div>;

  if (!editing && profile) return <div className="signed-in-card">
    <div className="profile-tabs"><button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>My profile</button><button className={activeTab === "discover" ? "active" : ""} onClick={() => setActiveTab("discover")}>Discover</button></div>
    {activeTab === "discover" ? <Discovery user={user} /> : <>
    <div className="success-icon"><BadgeCheck size={30} /></div><span className="eyebrow">PROFILE SAVED</span>
    <h2>Welcome, {profile.name.split(" ")[0]}.</h2><p>Your profile is saved for <strong>{user.email}</strong>.</p>
    <div className="profile-preview"><div className="profile-avatar">{savedPhotoUrl ? <img src={savedPhotoUrl} alt="" /> : <Heart fill="currentColor" size={26} />}</div><div><strong>{profile.name}, {profile.age}</strong><small>{profile.school}</small><small>{profile.gender}</small></div><span className="profile-status">You</span></div>
    {profile.bio && <p className="profile-bio">{profile.bio}</p>}
    {profile.interests.length > 0 && <div className="interest-list">{profile.interests.map(item=><span key={item}>{item}</span>)}</div>}
    {notice && <div className="notice info">{notice}</div>}
    {error && <div className="notice error">{error}</div>}
    <div className="notice info">Your profile is stored in Firestore. Discovery and messaging remain disabled until their access rules and backend operations are implemented.</div>
    <button className="secondary-button" onClick={()=>{setDob("");setEditing(true);}}>Edit profile</button>
    <button className="primary-button" onClick={onLogout} disabled={busy}>Sign out <ArrowRight size={17}/></button>
    </>}
  </div>;

  return <div className="auth-card">
    <span className="eyebrow">MAKE IT YOURS</span><h2>{profile ? "Edit your profile." : "Build your profile."}</h2>
    <p className="form-intro">Add a few details so your profile is ready. Your full date of birth is used to calculate age but is not saved in the profile document.</p>
    {notice && <div className="notice info">{notice}</div>}{error && <div className="notice error">{error}</div>}
    <form onSubmit={save}>
      <label>Display name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required /></label>
      <label>Date of birth<input type="date" value={dob} max={new Date().toISOString().slice(0,10)} onChange={e=>setDob(e.target.value)} required={!profile}/><small className="field-hint">{profile ? "Leave blank to keep your current age. Date of birth is not stored." : "18+ only. Self-declared age is not independent age verification."}</small></label>
      <label>Polytechnic<select value={school} onChange={e=>setSchool(e.target.value)}>{schools.map(item=><option key={item}>{item}</option>)}</select></label>
      <label>Gender<select value={gender} onChange={e=>setGender(e.target.value)} required><option value="">Choose an option</option><option>Woman</option><option>Man</option><option>Non-binary</option><option>Prefer not to say</option></select></label>
      <label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {
        const file = e.currentTarget.files?.[0] ?? null;
        setPhotoFile(file);
        if (file) {
          if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
          setPhotoPreview(URL.createObjectURL(file));
        } else setPhotoPreview("");
      }} /><small className="field-hint">JPG, PNG, or WebP · maximum 5 MB.</small></label>
      {(photoPreview || savedPhotoUrl) && <div className="photo-preview"><img src={photoPreview || savedPhotoUrl} alt="Profile photo preview" /></div>}
      <label>About you<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} rows={3} placeholder="A little about what makes you, you…"/></label>
      <div className="interest-field"><span className="interest-label">Your interests <small>(choose up to 12)</small></span><div className="interest-options">{interestOptions.map(item=><button type="button" key={item} className={interests.includes(item)?"selected":""} onClick={()=>setInterests(current=>current.includes(item)?current.filter(v=>v!==item):[...current,item].slice(0,12))}>{item}</button>)}</div></div>
      <button className="primary-button" type="submit" disabled={busy}>{busy?"Saving profile…":"Save my profile"} <ArrowRight size={17}/></button>
    </form>
    <button className="text-button" onClick={onLogout} disabled={busy}>Sign out instead</button>
    <p className="legal-note">School selection and email verification do not prove student identity. Your profile is not independently age-verified.</p>
  </div>;
}
