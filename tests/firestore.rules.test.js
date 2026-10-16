import fs from "node:fs";
import { after, before, beforeEach, describe, it } from "mocha";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

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
  imagePath: "profilePhotos/alice/avatar",
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

  it("denies unverified users direct reads of public discovery profiles", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "publicProfiles/alice"), profile());
    });
    const db = testEnv.authenticatedContext("bob", { email_verified: false }).firestore();
    await assertFails(getDoc(doc(db, "publicProfiles/alice")));
  });

  it("denies unverified users discovery queries", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "publicProfiles/alice"), profile());
    });
    const db = testEnv.authenticatedContext("bob", { email_verified: false }).firestore();
    await assertFails(getDocs(collection(db, "publicProfiles")));
  });

  it("denies unverified users reads of their own source profile", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/alice"), profile());
    });
    const db = testEnv.authenticatedContext("alice", { email_verified: false }).firestore();
    await assertFails(getDoc(doc(db, "profiles/alice")));
  });

  it("denies unverified users writes to the public profile collection", async function () {
    const db = testEnv.authenticatedContext("alice", { email_verified: false }).firestore();
    await assertFails(setDoc(doc(db, "publicProfiles/alice"), profile()));
  });

  it("denies changing the profile creation timestamp", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/alice"), profile());
    });
    const db = userDb("alice");
    await assertFails(updateDoc(doc(db, "profiles/alice"), { createdAt: 1 }));
  });

  it("keeps account A from reading account B data after an account switch", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/alice"), profile({ name: "Account A" }));
      await setDoc(doc(ctx.firestore(), "profiles/bob"), profile({ name: "Account B" }));
    });
    const accountA = userDb("alice");
    const accountB = userDb("bob");
    const ownA = await getDoc(doc(accountA, "profiles/alice"));
    if (!ownA.exists() || ownA.data().name !== "Account A") throw new Error("Account A profile mismatch");
    await assertFails(getDoc(doc(accountA, "profiles/bob")));
    const ownB = await getDoc(doc(accountB, "profiles/bob"));
    if (!ownB.exists() || ownB.data().name !== "Account B") throw new Error("Account B profile mismatch");
    await assertFails(getDoc(doc(accountB, "profiles/alice")));
  });

  it("denies protected profile access after sign-out", async function () {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles/alice"), profile());
    });
    const signedOutDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(signedOutDb, "profiles/alice")));
    await assertFails(setDoc(doc(signedOutDb, "profiles/alice"), profile({ name: "Tampered" })));
  });

  it("allows a user to submit a bounded report about another user", async function () {
    const db = userDb("reporter");
    await assertSucceeds(setDoc(doc(db, "reports/report-1"), {
      reporterUid: "reporter", targetUid: "target", reason: "harassment",
      details: "Unwanted messages", status: "pending", createdAt: serverTimestamp()
    }));
  });

  it("denies forged reports, self-reports, invalid reasons, and report mutation", async function () {
    const db = userDb("reporter");
    await assertFails(setDoc(doc(db, "reports/forged"), {
      reporterUid: "someone-else", targetUid: "target", reason: "spam", status: "pending", createdAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(db, "reports/self"), {
      reporterUid: "reporter", targetUid: "reporter", reason: "spam", status: "pending", createdAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(db, "reports/bad-reason"), {
      reporterUid: "reporter", targetUid: "target", reason: "ban-them", status: "pending", createdAt: serverTimestamp()
    }));
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), "reports/immutable"), {
        reporterUid: "reporter", targetUid: "target", reason: "spam", status: "pending", createdAt: 1760000000000
      });
    });
    await assertFails(updateDoc(doc(db, "reports/immutable"), { status: "reviewed" }));
    await assertFails(deleteDoc(doc(db, "reports/immutable")));
  });

  it("keeps reports private to their reporter", async function () {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), "reports/private"), {
        reporterUid: "alice", targetUid: "bob", reason: "spam", status: "pending", createdAt: 1760000000000
      });
    });
    await assertSucceeds(getDoc(doc(userDb("alice"), "reports/private")));
    await assertFails(getDoc(doc(userDb("bob"), "reports/private")));
  });

  it("allows users to create and remove only their own block records", async function () {
    const alice = userDb("alice");
    await assertSucceeds(setDoc(doc(alice, "users/alice/blocks/bob"), { targetUid: "bob", createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(alice, "users/bob/blocks/alice"), { targetUid: "alice", createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(alice, "users/alice/blocks/alice"), { targetUid: "alice", createdAt: serverTimestamp() }));
    await assertFails(getDoc(doc(userDb("bob"), "users/alice/blocks/bob")));
    await assertSucceeds(deleteDoc(doc(alice, "users/alice/blocks/bob")));
  });

});
