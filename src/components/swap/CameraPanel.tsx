import { useEffect, useRef, type ReactNode } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { cn } from "@/lib/cn";

interface CameraPanelProps {
  title: string;
  /** Badge affiché à droite du titre (LIVE, 30 FPS…) */
  badge?: ReactNode;
  stream: MediaStream | null;
  /** Contenu affiché quand il n'y a pas de flux (état, erreur, CTA) */
  placeholder?: ReactNode;
  /** Miroir horizontal (naturel pour la webcam) */
  mirrored?: boolean;
  /** Filigrane discret en bas à droite du flux */
  watermark?: string;
}

/** Panneau caméra réutilisable : titre, badge, flux vidéo, watermark, overlays. */
export function CameraPanel({
  title,
  badge,
  stream,
  placeholder,
  mirrored = false,
  watermark,
}: CameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) {
      void video.play().catch(() => {
        /* autoplay silencieux — le flux est muet */
      });
    }
  }, [stream]);

  return (
    <GlassPanel padded={false} className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          {title}
        </h2>
        {badge}
      </div>
      <div className="relative aspect-video bg-black/40">
        <video
          ref={videoRef}
          muted
          playsInline
          className={cn(
            "h-full w-full object-cover",
            mirrored && "-scale-x-100",
            !stream && "hidden",
          )}
        />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {placeholder}
          </div>
        )}
        {stream && watermark && (
          <span className="absolute bottom-2 right-3 rounded bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white/60 backdrop-blur-sm">
            {watermark}
          </span>
        )}
      </div>
    </GlassPanel>
  );
}
