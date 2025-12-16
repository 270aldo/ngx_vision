/**
 * VEO 3.1 API Client for NGX Vision
 * Generates cinematic transformation videos
 */

import { GoogleGenAI } from "@google/genai";
import type { VeoGenerationConfig, VeoGenerationResult } from "@/types/video";

// Initialize the client
function getVeoClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Generate a cinematic video using VEO 3.1 API
 *
 * @param config - Video generation configuration
 * @returns Video data as base64 with metadata
 */
export async function generateVideo(
  config: VeoGenerationConfig
): Promise<VeoGenerationResult> {
  const {
    prompt,
    referenceImageBase64,
    durationSeconds = 8,
    resolution = "1080p",
    aspectRatio = "9:16",
    generateAudio = true,
  } = config;

  const client = getVeoClient();
  const model = process.env.VEO_MODEL || "veo-3.0-generate-preview";

  console.log(`[VEO] Starting video generation with model: ${model}`);
  console.log(`[VEO] Config: ${durationSeconds}s, ${resolution}, ${aspectRatio}, audio: ${generateAudio}`);

  // Start generation using the correct API structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operation = await (client.models as any).generateVideos({
    model,
    prompt,
    config: {
      personGeneration: "allow_adult",
      aspectRatio,
      numberOfVideos: 1,
    },
    referenceImages: [{
      referenceImage: {
        imageBytes: referenceImageBase64,
      },
      referenceId: 1,
      referenceType: "REFERENCE_TYPE_SUBJECT",
    }],
  });

  console.log(`[VEO] Operation started: ${operation.name}`);

  // Polling with timeout (VEO can take 60-300 seconds)
  const maxAttempts = 36; // 6 minutes max (36 * 10s)
  let attempts = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result = await (client.operations as any).get({ operation: operation.name });

  while (!result.done && attempts < maxAttempts) {
    console.log(`[VEO] Polling attempt ${attempts + 1}/${maxAttempts}...`);
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 10s between checks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await (client.operations as any).get({ operation: operation.name });
    attempts++;
  }

  if (!result.done) {
    throw new Error("Video generation timed out after 6 minutes");
  }

  if (result.error) {
    throw new Error(`VEO generation failed: ${result.error.message}`);
  }

  console.log(`[VEO] Video generation completed after ${attempts} polling attempts`);

  // Extract video data
  const videoData = result.response?.generatedVideos?.[0];
  if (!videoData?.video) {
    throw new Error("No video data in VEO response");
  }

  return {
    videoBase64: videoData.video,
    durationSeconds,
    resolution,
  };
}

/**
 * Build a cinematic prompt for VEO video generation
 * This creates a detailed prompt that preserves user identity while creating
 * an inspiring transformation narrative
 */
export function buildCinematicPrompt(params: {
  userVisualAnchor: string;
  heroNarrative: string;
  goal: string;
  focusZone?: string;
}): string {
  const { userVisualAnchor, heroNarrative, goal, focusZone = "full body" } = params;

  return `
[IDENTITY LOCK - CRITICAL]
Subject: ${userVisualAnchor}
PRESERVE: exact facial features, skin tone, hair color/style, distinguishing marks throughout entire video.
This person MUST be recognizable as the same individual from start to finish.

[HERO NARRATIVE]
${heroNarrative}

[CINEMATIC SEQUENCE - 8 SECONDS]
Opening (0-2s):
- Close-up on subject's face, eyes closed, breathing deeply
- Golden hour lighting casting warm glow
- Slight camera push-in movement
- Subject opens eyes with fierce determination
- Single breath visible in cool air

Middle (2-6s):
- Dynamic montage of subject training toward their ${goal} goal
- Focus on ${focusZone} movements and development
- Slow motion captures of effort: muscles tensing, sweat forming, focused expression
- Camera orbits subject in smooth 180-degree arc
- Environment: Premium modern gym with electric violet (#6D00FF) accent lighting
- Power movements: lifts, pulls, controlled intensity

Climax (6-8s):
- Subject stands victorious, transformed, radiating confidence
- Knowing smile of achievement
- Wide shot pulling back to reveal their powerful presence
- Volumetric light rays through windows
- Lens flare on final frame

[STYLE DIRECTION]
Aesthetic: Nike Advertisement meets Documentary meets Music Video
Lighting: Dramatic chiaroscuro, golden hour warmth, volumetric rays, electric violet (#6D00FF) accent lights
Camera: Buttery smooth movements, slow-motion on peak moments, dolly and orbit shots
Color Grade: High contrast cinematic, deep blacks, warm highlights, violet-tinted shadows
Texture: Film grain subtlety, anamorphic lens characteristics

[AUDIO DIRECTION]
- Epic orchestral/electronic hybrid build
- Heartbeat rhythm synced to effort moments
- Breath sounds during intense training
- Triumphant orchestral swell at climax
- Subtle bass drops on power movements

[CONSTRAINTS]
- Single subject only (no other people visible)
- No text overlays or graphics
- No CGI or cartoon effects - photorealistic only
- Maintain subject identity throughout entire sequence
- 9:16 vertical format optimized for mobile viewing
- No quick cuts - smooth transitions only
`.trim();
}

/**
 * Estimate video generation time based on duration
 */
export function estimateGenerationTime(durationSeconds: number): {
  minSeconds: number;
  maxSeconds: number;
} {
  // VEO typically takes 60-180 seconds for 8s video
  const baseTime = 60;
  const multiplier = durationSeconds / 4;

  return {
    minSeconds: Math.round(baseTime * multiplier),
    maxSeconds: Math.round(baseTime * multiplier * 3),
  };
}
