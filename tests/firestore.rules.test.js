const fs = require('node:fs');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');

const PROJECT_ID = 'polyconnect-rules-test';
let env;

const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

async function seedProfile(uid, age = 20, extra = {}) {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'profiles', uid), {
      uid,
      name: uid,
      age,
      discoveryEnabled: true,
      emailVerified: true,
      verificationStatus: 'unverified',
      createdAt: new Date(),
      ...extra
    });
  });
}

function verifiedUser(uid) {
  return env.authenticatedContext(uid, { email_verified: true }).firestore();
}

function unverifiedUser(uid) {
  return env.authenticatedContext(uid, { email_verified: false }).firestore();
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
    storage: { rules: fs.readFileSync(path.join(__dirname, '..', 'storage.rules'), 'utf8') }
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

after(async () => {
  if (env) await env.cleanup();
});

test('unauthenticated users cannot read profiles', async () => {
  await seedProfile('alice');
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'profiles/alice')));
});

test('verified adult can create a constrained own profile', async () => {
  const db = verifiedUser('alice');
  await assertSucceeds(setDoc(doc(db, 'profiles/alice'), {
    uid: 'alice',
    name: 'Alice',
    age: 21,
    discoveryEnabled: true,
    emailVerified: true,
    verificationStatus: 'unverified'
  }));
});

test('unverified user cannot create a profile', async () => {
  await assertFails(setDoc(doc(unverifiedUser('alice'), 'profiles/alice'), {
    uid: 'alice',
    name: 'Alice',
    age: 21,
    discoveryEnabled: true,
    emailVerified: false,
    verificationStatus: 'unverified'
  }));
});

test('profile owner cannot write underage or privileged fields', async () => {
  const db = verifiedUser('alice');
  await assertFails(setDoc(doc(db, 'profiles/alice'), {
    uid: 'alice', name: 'Alice', age: 17, discoveryEnabled: true,
    emailVerified: true, verificationStatus: 'unverified'
  }));
  await assertFails(setDoc(doc(db, 'profiles/alice'), {
    uid: 'alice', name: 'Alice', age: 21, discoveryEnabled: true,
    emailVerified: true, verificationStatus: 'verified', moderator: true
  }));
});

test('users cannot forge matches or conversations', async () => {
  await seedProfile('alice');
  const db = verifiedUser('alice');
  await assertFails(setDoc(doc(db, 'matches/alice_bob'), {
    memberIds: ['alice', 'bob'], status: 'active'
  }));
  await assertFails(setDoc(doc(db, 'conversations/alice_bob'), {
    memberIds: ['alice', 'bob'], status: 'active'
  }));
});

test('only verified adults can submit constrained reports; clients cannot read them', async () => {
  await seedProfile('alice');
  const db = verifiedUser('alice');
  await assertSucceeds(setDoc(doc(db, 'reports/report1'), {
    reporterUid: 'alice', targetUid: 'bob', reason: 'harassment',
    details: 'Test report', createdAt: new Date(), status: 'open'
  }));
  await assertFails(getDoc(doc(db, 'reports/report1')));
  await assertFails(updateDoc(doc(db, 'reports/report1'), { status: 'closed' }));
});

test('unknown collections are denied by default', async () => {
  await assertFails(setDoc(doc(verifiedUser('alice'), 'privateSecrets/secret1'), { value: 'no' }));
});
