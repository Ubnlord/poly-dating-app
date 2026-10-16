import fs from "node:fs";
import { after, before, beforeEach, describe, it } from "mocha";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteObject, ref, uploadBytes } from "firebase/storage";

const projectId = "demo-polyconnect";
let testEnv;
const imageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43]);

function storageFor(uid, emailVerified = true) {
  return testEnv.authenticatedContext(uid, { email_verified: emailVerified }).storage();
}

describe("PolyConnect Storage rules — profile photos", function () {
  before(async function () {
    testEnv = await initializeTestEnvironment({
      projectId,
      storage: { rules: fs.readFileSync("storage.rules", "utf8") }
    });
  });

  beforeEach(async function () {
    await testEnv.clearStorage();
  });

  after(async function () {
    await testEnv.cleanup();
  });

  it("allows verified owners to upload an image to their own avatar path", async function () {
    const storage = storageFor("alice");
    await assertSucceeds(uploadBytes(ref(storage, "profilePhotos/alice/avatar"), imageBytes, {
      contentType: "image/jpeg",
      customMetadata: { ownerUid: "alice" }
    }));
  });

  it("denies uploads to another user's avatar path", async function () {
    const storage = storageFor("alice");
    await assertFails(uploadBytes(ref(storage, "profilePhotos/bob/avatar"), imageBytes, {
      contentType: "image/jpeg",
      customMetadata: { ownerUid: "alice" }
    }));
  });

  it("denies uploads from unverified users", async function () {
    const storage = storageFor("alice", false);
    await assertFails(uploadBytes(ref(storage, "profilePhotos/alice/avatar"), imageBytes, {
      contentType: "image/jpeg",
      customMetadata: { ownerUid: "alice" }
    }));
  });

  it("denies disallowed content types and files larger than five megabytes", async function () {
    const storage = storageFor("alice");
    await assertFails(uploadBytes(ref(storage, "profilePhotos/alice/avatar"), imageBytes, {
      contentType: "text/plain",
      customMetadata: { ownerUid: "alice" }
    }));
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    await assertFails(uploadBytes(ref(storage, "profilePhotos/alice/avatar"), oversized, {
      contentType: "image/jpeg",
      customMetadata: { ownerUid: "alice" }
    }));
  });

  it("denies spoofed owner metadata and unauthenticated reads", async function () {
    const storage = storageFor("alice");
    await assertFails(uploadBytes(ref(storage, "profilePhotos/alice/avatar"), imageBytes, {
      contentType: "image/jpeg",
      customMetadata: { ownerUid: "bob" }
    }));
    const anonymousStorage = testEnv.unauthenticatedContext().storage();
    await assertFails(uploadBytes(ref(anonymousStorage, "profilePhotos/alice/avatar"), imageBytes, {
      contentType: "image/jpeg",
      customMetadata: { ownerUid: "alice" }
    }));
  });

  it("denies verified users from reading other private Storage paths", async function () {
    const storage = storageFor("alice");
    await assertFails(uploadBytes(ref(storage, "private/alice/file"), imageBytes, {
      contentType: "image/jpeg",
      customMetadata: { ownerUid: "alice" }
    }));
    await assertFails(deleteObject(ref(storage, "profilePhotos/bob/avatar")));
  });
});
