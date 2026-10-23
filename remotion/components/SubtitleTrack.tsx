import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderSubtitle } from "../types";

export const SubtitleTrack: React.FC<{ subtitles: RenderSubtitle[] }> = ({
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const active = subtitles.find((s) => time >= s.start && time <= s.end);
  if (!active) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "0 48px 160px",
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.65)",
          color: "#fff",
          fontSize: 36,
          lineHeight: 1.35,
          padding: "16px 24px",
          borderRadius: 12,
          textAlign: "center",
          maxWidth: "90%",
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};
