export type Day = {
  date: string;
  contributionCount: number;
  contributionLevel: string;
};

export type YearBand = {
  year: number;
  totalContributions: number;
  weeks: { contributionDays: Day[] }[];
};

export type ContribData = {
  login: string;
  fromYear: number;
  total: number;
  years: YearBand[];
};

const LEVEL: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const PAD_L = 52;
const PAD_R = 10;
const HEADER_H = 22;
const MONTH_H = 16;
const PAD_B = 28;
const BAND_GAP = 28;
const GRID_H = 7 * STEP;
const BAND_BLOCK = HEADER_H + MONTH_H + GRID_H;

const WEEKDAY_MARKS = [
  { i: 1, t: 'Mon' },
  { i: 3, t: 'Wed' },
  { i: 5, t: 'Fri' },
] as const;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function monthMarksForYear(entry: YearBand) {
  const marks: { x: number; label: string }[] = [];
  const seen = new Set<number>();
  entry.weeks.forEach((week, wi) => {
    for (const day of week.contributionDays) {
      if (!day.date.startsWith(String(entry.year))) continue;
      const month = Number(day.date.slice(5, 7));
      if (seen.has(month)) continue;
      const dom = Number(day.date.slice(8, 10));
      if (dom > 7 && seen.size > 0) continue;
      seen.add(month);
      marks.push({ x: PAD_L + wi * STEP, label: MONTHS[month - 1]! });
      break;
    }
  });
  return marks;
}

export function graphSize(years: YearBand[]) {
  const maxWeeks = Math.max(...years.map((y) => y.weeks.length), 53);
  const width = PAD_L + maxWeeks * STEP + PAD_R;
  const height =
    8 + years.length * BAND_BLOCK + Math.max(0, years.length - 1) * BAND_GAP + PAD_B;
  return { width, height, maxWeeks };
}

/** SVG markup for the given year bands. Newest year first, same as the live graph. */
export function renderContributionSvg(graph: ContribData, years: YearBand[]): string {
  const yearCalendars = years;
  const { width, height, maxWeeks } = graphSize(yearCalendars);
  const newestYear = yearCalendars[0]?.year ?? graph.fromYear;
  const oldestYear =
    yearCalendars[yearCalendars.length - 1]?.year ?? graph.fromYear;
  const currentYear = graph.years[0]?.year ?? newestYear;
  const aria = `GitHub contribution graphs for ${graph.login} by year from ${oldestYear} through ${newestYear}: ${graph.total} total contributions`;

  const bands = yearCalendars
    .map((entry, yi) => {
      const top = 8 + yi * (BAND_BLOCK + BAND_GAP);
      const gridY = top + HEADER_H + MONTH_H;
      const countLabel =
        entry.year === currentYear
          ? `${entry.totalContributions} contributions (and counting)`
          : `${entry.totalContributions} contributions`;
      const months = monthMarksForYear(entry);
      const monthText = months
        .map(
          (m) =>
            `<text class="contrib-month" x="${m.x}" y="${top + HEADER_H + 12}">${escapeXml(m.label)}</text>`
        )
        .join('');
      const weekdays = WEEKDAY_MARKS.map(
        ({ i, t }) =>
          `<text class="contrib-weekday" x="${PAD_L - 8}" y="${gridY + i * STEP + Math.round(CELL * 0.78)}" text-anchor="end">${t}</text>`
      ).join('');
      const days = entry.weeks
        .flatMap((week, wi) =>
          week.contributionDays
            .filter((day) => day.date.startsWith(String(entry.year)))
            .map((day) => {
              const level = LEVEL[day.contributionLevel] ?? 0;
              const d = new Date(`${day.date}T12:00:00Z`);
              const ri = d.getUTCDay();
              const tip = `${day.contributionCount} contribution${
                day.contributionCount === 1 ? '' : 's'
              } on ${day.date}`;
              return `<rect class="contrib-day l${level}" x="${PAD_L + wi * STEP}" y="${gridY + ri * STEP}" width="${CELL}" height="${CELL}" rx="2" aria-label="${escapeXml(tip)}"></rect>`;
            })
        )
        .join('');
      return `<g class="contrib-year"><text class="contrib-year-label" x="${PAD_L}" y="${top + 14}">${entry.year}</text><text class="contrib-year-count" x="${width - PAD_R}" y="${top + 14}" text-anchor="end">${escapeXml(countLabel)}</text>${monthText}<rect class="contrib-band" x="${PAD_L - 2}" y="${gridY - 2}" width="${maxWeeks * STEP + 4}" height="${GRID_H + 4}" rx="4"></rect>${weekdays}${days}</g>`;
    })
    .join('');

  return `<svg class="github-graph contrib-graph" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(aria)}">${bands}<text class="contrib-caption" x="${PAD_L}" y="${height - 10}">${graph.total} contributions total / ${oldestYear}-present / @${escapeXml(graph.login)}</text></svg>`;
}

export function currentYearBand(graph: ContribData): YearBand[] {
  return graph.years[0] ? [graph.years[0]] : [];
}
