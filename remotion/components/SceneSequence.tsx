import { AbsoluteFill, Img, OffthreadVideo, Sequence } from "remotion";
import type { RenderScene } from "../types";
import { TextOverlay } from "./TextOverlay";

export const SceneSequence: React.FC<{
  scenes: RenderScene[];
  fps: number;
}> = ({ scenes, fps }) => {
  return (
    <>
      {scenes.map((scene) => {
        const from = Math.round(scene.startTime * fps);
        const durationInFrames = Math.max(
          1,
          Math.round((scene.endTime - scene.startTime) * fps),
        );
        return (
          <Sequence key={scene.sceneKey} from={from} durationInFrames={durationInFrames}>
            <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
              {scene.isVideo ? (
                <OffthreadVideo
                  src={scene.visualUrl}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  muted
                />
              ) : (
                <Img
                  src={scene.visualUrl}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
              <TextOverlay text={scene.overlayText} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </>
  );
};
