import { AbsoluteFill } from "remotion";

export const TextOverlay: React.FC<{ text?: string | null }> = ({ text }) => {
  if (!text) return null;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 120,
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: 42,
          fontWeight: 800,
          letterSpacing: 1,
          padding: "12px 24px",
          borderRadius: 8,
          textTransform: "uppercase",
          textAlign: "center",
          maxWidth: "85%",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
