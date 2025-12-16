import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { getVideoSignedUrl } from "@/lib/storage";

interface VisionSessionDoc {
  shareId: string;
  video?: {
    storagePath: string;
    durationSeconds: number;
    resolution: string;
  };
  status: "pending" | "analyzed" | "generating" | "ready" | "error";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    const db = getDb();
    const snap = await db.collection("sessions").doc(shareId).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const data = snap.data() as VisionSessionDoc | undefined;
    if (!data) {
      return NextResponse.json({ error: "Session data missing" }, { status: 500 });
    }

    if (!data.video?.storagePath) {
      return NextResponse.json({ error: "Video not yet generated" }, { status: 404 });
    }

    // Generate signed URL with 2-hour expiration
    const videoUrl = await getVideoSignedUrl(data.video.storagePath, {
      expiresInSeconds: 7200,
    });

    return NextResponse.json({
      videoUrl,
      durationSeconds: data.video.durationSeconds,
      resolution: data.video.resolution,
      status: data.status,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[video-url] Error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
