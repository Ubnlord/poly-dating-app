const crypto = require('node:crypto');
const admin = require('firebase-admin');
const { setGlobalOptions } = require('firebase-functions/v2');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

function requireVerifiedAdult(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to continue.');
  }
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Verify your email before using member features.');
  }
  return request.auth.uid;
}

function matchDocumentId(uidA, uidB) {
  return crypto.createHash('sha256')
    .update([uidA, uidB].sort().join(':'))
    .digest('hex');
}

function validateTarget(targetUid, actorUid) {
  if (typeof targetUid !== 'string' || targetUid.length < 1 || targetUid.length > 128 || targetUid === actorUid) {
    throw new HttpsError('invalid-argument', 'Choose a valid member.');
  }
}

exports.sendLike = onCall(async request => {
  const uid = requireVerifiedAdult(request);
  const { targetUid, kind = 'like' } = request.data || {};
  validateTarget(targetUid, uid);
  if (!['like', 'pass', 'superLike'].includes(kind)) {
    throw new HttpsError('invalid-argument', 'Unsupported interaction.');
  }

  const targetRef = db.collection('profiles').doc(targetUid);
  const ownRef = db.collection('profiles').doc(uid);
  const likeRef = db.collection('likes').doc(uid + '_' + targetUid);
  const reverseRef = db.collection('likes').doc(targetUid + '_' + uid);
  const blockRef = db.collection('blocks').doc(uid + '_' + targetUid);
  const reverseBlockRef = db.collection('blocks').doc(targetUid + '_' + uid);
  const ids = [uid, targetUid].sort();
  const matchId = matchDocumentId(uid, targetUid);
  const matchRef = db.collection('matches').doc(matchId);
  const conversationRef = db.collection('conversations').doc(matchId);

  return db.runTransaction(async transaction => {
    const own = await transaction.get(ownRef);
    const target = await transaction.get(targetRef);
    const [account, targetAccount, block, reverseBlock, existingLike, reverseLike, existingMatch, existingConversation, rateRef] =
      await Promise.all([
        transaction.get(db.collection('users').doc(uid)),
        transaction.get(db.collection('users').doc(targetUid)),
        transaction.get(blockRef),
        transaction.get(reverseBlockRef),
        transaction.get(likeRef),
        transaction.get(reverseRef),
        transaction.get(matchRef),
        transaction.get(conversationRef),
        transaction.get(db.collection('rateLimits').doc(uid + '_likes'))
      ]);

    if (!own.exists || !target.exists) {
      throw new HttpsError('not-found', 'Member profile not found.');
    }
    const mine = own.data();
    const theirs = target.data();
    if (!Number.isInteger(mine.age) || mine.age < 18 || mine.emailVerified !== true ||
        mine.discoveryEnabled !== true || (account.exists && account.data().suspended === true)) {
      throw new HttpsError('permission-denied', 'Your account is not eligible for this action.');
    }
    if (!Number.isInteger(theirs.age) || theirs.age < 18 || theirs.emailVerified !== true ||
        theirs.discoveryEnabled !== true || (targetAccount.exists && targetAccount.data().suspended === true)) {
      throw new HttpsError('not-found', 'Member profile is unavailable.');
    }
    if (block.exists || reverseBlock.exists) {
      throw new HttpsError('permission-denied', 'This interaction is unavailable.');
    }

    if (existingLike.exists && existingLike.data().kind === kind) {
      return { ok: true, duplicate: true, matched: existingMatch.exists && existingMatch.data().status === 'active' };
    }

    const day = new Date().toISOString().slice(0, 10);
    const rateData = rateRef.exists ? rateRef.data() : {};
    const count = rateData.day === day ? Number(rateData.count || 0) : 0;
    if (count >= 100) {
      throw new HttpsError('resource-exhausted', 'Daily interaction limit reached. Try again tomorrow.');
    }

    transaction.set(db.collection('rateLimits').doc(uid + '_likes'), {
      day, count: count + 1, updatedAt: FieldValue.serverTimestamp()
    });
    transaction.set(likeRef, {
      fromUid: uid,
      toUid: targetUid,
      kind,
      createdAt: existingLike.exists && existingLike.data().createdAt
        ? existingLike.data().createdAt : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    const reciprocal = reverseLike.exists && ['like', 'superLike'].includes(reverseLike.data().kind);
    const isPositive = kind === 'like' || kind === 'superLike';
    if (isPositive && reciprocal) {
      if (!existingMatch.exists) {
        transaction.create(matchRef, {
          memberIds: ids, status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
        });
      }
      if (!existingConversation.exists) {
        transaction.create(conversationRef, {
          memberIds: ids, status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
        });
      }
      return { ok: true, duplicate: false, matched: true, matchId };
    }
    return { ok: true, duplicate: false, matched: false };
  });
});

exports.blockMember = onCall(async request => {
  const uid = requireVerifiedAdult(request);
  const { targetUid } = request.data || {};
  validateTarget(targetUid, uid);
  const blockRef = db.collection('blocks').doc(uid + '_' + targetUid);
  const targetRef = db.collection('profiles').doc(targetUid);
  const matchId = matchDocumentId(uid, targetUid);
  const matchRef = db.collection('matches').doc(matchId);
  const conversationRef = db.collection('conversations').doc(matchId);
  const auditRef = db.collection('adminAudit').doc();

  return db.runTransaction(async transaction => {
    const own = await transaction.get(db.collection('profiles').doc(uid));
    const account = await transaction.get(db.collection('users').doc(uid));
    const target = await transaction.get(targetRef);
    const existingBlock = await transaction.get(blockRef);
    const match = await transaction.get(matchRef);
    const conversation = await transaction.get(conversationRef);
    if (!own.exists || !Number.isInteger(own.data().age) || own.data().age < 18 ||
        own.data().emailVerified !== true || (account.exists && account.data().suspended === true)) {
      throw new HttpsError('permission-denied', 'An eligible adult profile is required.');
    }
    if (!target.exists) throw new HttpsError('not-found', 'Member profile not found.');
    if (!existingBlock.exists) {
      transaction.create(blockRef, {
        blockerUid: uid, blockedUid: targetUid, createdAt: FieldValue.serverTimestamp()
      });
    }
    if (match.exists && match.data().status === 'active') {
      transaction.update(matchRef, { status: 'blocked', updatedAt: FieldValue.serverTimestamp() });
    }
    if (conversation.exists) {
      transaction.update(conversationRef, { status: 'blocked', updatedAt: FieldValue.serverTimestamp() });
    }
    transaction.create(auditRef, {
      action: 'member_blocked', actorUid: uid, targetUid, createdAt: FieldValue.serverTimestamp()
    });
    return { ok: true, alreadyBlocked: existingBlock.exists };
  });
});

exports.submitSafetyReport = onCall(async request => {
  const uid = requireVerifiedAdult(request);
  const { targetUid, reason, details = '' } = request.data || {};
  validateTarget(targetUid, uid);
  const allowedReasons = ['harassment', 'spam', 'fake_profile', 'underage', 'inappropriate_content', 'other'];
  if (!allowedReasons.includes(reason) || typeof details !== 'string' || details.length > 2000) {
    throw new HttpsError('invalid-argument', 'Check the report reason and description.');
  }

  const reportRef = db.collection('reports').doc();
  const targetRef = db.collection('profiles').doc(targetUid);
  await db.runTransaction(async transaction => {
    const own = await transaction.get(db.collection('profiles').doc(uid));
    const account = await transaction.get(db.collection('users').doc(uid));
    const target = await transaction.get(targetRef);
    const reportLimitRef = db.collection('rateLimits').doc(uid + '_reports');
    const reportLimit = await transaction.get(reportLimitRef);
    if (!own.exists || !Number.isInteger(own.data().age) || own.data().age < 18 ||
        own.data().emailVerified !== true || (account.exists && account.data().suspended === true)) {
      throw new HttpsError('permission-denied', 'An eligible adult profile is required.');
    }
    if (!target.exists) throw new HttpsError('not-found', 'Member profile not found.');
    const day = new Date().toISOString().slice(0, 10);
    const previous = reportLimit.exists ? reportLimit.data() : {};
    const count = previous.day === day ? Number(previous.count || 0) : 0;
    if (count >= 5) throw new HttpsError('resource-exhausted', 'Daily report limit reached. Try again tomorrow.');
    transaction.set(reportLimitRef, { day, count: count + 1, updatedAt: FieldValue.serverTimestamp() });
    transaction.create(reportRef, {
      reporterUid: uid, targetUid, reason, details,
      createdAt: FieldValue.serverTimestamp(), status: 'open'
    });
  });
  return { ok: true, reportId: reportRef.id };
});


exports.listDiscoveryProfiles = onCall(async request => {
  const uid = requireVerifiedAdult(request);
  const requestedLimit = Number(request.data && request.data.limit);
  const pageSize = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 20) : 20;
  const cursor = request.data && request.data.cursor;
  if (cursor && (!Number.isInteger(cursor.age) || typeof cursor.uid !== 'string' || !cursor.uid)) {
    throw new HttpsError('invalid-argument', 'Invalid discovery cursor.');
  }

  const own = await db.collection('profiles').doc(uid).get();
  if (!own.exists || !Number.isInteger(own.data().age) || own.data().age < 18 ||
      own.data().emailVerified !== true || own.data().discoveryEnabled !== true) {
    throw new HttpsError('failed-precondition', 'Complete an eligible profile and enable discovery first.');
  }
  const account = await db.collection('users').doc(uid).get();
  if (account.exists && account.data().suspended === true) {
    throw new HttpsError('permission-denied', 'This account is currently restricted.');
  }

  const [blockedByMe, blockedMe] = await Promise.all([
    db.collection('blocks').where('blockerUid', '==', uid).get(),
    db.collection('blocks').where('blockedUid', '==', uid).get()
  ]);
  const excluded = new Set([uid]);
  blockedByMe.docs.forEach(doc => excluded.add(doc.data().blockedUid));
  blockedMe.docs.forEach(doc => excluded.add(doc.data().blockerUid));

  let query = db.collection('profiles')
    .where('age', '>=', 18)
    .orderBy('age')
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(100);
  if (cursor) query = query.startAfter(cursor.age, cursor.uid);
  const snapshot = await query.get();
  const eligible = snapshot.docs.filter(doc => {
    const profile = doc.data();
    return !excluded.has(doc.id) && profile.emailVerified === true &&
      profile.discoveryEnabled === true && Number.isInteger(profile.age) && profile.age >= 18;
  });
  const page = eligible.slice(0, pageSize);
  const profiles = page.map(doc => {
    const p = doc.data();
    return {
      uid: doc.id,
      name: p.name || '',
      age: p.age,
      gender: p.gender || '',
      bio: p.bio || '',
      school: p.school || '',
      department: p.department || '',
      level: p.level || '',
      state: p.state || '',
      interests: Array.isArray(p.interests) ? p.interests.slice(0, 20) : [],
      hobbies: p.hobbies || '',
      relationshipGoal: p.relationshipGoal || '',
      languages: p.languages || '',
      imagePath: p.imagePath || ''
    };
  });
  const cursorDoc = page.length ? page[page.length - 1] :
    (eligible.length === 0 && snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null);
  return {
    profiles,
    nextCursor: cursorDoc ? { age: cursorDoc.data().age, uid: cursorDoc.id } : null,
    hasMore: eligible.length > pageSize || snapshot.docs.length === 100
  };
});


exports.unblockMember = onCall(async request => {
  const uid = requireVerifiedAdult(request);
  const { targetUid } = request.data || {};
  validateTarget(targetUid, uid);
  const blockRef = db.collection('blocks').doc(uid + '_' + targetUid);
  const auditRef = db.collection('adminAudit').doc();
  return db.runTransaction(async transaction => {
    const own = await transaction.get(db.collection('profiles').doc(uid));
    const account = await transaction.get(db.collection('users').doc(uid));
    const block = await transaction.get(blockRef);
    if (!own.exists || !Number.isInteger(own.data().age) || own.data().age < 18 ||
        own.data().emailVerified !== true || (account.exists && account.data().suspended === true)) {
      throw new HttpsError('permission-denied', 'An eligible adult profile is required.');
    }
    if (block.exists) transaction.delete(blockRef);
    transaction.create(auditRef, {
      action: 'member_unblocked', actorUid: uid, targetUid, createdAt: FieldValue.serverTimestamp()
    });
    return { ok: true, wasBlocked: block.exists };
  });
});


exports.listMyMatches = onCall(async request => {
  const uid = requireVerifiedAdult(request);
  const own = await db.collection('profiles').doc(uid).get();
  const account = await db.collection('users').doc(uid).get();
  if (!own.exists || !Number.isInteger(own.data().age) || own.data().age < 18 ||
      own.data().emailVerified !== true || (account.exists && account.data().suspended === true)) {
    throw new HttpsError('permission-denied', 'An eligible adult profile is required.');
  }
  const snapshot = await db.collection('matches')
    .where('memberIds', 'array-contains', uid)
    .limit(50)
    .get();
  const matches = await Promise.all(snapshot.docs.map(async matchDoc => {
    const match = matchDoc.data();
    if (match.status !== 'active' || !Array.isArray(match.memberIds) || match.memberIds.length !== 2) return null;
    const otherUid = match.memberIds.find(memberId => memberId !== uid);
    if (!otherUid) return null;
    const [profileDoc, forwardBlock, reverseBlock] = await Promise.all([
      db.collection('profiles').doc(otherUid).get(),
      db.collection('blocks').doc(uid + '_' + otherUid).get(),
      db.collection('blocks').doc(otherUid + '_' + uid).get()
    ]);
    if (!profileDoc.exists || forwardBlock.exists || reverseBlock.exists) return null;
    const profile = profileDoc.data();
    if (profile.emailVerified !== true || profile.discoveryEnabled !== true ||
        !Number.isInteger(profile.age) || profile.age < 18) return null;
    const latest = await db.collection('conversations').doc(matchDoc.id)
      .collection('messages').orderBy('createdAt', 'desc').limit(1).get();
    const last = latest.empty ? null : latest.docs[0].data();
    return {
      matchId: matchDoc.id,
      uid: otherUid,
      profile: {
        name: profile.name || '',
        age: profile.age,
        gender: profile.gender || '',
        bio: profile.bio || '',
        school: profile.school || '',
        department: profile.department || '',
        level: profile.level || '',
        state: profile.state || '',
        interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 20) : [],
        relationshipGoal: profile.relationshipGoal || '',
        imagePath: profile.imagePath || ''
      },
      lastMessage: last ? {
        text: last.text || '',
        senderUid: last.senderUid || '',
        createdAt: last.createdAt && typeof last.createdAt.toMillis === 'function' ? last.createdAt.toMillis() : null
      } : null
    };
  }));
  return { matches: matches.filter(Boolean) };
});

