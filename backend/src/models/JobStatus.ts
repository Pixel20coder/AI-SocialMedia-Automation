import mongoose, { InferSchemaType } from "mongoose";

const JobStatusSchema = new mongoose.Schema(
  {
    queueName: { type: String, required: true, index: true },
    jobId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "waiting", "delayed", "running", "completed", "failed"],
      default: "pending",
      index: true
    },
    attemptsMade: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 0 },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", index: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: "ContentItem", index: true },
    payload: mongoose.Schema.Types.Mixed,
    result: mongoose.Schema.Types.Mixed,
    resultUrls: { type: [String], default: [] },
    error: String,
    enqueuedAt: { type: Date, default: Date.now },
    startedAt: Date,
    finishedAt: Date
  },
  { timestamps: true }
);

JobStatusSchema.index({ queueName: 1, jobId: 1 }, { unique: true });

export type JobStatusDocument = InferSchemaType<typeof JobStatusSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const JobStatus = mongoose.model("JobStatus", JobStatusSchema);
