
import mongoose from "mongoose";

export interface CursorData {
  createdAt: Date;
  id: mongoose.Types.ObjectId;
}

export function encodeCursor(data: CursorData): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: data.createdAt.toISOString(),
      id: data.id.toString(),
    })
  ).toString("base64url");
}

export function decodeCursor(
  cursor: string
): CursorData | null {
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    );

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("createdAt" in decoded) ||
      !("id" in decoded)
    ) {
      return null;
    }

    const { createdAt, id } = decoded;

    if (
      typeof createdAt !== "string" ||
      typeof id !== "string" ||
      !mongoose.isValidObjectId(id)
    ) {
      return null;
    }

    const date = new Date(createdAt);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString() !== createdAt
    ) {
      return null;
    }

    return {
      createdAt: date,
      id: new mongoose.Types.ObjectId(id),
    };
  } catch {
    return null;
  }
}
