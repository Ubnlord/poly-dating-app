const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');

const PROJECT_ID = 'polyconnect-rules-test';
const admin = require('../functions/node_modules/firebase-admin');
const adminApp = admin.initializeApp({ projectId: PROJECT_ID }, 'polyconnect-functions-test');
const adminAuth = admin.auth(adminApp);
const adminDb = admin.firestore(adminApp);

let app;
let auth;
let functions;
let aliceUid;
let bobUid;

async function createVerifiedMember(label) {
  const email = label + '-' + crypto.randomUUID() + '@example.test';
  const user = await adminAuth.createUser({
    email,
    password: 'Test-password-123!',
    emailVerified: true,
    displayName: label
  });
  await adminDb.collection('profiles').doc(user.uid).set({
    uid: user.uid,
    name: label,
    age: 21,
    gender: 'Prefer not to say',
    bio: 'Emulator test profile',
    school: 'Test Polytechnic',
    department: 'Computing',
    interests: ['Technology'],
    discoveryEnabled: true,
    emailVerified: true,
    verificationStatus: 'unverified',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { uid: user.uid, email, password: 'Test-password-123!' };
}

async function signIn(member) {
  await signInWithEmailAndPassword(auth, member.email, member.password);
}

before(async () => {
  app = initializeApp({
    apiKey: 'fake-api-key',
    authDomain: 'localhost',
    projectId: PROJECT_ID
  }, 'polyconnect-functions-client-' + crypto.randomUUID());
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);

  const alice = await createVerifiedMember('Alice');
  const bob = await createVerifiedMember('Bob');
  aliceUid = alice.uid;
  bobUid = bob.uid;
  await signIn(alice);
});

after(async () => {
  try { await signOut(auth); } catch (_) {}
  for (const uid of [aliceUid, bobUid]) {
    if (!uid) continue;
    const queries = [
      ['likes', 'fromUid'], ['matches', 'memberIds'], ['conversations', 'memberIds'],
      ['reports', 'reporterUid'], ['blocks', 'blockerUid']
    ];
    for (const [collection, field] of queries) {
      const query = field === 'memberIds'
        ? adminDb.collection(collection).where(field, 'array-contains', uid)
        : adminDb.collection(collection).where(field, '==', uid);
      const snapshot = await query.get();
      for (const document of snapshot.docs) await document.ref.delete();
    }
  }
  for (const uid of [aliceUid, bobUid]) {
    if (!uid) continue;
    for (const collection of ['profiles', 'users', 'rateLimits']) {
      await adminDb.collection(collection).doc(collection === 'rateLimits' ? uid + '_likes' : uid).delete().catch(() => {});
    }
    await adminAuth.deleteUser(uid).catch(() => {});
  }
  if (app) await deleteApp(app);
  await adminApp.delete();
});

test('discovery, mutual matching, blocking, and reporting are enforced by trusted functions', async () => {
  const discover = httpsCallable(functions, 'listDiscoveryProfiles');
  const sendLike = httpsCallable(functions, 'sendLike');
  const blockMember = httpsCallable(functions, 'blockMember');
  const submitSafetyReport = httpsCallable(functions, 'submitSafetyReport');

  const firstPage = await discover({ limit: 20 });
  assert.ok(firstPage.data.profiles.some(profile => profile.uid === bobUid));
  assert.equal(firstPage.data.profiles.find(profile => profile.uid === bobUid).email, undefined);

  const firstLike = await sendLike({ targetUid: bobUid, kind: 'like' });
  assert.equal(firstLike.data.matched, false);

  await signOut(auth);
  await signIn(bob);

  const reciprocalLike = await sendLike({ targetUid: aliceUid, kind: 'superLike' });
  assert.equal(reciprocalLike.data.matched, true);
  assert.ok(reciprocalLike.data.matchId);

  const matchSnapshot = await adminDb.collection('matches').doc(reciprocalLike.data.matchId).get();
  const conversationSnapshot = await adminDb.collection('conversations').doc(reciprocalLike.data.matchId).get();
  assert.equal(matchSnapshot.data().status, 'active');
  assert.equal(conversationSnapshot.data().status, 'active');
  assert.deepEqual(matchSnapshot.data().memberIds.slice().sort(), [aliceUid, bobUid].sort());

  await signOut(auth);
  await signIn(alice);

  const report = await submitSafetyReport({
    targetUid: bobUid,
    reason: 'fake_profile',
    details: 'Automated emulator test report'
  });
  assert.equal(report.data.ok, true);
  const reportSnapshot = await adminDb.collection('reports').doc(report.data.reportId).get();
  assert.equal(reportSnapshot.data().reporterUid, aliceUid);
  assert.equal(reportSnapshot.data().status, 'open');

  const blocked = await blockMember({ targetUid: bobUid });
  assert.equal(blocked.data.ok, true);
  const blockSnapshot = await adminDb.collection('blocks').doc(aliceUid + '_' + bobUid).get();
  assert.equal(blockSnapshot.exists, true);
  assert.equal((await adminDb.collection('matches').doc(reciprocalLike.data.matchId).get()).data().status, 'blocked');

  const afterBlock = await discover({ limit: 20 });
  assert.equal(afterBlock.data.profiles.some(profile => profile.uid === bobUid), false);

  await assert.rejects(
    sendLike({ targetUid: bobUid, kind: 'like' }),
    error => error && (error.code === 'functions/permission-denied' || error.code === 'permission-denied')
  );
});
