import { useEffect } from 'react';

interface SeoOptions {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  ogImageUrl?: string | null;
  robotsIndex?: boolean | null;
  siteName?: string | null;
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSeo(opts: SeoOptions) {
  useEffect(() => {
    const title = opts.title || 'WhittleScript — Discover Screenplays Through Real Reader Engagement';
    const description = opts.description || 'WhittleScript helps writers improve their work, readers discover exceptional screenplays, and industry professionals find projects backed by genuine audience engagement.';
    document.title = title;

    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    if (opts.canonicalUrl) {
      setLinkTag('canonical', opts.canonicalUrl);
      setMetaTag('property', 'og:url', opts.canonicalUrl);
    }

    if (opts.ogImageUrl) {
      setMetaTag('property', 'og:image', opts.ogImageUrl);
      setMetaTag('name', 'twitter:image', opts.ogImageUrl);
    }

    const robotsContent = opts.robotsIndex === false ? 'noindex, nofollow' : 'index, follow';
    setMetaTag('name', 'robots', robotsContent);

    if (opts.siteName) {
      setMetaTag('property', 'og:site_name', opts.siteName);
    }
  }, [opts.title, opts.description, opts.canonicalUrl, opts.ogImageUrl, opts.robotsIndex, opts.siteName]);
}
