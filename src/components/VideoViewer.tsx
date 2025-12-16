"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Download, Share2, Volume2, VolumeX, RotateCcw } from "lucide-react";

interface VideoViewerProps {
  videoUrl: string;
  heroNarrative: string;
  shareId: string;
  onShare?: () => void;
  onDownload?: () => void;
}

export function VideoViewer({
  videoUrl,
  heroNarrative,
  shareId,
  onShare,
  onDownload,
}: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Auto-play on mount
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          // Autoplay blocked, wait for user interaction
          console.log("Autoplay blocked:", e.message);
        });
    }
  }, []);

  // Hide controls after inactivity
  const resetHideControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleReplay = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ngx-vision-${shareId}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onDownload?.();
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/v/${shareId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mi Transformación NGX",
          text: heroNarrative,
          url: shareUrl,
        });
        onShare?.();
      } catch (error) {
        // User cancelled or error
        console.log("Share cancelled or failed:", error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
        onShare?.();
      } catch {
        console.error("Could not copy to clipboard");
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden"
      onMouseMove={resetHideControlsTimer}
      onTouchStart={resetHideControlsTimer}
    >
      {/* Video Player */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Gradient Overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/40" />

      {/* NGX Watermark */}
      <div className="absolute top-6 right-6 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#6D00FF] animate-pulse" />
          <span className="text-white/60 text-sm font-bold tracking-widest">
            NGX VISION
          </span>
        </div>
      </div>

      {/* Hero Narrative Overlay */}
      <div
        className={`absolute bottom-28 left-6 right-6 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-white text-lg md:text-xl font-medium leading-relaxed drop-shadow-lg text-center">
          &ldquo;{heroNarrative}&rdquo;
        </p>
      </div>

      {/* Progress Bar */}
      <div
        className={`absolute bottom-20 left-6 right-6 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-xs font-mono">
            {formatTime((progress / 100) * duration)}
          </span>
          <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6D00FF] rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-white/60 text-xs font-mono">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div
        className={`absolute bottom-6 left-6 right-6 flex items-center justify-between transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Left Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="p-4 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-0.5" />
            )}
          </button>
          <button
            onClick={handleReplay}
            className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors"
            aria-label="Replay"
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={toggleMute}
            className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors"
            aria-label="Download"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleShare}
            className="p-4 bg-[#6D00FF] rounded-full hover:bg-[#5b00d6] transition-colors shadow-lg shadow-[#6D00FF]/30"
            aria-label="Share"
          >
            <Share2 className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Play button overlay when paused */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-10"
          aria-label="Play"
        >
          <div className="p-6 bg-[#6D00FF]/80 backdrop-blur-md rounded-full hover:bg-[#6D00FF] transition-colors shadow-2xl shadow-[#6D00FF]/50">
            <Play className="w-12 h-12 text-white ml-1" />
          </div>
        </button>
      )}
    </div>
  );
}
