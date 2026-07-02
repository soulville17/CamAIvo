import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { AvatarUploader } from "@/components/avatars/AvatarUploader";
import { AvatarManageCard } from "@/components/avatars/AvatarManageCard";
import {
  deleteAvatar,
  fetchAvatars,
  setDefaultAvatar,
} from "@/features/avatars/avatarsApi";
import { useAuthStore } from "@/features/auth/authStore";
import { useSwapStore } from "@/stores/swapStore";
import type { Avatar } from "@/types/db";

/** MES AVATARS — upload, statut, défaut, suppression + avatars publics. */
export function AvatarsPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const selectedAvatar = useSwapStore((s) => s.selectedAvatar);

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAvatars().then(({ avatars, error }) => {
      if (cancelled) return;
      setAvatars(avatars);
      setError(error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const myAvatars = useMemo(() => avatars.filter((a) => !a.is_public), [avatars]);
  const publicAvatars = useMemo(() => avatars.filter((a) => a.is_public), [avatars]);

  function handleUploaded(avatar: Avatar) {
    setAvatars((prev) => [avatar, ...prev]);
    setShowUploader(false);
    setNotice(`Avatar « ${avatar.name} » ajouté !`);
  }

  async function handleSetDefault(avatar: Avatar) {
    if (!userId) return;
    setBusy(true);
    setNotice(null);
    const { error } = await setDefaultAvatar(userId, avatar.id);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setAvatars((prev) =>
      prev.map((a) => ({ ...a, is_default: a.id === avatar.id })),
    );
  }

  async function handleDelete(avatar: Avatar) {
    setBusy(true);
    setNotice(null);
    const { error } = await deleteAvatar(avatar);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setAvatars((prev) => prev.filter((a) => a.id !== avatar.id));
    // Si l'avatar supprimé était la cible du swap, on désélectionne
    if (selectedAvatar?.id === avatar.id) {
      useSwapStore.setState({ selectedAvatar: null });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageHeading
            title="Mes avatars"
            subtitle="Gère les visages utilisés pour le swap"
          />
        </div>
        {!showUploader && (
          <Button variant="primary" onClick={() => setShowUploader(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Nouvel avatar
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert variant="success" className="mb-4">
          {notice}
        </Alert>
      )}

      {showUploader && userId && (
        <div className="mb-6">
          <AvatarUploader
            userId={userId}
            onUploaded={handleUploaded}
            onClose={() => setShowUploader(false)}
          />
        </div>
      )}

      {/* Mes avatars */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
          Mes avatars
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : myAvatars.length === 0 ? (
          <GlassPanel>
            <p className="text-sm text-muted">
              Tu n&rsquo;as pas encore d&rsquo;avatar. Ajoute une photo avec «&nbsp;+
              Nouvel avatar&nbsp;», ou utilise un avatar public ci-dessous.
            </p>
          </GlassPanel>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {myAvatars.map((avatar) => (
              <AvatarManageCard
                key={avatar.id}
                avatar={avatar}
                onSetDefault={(a) => void handleSetDefault(a)}
                onDelete={(a) => void handleDelete(a)}
                busy={busy}
              />
            ))}
          </div>
        )}
      </section>

      {/* Avatars publics */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
          Avatars publics
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {publicAvatars.map((avatar) => (
            <GlassPanel key={avatar.id} padded={false} className="overflow-hidden">
              <img
                src={avatar.image_url}
                alt={avatar.name}
                className="aspect-square w-full object-cover"
                draggable={false}
              />
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-semibold text-snow">{avatar.name}</span>
                <Badge variant="neutral">Public</Badge>
              </div>
            </GlassPanel>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Les avatars publics sont proposés par CamAIvo et utilisables par tous —
          sélectionne-les directement depuis le Live Swap.
        </p>
      </section>

      {/* Rappel d'usage responsable */}
      <GlassPanel className="mt-10">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-snow">
          Usage responsable
        </h2>
        <p className="text-xs leading-relaxed text-muted">
          N&rsquo;upload que des photos dont tu détiens les droits (toi-même, ou une
          personne ayant donné son consentement explicite). L&rsquo;usurpation
          d&rsquo;identité de personnes réelles est interdite et entraîne la
          suppression du compte.
        </p>
      </GlassPanel>
    </motion.div>
  );
}
