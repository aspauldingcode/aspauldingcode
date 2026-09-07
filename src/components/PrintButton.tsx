import resumePdf from '@/lib/resumePdf.json';


export const RESUME_PDF_VERSION = resumePdf.version;
export const RESUME_PDF_HREF = resumePdf.href;
export const RESUME_PDF_FILENAME = resumePdf.filename;

/** Download the prebuilt Letter PDF. Not a webview. */
export default function PrintButton({
  label = 'Resume',
  href = RESUME_PDF_HREF,
  className = 'ctrl-link resume-print',
}: {
  label?: string;
  href?: string;
  className?: string;
}) {
  return (
    <a className={className} href={href} download={RESUME_PDF_FILENAME}>
      {label}
    </a>
  );
}
