import fs from "node:fs";
import { after, before, beforeEach, describe, it } from "mocha";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const projectId = "demo-polyconnect";
let testEnv;

const profile = (overrides = {}) => ({
  name: "Ada Example",
  age: 21,
  gender: "Female",
  school: "Federal Polytechnic",
  bio: "Student and developer",
  department: "Computer Science",
  level: "ND 2",
  state: "Lagos",
  interests: ["Coding", "Music"],
  hobbies: "Reading",
  relationshipGoal: "Serious relationship",
  religion: "Prefer not to say",
  languages: "English",
  image: "https://example.com/avatar.png",
  verified: false,
  createdAt: 1760000000000,
  ...overrides
});

describe("PolyConnect Firestore rules — profile foundation", function () {
  before(async function () {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: { rules: fs.readFileSync("firestore.rules", "utf8") }
    });
  });

  beforeEach(async function () {
    await testEnv.clearFirestore();
  });

  after(async function () {
    await testEnv.cleanup();
  });

  it("allows an authenticated user to create their own valid 18+ public profile", async function () {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(db, "profiles/alice"), profile()));
  });

  it("denies unauthenticated profile reads", async function () {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "profiles/alice")));
  });

  it("allows authenticated discovery reads of public profile documents", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/alice"), profile());
    });
    const db = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(getDoc(doc(db, "profiles/alice")));
  });

  it("denies creating another user's profile", async function () {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "profiles/bob"), profile()));
  });

  it("denies underage profiles", async function () {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "profiles/alice"), profile({ age: 17 })));
  });

  it("denies client-claimed verification and selfie fields", async function () {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "profiles/alice"), profile({ verified: true })));
    await assertFails(setDoc(doc(db, "profiles/alice"), profile({ selfie: "data:image/jpeg;base64,abc" })));
  });

  it("denies data URLs for profile images", async function () {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "profiles/alice"), profile({ image: "data:image/jpeg;base64,abc" })));
  });

  it("denies client writes to unimplemented match and message collections", async function () {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "matches/match-1"), { participants: ["alice", "bob"] }));
    await assertFails(setDoc(doc(db, "conversations/c1/messages/m1"), { senderUid: "alice", text: "Hello" }));
  });

  it("denies direct profile deletion until coordinated account deletion exists", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/alice"), profile());
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(deleteDoc(doc(db, "profiles/alice")));
  });

  it("denies changing the profile creation timestamp", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/alice"), profile());
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(db, "profiles/alice"), { createdAt: 1 }));
  });
});
