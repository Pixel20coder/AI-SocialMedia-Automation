import { AiGateway } from "../integrations/ai/aiGateway";
import { TelegramBot } from "../integrations/telegram/telegramBot";
import { AccountDocument } from "../models/Account";
import { ContentItemDocument } from "../models/ContentItem";
import { CeoDecision, TrendInsight, ViralScript } from "../types";

export class CEOAgent {
  constructor(
    private readonly ai: AiGateway,
    private readonly telegram: TelegramBot
  ) {}

  async review(account: AccountDocument, script: ViralScript, trend: TrendInsight): Promise<CeoDecision> {
    return this.ai.ceoReview(account, script, trend);
  }

  async requestHumanApproval(account: AccountDocument, content: ContentItemDocument) {
    await this.telegram.sendApprovalRequest(account, content);
  }
}
