import { SocialPublisher } from "../integrations/social/socialPublisher";
import { Account, AccountDocument } from "../models/Account";
import { AnalyticsSnapshot } from "../models/AnalyticsSnapshot";

export class FeedbackAgent {
  constructor(private readonly publisher: SocialPublisher) {}

  async collectForAccount(account: AccountDocument) {
    const performance = await this.publisher.fetchPerformance(account);
    return AnalyticsSnapshot.insertMany(
      performance.map((snapshot) => ({
        accountId: account._id,
        ...snapshot
      }))
    );
  }

  async collectForAllEnabled() {
    const accounts = await Account.find({ enabled: true });
    const results = [];
    for (const account of accounts) {
      results.push(await this.collectForAccount(account));
    }
    return results.flat();
  }
}
