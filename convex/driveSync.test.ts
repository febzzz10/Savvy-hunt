/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "./**/*.js", "!./**/*.test.ts"]);

describe("Drive gallery sync", () => {
  it("keeps a hidden image hidden when the Drive file changes", async () => {
    const t = convexTest(schema, modules as never);
    const firstStorage = await t.run((ctx) => ctx.storage.store(new Blob(["a"])));

    const first = await t.mutation(internal.drive.applyDriveFile, {
      driveFileId: "drive_file",
      driveFolderId: "drive_folder",
      driveName: "photo.jpg",
      mimeType: "image/jpeg",
      driveModifiedTime: "t1",
      sizeBytes: 1,
      storageId: firstStorage,
      autoPublish: true,
    });
    await t.run((ctx) => ctx.db.patch(first.galleryItemId, { status: "hidden" }));

    const secondStorage = await t.run((ctx) => ctx.storage.store(new Blob(["bb"])));
    const second = await t.mutation(internal.drive.applyDriveFile, {
      driveFileId: "drive_file",
      driveFolderId: "drive_folder",
      driveName: "photo.jpg",
      mimeType: "image/jpeg",
      driveModifiedTime: "t2",
      sizeBytes: 2,
      storageId: secondStorage,
      autoPublish: true,
    });

    const galleryItemId: Id<"galleryItems"> = second.galleryItemId;
    const item = await t.run((ctx) => ctx.db.get(galleryItemId));
    expect(second.action).toBe("updated");
    expect(item?.status).toBe("hidden");
    expect(item?.storageId).toBe(secondStorage);
  });
});
