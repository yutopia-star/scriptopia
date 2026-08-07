import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BlockRenderer } from '@/components/public/BlockRenderer';
import { useSeo } from '@/lib/useSeo';
import { fetchPageBySlug } from '@/lib/cms';
import { Feather } from 'lucide-react';
import type { CmsPage, PageVersion } from '@/types/database';

export function CmsPageView() {
  const params = useParams();
  const slug = (params.slug as string) || 'home';
  const [page, setPage] = useState<CmsPage | null>(null);
  const [version, setVersion] = useState<PageVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetchPageBySlug(slug).then((result) => {
      if (!result) {
        setNotFound(true);
      } else {
        setPage(result.page);
        setVersion(result.version);
      }
      setLoading(false);
    });
  }, [slug]);

  useSeo({
    title: page?.seo_title || page?.title,
    description: page?.meta_description,
    canonicalUrl: page?.canonical_url || `/${slug === 'home' ? '' : slug}`,
    ogImageUrl: page?.og_image_url,
    robotsIndex: page?.robots_index,
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background pt-16">
        <div className="h-8 w-8 animate-spin border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (notFound || !page || !version) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-background px-4 pt-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center bg-foreground text-background">
          <Feather className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-base text-muted-foreground">The page you are looking for does not exist or has been unpublished.</p>
        <Link to="/" className="mt-6 inline-flex h-11 items-center bg-foreground px-6 text-sm font-medium text-background hover:bg-primary-hover">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div>
      {version.blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}
    </div>
  );
}
