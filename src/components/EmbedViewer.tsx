'use client';

import DetailCrumb from '@/components/DetailCrumb';
import EmbedFrame from '@/components/EmbedFrame';
import { detailTrail, trailForViewUrl } from '@/lib/detailTrail';
import GitHubStats from '@/components/GitHubStats';
import {
  EWU_SYMPOSIUM_HREF,
  formatStatCount,
  isEwuPreviewHost,
  isOwnGitHubProfile,
  papersForUrl,
  type ProfileCard,
  type ProfilePaper,
  type ProfilePin,
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
  const papers =
    previewData?.papers?.length
      ? previewData.papers
      : papersForUrl(target.openHref);
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
            papers={papers}
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

function paperHost(href: string): string {
  try {
    const u = new URL(href);
    return `${u.host}${u.pathname === '/' ? '' : u.pathname}`;
  } catch {
    return href;
  }
}

function PublishedPapers({
  papers,
  showSymposium,
}: {
  papers: ProfilePaper[];
  showSymposium: boolean;
}) {
  const author = resume.basics.name;
  return (
    <section className="profile-papers" aria-label={`Papers by ${author}`}>
      <h2 className="profile-papers-heading">Papers by {author}</h2>
      <ul className="profile-papers-list">
        {papers.map((paper) => (
          <li key={paper.href}>
            {paper.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="profile-papers-photo"
                src={paper.image}
                alt={
                  paper.imageAlt ||
                  `${paper.author} presenting ${paper.title}`
                }
                width={900}
                height={600}
                loading="eager"
                decoding="async"
              />
            ) : null}
            <p className="profile-papers-author">
              Published by {paper.author}
            </p>
            <a
              className="profile-papers-title"
              href={paper.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {paper.title}
            </a>
            <dl className="profile-papers-meta">
              {paper.type ? (
                <div>
                  <dt>Type</dt>
                  <dd>{paper.type}</dd>
                </div>
              ) : null}
              {paper.date ? (
                <div>
                  <dt>When</dt>
                  <dd>{paper.date}</dd>
                </div>
              ) : null}
              <div>
                <dt>For</dt>
                <dd>{paper.venue}</dd>
              </div>
              {paper.location ? (
                <div>
                  <dt>Where</dt>
                  <dd>{paper.location}</dd>
                </div>
              ) : null}
              {paper.mentor ? (
                <div>
                  <dt>Faculty mentor</dt>
                  <dd>{paper.mentor}</dd>
                </div>
              ) : null}
            </dl>
            {paper.summary ? (
              <p className="profile-papers-summary">{paper.summary}</p>
            ) : null}
            <p className="profile-papers-href">
              <a href={paper.href} target="_blank" rel="noopener noreferrer">
                Open paper ({paperHost(paper.href)})
              </a>
            </p>
          </li>
        ))}
      </ul>
      {showSymposium ? (
        <p className="profile-papers-symposium">
          <a href={EWU_SYMPOSIUM_HREF} target="_blank" rel="noopener noreferrer">
            2026 Student Research and Creative Works Symposium archive
          </a>
        </p>
      ) : null}
    </section>
  );
}

function PinnedRepos({ pins }: { pins: ProfilePin[] }) {
  return (
    <section className="profile-pins" aria-label="Pinned repositories">
      <h2 className="profile-card-section-heading">Pinned</h2>
      <ul className="profile-pins-list">
        {pins.map((pin) => (
          <li key={pin.href}>
            <a
              className="profile-pin"
              href={pin.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="profile-pin-name">{pin.name}</span>
              {pin.description ? (
                <span className="profile-pin-desc">{pin.description}</span>
              ) : null}
              <span className="profile-pin-meta">
                {pin.language ? (
                  <span className="profile-pin-lang">
                    {pin.languageColor ? (
                      <span
                        className="profile-pin-swatch"
                        style={{ background: pin.languageColor }}
                        aria-hidden
                      />
                    ) : null}
                    {pin.language}
                  </span>
                ) : null}
                {pin.stars != null ? (
                  <span className="profile-pin-stars">
                    {formatStatCount(pin.stars)} stars
                  </span>
                ) : null}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProfileCardView({
  target,
  card,
  loading,
  papers,
}: {
  target: ViewTarget;
  card: ProfileCard | null;
  loading: boolean;
  papers: ProfilePaper[];
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
  const pins = card?.pins || [];
  const hasNumericStats =
    stats.followers != null || stats.following != null || stats.posts != null;
  const showPapers = papers.length > 0;
  const showOwnGitHub = isOwnGitHubProfile(target.openHref);
  const showStats = !showPapers && !showOwnGitHub && (loading || hasNumericStats);
  const openHref = card?.url || target.openHref;

  return (
    <article className={`profile-card${loading ? ' is-loading' : ''}`}>
      <a
        className="profile-card-head"
        href={openHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${displayName} on ${network} in a new tab`}
      >
        <div className="profile-card-avatar">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
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
      </a>

      {bio ? (
        <p className="profile-card-bio">{bio}</p>
      ) : loading ? (
        <p className="profile-card-bio is-skeleton" aria-hidden>
          &nbsp;
        </p>
      ) : (
        <p className="profile-card-bio is-empty">No bio</p>
      )}

      {showPapers ? (
        <PublishedPapers
          papers={papers}
          showSymposium={isEwuPreviewHost(target.openHref)}
        />
      ) : showOwnGitHub ? (
        <section className="profile-card-gh" aria-label="GitHub stats">
          <h2 className="profile-card-section-heading">Stats</h2>
          <GitHubStats />
        </section>
      ) : showStats ? (
        <ul className="profile-card-stats" aria-label="Profile stats">
          <li>
            <span className="profile-card-stat-value">
              {loading && stats.followers == null
                ? '...'
                : formatStatCount(stats.followers)}
            </span>
            <span className="profile-card-stat-label">{labels.followers}</span>
          </li>
          <li>
            <span className="profile-card-stat-value">
              {loading && stats.following == null
                ? '...'
                : formatStatCount(stats.following)}
            </span>
            <span className="profile-card-stat-label">{labels.following}</span>
          </li>
          <li>
            <span className="profile-card-stat-value">
              {loading && stats.posts == null
                ? '...'
                : formatStatCount(stats.posts)}
            </span>
            <span className="profile-card-stat-label">{labels.posts}</span>
          </li>
        </ul>
      ) : null}

      {pins.length > 0 ? <PinnedRepos pins={pins} /> : null}

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
            ? showPapers
              ? 'Click the header to open the university site in a new tab.'
              : 'Click the header to open this profile in a new tab.'
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
