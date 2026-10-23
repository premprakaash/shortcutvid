import { Audio } from "remotion";

export const VoiceoverTrack: React.FC<{ audioUrl: string }> = ({ audioUrl }) => {
  return <Audio src={audioUrl} />;
};
