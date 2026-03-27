/**
 * Friends routes.
 *
 * Manages the user-friends table: a userId → list-of-friendIds mapping.
 * Each user has at most one document in the "user-friends" collection.
 *
 * All routes require an `x-user-id` header identifying the acting user.
 *
 * Endpoints:
 *   GET    /friends            – return the caller's friend list
 *   POST   /friends/:friendId  – add a friend to the caller's list
 *   DELETE /friends/:friendId  – remove a friend from the caller's list
 */

import { Router } from "express";
import db from "../db";

// ─── Local types ─────────────────────────────────────────────────────────────

/** Represents the friend list for a single user (mirrors @flightdad/shared UserFriends). */
interface UserFriends {
  userId: string;
  friendIds: string[];
}

/** A persisted UserFriends document with its database-assigned `_id`. */
type UserFriendsDocument = UserFriends & { _id: string };

const router = Router();

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Resolve (or lazily create) the caller's UserFriends document.
 * Returns the document's `_id` alongside the record so callers can update it.
 */
async function getOrCreateFriendList(userId: string): Promise<UserFriendsDocument> {
  const col = db.collection<UserFriends>("user-friends");
  const [existing] = await col.find({ userId });
  if (existing) {
    return existing as UserFriendsDocument;
  }
  const created = await col.insert({ userId, friendIds: [] });
  return created as UserFriendsDocument;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /friends — return the authenticated user's friend list. */
router.get("/", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || userId.trim() === "") {
    res.status(400).json({ message: "Missing or invalid x-user-id header" });
    return;
  }

  const doc = await getOrCreateFriendList(userId.trim());
  res.status(200).json({ userId: doc.userId, friendIds: doc.friendIds });
});

/** POST /friends/:friendId — add a friend to the authenticated user's list. */
router.post("/:friendId", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || userId.trim() === "") {
    res.status(400).json({ message: "Missing or invalid x-user-id header" });
    return;
  }

  const { friendId } = req.params;
  if (!friendId || friendId.trim() === "") {
    res.status(400).json({ message: "Missing friendId" });
    return;
  }

  const trimmedUserId = userId.trim();
  const trimmedFriendId = friendId.trim();

  if (trimmedUserId === trimmedFriendId) {
    res.status(400).json({ message: "A user cannot be their own friend" });
    return;
  }

  const doc = await getOrCreateFriendList(trimmedUserId);

  if (doc.friendIds.includes(trimmedFriendId)) {
    res.status(409).json({ message: "Friend already added" });
    return;
  }

  const updated = await db
    .collection<UserFriends>("user-friends")
    .update(doc._id, { friendIds: [...doc.friendIds, trimmedFriendId] });

  if (!updated) {
    res.status(500).json({ message: "Failed to update friend list" });
    return;
  }

  res.status(201).json({ userId: updated.userId, friendIds: updated.friendIds });
});

/** DELETE /friends/:friendId — remove a friend from the authenticated user's list. */
router.delete("/:friendId", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || userId.trim() === "") {
    res.status(400).json({ message: "Missing or invalid x-user-id header" });
    return;
  }

  const { friendId } = req.params;
  if (!friendId || friendId.trim() === "") {
    res.status(400).json({ message: "Missing friendId" });
    return;
  }

  const trimmedUserId = userId.trim();
  const trimmedFriendId = friendId.trim();

  const doc = await getOrCreateFriendList(trimmedUserId);

  if (!doc.friendIds.includes(trimmedFriendId)) {
    res.status(404).json({ message: "Friend not found" });
    return;
  }

  const updated = await db
    .collection<UserFriends>("user-friends")
    .update(doc._id, {
      friendIds: doc.friendIds.filter((id: string) => id !== trimmedFriendId),
    });

  if (!updated) {
    res.status(500).json({ message: "Failed to update friend list" });
    return;
  }

  res.status(200).json({ userId: updated.userId, friendIds: updated.friendIds });
});

export default router;
