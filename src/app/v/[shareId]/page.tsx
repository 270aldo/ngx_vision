import { getDb } from "@/lib/firebaseAdmin";
import { VideoViewer } from "@/components/VideoViewer";
import { VideoLoader } from "@/components/VideoLoader";
import RefreshClient from "./refresh-client";
import { Metadata } from "next";
import type { VisionAnalysisResult } from "@/types/video";

export const dynamic = "force-dynamic";

interface VisionSessionDoc {
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
  errorMessage?: string;
}

export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const { shareId } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || "http://localhost:3000";
  const absoluteBase = String(baseUrl).startsWith("http") ? baseUrl : `https://${baseUrl}`;

  // For video pages, we could generate a thumbnail from the video
  // For now, use the original photo as OG image
  const ogUrl = `${absoluteBase}/api/og/${shareId}`;

  return {
    title: "Mi Transformación Cinematográfica - NGX Vision",
    description: "Descubre mi viaje de transformación en un video cinematográfico de 8 segundos. Creado con NGX Vision.",
    openGraph: {
      title: "Mi Transformación - NGX Vision",
      description: "Mira mi trailer de transformación personal",
      type: "video.other",
      images: [ogUrl],
    },
    twitter: {
      card: "player",
      title: "Mi Transformación - NGX Vision",
      description: "Mira mi trailer de transformación personal",
    },
  };
}

async function getVideoUrl(shareId: string): Promise<string | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${shareId}/video-url`, {
      cache: "no-store"
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.videoUrl || null;
  } catch {
    return null;
  }
}

export default async function VideoPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const db = getDb();
  const snap = await db.collection("sessions").doc(shareId).get();

  if (!snap.exists) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center p-10">
          <h1 className="text-2xl font-bold text-white mb-2">Video no encontrado</h1>
          <p className="text-neutral-400">El enlace puede haber expirado o ser incorrecto.</p>
        </div>
      </div>
    );
  }

  const data = snap.data() as VisionSessionDoc | undefined;
  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center p-10">
          <h1 className="text-2xl font-bold text-white mb-2">Datos inválidos</h1>
          <p className="text-neutral-400">No se pudieron cargar los datos de la sesión.</p>
        </div>
      </div>
    );
  }

  // Handle error status
  if (data.status === "error") {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center p-10 max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Error en la generación</h1>
          <p className="text-neutral-400 mb-4">
            Hubo un problema al generar tu video. Por favor, intenta de nuevo.
          </p>
          {data.errorMessage && (
            <p className="text-red-400 text-sm font-mono">{data.errorMessage}</p>
          )}
        </div>
      </div>
    );
  }

  // Determine loading status
  const getLoaderStatus = () => {
    if (data.status === "pending" || !data.analysis) return "analyzing";
    if (data.status === "analyzed" || data.status === "generating") return "generating";
    return "processing";
  };

  // If not ready, show loader
  if (data.status !== "ready" || !data.video?.storagePath) {
    return (
      <>
        <VideoLoader status={getLoaderStatus()} />
        <RefreshClient shareId={shareId} active={true} />
      </>
    );
  }

  // Get signed URL for video
  const videoUrl = await getVideoUrl(shareId);

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center p-10">
          <h1 className="text-2xl font-bold text-white mb-2">Video no disponible</h1>
          <p className="text-neutral-400">El video no pudo ser cargado. Por favor, recarga la página.</p>
        </div>
      </div>
    );
  }

  // Get hero narrative from analysis
  const heroNarrative = data.analysis?.hero_narrative ||
    "Tu transformación comienza aquí. Cada día es una oportunidad para convertirte en la mejor versión de ti mismo.";

  return (
    <>
      <VideoViewer
        videoUrl={videoUrl}
        heroNarrative={heroNarrative}
        shareId={shareId}
      />
      <RefreshClient shareId={shareId} active={false} />
    </>
  );
}
