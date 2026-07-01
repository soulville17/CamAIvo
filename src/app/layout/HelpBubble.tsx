import { Send } from "lucide-react";

const TELEGRAM_URL =
  import.meta.env.VITE_SUPPORT_TELEGRAM ?? "https://t.me/camaivo_support";

/** Bulle d'aide fixe en bas à droite : "Besoin d'aide ?" + lien Telegram. */
export function HelpBubble() {
  return (
    <a
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-glass-border bg-ink-soft/90 px-4 py-2.5 text-sm font-medium text-snow shadow-glass backdrop-blur-xl transition-all hover:border-cloud/50 hover:text-cloud"
    >
      <Send className="h-4 w-4 text-cloud" aria-hidden />
      <span className="hidden sm:inline">Besoin d&rsquo;aide&nbsp;?</span>
    </a>
  );
}
