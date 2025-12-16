/**
 * VEO 3.1 Video Generation Types for NGX Vision
 */

import { z } from "zod";

// VEO API Configuration
export interface VeoGenerationConfig {
  prompt: string;
  referenceImageBase64: string;
  durationSeconds?: 4 | 6 | 8;
  resolution?: "720p" | "1080p";
  aspectRatio?: "16:9" | "9:16";
  generateAudio?: boolean;
}

// VEO API Response
export interface VeoGenerationResult {
  videoBase64: string;
  durationSeconds: number;
  resolution: string;
}

// Vision Analysis Output Schema
export const VisionAnalysisResultZ = z.object({
  user_visual_anchor: z.string().describe(
    "Detailed, immutable description of facial features, skin tone, hair, distinguishing marks"
  ),
  hero_narrative: z.string().describe(
    "2-3 sentence inspiring narrative in second person about transformation journey"
  ),
  veo_prompt: z.string().describe(
    "Complete VEO 3.1 prompt for 8-second cinematic video"
  ),
  estimated_transformation: z.object({
    physical: z.string(),
    mental: z.string(),
  }).optional(),
});

export type VisionAnalysisResult = z.infer<typeof VisionAnalysisResultZ>;

// Vision Session Schema (extends base session)
export interface VisionSession {
  id: string;
  shareId: string;
  email: string | null;
  status: "pending" | "analyzed" | "generating" | "ready" | "error";

  // Profile data
  input: {
    age: number;
    sex: "male" | "female" | "other";
    heightCm: number;
    weightKg: number;
    level: "novato" | "intermedio" | "avanzado";
    goal: "definicion" | "masa" | "mixto";
    weeklyTime: number;
    stressLevel?: number;
    sleepQuality?: number;
    disciplineRating?: number;
    bodyType?: "ectomorph" | "mesomorph" | "endomorph";
    focusZone?: "upper" | "lower" | "abs" | "full";
    notes?: string;
  };

  // Storage references
  photo: {
    originalStoragePath: string;
  };

  // Video assets (new for Vision)
  video?: {
    storagePath: string;
    durationSeconds: number;
    resolution: string;
  };

  // Analysis results
  analysis?: VisionAnalysisResult;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  analyzedAt?: Date;
  videoGeneratedAt?: Date;
}

// Video viewer props
export interface VideoViewerProps {
  videoUrl: string;
  heroNarrative: string;
  shareId: string;
  onShare?: () => void;
  onDownload?: () => void;
}

// Video loader props
export interface VideoLoaderProps {
  status: "analyzing" | "generating" | "processing";
  progress?: number;
}
