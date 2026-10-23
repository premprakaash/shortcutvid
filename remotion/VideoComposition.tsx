import { AbsoluteFill } from "remotion";
import type { VideoCompositionProps } from "./types";
import { SceneSequence } from "./components/SceneSequence";
import { SubtitleTrack } from "./components/SubtitleTrack";
import { VoiceoverTrack } from "./components/VoiceoverTrack";

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  audioUrl,
  subtitles,
  scenes,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <SceneSequence scenes={scenes} fps={30} />
      <SubtitleTrack subtitles={subtitles} />
      <VoiceoverTrack audioUrl={audioUrl} />
    </AbsoluteFill>
  );
};
