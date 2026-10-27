
import mongoose from "mongoose";

export interface FollowCursor {
  createdAt: Date;
  id: mongoose.Types.ObjectId;
}

export function parseFollowCursor(
  cursor: string | null
): FollowCursor | null {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(decoded);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("createdAt" in parsed) ||
      !("id" in parsed) ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string"
    ) {
      return null;
    }

    const createdAt = new Date(parsed.createdAt);

    if (
      Number.isNaN(createdAt.getTime()) ||
      !mongoose.isValidObjectId(parsed.id)
    ) {
      return null;
    }

    return {
      createdAt,
      id: new mongoose.Types.ObjectId(parsed.id),
    };
  } catch {
    return null;
  }
}

export function createFollowCursor(
  createdAt: Date,
  id: mongoose.Types.ObjectId
): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: createdAt.toISOString(),
      id: id.toString(),
    })
  ).toString("base64url");
}

export function getFollowCursorQuery(
  cursor: FollowCursor | null
) {
  if (!cursor) return {};

  return {
    $or: [
      { createdAt: { $lt: cursor.createdAt } },
      {
        createdAt: cursor.createdAt,
        _id: { $lt: cursor.id },
      },
    ],
  };
}
