import { doc, getDoc, writeBatch } from "firebase/firestore";
import { getBytes, getMetadata, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";

export interface ProfileDraft {
  name: string;
  age: number;
  gender: string;
  school: string;
  bio: string;
  interests: string[];
  imagePath?: string;
}

export interface SavedProfile extends ProfileDraft {
  uid: string;
  imagePath: string;
  verified: false;
  createdAt: number;
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";

function getDb() {
  if (!db) throw new Error("Firebase is not configured. Add your development Firebase settings.");
  return db;
}

function matchesImageSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (type === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  if (!storage) throw new Error("Firebase Storage is not configured.");
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Profile photos must be 5 MB or smaller.");
  if (file.size === 0) throw new Error("The selected image is empty.");
  // MIME types are supplied by the client and can be spoofed. Check file signatures too.
  // Storage rules still enforce ownership, size, and declared MIME type; they cannot decode image bytes.
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!matchesImageSignature(file.type, header)) {
    throw new Error("The file contents do not match a supported JPG, PNG, or WebP image.");
  }
  const objectRef = ref(storage, "profilePhotos/" + uid + "/avatar");
  await uploadBytes(objectRef, file, { contentType: file.type, customMetadata: { ownerUid: uid } });
  return objectRef.fullPath;
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
    imagePath: typeof data.imagePath === "string" ? data.imagePath : "",
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
    imagePath: typeof draft.imagePath === "string" && draft.imagePath.startsWith("profilePhotos/" + uid + "/") ? draft.imagePath : "",
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

export async function loadProfilePhoto(path: string): Promise<string> {
  if (!storage || !path.startsWith("profilePhotos/")) return "";
  const objectRef = ref(storage, path);
  const [bytes, metadata] = await Promise.all([getBytes(objectRef, 5 * 1024 * 1024), getMetadata(objectRef)]);
  const contentType = metadata.contentType && /^image\/(jpeg|png|webp)$/.test(metadata.contentType) ? metadata.contentType : "application/octet-stream";
  return URL.createObjectURL(new Blob([bytes], { type: contentType }));
}
