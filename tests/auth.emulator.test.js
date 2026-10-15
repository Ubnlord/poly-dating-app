import { after, before, describe, it } from "mocha";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, signOut, applyActionCode, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, setDoc, getFirestore } from "firebase/firestore";
import { initializeTestEnvironment, assertFails } from "@firebase/rules-unit-testing";
import fs from "node:fs";
const projectId = "demo-polyconnect";
let app, auth, db, rulesEnv;
async function verificationCode(email) {
  const response = await fetch("http://127.0.0.1:9099/emulator/v1/projects/" + projectId + "/oobCodes");
  if (!response.ok) throw new Error("Auth emulator code lookup failed: " + response.status);
  const body = await response.json();
  const code = (body.oobCodes || []).find(x => x.email === email && x.requestType === "VERIFY_EMAIL");
  if (!code) throw new Error("No verification code found for " + email);
  return code.oobCode;
}
describe("Isolated Firebase Auth and Firestore journey", function () {
  before(async function () {
    app = initializeApp({ apiKey: "fake-api-key", authDomain: "localhost", projectId }, "polyconnect-auth-test");
    auth = getAuth(app); connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    db = getFirestore(app); connectFirestoreEmulator(db, "127.0.0.1", 8080);
    rulesEnv = await initializeTestEnvironment({ projectId, firestore: { rules: fs.readFileSync("firestore.rules", "utf8") } });
  });
  after(async function () { if (auth) await signOut(auth).catch(() => {}); if (rulesEnv) await rulesEnv.cleanup(); if (app) await deleteApp(app); });
  it("tests signup, verification, login, account switch, and sign-out", async function () {
    const suffix = Date.now() + "-" + Math.random().toString(36).slice(2);
    const emailA = "account-a-" + suffix + "@example.test", emailB = "account-b-" + suffix + "@example.test";
    const password = "Test-only-Password-2026!";
    const profile = name => ({ name, age: 21, gender: "Other", school: "Test Polytechnic", image: "https://example.test/avatar.png", verified: false, createdAt: Date.now() });
    const a = await createUserWithEmailAndPassword(auth, emailA, password);
    if (a.user.emailVerified) throw new Error("New account unexpectedly verified");
    await sendEmailVerification(a.user);
    await assertFails(setDoc(doc(db, "profiles", a.user.uid), profile("A")));
    await applyActionCode(auth, await verificationCode(emailA)); await a.user.reload();
    if (!a.user.emailVerified) throw new Error("Verification failed for account A");
    await setDoc(doc(db, "profiles", a.user.uid), profile("A")); await signOut(auth);
    if (auth.currentUser !== null) throw new Error("Sign-out failed for account A");
    const loginA = await signInWithEmailAndPassword(auth, emailA, password);
    const ownA = await getDoc(doc(db, "profiles", loginA.user.uid));
    if (!ownA.exists() || ownA.data().name !== "A") throw new Error("Account A profile not restored on login");
    await signOut(auth);
    const b = await createUserWithEmailAndPassword(auth, emailB, password); await sendEmailVerification(b.user);
    await applyActionCode(auth, await verificationCode(emailB)); await b.user.reload();
    await setDoc(doc(db, "profiles", b.user.uid), profile("B")); await signOut(auth);
    const loginB = await signInWithEmailAndPassword(auth, emailB, password);
    if (loginB.user.uid !== b.user.uid) throw new Error("Account switch did not select B");
    const ownB = await getDoc(doc(db, "profiles", loginB.user.uid));
    if (!ownB.exists() || ownB.data().name !== "B") throw new Error("Account B profile not restored on login");
    await assertFails(getDoc(doc(db, "profiles", a.user.uid)));
    await signOut(auth); if (auth.currentUser !== null) throw new Error("Final sign-out failed");
    await assertFails(getDoc(doc(db, "profiles", b.user.uid)));
  });
});
