import mongoose, { Schema, Document } from "mongoose";

export interface IBase extends Document {
  created_at: Date;
  updated_at: Date;
}
