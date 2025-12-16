"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@/components/Spinner";

interface VideoLoaderProps {
  status: "analyzing" | "generating" | "processing";
  progress?: number;
}

const MESSAGES = {
  analyzing: [
    "Analizando tu esencia visual...",
    "Mapeando características únicas...",
    "Construyendo tu narrativa heroica...",
    "Preparando tu transformación...",
  ],
  generating: [
    "Componiendo tu narrativa cinematográfica...",
    "Renderizando tu trailer de transformación...",
    "Sincronizando audio épico...",
    "Calibrando la iluminación dramática...",
    "Procesando movimientos fluidos...",
    "Aplicando estilo Nike commercial...",
    "Finalizando tu video...",
  ],
  processing: [
    "Optimizando calidad de video...",
    "Preparando para reproducción...",
    "Casi listo...",
  ],
};

const TIPS = [
  "Tu video será de 8 segundos en formato vertical, perfecto para Stories.",
  "El audio se genera automáticamente para crear una experiencia inmersiva.",
  "Podrás descargar tu video en alta calidad (1080p).",
  "Comparte tu transformación directamente en TikTok, Instagram o WhatsApp.",
  "Tu identidad se preserva a lo largo de todo el video.",
  "Cada video es único y personalizado para ti.",
];

export function VideoLoader({ status, progress }: VideoLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [dots, setDots] = useState("");

  const messages = MESSAGES[status];

  // Rotate messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages.length, status]);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-6">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6D00FF]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#5B21B6]/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md w-full text-center space-y-8">
        {/* Logo/Brand */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-3 h-3 rounded-full bg-[#6D00FF] animate-ping" />
          <h1 className="text-2xl font-bold text-white tracking-widest">
            NGX VISION
          </h1>
        </div>

        {/* Status Icon */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Outer ring */}
            <div className="w-32 h-32 rounded-full border-4 border-[#6D00FF]/20 absolute inset-0" />
            {/* Progress ring */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="60"
                stroke="transparent"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="60"
                stroke="#6D00FF"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(progress || 0) * 3.77} 377`}
                className="transition-all duration-500"
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </div>
          </div>
        </div>

        {/* Progress percentage */}
        {progress !== undefined && (
          <div className="text-[#6D00FF] font-mono text-3xl font-bold">
            {Math.round(progress)}%
          </div>
        )}

        {/* Status message */}
        <div className="h-8">
          <p className="text-white text-lg font-medium animate-pulse">
            {messages[messageIndex]}{dots}
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              status === "analyzing"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : status === "generating"
                ? "bg-[#6D00FF]/20 text-[#B98CFF] border border-[#6D00FF]/30"
                : "bg-green-500/20 text-green-400 border border-green-500/30"
            }`}
          >
            {status === "analyzing" && "Analizando"}
            {status === "generating" && "Generando Video"}
            {status === "processing" && "Procesando"}
          </span>
        </div>

        {/* Estimated time */}
        <p className="text-neutral-500 text-sm">
          {status === "generating" ? (
            <>Tiempo estimado: <span className="text-neutral-400">60-120 segundos</span></>
          ) : (
            <>Tiempo estimado: <span className="text-neutral-400">10-20 segundos</span></>
          )}
        </p>

        {/* Tip */}
        <div className="pt-8 border-t border-white/5">
          <p className="text-neutral-600 text-xs uppercase tracking-widest mb-2">
            Tip
          </p>
          <p className="text-neutral-400 text-sm min-h-[40px] transition-opacity duration-500">
            {TIPS[tipIndex]}
          </p>
        </div>

        {/* Progress bar (mobile-friendly) */}
        {progress !== undefined && (
          <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6D00FF] to-[#B98CFF] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
