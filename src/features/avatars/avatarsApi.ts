import { supabase } from "@/lib/supabase";
import { configuredSwapMode } from "@/features/swap-engine";
import type { Avatar } from "@/types/db";

const BUCKET = "avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo (aligné sur le bucket)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Charge les avatars visibles par l'utilisateur : les siens + les publics.
 * (La RLS filtre déjà côté serveur ; le tri met les siens en premier.)
 */
export async function fetchAvatars(): Promise<{
  avatars: Avatar[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("avatars")
    .select("*")
    .order("is_public", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return { avatars: [], error: "Impossible de charger les avatars." };
  }
  return { avatars: (data ?? []) as Avatar[], error: null };
}

/**
 * Upload d'une photo source → Storage (dossier de l'utilisateur) → ligne avatars.
 * En mode mock le statut passe directement à `ready` ; avec un moteur réel,
 * il reste `processing` jusqu'au traitement du visage (extraction embedding).
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  name: string,
): Promise<{ avatar: Avatar | null; error: string | null }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { avatar: null, error: "Format non supporté : utilise JPG, PNG ou WebP." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { avatar: null, error: "Image trop lourde (5 Mo maximum)." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    return { avatar: null, error: "Échec de l'upload de l'image." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from("avatars")
    .insert({
      user_id: userId,
      name: name.trim() || "Mon avatar",
      image_url: publicUrl,
      status: configuredSwapMode === "mock" ? "ready" : "processing",
    })
    .select("*")
    .single();

  if (error || !data) {
    // Évite l'image orpheline si l'insert échoue
    await supabase.storage.from(BUCKET).remove([path]);
    return { avatar: null, error: "Impossible d'enregistrer l'avatar." };
  }
  return { avatar: data as Avatar, error: null };
}

/** Supprime un avatar (ligne + fichier Storage s'il vient du bucket). */
export async function deleteAvatar(
  avatar: Avatar,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("avatars").delete().eq("id", avatar.id);
  if (error) {
    return { error: "Impossible de supprimer cet avatar." };
  }

  // Nettoyage du fichier Storage (chemin = tout ce qui suit /avatars/)
  const marker = `/object/public/${BUCKET}/`;
  const idx = avatar.image_url.indexOf(marker);
  if (idx !== -1) {
    const path = decodeURIComponent(avatar.image_url.slice(idx + marker.length));
    await supabase.storage.from(BUCKET).remove([path]);
  }
  return { error: null };
}

/** Définit l'avatar par défaut (un seul par utilisateur, index unique en base). */
export async function setDefaultAvatar(
  userId: string,
  avatarId: string,
): Promise<{ error: string | null }> {
  const { error: clearError } = await supabase
    .from("avatars")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);
  if (clearError) {
    return { error: "Impossible de mettre à jour l'avatar par défaut." };
  }

  const { error } = await supabase
    .from("avatars")
    .update({ is_default: true })
    .eq("id", avatarId)
    .eq("user_id", userId);
  if (error) {
    return { error: "Impossible de définir cet avatar par défaut." };
  }
  return { error: null };
}
