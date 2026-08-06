import stats from '../../public/github/stats.json';

/** Deterministic grouping — avoid locale/ICU drift between Node and browsers. */
function fmt(n: number): string {
  const s = Math.round(n).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtPct(n: number): string {
  return `${Number(n.toFixed(1))}%`;
}

type LangSlice = {
  name: string;
  percent: number;
  color: string;
};

type PieSlice = LangSlice & {
  start: number;
  end: number;
};

const LANG_TOP_N = 8;
const OTHER_LANG_COLOR = '#8b949e';

/** Prefer generator output; bucket here if an older stats.json lacks Other. */
function withOtherBucket(languages: LangSlice[]): LangSlice[] {
  const live = languages.filter((l) => l.percent > 0);
  if (live.some((l) => l.name === 'Other') || live.length <= LANG_TOP_N) {
    return live;
  }
  const ranked = [...live].sort((a, b) => b.percent - a.percent);
  const head = ranked.slice(0, LANG_TOP_N);
  const otherPct =
    Math.round(ranked.slice(LANG_TOP_N).reduce((s, l) => s + l.percent, 0) * 10) / 10;
  return [...head, { name: 'Other', percent: otherPct, color: OTHER_LANG_COLOR }];
}

function buildSlices(languages: LangSlice[]): PieSlice[] {
  const langs = withOtherBucket(languages);
  const total = langs.reduce((s, x) => s + x.percent, 0) || 1;
  let angle = 0;
  return langs.map((slice) => {
    const sweep = (slice.percent / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { ...slice, start, end };
  });
}

/** Round so Node SSR and browser path `d` strings match. */
function r3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [r3(cx + r * Math.cos(a)), r3(cy + r * Math.sin(a))];
}

function slicePath(cx: number, cy: number, r: number, start: number, end: number): string {
  if (end - start >= 359.99) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function LanguagePie({ slices }: { slices: PieSlice[] }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 88;
  const summary = slices.map((s) => `${s.name} ${fmtPct(s.percent)}`).join(', ');

  return (
    <svg
      className="gh-pie"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Language share: ${summary}`}
    >
      {slices.map((slice) => (
        <path
          key={slice.name}
          d={slicePath(cx, cy, r, slice.start, slice.end)}
          fill={slice.color}
          stroke="var(--bg)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          aria-label={`${slice.name}: ${fmtPct(slice.percent)}`}
        />
      ))}
    </svg>
  );
}

export default function GitHubStats() {
  const { metrics, streak, languages, fromYear, login } = stats;

  const cards = [
    { label: 'Commits', value: metrics.commits },
    { label: 'Contributions', value: metrics.contributions },
    { label: 'Pull requests', value: metrics.pullRequests },
    { label: 'Stars', value: metrics.stars },
    { label: 'Repositories', value: metrics.repositories },
    { label: 'Followers', value: metrics.followers },
  ];

  const streakCards = [
    { label: 'Current streak', value: streak.current, unit: 'days' },
    { label: 'Longest streak', value: streak.longest, unit: 'days' },
    {
      label: 'Active days',
      value: streak.totalActiveDays,
      unit: `since ${fromYear}`,
    },
  ];

  const slices = buildSlices(languages);

  return (
    <div className="gh-stats">
      <div className="gh-stats-scroller">
        <div className="gh-metrics" role="list">
          {cards.map((card) => (
            <div key={card.label} className="gh-metric" role="listitem">
              <p className="gh-metric-value">{fmt(card.value)}</p>
              <p className="gh-metric-label">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="gh-stats-scroller">
        <div className="gh-streak-row" role="list" aria-label="Contribution streaks">
          {streakCards.map((card) => (
            <div key={card.label} className="gh-metric gh-streak-metric" role="listitem">
              <p className="gh-metric-value">
                {fmt(card.value)}
                <span className="gh-unit"> {card.unit}</span>
              </p>
              <p className="gh-metric-label">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="gh-stats-scroller">
        <div className="gh-block gh-langs-block">
          <h3 className="gh-block-title">Languages</h3>
          <div className="gh-pie-layout">
            <LanguagePie slices={slices} />
            <ul className="gh-pie-legend">
              {slices.map((lang) => (
                <li key={lang.name}>
                  <span
                    className="gh-pie-swatch"
                    style={{ background: lang.color }}
                    aria-hidden="true"
                  />
                  <span className="gh-lang-name">{lang.name}</span>
                  <span className="gh-lang-pct">{fmtPct(lang.percent)}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="gh-footnote">
            Language share by bytes across @{login} public repositories.
          </p>
        </div>
      </div>
    </div>
  );
}
