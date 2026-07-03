import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Cloud, FlaskConical, HardDrive, LogOut, RefreshCw } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Switch } from "@/components/ui/Switch";
import { useAuthStore } from "@/features/auth/authStore";
import {
  ENGINE_CONSTANTS,
  useSettingsStore,
  type Resolution,
} from "@/stores/settingsStore";
import type { SwapMode } from "@/features/swap-engine";
import { cn } from "@/lib/cn";

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
      {children}
    </h2>
  );
}

/** PARAMÈTRES — profil, préférences de swap, sécurité, usage responsable. */
export function SettingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const updateDisplayName = useAuthStore((s) => s.updateDisplayName);
  const changePassword = useAuthStore((s) => s.changePassword);
  const signOut = useAuthStore((s) => s.signOut);
  const settings = useSettingsStore();

  // ── Profil ──
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    const { error } = await updateDisplayName(displayName);
    setSavingProfile(false);
    setProfileMsg(
      error
        ? { type: "error", text: error }
        : { type: "success", text: "Profil mis à jour." },
    );
  }

  // ── Webcams ──
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  async function refreshDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "videoinput"));
    } catch {
      setDevices([]);
    }
  }

  useEffect(() => {
    void refreshDevices();
  }, []);

  // ── Sécurité ──
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({
        type: "error",
        text: "Le mot de passe doit contenir au moins 6 caractères.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        type: "error",
        text: "Les deux mots de passe ne correspondent pas.",
      });
      return;
    }
    setSavingPassword(true);
    const { error } = await changePassword(newPassword);
    setSavingPassword(false);
    if (error) {
      setPasswordMsg({ type: "error", text: error });
    } else {
      setPasswordMsg({ type: "success", text: "Mot de passe modifié." });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  const selectClass =
    "h-10 w-full rounded-xl border border-glass-border bg-white/5 px-3 text-sm text-snow outline-none focus:border-ember/60 [&>option]:bg-ink-soft";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <PageHeading title="Paramètres" subtitle="Profil, préférences et sécurité" />

      {/* ── Profil ── */}
      <section>
        <SectionTitle>Profil</SectionTitle>
        <GlassPanel>
          <form onSubmit={handleSaveProfile} className="max-w-md space-y-4">
            {profileMsg && (
              <Alert variant={profileMsg.type}>{profileMsg.text}</Alert>
            )}
            <Input
              label="Nom d'affichage"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ton pseudo de créateur"
            />
            <Input label="Email" value={profile?.email ?? ""} disabled readOnly />
            <Button type="submit" variant="primary" loading={savingProfile}>
              Enregistrer
            </Button>
          </form>
        </GlassPanel>
      </section>

      {/* ── Préférences de swap ── */}
      <section>
        <SectionTitle>Préférences de swap</SectionTitle>
        <GlassPanel className="space-y-6">
          {/* Pipeline moteur */}
          <div>
            <p className="mb-2 text-sm font-medium text-snow">Moteur de swap</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { mode: "mock", icon: FlaskConical, label: "Démo" },
                  { mode: "local", icon: HardDrive, label: "Local" },
                  { mode: "cloud", icon: Cloud, label: "Cloud" },
                ] as { mode: SwapMode; icon: typeof Cloud; label: string }[]
              ).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => settings.setEnginePipeline(mode)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold uppercase transition-colors",
                    settings.enginePipeline === mode
                      ? mode === "mock"
                        ? "border-token/50 bg-token/15 text-token"
                        : mode === "local"
                          ? "border-live/50 bg-live/15 text-live"
                          : "border-cloud/50 bg-cloud/15 text-cloud"
                      : "border-glass-border text-muted hover:text-snow",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              <strong>Démo</strong> = simulation sans GPU (aucun vrai swap) ·{" "}
              <strong>Local</strong> = sidecar CamAIvo sur ta machine (vrai swap,
              GPU recommandé) · <strong>Cloud</strong> = worker GPU distant.
              Le changement prend effet au prochain démarrage de swap.
            </p>
          </div>

          {/* Webcam + résolution + fps */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Webcam
                </label>
                <button
                  onClick={() => void refreshDevices()}
                  className="text-muted hover:text-snow"
                  title="Rafraîchir la liste"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <select
                className={selectClass}
                value={settings.cameraDeviceId ?? ""}
                onChange={(e) => settings.setCameraDeviceId(e.target.value || null)}
              >
                <option value="">Webcam par défaut</option>
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Caméra ${i + 1}`}
                  </option>
                ))}
              </select>
              {devices.length > 0 && !devices[0]?.label && (
                <p className="mt-1 text-[11px] text-muted">
                  Autorise la caméra (Live Swap) pour voir les noms.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                Résolution
              </label>
              <select
                className={selectClass}
                value={settings.resolution}
                onChange={(e) => settings.setResolution(e.target.value as Resolution)}
              >
                <option value="640x480">640×480 (défaut)</option>
                <option value="1280x720">1280×720</option>
                <option value="1920x1080">1920×1080</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                FPS cible
              </label>
              <select
                className={selectClass}
                value={settings.targetFps}
                onChange={(e) =>
                  settings.setTargetFps(Number(e.target.value) as 20 | 30)
                }
              >
                <option value={20}>20 fps (défaut)</option>
                <option value={30}>30 fps</option>
              </select>
            </div>
          </div>

          {/* Options du moteur */}
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-snow">Transparence de l&rsquo;avatar</span>
                <span className="tabular-nums text-muted">
                  {Math.round(settings.transparency * 100)} %
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.transparency * 100)}
                onChange={(e) =>
                  settings.setEngineOption("transparency", Number(e.target.value) / 100)
                }
                className="w-full accent-[#FF5A1F]"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-snow">Netteté</span>
                <span className="tabular-nums text-muted">
                  {Math.round(settings.sharpness * 100)} %
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.sharpness * 100)}
                onChange={(e) =>
                  settings.setEngineOption("sharpness", Number(e.target.value) / 100)
                }
                className="w-full accent-[#FF5A1F]"
              />
            </div>
            <Switch
              checked={settings.mouthMask}
              onChange={(v) => settings.setEngineOption("mouthMask", v)}
              label="Masque bouche"
              description="Garde ta vraie bouche visible (meilleure synchro labiale)"
            />
            <Switch
              checked={settings.faceEnhancer}
              onChange={(v) => settings.setEngineOption("faceEnhancer", v)}
              label="Amélioration du visage"
              description="OFF par défaut — plus joli mais coûteux en GPU (baisse les FPS)"
            />
          </div>

          <p className="border-t border-white/5 pt-3 text-[11px] text-muted">
            Détection : {ENGINE_CONSTANTS.detSize} · {ENGINE_CONSTANTS.maxFaces} visage
            max — appliqué par le moteur, non modifiable.
          </p>
        </GlassPanel>
      </section>

      {/* ── Sécurité ── */}
      <section>
        <SectionTitle>Sécurité</SectionTitle>
        <GlassPanel>
          <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
            {passwordMsg && (
              <Alert variant={passwordMsg.type}>{passwordMsg.text}</Alert>
            )}
            <Input
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6 caractères minimum"
            />
            <Input
              label="Confirmer le mot de passe"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" loading={savingPassword}>
                Changer le mot de passe
              </Button>
              <Button type="button" variant="ghost" onClick={() => void signOut()}>
                <LogOut className="h-4 w-4" aria-hidden />
                Se déconnecter
              </Button>
            </div>
          </form>
        </GlassPanel>
      </section>

      {/* ── Usage responsable ── */}
      <section>
        <SectionTitle>Usage responsable</SectionTitle>
        <GlassPanel className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            N&rsquo;utilise que des avatars dont tu détiens les droits. L&rsquo;usurpation
            d&rsquo;identité de personnes réelles sans leur consentement explicite est
            interdite par les conditions d&rsquo;utilisation et peut entraîner la
            suppression du compte. Le filigrane aide les plateformes (TikTok, Meet…)
            à identifier un flux transformé.
          </p>
          <Switch
            checked={settings.watermarkEnabled}
            onChange={settings.setWatermarkEnabled}
            label="Filigrane sur la sortie"
            description="Affiche « CamAIvo » discrètement sur le flux transformé (recommandé)"
          />
        </GlassPanel>
      </section>
    </motion.div>
  );
}
