const fs = require('node:fs');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');
const { ref, uploadBytes, getBytes } = require('firebase/storage');

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
  await env.clearStorage();
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

test('clients cannot write likes, matches, or conversations directly', async () => {
  await seedProfile('alice');
  await seedProfile('bob');
  const db = verifiedUser('alice');
  await assertFails(setDoc(doc(db, 'likes/alice_bob'), {
    fromUid: 'alice', toUid: 'bob', kind: 'like', createdAt: new Date()
  }));
  await assertFails(setDoc(doc(db, 'matches/alice_bob'), {
    memberIds: ['alice', 'bob'], status: 'active'
  }));
  await assertFails(setDoc(doc(db, 'conversations/alice_bob'), {
    memberIds: ['alice', 'bob'], status: 'active'
  }));
});

test('clients cannot create or read reports directly', async () => {
  await seedProfile('alice');
  const db = verifiedUser('alice');
  await assertFails(setDoc(doc(db, 'reports/report1'), {
    reporterUid: 'alice', targetUid: 'bob', reason: 'harassment',
    details: 'Test report', createdAt: new Date(), status: 'open'
  }));
  await assertFails(getDoc(doc(db, 'reports/report1')));
  await assertFails(updateDoc(doc(db, 'reports/report1'), { status: 'closed' }));
});


test('verified adult can upload an allowed profile avatar', async () => {
  await seedProfile('alice', 20);
  const storage = env.authenticatedContext('alice', { email_verified: true }).storage();
  const avatar = ref(storage, 'profilePhotos/alice/avatar');
  await assertSucceeds(uploadBytes(avatar, new Uint8Array([0xff, 0xd8, 0xff]), {
    contentType: 'image/jpeg'
  }));
});

test('profile photo uploads are denied without a verified adult profile', async () => {
  const unverifiedStorage = env.authenticatedContext('alice', { email_verified: false }).storage();
  await assertFails(uploadBytes(ref(unverifiedStorage, 'profilePhotos/alice/avatar'), new Uint8Array([1]), {
    contentType: 'image/jpeg'
  }));

  const missingProfileStorage = env.authenticatedContext('bob', { email_verified: true }).storage();
  await assertFails(uploadBytes(ref(missingProfileStorage, 'profilePhotos/bob/avatar'), new Uint8Array([1]), {
    contentType: 'image/jpeg'
  }));

  await seedProfile('minor', 17);
  const minorStorage = env.authenticatedContext('minor', { email_verified: true }).storage();
  await assertFails(uploadBytes(ref(minorStorage, 'profilePhotos/minor/avatar'), new Uint8Array([1]), {
    contentType: 'image/jpeg'
  }));
});

test('profile photo paths cannot point to another member avatar', async () => {
  const db = verifiedUser('alice');
  await assertFails(setDoc(doc(db, 'profiles/alice'), {
    uid: 'alice', name: 'Alice', age: 21, discoveryEnabled: true,
    emailVerified: true, verificationStatus: 'unverified',
    imagePath: 'profilePhotos/bob/avatar'
  }));
});

test('avatar reads respect discovery visibility and mutual blocks', async () => {
  await seedProfile('alice', 20);
  await seedProfile('bob', 22);
  const aliceStorage = env.authenticatedContext('alice', { email_verified: true }).storage();
  const bobStorage = env.authenticatedContext('bob', { email_verified: true }).storage();
  const avatar = ref(aliceStorage, 'profilePhotos/alice/avatar');
  await assertSucceeds(uploadBytes(avatar, new Uint8Array([0xff, 0xd8, 0xff]), {
    contentType: 'image/jpeg'
  }));
  await assertSucceeds(getBytes(ref(bobStorage, 'profilePhotos/alice/avatar'), 1024));

  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'blocks/alice_bob'), {
      blockerUid: 'alice', blockedUid: 'bob', createdAt: new Date()
    });
  });
  await assertFails(getBytes(ref(bobStorage, 'profilePhotos/alice/avatar'), 1024));
  await assertSucceeds(getBytes(ref(aliceStorage, 'profilePhotos/alice/avatar'), 1024));
});

test('profile photo uploads reject unsupported types, oversized files, and other users paths', async () => {
  await seedProfile('alice', 20);
  const storage = env.authenticatedContext('alice', { email_verified: true }).storage();

  await assertFails(uploadBytes(ref(storage, 'profilePhotos/alice/avatar'), new Uint8Array([1]), {
    contentType: 'text/plain'
  }));
  await assertFails(uploadBytes(ref(storage, 'profilePhotos/alice/avatar'), new Uint8Array(5 * 1024 * 1024 + 1), {
    contentType: 'image/jpeg'
  }));
  await assertFails(uploadBytes(ref(storage, 'profilePhotos/bob/avatar'), new Uint8Array([1]), {
    contentType: 'image/jpeg'
  }));
});

test('unknown collections are denied by default', async () => {
  await assertFails(setDoc(doc(verifiedUser('alice'), 'privateSecrets/secret1'), { value: 'no' }));
});
