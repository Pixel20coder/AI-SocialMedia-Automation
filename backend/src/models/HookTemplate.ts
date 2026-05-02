import mongoose, { InferSchemaType } from "mongoose";

const HookTemplateSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", index: true },
    niche: { type: String, index: true },
    template: { type: String, required: true },
    source: { type: String, enum: ["analytics", "manual", "generated"], default: "generated" },
    format: { type: String, default: "short-form" },
    score: { type: Number, default: 0 },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date }
  },
  { timestamps: true }
);

HookTemplateSchema.index({ template: 1, niche: 1 }, { unique: true });

export type HookTemplateDocument = InferSchemaType<typeof HookTemplateSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const HookTemplate = mongoose.model("HookTemplate", HookTemplateSchema);
