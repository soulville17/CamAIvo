import { motion } from "framer-motion";
import { AvatarCard } from "@/components/avatars/AvatarCard";
import type { Avatar } from "@/types/db";

interface AvatarPickerProps {
  avatars: Avatar[];
  selectedId: string | null;
  onSelect: (avatar: Avatar) => void;
  loading?: boolean;
  error?: string | null;
}

/** Carrousel horizontal des avatars — sélection à chaud pendant une session. */
export function AvatarPicker({
  avatars,
  selectedId,
  onSelect,
  loading = false,
  error = null,
}: AvatarPickerProps) {
  if (loading) {
    return (
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-36 w-28 shrink-0 animate-pulse rounded-2xl bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (avatars.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucun avatar disponible. Ajoute-en un depuis « Mes avatars ».
      </p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {avatars.map((avatar, i) => (
        <motion.div
          key={avatar.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05 }}
        >
          <AvatarCard
            avatar={avatar}
            selected={avatar.id === selectedId}
            onSelect={onSelect}
          />
        </motion.div>
      ))}
    </div>
  );
}