async function verifyActiveConversation(uid, conversationId) {
  if (typeof conversationId !== 'string' || !/^[a-f0-9]{64}$/.test(conversationId)) {
    throw new HttpsError('invalid-argument', 'Invalid conversation.');
  }
  const matchRef = db.collection('matches').doc(conversationId);
  const conversationRef = db.collection('conversations').doc(conversationId);
  const [match, conversation] = await Promise.all([matchRef.get(), conversationRef.get()]);
  if (!match.exists || !conversation.exists || match.data().status !== 'active' ||
      conversation.data().status !== 'active' || !Array.isArray(match.data().memberIds) ||
      !match.data().memberIds.includes(uid)) {
    throw new HttpsError('permission-denied', 'You do not have access to this conversation.');
  }
  const otherUid = match.data().memberIds.find(memberId => memberId !== uid);
  if (!otherUid) throw new HttpsError('permission-denied', 'Invalid conversation membership.');
  const [forwardBlock, reverseBlock] = await Promise.all([
    db.collection('blocks').doc(uid + '_' + otherUid).get(),
    db.collection('blocks').doc(otherUid + '_' + uid).get()
  ]);
  if (forwardBlock.exists || reverseBlock.exists) {
    throw new HttpsError('permission-denied', 'This conversation is no longer available.');
  }
  return { matchRef, conversationRef, otherUid };
}

