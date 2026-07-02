import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Lightbulb, X } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { uploadAvatar } from "@/features/avatars/avatarsApi";
import type { Avatar } from "@/types/db";

const PHOTO_TIPS = [
  "Visage centré et face caméra",
  "Bonne lumière, sans contre-jour",
  "Pas de lunettes fumées ni de masque",
  "Une seule personne sur la photo",
];

interface AvatarUploaderProps {
  userId: string;
  onUploaded: (avatar: Avatar) => void;
  onClose: () => void;
}

/** Formulaire d'ajout d'avatar : photo (préviz), nom, conseils qualité. */
export function AvatarUploader({ userId, onUploaded, onClose }: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choisis d'abord une photo.");
      return;
    }
    setUploading(true);
    setError(null);
    const { avatar, error: uploadError } = await uploadAvatar(userId, file, name);
    setUploading(false);
    if (uploadError || !avatar) {
      setError(uploadError);
      return;
    }
    onUploaded(avatar);
  }

  return (
    <GlassPanel className="relative">
      <button
        onClick={onClose}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-snow"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>

      <h2 className="text-sm font-bold uppercase tracking-wider text-snow">
        Nouvel avatar
      </h2>
      <p className="mt-1 text-xs text-muted">
        Une photo nette du visage donne le meilleur résultat de swap.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
        {/* Zone photo + préviz */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-glass-border bg-white/[0.03] transition-colors hover:border-ember/50"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Aperçu de l'avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex flex-col items-center gap-2 text-muted">
              <ImagePlus className="h-7 w-7" aria-hidden />
              <span className="text-[11px]">JPG · PNG · WebP</span>
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            label="Nom de l'avatar"
            placeholder="Ex. Mon perso stream"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <ul className="space-y-1">
            {PHOTO_TIPS.map((tip) => (
              <li key={tip} className="flex items-center gap-2 text-xs text-muted">
                <Lightbulb className="h-3 w-3 shrink-0 text-token" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
          <Button type="submit" variant="primary" loading={uploading}>
            Ajouter l&rsquo;avatar
          </Button>
        </div>
      </form>
    </GlassPanel>
  );
}
