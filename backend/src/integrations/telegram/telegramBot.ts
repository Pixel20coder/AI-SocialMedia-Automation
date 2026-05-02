import { env } from "../../config/env";
import { AccountDocument } from "../../models/Account";
import { ContentItemDocument } from "../../models/ContentItem";
import { logger } from "../../utils/logger";

export class TelegramBot {
  private get enabled() {
    return Boolean(env.telegramBotToken && env.telegramChatId);
  }

  async sendApprovalRequest(account: AccountDocument, content: ContentItemDocument) {
    const caption = content.script?.caption ?? "";
    const hashtags = content.script?.hashtags?.join(" ") ?? "";
    const videoUrl = content.assets?.finalVideo?.url ?? "Video is queued locally.";
    const approvalUrl = `${env.frontendUrl}/dashboard/approvals/${content._id.toString()}`;

    const text = [
      `Approval needed for ${account.name}`,
      "",
      `Title: ${content.script?.title ?? "Untitled"}`,
      `Video: ${videoUrl}`,
      `Caption: ${caption}`,
      `Hashtags: ${hashtags}`,
      `Dashboard: ${approvalUrl}`
    ].join("\n");

    if (!this.enabled) {
      logger.info({ contentId: content._id.toString(), text }, "Telegram not configured; approval logged only");
      return;
    }

    const response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.telegramChatId,
        text,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Approve", callback_data: `approve:${content._id.toString()}` },
              { text: "Reject", callback_data: `reject:${content._id.toString()}` }
            ],
            [{ text: "Edit in dashboard", url: approvalUrl }]
          ]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Telegram send failed with ${response.status}: ${await response.text()}`);
    }
  }

  parseCallback(body: unknown): { action: "approve" | "reject"; contentId: string; user?: string } | undefined {
    const payload = body as {
      callback_query?: {
        data?: string;
        from?: { username?: string; id?: number };
      };
    };
    const data = payload.callback_query?.data;
    if (!data) return undefined;
    const [action, contentId] = data.split(":");
    if ((action !== "approve" && action !== "reject") || !contentId) return undefined;
    const from = payload.callback_query?.from;
    return {
      action,
      contentId,
      user: from?.username ?? (from?.id ? String(from.id) : "telegram")
    };
  }
}
