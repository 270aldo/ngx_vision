import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { AnalyzeSchema } from "@/lib/validators";
import { getSignedUrl } from "@/lib/storage";
import { generateVisionAnalysis } from "@/lib/gemini";
import { FieldValue } from "firebase-admin/firestore";

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
  analysis?: unknown;
  video?: { storagePath: string };
  status: "pending" | "analyzed" | "generating" | "ready" | "error";
}

export async function POST(req: Request) {
  let parsedSessionId: string | undefined;
  try {
    const body = await req.json();
    const parsed = AnalyzeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { sessionId } = parsed.data;
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
    if (!data) return NextResponse.json({ error: "Session data missing" }, { status: 500 });

    const photoPath = data.photo?.originalStoragePath;
    if (!photoPath) return NextResponse.json({ error: "Missing photo" }, { status: 400 });

    const imageUrl = await getSignedUrl(photoPath, { expiresInSeconds: 3600 });

    console.log("[analyze] Starting vision analysis for session:", sessionId);

    // Generate Vision Analysis (for VEO video generation)
    const analysis = await generateVisionAnalysis({
      imageUrl,
      profile: data.input,
    });

    console.log("[analyze] Vision analysis complete, hero_narrative:", analysis.hero_narrative.substring(0, 100) + "...");

    await ref.set(
      {
        analysis,
        status: "analyzed",
        analyzedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      analysis: {
        hero_narrative: analysis.hero_narrative,
        estimated_transformation: analysis.estimated_transformation,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[analyze] Error:", e);
    try {
      if (parsedSessionId) {
        await getDb().collection("sessions").doc(parsedSessionId).set(
          {
            status: "error",
            errorMessage: message,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch {}
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
