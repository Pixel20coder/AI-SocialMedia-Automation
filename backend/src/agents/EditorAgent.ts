import { EditorProvider } from "../integrations/media/editorProvider";
import { GeneratedAsset, ViralScript } from "../types";

export class EditorAgent {
  constructor(private readonly provider: EditorProvider) {}

  async assemble(
    script: ViralScript,
    voice: GeneratedAsset,
    visuals: GeneratedAsset,
    contentId: string
  ): Promise<{ finalVideo: GeneratedAsset; subtitles: GeneratedAsset }> {
    return this.provider.combine(script, voice, visuals, contentId);
  }
}
