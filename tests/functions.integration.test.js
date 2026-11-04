const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');

const PROJECT_ID = 'polyconnect-rules-test';
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const adminApp = admin.initializeApp({ projectId: PROJECT_ID }, 'polyconnect-functions-test');
const adminAuth = admin.auth(adminApp);
const adminDb = admin.firestore(adminApp);

let app;
let auth;
let functions;
let aliceUid;
let bobUid;
let aliceMember;
let bobMember;

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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
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

  aliceMember = await createVerifiedMember('Alice');
  bobMember = await createVerifiedMember('Bob');
  aliceUid = aliceMember.uid;
  bobUid = bobMember.uid;
  await signIn(aliceMember);
});

after(async () => {
  try { await signOut(auth); } catch (_) {}
  for (const uid of [aliceUid, bobUid]) {
    if (!uid) continue;
    const queries = [
      ['likes', 'fromUid'], ['matches', 'memberIds'], ['conversations', 'memberIds'],
      ['reports', 'reporterUid'], ['blocks', 'blockerUid'], ['adminAudit', 'actorUid']
    ];
    for (const [collection, field] of queries) {
      const query = field === 'memberIds'
        ? adminDb.collection(collection).where(field, 'array-contains', uid)
        : adminDb.collection(collection).where(field, '==', uid);
      const snapshot = await query.get();
      for (const document of snapshot.docs) {
        if (collection === 'conversations') await adminDb.recursiveDelete(document.ref);
        else await document.ref.delete();
      }
    }
  }
  for (const uid of [aliceUid, bobUid]) {
    if (!uid) continue;
    for (const collection of ['profiles', 'users']) {
      await adminDb.collection(collection).doc(uid).delete().catch(() => {});
    }
    for (const suffix of ['_likes', '_reports', '_messages']) {
      await adminDb.collection('rateLimits').doc(uid + suffix).delete().catch(() => {});
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
  const unblockMember = httpsCallable(functions, 'unblockMember');
  const submitSafetyReport = httpsCallable(functions, 'submitSafetyReport');
  const listMyMatches = httpsCallable(functions, 'listMyMatches');
  const listConversationMessages = httpsCallable(functions, 'listConversationMessages');
  const sendConversationMessage = httpsCallable(functions, 'sendConversationMessage');
  const exportMyData = httpsCallable(functions, 'exportMyData');
  const listMyBlocks = httpsCallable(functions, 'listMyBlocks');

  const firstPage = await discover({ limit: 20 });
  assert.ok(firstPage.data.profiles.some(profile => profile.uid === bobUid));
  assert.equal(firstPage.data.profiles.find(profile => profile.uid === bobUid).email, undefined);

  const firstLike = await sendLike({ targetUid: bobUid, kind: 'like' });
  assert.equal(firstLike.data.matched, false);

  await signOut(auth);
  await signIn(bobMember);

  const reciprocalLike = await sendLike({ targetUid: aliceUid, kind: 'superLike' });
  assert.equal(reciprocalLike.data.matched, true);
  assert.ok(reciprocalLike.data.matchId);

  const matchSnapshot = await adminDb.collection('matches').doc(reciprocalLike.data.matchId).get();
  const conversationSnapshot = await adminDb.collection('conversations').doc(reciprocalLike.data.matchId).get();
  assert.equal(matchSnapshot.data().status, 'active');
  assert.equal(conversationSnapshot.data().status, 'active');
  assert.deepEqual(matchSnapshot.data().memberIds.slice().sort(), [aliceUid, bobUid].sort());

  const bobMatches = await listMyMatches({});
  assert.ok(bobMatches.data.matches.some(match => match.uid === aliceUid));
  await sendConversationMessage({ conversationId: reciprocalLike.data.matchId, text: 'Hello from Bob' });
  const bobMessages = await listConversationMessages({ conversationId: reciprocalLike.data.matchId });
  assert.equal(bobMessages.data.messages.length, 1);
  assert.equal(bobMessages.data.messages[0].text, 'Hello from Bob');
  assert.equal(bobMessages.data.messages[0].senderUid, bobUid);
  const bobExport = await exportMyData({});
  assert.equal(bobExport.data.account.uid, bobUid);
  assert.equal(bobExport.data.profile.name, 'Bob');
  assert.ok(bobExport.data.conversations.some(conversation => conversation.messages.some(message => message.text === 'Hello from Bob')));

  await signOut(auth);
  await signIn(aliceMember);

  const report = await submitSafetyReport({
    targetUid: bobUid,
    reason: 'fake_profile',
    details: 'Automated emulator test report'
  });
  assert.equal(report.data.ok, true);
  const reportSnapshot = await adminDb.collection('reports').doc(report.data.reportId).get();
  assert.equal(reportSnapshot.data().reporterUid, aliceUid);
  assert.equal(reportSnapshot.data().status, 'open');
  const aliceExport = await exportMyData({});
  assert.ok(aliceExport.data.reportsFiled.some(item => item.reportId === report.data.reportId));

  const blocked = await blockMember({ targetUid: bobUid });
  assert.equal(blocked.data.ok, true);
  const blockSnapshot = await adminDb.collection('blocks').doc(aliceUid + '_' + bobUid).get();
  assert.equal(blockSnapshot.exists, true);
  assert.equal((await adminDb.collection('matches').doc(reciprocalLike.data.matchId).get()).data().status, 'blocked');
  const blockedList = await listMyBlocks({});
  assert.ok(blockedList.data.blocks.some(item => item.targetUid === bobUid));
  const matchesAfterBlock = await listMyMatches({});
  assert.equal(matchesAfterBlock.data.matches.some(match => match.uid === bobUid), false);
  await assert.rejects(
    sendConversationMessage({ conversationId: reciprocalLike.data.matchId, text: 'This must fail' }),
    error => error && (error.code === 'functions/permission-denied' || error.code === 'permission-denied')
  );
  await assert.rejects(
    listConversationMessages({ conversationId: reciprocalLike.data.matchId }),
    error => error && (error.code === 'functions/permission-denied' || error.code === 'permission-denied')
  );

  const afterBlock = await discover({ limit: 20 });
  assert.equal(afterBlock.data.profiles.some(profile => profile.uid === bobUid), false);

  await assert.rejects(
    sendLike({ targetUid: bobUid, kind: 'like' }),
    error => error && (error.code === 'functions/permission-denied' || error.code === 'permission-denied')
  );
  
  const unblocked = await unblockMember({ targetUid: bobUid });
  assert.equal(unblocked.data.ok, true);
  const blocksAfterUnblock = await listMyBlocks({});
  assert.equal(blocksAfterUnblock.data.blocks.some(item => item.targetUid === bobUid), false);
  const aliceRelike = await sendLike({ targetUid: bobUid, kind: 'like' });
  assert.equal(aliceRelike.data.matched, false);
  await signOut(auth);
  await signIn(bobMember);
  const bobRelike = await sendLike({ targetUid: aliceUid, kind: 'like' });
  assert.equal(bobRelike.data.matched, true);
  const reopenedMessages = await listConversationMessages({ conversationId: reciprocalLike.data.matchId });
  assert.equal(reopenedMessages.data.messages.length, 0);

});
