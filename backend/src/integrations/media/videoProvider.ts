import { VideoApiAdapter } from "../video";
import { AccountDocument } from "../../models/Account";
import { GeneratedAsset, ViralScript } from "../../types";

export class VideoProvider {
  constructor(private readonly adapter = new VideoApiAdapter()) {}

  async generateVisuals(account: AccountDocument, script: ViralScript, contentId: string): Promise<GeneratedAsset> {
    return this.adapter.generateVisuals(account, script, contentId);
  }
}
