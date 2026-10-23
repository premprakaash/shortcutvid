import { describe, expect, it } from "vitest";
import {
  repairSceneManifest,
  validateSceneManifestConsistency,
} from "@/lib/schemas/scene-manifest";

const baseManifest = {
  title: "Test Video",
  targetDuration: 50,
  language: "es",
  voiceoverFullText: "Hook line. Middle idea. Strong finish.",
  scenes: [
    {
      id: "scene_1",
      order: 1,
      scriptSnippet: "Hook line.",
      visualKeywords: ["developer", "laptop"],
      overlayText: "HOOK",
      transition: "cut" as const,
      estimatedDuration: 15,
    },
    {
      id: "scene_2",
      order: 2,
      scriptSnippet: "Middle idea. Strong finish.",
      visualKeywords: ["team", "office"],
      overlayText: "IDEA",
      transition: "fade" as const,
      estimatedDuration: 35,
    },
  ],
};

describe("scene manifest validation", () => {
  it("accepts consistent manifests", () => {
    const result = validateSceneManifestConsistency(baseManifest);
    expect(result.ok).toBe(true);
  });

  it("rejects mismatched narration", () => {
    const result = validateSceneManifestConsistency({
      ...baseManifest,
      voiceoverFullText: "Different text entirely.",
    });
    expect(result.ok).toBe(false);
  });

  it("repairs scene order and narration", () => {
    const repaired = repairSceneManifest({
      ...baseManifest,
      scenes: [
        { ...baseManifest.scenes[1], order: 2 },
        { ...baseManifest.scenes[0], order: 1 },
      ],
      voiceoverFullText: "stale",
    });
    expect(repaired.voiceoverFullText).toContain("Hook line.");
  });
});
