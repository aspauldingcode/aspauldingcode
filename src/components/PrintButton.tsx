/** Download the prebuilt Letter PDF (no browser print chrome). */
export default function PrintButton({
  label = 'Download PDF',
  href = '/resume.pdf',
}: {
  label?: string;
  href?: string;
}) {
  return (
    <a className="ctrl-link resume-print" href={href} download="Alex-Spaulding-Resume.pdf">
      {label}
    </a>
  );
}
