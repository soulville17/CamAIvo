interface PageHeadingProps {
  title: string;
  subtitle?: string;
}

/** Titre de page uniforme (LIVE SWAP, MES AVATARS…). */
export function PageHeading({ title, subtitle }: PageHeadingProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold uppercase tracking-wide text-snow sm:text-3xl">
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
