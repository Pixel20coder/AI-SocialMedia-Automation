import { AccountDocument } from "../../models/Account";
import { ContentItemDocument } from "../../models/ContentItem";
import { PublishResult, SocialPublisherAdapter } from "../publisher";

export class SocialPublisher {
  constructor(private readonly adapter = new SocialPublisherAdapter()) {}

  async publish(account: AccountDocument, content: ContentItemDocument): Promise<PublishResult[]> {
    return this.adapter.publish(account, content);
  }

  async fetchPerformance(account: AccountDocument) {
    return this.adapter.fetchPerformance(account);
  }
}
