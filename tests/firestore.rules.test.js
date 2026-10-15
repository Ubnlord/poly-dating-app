import fs from "node:fs";
import { after, before, beforeEach, describe, it } from "mocha";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const projectId = "demo-polyconnect";
let testEnv;
const userDb = (uid) => testEnv.authenticatedContext(uid, { email_verified: true }).firestore();

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
    const db = userDb("alice");
    await assertSucceeds(setDoc(doc(db, "profiles/alice"), profile()));
  });

  it("denies unauthenticated profile reads", async function () {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "profiles/alice")));
  });

  it("denies profile access for authenticated but unverified users", async function () {
    const db = testEnv.authenticatedContext("alice", { email_verified: false }).firestore();
    await assertFails(setDoc(doc(db, "profiles/alice"), profile()));
  });

  it("allows authenticated discovery reads from the dedicated public profile collection", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "publicProfiles/alice"), profile());
    });
    const db = userDb("bob");
    await assertSucceeds(getDoc(doc(db, "publicProfiles/alice")));
  });

  it("allows discovery queries over validated public profiles", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "publicProfiles/alice"), profile());
      await setDoc(doc(ctx.firestore(), "publicProfiles/bob"), profile({ name: "Bob Example" }));
    });
    const db = userDb("carol");
    const result = await getDocs(collection(db, "publicProfiles"));
    if (result.size !== 2) throw new Error(`Expected 2 public profiles, got ${result.size}`);
  });

  it("prevents other users from reading the source profile collection", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/alice"), profile());
    });
    await assertFails(getDoc(doc(userDb("bob"), "profiles/alice")));
    await assertSucceeds(getDoc(doc(userDb("alice"), "profiles/alice")));
  });

  it("denies reads of legacy profiles containing selfie data or claimed verification", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/legacy"), profile({
        verified: true,
        selfie: "data:image/jpeg;base64,private"
      }));
    });
    const db = userDb("bob");
    await assertFails(getDoc(doc(db, "profiles/legacy")));
  });

  it("allows an owner to replace their invalid legacy profile with clean public data", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/alice"), profile({
        verified: true,
        selfie: "data:image/jpeg;base64,private"
      }));
    });
    const db = userDb("alice");
    await assertSucceeds(setDoc(doc(db, "profiles/alice"), profile({ createdAt: 1761000000000 })));
  });

  it("denies creating another user's profile", async function () {
    const db = userDb("alice");
    await assertFails(setDoc(doc(db, "profiles/bob"), profile()));
  });

  it("denies underage profiles", async function () {
    const db = userDb("alice");
    await assertFails(setDoc(doc(db, "profiles/alice"), profile({ age: 17 })));
  });

  it("denies client-claimed verification and selfie fields", async function () {
    const db = userDb("alice");
    await assertFails(setDoc(doc(db, "profiles/alice"), profile({ verified: true })));
    await assertFails(setDoc(doc(db, "profiles/alice"), profile({ selfie: "data:image/jpeg;base64,abc" })));
  });

  it("denies data URLs for profile images", async function () {
    const db = userDb("alice");
    await assertFails(setDoc(doc(db, "profiles/alice"), profile({ image: "data:image/jpeg;base64,abc" })));
  });

  it("denies client writes to unimplemented match and message collections", async function () {
    const db = userDb("alice");
    await assertFails(setDoc(doc(db, "matches/match-1"), { participants: ["alice", "bob"] }));
    await assertFails(setDoc(doc(db, "conversations/c1/messages/m1"), { senderUid: "alice", text: "Hello" }));
  });

  it("denies direct profile deletion until coordinated account deletion exists", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/alice"), profile());
    });
    const db = userDb("alice");
    await assertFails(deleteDoc(doc(db, "profiles/alice")));
  });

  it("denies changing the profile creation timestamp", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/alice"), profile());
    });
    const db = userDb("alice");
    await assertFails(updateDoc(doc(db, "profiles/alice"), { createdAt: 1 }));
  });
});
