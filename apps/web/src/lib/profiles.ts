import { doc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

export interface ProfileDraft {
  name: string;
  age: number;
  gender: string;
  school: string;
  bio: string;
  interests: string[];
}

export interface SavedProfile extends ProfileDraft {
  uid: string;
  image: string;
  verified: false;
  createdAt: number;
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";

function getDb() {
  if (!db) throw new Error("Firebase is not configured. Add your development Firebase settings.");
  return db;
}

export async function getMyProfile(uid: string): Promise<SavedProfile | null> {
  const database = getDb();
  const snapshot = await getDoc(doc(database, "profiles", uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    uid,
    name: String(data.name ?? ""),
    age: Number(data.age ?? 0),
    gender: String(data.gender ?? ""),
    school: String(data.school ?? ""),
    bio: String(data.bio ?? ""),
    interests: Array.isArray(data.interests) ? data.interests.filter((v): v is string => typeof v === "string") : [],
    image: String(data.image ?? DEFAULT_IMAGE),
    verified: false,
    createdAt: Number(data.createdAt ?? Date.now()),
  };
}

export async function saveMyProfile(uid: string, draft: ProfileDraft): Promise<void> {
  const database = getDb();
  const now = Date.now();
  const existing = await getDoc(doc(database, "profiles", uid));
  const createdAt = existing.exists() && typeof existing.data().createdAt === "number"
    ? existing.data().createdAt
    : now;

  const profile = {
    name: draft.name.trim().slice(0, 80),
    age: draft.age,
    gender: draft.gender,
    school: draft.school.trim().slice(0, 160),
    bio: draft.bio.trim().slice(0, 500),
    interests: draft.interests.slice(0, 30),
    image: DEFAULT_IMAGE,
    verified: false,
    createdAt,
  };

  // The two documents contain only the validated public-profile projection.
  // Firestore rules enforce ownership, email verification and field constraints.
  const batch = writeBatch(database);
  batch.set(doc(database, "profiles", uid), profile);
  batch.set(doc(database, "publicProfiles", uid), profile);
  await batch.commit();
}
