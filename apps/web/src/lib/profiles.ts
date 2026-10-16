import { doc, getDoc, writeBatch } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";

export interface ProfileDraft {
  name: string;
  age: number;
  gender: string;
  school: string;
  bio: string;
  interests: string[];
  image?: string;
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

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  if (!storage) throw new Error("Firebase Storage is not configured.");
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Profile photos must be 5 MB or smaller.");
  if (file.size === 0) throw new Error("The selected image is empty.");
  const objectRef = ref(storage, "profilePhotos/" + uid + "/avatar");
  await uploadBytes(objectRef, file, { contentType: file.type, customMetadata: { ownerUid: uid } });
  return getDownloadURL(objectRef);
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
    image: typeof draft.image === "string" && draft.image.startsWith("https://") ? draft.image : DEFAULT_IMAGE,
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
