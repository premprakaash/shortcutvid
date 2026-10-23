import { z } from "zod";

export const createProjectSchema = z.object({
  prompt: z.string().min(10).max(5000),
  inputType: z.enum(["idea", "topic", "keyword", "url", "description"]).default("idea"),
  title: z.string().min(1).max(120).optional(),
  language: z.string().default("en"),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  targetDuration: z.number().int().min(15).max(180).default(50),
  tone: z.string().max(80).optional(),
  visualStyle: z.string().max(80).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  title: z.string().min(1).max(120).optional(),
  voiceId: z.string().optional(),
  scriptManifest: z.record(z.string(), z.unknown()).optional(),
});

export const generateScriptSchema = z.object({
  audience: z.string().optional(),
  tone: z.string().optional(),
  contentCategory: z.string().optional(),
  callToAction: z.string().optional(),
  numberOfScenes: z.number().int().min(3).max(12).optional(),
  platform: z.string().optional(),
});

export const approveScriptSchema = z.object({
  scriptManifest: z.record(z.string(), z.unknown()),
});
