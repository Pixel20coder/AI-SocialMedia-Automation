import { ElevenLabsAdapter } from "../elevenlabs";
import { GeneratedAsset, ViralScript } from "../../types";

export class VoiceProvider {
  constructor(private readonly adapter = new ElevenLabsAdapter()) {}

  async synthesize(script: ViralScript, contentId: string): Promise<GeneratedAsset> {
    return this.adapter.synthesize(script, contentId);
  }
}
