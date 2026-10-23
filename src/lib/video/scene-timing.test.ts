import { describe, expect, it } from "vitest";
import { calculateSceneTiming } from "@/lib/video/scene-timing";

describe("calculateSceneTiming", () => {
  it("scales scene durations to audio length", () => {
    const manifest = {
      title: "T",
      targetDuration: 50,
      language: "en",
      voiceoverFullText: "A B",
      scenes: [
        {
          id: "scene_1",
          order: 1,
          scriptSnippet: "A",
          visualKeywords: ["a"],
          transition: "cut" as const,
          estimatedDuration: 25,
        },
        {
          id: "scene_2",
          order: 2,
          scriptSnippet: "B",
          visualKeywords: ["b"],
          transition: "cut" as const,
          estimatedDuration: 25,
        },
      ],
    };

    const timing = calculateSceneTiming(manifest, 40);
    expect(timing[0]?.duration).toBeCloseTo(20, 1);
    expect(timing[1]?.endTime).toBeCloseTo(40, 1);
  });
});
