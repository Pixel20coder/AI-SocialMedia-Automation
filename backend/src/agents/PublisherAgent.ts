import { SocialPublisher } from "../integrations/social/socialPublisher";
import { AccountDocument } from "../models/Account";
import { ContentItemDocument } from "../models/ContentItem";

export class PublisherAgent {
  constructor(private readonly publisher: SocialPublisher) {}

  async publish(account: AccountDocument, content: ContentItemDocument) {
    return this.publisher.publish(account, content);
  }
}
