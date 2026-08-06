'use client';

import DetailCrumb from '@/components/DetailCrumb';
import EmbedFrame from '@/components/EmbedFrame';
import { detailTrail, trailForViewUrl } from '@/lib/detailTrail';
import type { LinkPreview } from '@/lib/linkPreview';
import type { ViewTarget } from '@/lib/viewHref';
import { resume } from '@/content/resume';
import Link from 'next/link';
import { useState } from 'react';

export default function EmbedViewer({
  target,
  preview,
}: {
  target: ViewTarget;
  preview?: LinkPreview | null;
}) {
  const homeLabel = resume.basics.name;
  const trailMeta = trailForViewUrl(target.openHref, {
    siteName: preview?.siteName,
    title: preview?.title,
  });
  const crumbs = detailTrail(trailMeta.section, trailMeta.current);

  return (
    <div
      className={
        target.embeddable ? 'detail-pane embed-viewer is-frame' : 'detail-pane'
      }
    >
      <div className="wrap">
        <DetailCrumb items={crumbs} />

        <p className="detail-actions no-print">
          <a href={target.openHref} target="_blank" rel="noopener noreferrer">
            Open in new tab ↗
          </a>
        </p>

        {target.embeddable ? null : (
          <PreviewBody target={target} preview={preview ?? null} />
        )}

        {target.embeddable ? null : (
          <p className="project-home">
            <Link href="/">← Back to {homeLabel}</Link>
          </p>
        )}
      </div>

      {target.embeddable ? (
        <>
          <div className="embed-stage">
            <EmbedFrame
              key={target.href}
              src={target.href}
              title={trailMeta.current}
            />
          </div>
          <p className="project-home embed-home">
            <Link href="/">← Back to {homeLabel}</Link>
          </p>
        </>
      ) : null}
    </div>
  );
}

function PreviewBody({
  target,
  preview,
}: {
  target: ViewTarget;
  preview: LinkPreview | null;
}) {
  const title = preview?.title || target.label;
  const site =
    preview?.siteName ||
    (() => {
      try {
        return new URL(target.openHref).hostname.replace(/^www\./, '');
      } catch {
        return null;
      }
    })();
  const desc = preview?.description?.trim() || null;
  const image = preview?.image;
  const favicon = preview?.favicon;

  return (
    <article className="detail-preview">
      {image ? (
        <PreviewMedia src={image} alt={preview?.imageAlt || title} />
      ) : null}

      <header className="detail-preview-header">
        <p className="detail-preview-site">
          {favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="detail-preview-favicon"
              src={favicon}
              alt=""
              width={14}
              height={14}
              referrerPolicy="no-referrer"
            />
          ) : null}
          <span>{site}</span>
        </p>
        <h1 className="detail-preview-title">{title}</h1>
      </header>

      {desc ? <p className="detail-preview-desc">{desc}</p> : null}

      <p className="detail-preview-note">
        {preview
          ? 'This site blocks in-page embedding, so a preview is shown instead.'
          : 'This site blocks in-page embedding. Open it in a new tab to continue.'}
      </p>
    </article>
  );
}

function PreviewMedia({ src, alt }: { src: string; alt: string }) {
  const [shape, setShape] = useState<'square' | 'wide' | 'tall' | null>(null);

  return (
    <div
      className={
        shape ? `detail-preview-media is-${shape}` : 'detail-preview-media'
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote OG URLs vary by host */}
      <img
        src={src}
        alt={alt}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
          if (!w || !h) return;
          const ratio = w / h;
          setShape(ratio < 0.85 ? 'tall' : ratio > 1.25 ? 'wide' : 'square');
        }}
      />
    </div>
  );
}
