import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

function getAuthOrThrow() {
  if (!auth) throw new Error("Firebase is not configured yet. Add the VITE_FIREBASE_* values from .env.example.");
  return auth;
}

export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (!dateOfBirth || Number.isNaN(dob.getTime()) || dob > new Date()) return -1;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

export async function signUp(email: string, password: string, displayName: string, dateOfBirth: string): Promise<User> {
  if (calculateAge(dateOfBirth) < 18) throw new Error("PolyConnect is for adults aged 18 and over.");
  if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
  const client = getAuthOrThrow();
  const credential = await createUserWithEmailAndPassword(client, email.trim(), password);
  await updateProfile(credential.user, { displayName: displayName.trim() });
  await sendEmailVerification(credential.user);
  return credential.user;
}

export async function logIn(email: string, password: string): Promise<User> {
  const client = getAuthOrThrow();
  const credential = await signInWithEmailAndPassword(client, email.trim(), password);
  await credential.user.reload();
  if (!credential.user.emailVerified) {
    await signOut(client);
    throw new Error("Please verify your email before signing in. Check your inbox for the verification link.");
  }
  return credential.user;
}

export async function resetPassword(email: string): Promise<void> {
  const client = getAuthOrThrow();
  const normalizedEmail = email.trim();
  if (!normalizedEmail) throw new Error("Enter the email address for your account.");
  await sendPasswordResetEmail(client, normalizedEmail);
}

export async function resendVerification(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function logOut(): Promise<void> {
  const client = getAuthOrThrow();
  await signOut(client);
}
