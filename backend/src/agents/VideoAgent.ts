import { VideoProvider } from "../integrations/media/videoProvider";
import { AccountDocument } from "../models/Account";
import { GeneratedAsset, ViralScript } from "../types";

export class VideoAgent {
  constructor(private readonly provider: VideoProvider) {}

  async createVisuals(account: AccountDocument, script: ViralScript, contentId: string): Promise<GeneratedAsset> {
    return this.provider.generateVisuals(account, script, contentId);
  }
}
