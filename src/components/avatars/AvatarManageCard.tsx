import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Badge } from "@/components/ui/Badge";
import type { Avatar } from "@/types/db";
import { cn } from "@/lib/cn";

const STATUS_BADGES = {
  ready: { label: "Prêt", variant: "local" as const },
  processing: { label: "Traitement…", variant: "token" as const },
  failed: { label: "Échec", variant: "live" as const },
};

interface AvatarManageCardProps {
  avatar: Avatar;
  onSetDefault: (avatar: Avatar) => void;
  onDelete: (avatar: Avatar) => void;
  busy?: boolean;
}

/** Carte de gestion (page Mes avatars) : statut, défaut, suppression. */
export function AvatarManageCard({
  avatar,
  onSetDefault,
  onDelete,
  busy = false,
}: AvatarManageCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = STATUS_BADGES[avatar.status];

  return (
    <GlassPanel padded={false} className="overflow-hidden">
      <div className="relative">
        <img
          src={avatar.image_url}
          alt={avatar.name}
          className="aspect-square w-full object-cover"
          draggable={false}
        />
        <span className="absolute left-2 top-2">
          <Badge variant={status.variant}>{status.label}</Badge>
        </span>
        {avatar.is_default && (
          <span className="absolute right-2 top-2">
            <Badge variant="token">Par défaut</Badge>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="truncate text-sm font-semibold text-snow" title={avatar.name}>
          {avatar.name}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onSetDefault(avatar)}
            disabled={busy || avatar.is_default || avatar.status !== "ready"}
            className={cn(
              "rounded-lg p-1.5 transition-colors disabled:opacity-30",
              avatar.is_default
                ? "text-token"
                : "text-muted hover:bg-white/5 hover:text-token",
            )}
            title={avatar.is_default ? "Avatar par défaut" : "Définir par défaut"}
          >
            <Star
              className={cn("h-4 w-4", avatar.is_default && "fill-current")}
              aria-hidden
            />
          </button>
          {confirmDelete ? (
            <button
              onClick={() => onDelete(avatar)}
              disabled={busy}
              className="rounded-lg bg-red-500/90 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-500"
            >
              Confirmer
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
