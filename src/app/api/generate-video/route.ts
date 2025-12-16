import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { GenerateVideoSchema } from "@/lib/validators";
import { uploadVideo, downloadFileBuffer } from "@/lib/storage";
import { generateVideo } from "@/lib/veo";
import { FieldValue } from "firebase-admin/firestore";
import type { VisionAnalysisResult } from "@/types/video";

// Explicit Node.js runtime for video processing
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for VEO generation + polling

interface SessionDoc {
  shareId: string;
  email?: string | null;
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
    bodyType?: string;
    focusZone?: string;
    notes?: string;
  };
  photo?: { originalStoragePath?: string };
  analysis?: VisionAnalysisResult;
  video?: {
    storagePath: string;
    durationSeconds: number;
    resolution: string;
  };
  status: "pending" | "analyzed" | "generating" | "ready" | "error";
}

export async function POST(req: Request) {
  let parsedSessionId: string | undefined;

  try {
    const body = await req.json();
    const parsed = GenerateVideoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { sessionId, durationSeconds = 8, resolution = "1080p", aspectRatio = "9:16" } = parsed.data;
    parsedSessionId = sessionId;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 400 });
    }

    const db = getDb();
    const ref = db.collection("sessions").doc(sessionId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const data = snap.data() as SessionDoc | undefined;
    if (!data) {
      return NextResponse.json({ error: "Session data missing" }, { status: 500 });
    }

    // Check if video already exists
    if (data.video?.storagePath && data.status === "ready") {
      console.log("[generate-video] Video already exists, returning existing");
      return NextResponse.json({
        ok: true,
        video: data.video,
        message: "Video already generated",
      });
    }

    // Verify analysis has been completed
    if (!data.analysis?.veo_prompt) {
      return NextResponse.json(
        { error: "Session not analyzed. Run /api/analyze first." },
        { status: 400 }
      );
    }

    const photoPath = data.photo?.originalStoragePath;
    if (!photoPath) {
      return NextResponse.json({ error: "Missing photo" }, { status: 400 });
    }

    // Update status to generating
    await ref.set(
      {
        status: "generating",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("[generate-video] Starting video generation for session:", sessionId);

    // Download the reference image
    const { buffer: imageBuffer } = await downloadFileBuffer(photoPath);
    const referenceImageBase64 = imageBuffer.toString("base64");

    // Generate the video using VEO
    const veoResult = await generateVideo({
      prompt: data.analysis.veo_prompt,
      referenceImageBase64,
      durationSeconds,
      resolution,
      aspectRatio,
      generateAudio: true,
    });

    console.log("[generate-video] VEO generation complete, uploading to storage");

    // Convert base64 to buffer and upload
    const videoBuffer = Buffer.from(veoResult.videoBase64, "base64");
    const storagePath = `sessions/${sessionId}/video/transformation.mp4`;
    await uploadVideo(storagePath, videoBuffer, "video/mp4");

    console.log("[generate-video] Video uploaded to:", storagePath);

    // Update session with video info
    const videoData = {
      storagePath,
      durationSeconds: veoResult.durationSeconds,
      resolution: veoResult.resolution,
    };

    await ref.set(
      {
        video: videoData,
        status: "ready",
        videoGeneratedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("[generate-video] Session updated, video generation complete");

    return NextResponse.json({
      ok: true,
      video: videoData,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[generate-video] Error:", e);

    // Update session status to error
    if (parsedSessionId) {
      try {
        await getDb().collection("sessions").doc(parsedSessionId).set(
          {
            status: "error",
            errorMessage: message,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (updateError) {
        console.error("[generate-video] Failed to update error status:", updateError);
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