exports.listConversationMessages = onCall(async request => {
  const uid = requireVerifiedAdult(request);
  const { conversationId } = request.data || {};
  const { conversationRef } = await verifyActiveConversation(uid, conversationId);
  const snapshot = await conversationRef.collection('messages')
    .orderBy('createdAt', 'desc').limit(50).get();
  const messages = snapshot.docs.map(doc => {
    const message = doc.data();
    return {
      id: doc.id,
      senderUid: message.senderUid,
      text: message.text,
      createdAt: message.createdAt && typeof message.createdAt.toMillis === 'function'
        ? message.createdAt.toMillis() : null
    };
  }).reverse();
  return { messages };
});

exports.sendConversationMessage = onCall(async request => {
  const uid = requireVerifiedAdult(request);
  const { conversationId, text } = request.data || {};
  if (typeof text !== 'string' || !text.trim() || text.trim().length > 2000) {
    throw new HttpsError('invalid-argument', 'Messages must contain 1 to 2,000 characters.');
  }
  const { conversationRef } = await verifyActiveConversation(uid, conversationId);
  const profile = await db.collection('profiles').doc(uid).get();
  const account = await db.collection('users').doc(uid).get();
  if (!profile.exists || !Number.isInteger(profile.data().age) || profile.data().age < 18 ||
      profile.data().emailVerified !== true || (account.exists && account.data().suspended === true)) {
    throw new HttpsError('permission-denied', 'This account cannot send messages.');
  }

  const rateRef = db.collection('rateLimits').doc(uid + '_messages');
  const messageRef = conversationRef.collection('messages').doc();
  await db.runTransaction(async transaction => {
    const rate = await transaction.get(rateRef);
    const now = Date.now();
    const previous = rate.exists ? rate.data() : {};
    const windowStart = Number(previous.windowStart || 0);
    const count = now - windowStart < 10 * 60 * 1000 ? Number(previous.count || 0) : 0;
    if (count >= 30) {
      throw new HttpsError('resource-exhausted', 'Message limit reached. Please wait before sending more.');
    }
    transaction.set(rateRef, { windowStart: count ? windowStart : now, count: count + 1, updatedAt: FieldValue.serverTimestamp() });
    transaction.create(messageRef, {
      senderUid: uid,
      text: text.trim(),
      createdAt: FieldValue.serverTimestamp()
    });
    transaction.update(conversationRef, { lastMessageAt: FieldValue.serverTimestamp() });
  });
  return { ok: true, messageId: messageRef.id };
});
