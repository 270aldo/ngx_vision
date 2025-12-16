import { GoogleGenerativeAI } from "@google/generative-ai";
import { InsightsResultZ, type InsightsResult } from "@/types/ai";
import { VisionAnalysisResultZ, type VisionAnalysisResult } from "@/types/video";

async function fetchImageAsInlineData(url: string): Promise<{ mimeType: string; data: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed fetching image: ${res.status}`);
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await res.arrayBuffer();
  const data = Buffer.from(arrayBuffer).toString("base64");
  return { mimeType, data };
}

/**
 * Vision Analysis Prompt for VEO Video Generation
 * Generates user_visual_anchor, hero_narrative, and veo_prompt
 */
const VISION_ANALYSIS_PROMPT = `
You are an ELITE CINEMATIC DIRECTOR and HIGH-PERFORMANCE COACH creating a transformation video.

Your task is to analyze the provided photo and profile data to generate the foundation for a powerful 8-second cinematic transformation video.

ANALYZE THE PHOTO AND PROFILE TO GENERATE:

1. **user_visual_anchor**: A detailed, IMMUTABLE description of the person's physical appearance:
   - Facial structure: face shape, eye color/shape, eyebrows, nose, lips, jaw
   - Skin: tone, texture, any visible marks or features
   - Hair: color, style, length, texture
   - Any distinguishing features: facial hair, glasses, piercings, etc.
   This description will be used to PRESERVE their identity across video frames.
   Be extremely specific and detailed. This is critical for maintaining consistency.

2. **hero_narrative**: A 2-3 sentence inspiring narrative about THIS SPECIFIC person's transformation journey.
   - Written in second person ("You are...")
   - Stoic, clinical, yet deeply motivational tone
   - Reference their specific goals and obstacles
   - Make them feel like the protagonist of their own epic story

3. **veo_prompt**: A complete, production-ready prompt for VEO 3.1 video generation that will create an 8-second cinematic transformation video showing this person as the hero of their journey.

   Structure the veo_prompt with these sections:

   [IDENTITY LOCK]
   - Include the user_visual_anchor
   - Emphasize preserving exact features throughout

   [SEQUENCE - 8 SECONDS]
   - 0-2s: Opening close-up, eyes opening with determination
   - 2-6s: Training montage focused on their goal and focus zone
   - 6-8s: Triumphant final pose, confident smile

   [STYLE]
   - Nike commercial aesthetic
   - Golden hour + electric violet (#6D00FF) lighting
   - Smooth camera movements
   - Photorealistic quality

   [AUDIO]
   - Epic orchestral/electronic build
   - Heartbeat sync
   - Triumphant swell

   [CONSTRAINTS]
   - Single subject only
   - No text overlays
   - 9:16 vertical format
   - Photorealistic (no CGI)

OUTPUT FORMAT (JSON only, no markdown):
{
  "user_visual_anchor": "Detailed physical description...",
  "hero_narrative": "Your inspiring narrative...",
  "veo_prompt": "Complete VEO prompt with all sections...",
  "estimated_transformation": {
    "physical": "Expected physical changes based on goals",
    "mental": "Expected mental/emotional growth"
  }
}

TONE REQUIREMENTS:
- Clinical yet inspiring
- Personalized to THEIR specific situation
- Reference their stress/sleep/discipline data for authenticity
- Make them feel seen and understood
- The narrative should give them chills

CRITICAL:
- Output ONLY valid JSON, no markdown code blocks
- Be extremely specific in the visual anchor - vague descriptions will fail
- The veo_prompt must be self-contained and production-ready
`;

/**
 * Generate Vision Analysis for VEO Video Generation
 * Creates user_visual_anchor, hero_narrative, and veo_prompt
 */
export async function generateVisionAnalysis(params: {
  imageUrl: string;
  profile: {
    age?: string | number;
    sex?: string;
    height?: string | number;
    heightCm?: number;
    weight?: string | number;
    weightKg?: number;
    goals?: string;
    goal?: string;
    level?: string;
    weeklyTime?: string | number;
    stressLevel?: number;
    sleepQuality?: number;
    disciplineRating?: number;
    bodyType?: string;
    focusZone?: string;
    notes?: string;
  };
}): Promise<VisionAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-05-20";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const { mimeType, data } = await fetchImageAsInlineData(params.imageUrl);
  const { profile } = params;

  // Handle both field naming conventions
  const height = profile.height ?? profile.heightCm;
  const weight = profile.weight ?? profile.weightKg;
  const goals = profile.goals ?? profile.goal;

  const userContext = `
USER PROFILE DATA:
- Age: ${profile.age}
- Sex: ${profile.sex}
- Height: ${height}cm
- Weight: ${weight}kg
- Body Type: ${profile.bodyType || "Not specified"}
- Current Level: ${profile.level || "Novato"}
- Main Goal: ${goals || "General fitness"}
- Weekly Dedication: ${profile.weeklyTime || 3} hours
- Focus Zone: ${profile.focusZone?.toUpperCase() || "FULL BODY"}

MENTAL STATE:
- Stress Level: ${profile.stressLevel || 5}/10
- Sleep Quality: ${profile.sleepQuality || 5}/10
- Discipline Rating: ${profile.disciplineRating || 5}/10

ADDITIONAL NOTES:
${profile.notes || "None provided"}
`;

  console.log("[Gemini] Generating Vision Analysis...");

  const result = await model.generateContent([
    { text: VISION_ANALYSIS_PROMPT },
    { text: userContext },
    { inlineData: { mimeType, data } },
  ]);

  let text = result.response.text().trim();

  // Strip code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
  }

  console.log("[Gemini] Raw response:", text.substring(0, 200) + "...");

  const parsed = VisionAnalysisResultZ.safeParse(JSON.parse(text));
  if (!parsed.success) {
    console.error("[Gemini] Validation failed:", parsed.error.message);
    throw new Error("Vision analysis validation failed: " + parsed.error.message);
  }

  console.log("[Gemini] Vision Analysis complete");
  return parsed.data;
}

export async function generateInsightsFromImage(params: {
  imageUrl: string;
  profile: {
    age?: string | number;
    sex?: string;
    height?: string | number;
    heightCm?: number;
    weight?: string | number;
    weightKg?: number;
    goals?: string;
    goal?: string;
    level?: string;
    weeklyTime?: string | number;
    stressLevel?: number;
    sleepQuality?: number;
    disciplineRating?: number;
    bodyType?: string;
    focusZone?: string;
    notes?: string;
  };
}): Promise<InsightsResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const { mimeType, data } = await fetchImageAsInlineData(params.imageUrl);

  const { profile } = params;

  // Handle both field naming conventions (API vs Firestore)
  const height = profile.height ?? profile.heightCm;
  const weight = profile.weight ?? profile.weightKg;
  const goals = profile.goals ?? profile.goal;

  const systemPrompt = `
    You are an Elite High-Performance Coach & Futurist (Stoic, Clinical, Motivational).
    Your goal is to analyze the user's current photo and data to project their physical and mental evolution over 12 months.

    USER DATA:
    - Age: ${profile.age}, Sex: ${profile.sex}
    - Height: ${height}cm, Weight: ${weight}kg
    - Body Type: ${profile.bodyType}
    - Current Level: ${profile.level}
    - Main Goal: ${goals}
    - Weekly Dedication: ${profile.weeklyTime} hours
    - Stress: ${profile.stressLevel}/10, Sleep: ${profile.sleepQuality}/10, Discipline: ${profile.disciplineRating}/10

    FOCUS ZONE (PRIORITY): ${profile.focusZone?.toUpperCase() || "FULL BODY"}
    (Tailor the training and aesthetic focus to this area).

    You must generate a JSON response with a timeline of 4 stages:
    - "m0" (Current): Analysis of starting point.
    - "m4" (Foundation): Early visible changes.
    - "m8" (Expansion): Significant muscle/definition gains.
    - "m12" (Peak): The final transformed state.

    For each stage, provide:
    1. "title": A powerful, 1-2 word phase name (e.g., "GÉNESIS", "METAMORFOSIS").
    2. "description": A clinical but motivating summary of changes.
    3. "stats": Numerical attributes (0-100) for Strength, Aesthetics, Endurance, Mental.
    4. "image_prompt": A highly detailed, photorealistic prompt for generating the user's photo at this stage.
       - MUST incorporate the user's "Visual Vision" for this specific month.
       - Keep the face consistent but evolve the body.
       - Style: Cinematic, 8k, dramatic lighting, Nike commercial aesthetic.
    5. "mental": A short, stoic mindset shift required for this stage.
    6. "risks" (m0 only): Potential pitfalls based on their stress/sleep data.
    7. "expectations" (m0 only): Realistic physical outcomes.

    TONE:
    - Clinical yet inspiring.
    - Use "Deep Data" (stress, sleep) to customize advice.
    - If stress is high, emphasize recovery. If discipline is low, emphasize consistency.

    OUTPUT FORMAT:
    Return ONLY valid JSON matching this exact Schema:
    {
      "insightsText": "string (Main analysis summary)",
      "timeline": {
        "m0": { "month": 0, "title": "string", "description": "string", "stats": { "strength": number, "aesthetics": number, "endurance": number, "mental": number }, "image_prompt": "string", "mental": "string", "risks": ["string"], "expectations": ["string"] },
        "m4": { "month": 4, "title": "string", "description": "string", "stats": { "strength": number, "aesthetics": number, "endurance": number, "mental": number }, "image_prompt": "string", "mental": "string" },
        "m8": { "month": 8, "title": "string", "description": "string", "stats": { "strength": number, "aesthetics": number, "endurance": number, "mental": number }, "image_prompt": "string", "mental": "string" },
        "m12": { "month": 12, "title": "string", "description": "string", "stats": { "strength": number, "aesthetics": number, "endurance": number, "mental": number }, "image_prompt": "string", "mental": "string" }
      },
      "overlays": {
        "m0": [{ "x": number, "y": number, "label": "string" }]
      }
    }
    
    IMPORTANT: 
    - "stats" values must be integers 0-100.
    - "overlays" coordinates x,y must be 0.0-1.0 (relative).
    - "image_prompt" must be English, highly detailed, photorealistic.
  `;

  const userContext = `Perfil: ${JSON.stringify(params.profile)} `;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userContext },
    { inlineData: { mimeType, data } },
  ]);

  let text = result.response.text().trim();
  // Strip code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
  }

  const parsed = InsightsResultZ.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error("Gemini output validation failed: " + parsed.error.message);
  }
  return parsed.data;
}

