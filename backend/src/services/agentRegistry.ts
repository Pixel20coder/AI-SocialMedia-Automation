import { AnalyticsAgent } from "../agents/AnalyticsAgent";
import { CEOAgent } from "../agents/CEOAgent";
import { ContentAgent } from "../agents/ContentAgent";
import { EditorAgent } from "../agents/EditorAgent";
import { FeedbackAgent } from "../agents/FeedbackAgent";
import { PublisherAgent } from "../agents/PublisherAgent";
import { VideoAgent } from "../agents/VideoAgent";
import { VoiceAgent } from "../agents/VoiceAgent";
import { AiGateway } from "../integrations/ai/aiGateway";
import { EditorProvider } from "../integrations/media/editorProvider";
import { VideoProvider } from "../integrations/media/videoProvider";
import { VoiceProvider } from "../integrations/media/voiceProvider";
import { SocialPublisher } from "../integrations/social/socialPublisher";
import { TelegramBot } from "../integrations/telegram/telegramBot";

const ai = new AiGateway();
const telegram = new TelegramBot();
const socialPublisher = new SocialPublisher();

export const agents = {
  analytics: new AnalyticsAgent(ai),
  content: new ContentAgent(ai),
  video: new VideoAgent(new VideoProvider()),
  voice: new VoiceAgent(new VoiceProvider()),
  editor: new EditorAgent(new EditorProvider()),
  ceo: new CEOAgent(ai, telegram),
  publisher: new PublisherAgent(socialPublisher),
  feedback: new FeedbackAgent(socialPublisher),
  telegram
};
