import mongoose, { InferSchemaType } from "mongoose";

const ScriptSectionSchema = new mongoose.Schema(
  {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    text: { type: String, required: true }
  },
  { _id: false }
);

const ScriptSchema = new mongoose.Schema(
  {
    title: String,
    hook: String,
    body: String,
    payoff: String,
    sections: { type: [ScriptSectionSchema], default: [] },
    caption: String,
    hashtags: { type: [String], default: [] },
    visualPrompt: String,
    voiceDirection: String
  },
  { _id: false }
);

const AssetSchema = new mongoose.Schema(
  {
    provider: String,
    filePath: String,
    url: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { _id: false }
);

const ContentItemSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    status: {
      type: String,
      enum: [
        "draft",
        "generating",
        "pending_approval",
        "approved",
        "rejected",
        "needs_revision",
        "publishing",
        "posted",
        "failed"
      ],
      default: "draft",
      index: true
    },
    pipelineStage: {
      type: String,
      enum: [
        "analytics",
        "content",
        "voice",
        "video",
        "editing",
        "ceo_review",
        "approval",
        "publishing",
        "complete"
      ],
      default: "analytics"
    },
    script: ScriptSchema,
    trendInsight: mongoose.Schema.Types.Mixed,
    ceoDecision: mongoose.Schema.Types.Mixed,
    safetyReview: mongoose.Schema.Types.Mixed,
    assets: {
      voice: AssetSchema,
      visuals: AssetSchema,
      finalVideo: AssetSchema,
      subtitles: AssetSchema
    },
    approval: {
      requestedAt: Date,
      decidedAt: Date,
      decidedBy: String,
      feedback: String
    },
    publishResults: { type: [mongoose.Schema.Types.Mixed], default: [] },
    failureReason: String,
    retryCount: { type: Number, default: 0 },
    metrics: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      saves: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export type ContentItemDocument = InferSchemaType<typeof ContentItemSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const ContentItem = mongoose.model("ContentItem", ContentItemSchema);
