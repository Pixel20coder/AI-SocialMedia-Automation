import mongoose, { InferSchemaType } from "mongoose";

const AnalyticsSnapshotSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    platform: { type: String, required: true },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    topHooks: { type: [String], default: [] },
    topFormats: { type: [String], default: [] },
    raw: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

export type AnalyticsSnapshotDocument = InferSchemaType<typeof AnalyticsSnapshotSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const AnalyticsSnapshot = mongoose.model("AnalyticsSnapshot", AnalyticsSnapshotSchema);
