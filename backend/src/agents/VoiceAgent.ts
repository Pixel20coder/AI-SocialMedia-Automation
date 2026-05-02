import { VoiceProvider } from "../integrations/media/voiceProvider";
import { GeneratedAsset, ViralScript } from "../types";

export class VoiceAgent {
  constructor(private readonly provider: VoiceProvider) {}

  async createVoice(script: ViralScript, contentId: string): Promise<GeneratedAsset> {
    return this.provider.synthesize(script, contentId);
  }
}
