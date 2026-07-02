import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Avatar } from "@/types/db";
import { cn } from "@/lib/cn";

interface AvatarCardProps {
  avatar: Avatar;
  selected: boolean;
  onSelect: (avatar: Avatar) => void;
}

/** Carte avatar cliquable — checkmark vert quand sélectionné comme cible. */
export function AvatarCard({ avatar, selected, onSelect }: AvatarCardProps) {
  const disabled = avatar.status !== "ready";
  return (
    <button
      onClick={() => onSelect(avatar)}
      disabled={disabled}
      className={cn(
        "group relative w-28 shrink-0 overflow-hidden rounded-2xl border text-left transition-all",
        selected
          ? "border-live shadow-[0_0_0_2px_rgba(34,197,94,0.4)]"
          : "border-glass-border hover:border-white/25",
        disabled && "opacity-50",
      )}
      title={avatar.name}
    >
      <img
        src={avatar.image_url}
        alt={avatar.name}
        className="aspect-square w-full object-cover"
        draggable={false}
      />
      <div className="flex items-center justify-between bg-ink-soft/90 px-2 py-1.5">
        <span className="truncate text-xs font-semibold text-snow">{avatar.name}</span>
        {avatar.is_public && (
          <Badge variant="neutral" className="px-1.5 text-[9px]">
            Public
          </Badge>
        )}
      </div>
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-live shadow">
          <Check className="h-4 w-4 text-ink" strokeWidth={3} aria-hidden />
        </span>
      )}
      {avatar.status === "processing" && (
        <span className="absolute left-1.5 top-1.5">
          <Badge variant="token" className="text-[9px]">
            Traitement…
          </Badge>
        </span>
      )}
    </button>
  );
}
