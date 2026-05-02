import mongoose, { InferSchemaType } from "mongoose";

const ChannelSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["instagram", "youtube", "tiktok", "facebook"],
      required: true
    },
    handle: { type: String, required: true },
    externalAccountId: { type: String },
    enabled: { type: Boolean, default: true }
  },
  { _id: false }
);

const AccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    niche: {
      type: String,
      enum: ["motivation", "culture", "facts", "custom"],
      required: true
    },
    description: { type: String, required: true },
    audience: { type: String, required: true },
    tone: { type: String, required: true },
    language: { type: String, default: "English" },
    dailyQuota: { type: Number, default: 1 },
    enabled: { type: Boolean, default: true },
    schedule: {
      timezone: { type: String, default: "Asia/Kolkata" },
      generateAt: { type: String, default: "10:00" }
    },
    channels: { type: [ChannelSchema], default: [] },
    brandRules: { type: [String], default: [] }
  },
  { timestamps: true }
);

export type AccountDocument = InferSchemaType<typeof AccountSchema> & { _id: mongoose.Types.ObjectId };
export const Account = mongoose.model("Account", AccountSchema);
