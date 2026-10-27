
import mongoose from "mongoose";

export function isValidObjectId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    mongoose.isValidObjectId(value)
  );
}

export function toObjectId(value: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(value);
}
