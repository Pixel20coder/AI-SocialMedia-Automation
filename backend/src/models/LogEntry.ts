import mongoose, { InferSchemaType } from "mongoose";

const LogEntrySchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["debug", "info", "warn", "error"],
      default: "info",
      index: true
    },
    scope: { type: String, required: true, index: true },
    message: { type: String, required: true },
    jobId: { type: String, index: true },
    queueName: { type: String, index: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", index: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: "ContentItem", index: true },
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

LogEntrySchema.index({ createdAt: -1 });

export type LogEntryDocument = InferSchemaType<typeof LogEntrySchema> & {
  _id: mongoose.Types.ObjectId;
};
export const LogEntry = mongoose.model("LogEntry", LogEntrySchema);
