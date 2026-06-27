import PublicShelfClient from './PublicShelfClient';

// Indique à Next.js qu'il s'agit d'une route dynamique qui doit être générée 
// côté client lors d'un export statique (SSG).
export function generateStaticParams() {
  return [{ username: 'placeholder' }];
}

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  return <PublicShelfClient username={resolvedParams.username} />;
}
