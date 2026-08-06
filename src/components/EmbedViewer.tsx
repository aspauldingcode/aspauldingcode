'use client';

import DetailCrumb from '@/components/DetailCrumb';
import EmbedFrame from '@/components/EmbedFrame';
import { detailTrail, trailForViewUrl } from '@/lib/detailTrail';
import {
  formatStatCount,
  type ProfileCard,
} from '@/lib/profileCard';
import type { ViewTarget } from '@/lib/viewHref';
import { resume } from '@/content/resume';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: ProfileCard }
  | { status: 'empty' };

export default function EmbedViewer({ target }: { target: ViewTarget }) {
  const homeLabel = resume.basics.name;
  const [preview, setPreview] = useState<PreviewState>(() =>
    target.embeddable ? { status: 'idle' } : { status: 'loading' }
  );

  useEffect(() => {
    if (target.embeddable) return;

    const href = target.openHref;
    let cancelled = false;
    const ac = new AbortController();

    queueMicrotask(() => {
      if (!cancelled) setPreview({ status: 'loading' });
    });

    void (async () => {
      try {
        const res = await fetch(
          `/api/preview?u=${encodeURIComponent(href)}`,
          { signal: ac.signal }
        );
        if (!res.ok) {
          if (!cancelled) setPreview({ status: 'empty' });
          return;
        }
        const data = (await res.json()) as ProfileCard;
        if (!cancelled) setPreview({ status: 'ready', data });
      } catch {
        if (!cancelled) setPreview({ status: 'empty' });
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [target.embeddable, target.openHref]);

  const previewData = preview.status === 'ready' ? preview.data : null;
  const trailMeta = trailForViewUrl(target.openHref, {
    siteName: previewData?.network,
    title: previewData?.displayName || previewData?.username,
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
            Open in new tab{' '}
            <span className="nf" aria-hidden>
              󰏌
            </span>
          </a>
        </p>

        {target.embeddable ? null : (
          <ProfileCardView
            target={target}
            card={previewData}
            loading={preview.status === 'loading'}
          />
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

function ProfileCardView({
  target,
  card,
  loading,
}: {
  target: ViewTarget;
  card: ProfileCard | null;
  loading: boolean;
}) {
  const network = card?.network || fallbackNetwork(target.openHref);
  const displayName = card?.displayName || card?.username || target.label;
  const username = card?.username;
  const bio = card?.bio;
  const status = card?.status;
  const avatar = card?.avatar;
  const favicon = card?.favicon;
  const labels = card?.labels || {
    followers: 'Followers',
    following: 'Following',
    posts: 'Posts',
  };
  const stats = card?.stats || {
    followers: null,
    following: null,
    posts: null,
  };
  const extras = card?.extras || [];

  return (
    <article className={`profile-card${loading ? ' is-loading' : ''}`}>
      <header className="profile-card-head">
        <div className="profile-card-avatar">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={
                displayName
                  ? `${displayName} profile photo`
                  : `${network} profile photo`
              }
              width={88}
              height={88}
              loading="eager"
              decoding="async"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <span className="profile-card-avatar-fallback" aria-hidden>
              {initials(displayName)}
            </span>
          )}
        </div>

        <div className="profile-card-identity">
          <p className="profile-card-network">
            {favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="profile-card-favicon"
                src={favicon}
                alt=""
                width={14}
                height={14}
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : null}
            <span>{network}</span>
          </p>
          <h1 className="profile-card-name">{displayName}</h1>
          {username ? (
            <p className="profile-card-username">@{username.replace(/^@/, '')}</p>
          ) : loading ? (
            <p className="profile-card-username is-skeleton" aria-hidden>
              &nbsp;
            </p>
          ) : null}
          {status ? <p className="profile-card-status">{status}</p> : null}
        </div>
      </header>

      {bio ? (
        <p className="profile-card-bio">{bio}</p>
      ) : loading ? (
        <p className="profile-card-bio is-skeleton" aria-hidden>
          &nbsp;
        </p>
      ) : (
        <p className="profile-card-bio is-empty">No bio</p>
      )}

      <ul className="profile-card-stats" aria-label="Profile stats">
        <li>
          <span className="profile-card-stat-value">
            {loading && stats.followers == null ? '...' : formatStatCount(stats.followers)}
          </span>
          <span className="profile-card-stat-label">{labels.followers}</span>
        </li>
        <li>
          <span className="profile-card-stat-value">
            {loading && stats.following == null ? '...' : formatStatCount(stats.following)}
          </span>
          <span className="profile-card-stat-label">{labels.following}</span>
        </li>
        <li>
          <span className="profile-card-stat-value">
            {loading && stats.posts == null ? '...' : formatStatCount(stats.posts)}
          </span>
          <span className="profile-card-stat-label">{labels.posts}</span>
        </li>
      </ul>

      {extras.length > 0 ? (
        <dl className="profile-card-extras">
          {extras.map((row) => (
            <div key={`${row.label}:${row.value}`} className="profile-card-extra">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <p className="profile-card-note">
        {loading
          ? 'Loading profile...'
          : card
            ? 'Open in a new tab to visit this profile.'
            : 'Preview unavailable. Open in a new tab to continue.'}
      </p>
    </article>
  );
}

function fallbackNetwork(href: string): string {
  try {
    const host = new URL(href).hostname.replace(/^www\./, '');
    if (host.includes('github')) return 'GitHub';
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('youtube') || host === 'youtu.be') return 'YouTube';
    if (host.includes('mastodon')) return 'Mastodon';
    if (host === 'x.com' || host.includes('twitter')) return 'X';
    return host;
  } catch {
    return 'Profile';
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}
