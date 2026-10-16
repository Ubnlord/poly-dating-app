export type AuthView = "login" | "signup" | "verify-email";

export interface UserProfile {
  uid: string;
  displayName: string;
  dateOfBirth: string;
  school: string;
  bio: string;
  interests: string[];
  photoURL?: string;
  createdAt: string;
}
