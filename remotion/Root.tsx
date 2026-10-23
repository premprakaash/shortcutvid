import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import type { VideoCompositionProps } from "./types";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainVideo"
        component={VideoComposition}
        durationInFrames={30 * 60}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: "ShortcutVid",
          audioUrl: "",
          subtitles: [],
          scenes: [],
        } satisfies VideoCompositionProps}
        calculateMetadata={({ props }) => {
          const durationInSeconds = Math.max(
            1,
            ...props.scenes.map((s) => s.endTime),
            ...props.subtitles.map((s) => s.end),
            1,
          );
          return {
            durationInFrames: Math.ceil(durationInSeconds * 30),
            width: 1080,
            height: 1920,
          };
        }}
      />
    </>
  );
};
