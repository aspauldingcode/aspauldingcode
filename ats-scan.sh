# ats-scanner — structured ATS compliance scanner
# Pipeline: Extract → Contact → Sections → Dates → Quality → Skills → Format → Match
#
# Usage: ats-scanner <resume.pdf> [job-description.txt]
#
# Scoring weights (100 base, +25 bonus with job description):
#   Parsability ......... 10    Can ATS extract text at all?
#   Contact info ........ 15    Name, email, phone, LinkedIn, GitHub, location
#   Section structure ... 20    Required sections exist with real content
#   Date recognition .... 10    Timeline parseable by ATS date extractors
#   Experience quality .. 15    Quantified achievements, action verbs, density
#   Skills coverage ..... 15    Recognized technical skills breadth
#   Formatting quality .. 15    Encoding cleanliness, no duplication noise
#   Job match (bonus) ... 25    Keyword overlap with provided job description

PDF_FILE="${1:-}"
JOB_DESC_FILE="${2:-}"

if [[ -z "$PDF_FILE" ]]; then
  echo "Usage: ats-scanner <resume.pdf> [job-description.txt]"
  echo ""
  echo "  Scans a PDF resume for ATS compliance issues."
  echo "  Optionally compares against a job description for keyword matching."
  exit 1
fi

if [[ ! -f "$PDF_FILE" ]]; then
  echo "Error: file not found: $PDF_FILE"
  exit 1
fi

# --- output helpers ---
if [[ -t 1 ]]; then
  _G='\033[0;32m' _Y='\033[1;33m' _R='\033[0;31m'
  _B='\033[1m' _D='\033[2m' _N='\033[0m'
else
  _G='' _Y='' _R='' _B='' _D='' _N=''
fi

SCORE=0
TOTAL=100
PASS_LOG=$(mktemp); WARN_LOG=$(mktemp); FAIL_LOG=$(mktemp)
trap 'rm -f "$PASS_LOG" "$WARN_LOG" "$FAIL_LOG"' EXIT

pass() { echo "$1" >> "$PASS_LOG"; }
warn() { echo "$1" >> "$WARN_LOG"; }
fail() { echo "$1" >> "$FAIL_LOG"; }

# grep returns exit 1 on zero matches, which kills the script under
# writeShellApplication's set -euo pipefail.  This wrapper is safe for
# pipelines where zero matches is a valid (non-error) outcome.
_grep() { command grep "$@" || true; }

# ================================================================
# EXTRACT
# ================================================================

PDF_TEXT=$(pdftotext "$PDF_FILE" - 2>/dev/null) || true

echo ""
echo -e "${_B}ATS COMPLIANCE SCAN${_N}  ${_D}$PDF_FILE${_N}"
echo -e "${_D}$(printf '─%.0s' {1..56})${_N}"

# ================================================================
# PHASE 1 — PARSABILITY (10 pts)
# ================================================================

if [[ -z "$PDF_TEXT" ]]; then
  fail "Text extraction failed — ATS cannot read this PDF"
else
  WORD_COUNT=$(echo "$PDF_TEXT" | wc -w | tr -d ' ')
  CHAR_COUNT=${#PDF_TEXT}

  if [[ "$WORD_COUNT" -lt 50 ]]; then
    fail "Only $WORD_COUNT words extracted — PDF may be image-based"
  elif [[ "$WORD_COUNT" -lt 200 ]]; then
    SCORE=$((SCORE + 5))
    warn "Sparse content: $WORD_COUNT words ($CHAR_COUNT chars)"
    pass "Text extractable ($WORD_COUNT words)"
  else
    SCORE=$((SCORE + 10))
    pass "Text extraction clean ($WORD_COUNT words, $CHAR_COUNT chars)"
  fi
fi

# ================================================================
# PHASE 2 — CONTACT INFO (15 pts)
# ================================================================

EMAIL_RE='[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
PHONE_RE='\(?[0-9]{3}\)?[-. ]?[0-9]{3}[-. ]?[0-9]{4}'

# Email (3 pts)
EMAIL_HITS=$(echo "$PDF_TEXT" | _grep -oEi "$EMAIL_RE" | wc -l | tr -d ' ')
if [[ "$EMAIL_HITS" -gt 0 ]]; then
  SCORE=$((SCORE + 3))
  EMAIL_VAL=$(echo "$PDF_TEXT" | _grep -oEi "$EMAIL_RE" | head -1)
  pass "Email: $EMAIL_VAL"
  UNIQUE_EMAILS=$(echo "$PDF_TEXT" | _grep -oEi "$EMAIL_RE" | sort -u | wc -l | tr -d ' ')
  if [[ "$EMAIL_HITS" -gt "$UNIQUE_EMAILS" ]]; then
    warn "Email appears ${EMAIL_HITS}x (hyperref may duplicate contact info in PDF text layer)"
  fi
else
  fail "No email address detected"
fi

# Phone (3 pts)
PHONE_HITS=$(echo "$PDF_TEXT" | _grep -oE "$PHONE_RE" | wc -l | tr -d ' ')
if [[ "$PHONE_HITS" -gt 0 ]]; then
  SCORE=$((SCORE + 3))
  PHONE_VAL=$(echo "$PDF_TEXT" | _grep -oE "$PHONE_RE" | head -1)
  pass "Phone: $PHONE_VAL"
  if [[ "$PHONE_HITS" -gt 2 ]]; then
    warn "Phone appears ${PHONE_HITS}x — tel: link may duplicate in text layer"
  fi
else
  fail "No phone number detected"
fi

# LinkedIn (3 pts)
if echo "$PDF_TEXT" | grep -qi 'linkedin'; then
  SCORE=$((SCORE + 3)); pass "LinkedIn presence detected"
else
  SCORE=$((SCORE + 1)); warn "No LinkedIn URL — most ATS systems expect this"
fi

# GitHub / Portfolio (3 pts)
HAS_GH=0; HAS_WEB=0
echo "$PDF_TEXT" | grep -qi 'github' && HAS_GH=1 || true
echo "$PDF_TEXT" | grep -qEi 'portfolio|\.com|\.io' && HAS_WEB=1 || true
if [[ $((HAS_GH + HAS_WEB)) -ge 2 ]]; then
  SCORE=$((SCORE + 3)); pass "GitHub + web presence detected"
elif [[ $((HAS_GH + HAS_WEB)) -ge 1 ]]; then
  SCORE=$((SCORE + 2)); pass "GitHub or web presence detected"
else
  SCORE=$((SCORE + 1)); warn "No GitHub or portfolio links found"
fi

# Location (3 pts)
STATE_RE='[A-Z][a-z]+,? +(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)'
if echo "$PDF_TEXT" | grep -qEi "$STATE_RE"; then
  SCORE=$((SCORE + 3)); pass "Location (City, ST) detected"
else
  SCORE=$((SCORE + 1)); warn "No clear City, ST location pattern — some ATS require this"
fi

# Contact placement — ATS parsers skip PDF headers/footers; contact info
# must be in the body text.  Verify it appears in the first ~5 lines.
FIRST_5=$(echo "$PDF_TEXT" | head -5)
if echo "$FIRST_5" | grep -qEi "$EMAIL_RE|$PHONE_RE"; then
  pass "Contact info in document body (not trapped in PDF header/footer)"
else
  warn "Contact info not found in first 5 lines — may be in PDF header/footer (some ATS skip these)"
fi

# ================================================================
# PHASE 3 — SECTION STRUCTURE (20 pts)
# ================================================================

check_section() {
  local name="$1"
  local pts="$2"
  local end_pattern="$3"

  if echo "$PDF_TEXT" | grep -qi "$name"; then
    local content
    content=$(echo "$PDF_TEXT" | gawk -v start="$name" -v endp="$end_pattern" \
      'BEGIN { IGNORECASE=1; found=0 }
       $0 ~ start { found=1; next }
       found && $0 ~ endp { exit }
       found { print }')
    local wc
    wc=$(echo "$content" | wc -w | tr -d ' ')

    if [[ "$wc" -gt 10 ]]; then
      SCORE=$((SCORE + pts))
      pass "$name ($wc words)"
    elif [[ "$wc" -gt 0 ]]; then
      SCORE=$((SCORE + pts / 2))
      warn "$name section sparse ($wc words)"
    else
      SCORE=$((SCORE + pts / 2))
      warn "$name header present but content extraction unclear"
    fi
  else
    fail "No $name section"
  fi
}

check_section "Education"        5 "Technical Skills|Skills|Experience|Projects"
check_section "Experience"       5 "Leadership|Awards|Education|Projects|Skills"
check_section "Technical Skills" 5 "Projects|Experience|Education|Leadership"
check_section "Projects"         5 "Experience|Leadership|Awards|Education"

# ================================================================
# PHASE 4 — DATE RECOGNITION (10 pts)
# ================================================================

# NOTE: bracket expressions like [-–—] match byte-by-byte in GNU grep,
# breaking on multi-byte UTF-8 chars (en dash = 3 bytes).
# Use alternation (-|–|—) so each character matches as a whole unit.
DASH='(-|–|—)'
RANGE_FULL="(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* [0-9]{4} *${DASH} *(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* [0-9]{4}"
RANGE_PRES="(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* [0-9]{4} *${DASH} *[Pp]resent"
RANGE_YEAR="[0-9]{4} *${DASH} *([0-9]{4}|[Pp]resent)"

RANGE_COUNT=$(echo "$PDF_TEXT" | _grep -oEi "$RANGE_FULL|$RANGE_PRES|$RANGE_YEAR" | sort -u | wc -l | tr -d ' ')

if [[ "$RANGE_COUNT" -gt 3 ]]; then
  SCORE=$((SCORE + 7)); pass "Date ranges parseable ($RANGE_COUNT found)"
elif [[ "$RANGE_COUNT" -gt 0 ]]; then
  SCORE=$((SCORE + 4)); warn "Few date ranges ($RANGE_COUNT) — ATS may miss some timeline entries"
else
  YEAR_COUNT=$(echo "$PDF_TEXT" | _grep -oE '[0-9]{4}' | wc -l | tr -d ' ')
  if [[ "$YEAR_COUNT" -gt 2 ]]; then
    SCORE=$((SCORE + 2)); warn "Years found ($YEAR_COUNT) but no date ranges — timeline parsing unreliable"
  else
    fail "No parseable dates — ATS cannot build employment timeline"
  fi
fi

if echo "$PDF_TEXT" | grep -qi 'present\|current'; then
  SCORE=$((SCORE + 3)); pass "Active role indicator (Present/Current) found"
else
  warn "No 'Present'/'Current' indicator for active roles"
fi

# ================================================================
# PHASE 5 — EXPERIENCE QUALITY (15 pts)
# ================================================================

# Quantified achievements (5 pts)
METRICS=$(echo "$PDF_TEXT" | _grep -oE '[0-9,]+\+?' | wc -l | tr -d ' ')
if [[ "$METRICS" -gt 8 ]]; then
  SCORE=$((SCORE + 5)); pass "Strong quantified achievements ($METRICS numeric metrics)"
elif [[ "$METRICS" -gt 4 ]]; then
  SCORE=$((SCORE + 3)); pass "Quantified achievements present ($METRICS metrics)"
elif [[ "$METRICS" -gt 0 ]]; then
  SCORE=$((SCORE + 1)); warn "Few quantified achievements ($METRICS) — add numbers to strengthen impact"
else
  fail "No quantified achievements — ATS keyword filters favor measurable results"
fi

# Action verbs (5 pts)
VERB_PAT='Built|Designed|Engineered|Developed|Implemented|Architected|Optimized|Launched|Led|Resolved|Managed|Diagnosed|Created|Deployed|Automated|Integrated|Performed|Contributed|Maintained|Improved|Reduced|Increased|Delivered'
VERB_COUNT=$(echo "$PDF_TEXT" | _grep -oEiw "$VERB_PAT" | wc -l | tr -d ' ')
if [[ "$VERB_COUNT" -gt 8 ]]; then
  SCORE=$((SCORE + 5)); pass "Excellent action verb usage ($VERB_COUNT found)"
elif [[ "$VERB_COUNT" -gt 4 ]]; then
  SCORE=$((SCORE + 3)); pass "Action verbs present ($VERB_COUNT found)"
elif [[ "$VERB_COUNT" -gt 0 ]]; then
  SCORE=$((SCORE + 1)); warn "Few action verbs ($VERB_COUNT) — lead bullets with strong verbs"
else
  fail "No action verbs detected"
fi

# Content density (5 pts)
LINE_COUNT=$(echo "$PDF_TEXT" | _grep -c '.')
if [[ "$LINE_COUNT" -gt 40 ]]; then
  SCORE=$((SCORE + 5)); pass "Good content density ($LINE_COUNT text lines)"
elif [[ "$LINE_COUNT" -gt 20 ]]; then
  SCORE=$((SCORE + 3)); pass "Moderate content density ($LINE_COUNT lines)"
elif [[ "$LINE_COUNT" -gt 0 ]]; then
  SCORE=$((SCORE + 1)); warn "Low content density ($LINE_COUNT lines)"
else
  fail "No content lines detected"
fi

# ================================================================
# PHASE 6 — SKILLS COVERAGE (15 pts)
# ================================================================

SKILL_PAT='Python|Java\b|JavaScript|TypeScript|C\+\+|\bRust\b|Swift|\bGo\b|\bSQL\b|Bash|\bC\b|Nix|Ruby|Kotlin|Scala|PHP'
TOOL_PAT='Docker|Kubernetes|AWS|GCP|Azure|Git\b|Linux|React|Node\.?js|Next\.?js|PostgreSQL|MongoDB|Redis|Terraform|Jenkins|Nginx|Vercel'
CONCEPT_PAT='\bREST\b|\bAPI\b|Microservices|Agile|Machine Learning|DevOps|CI.?CD|\bIPC\b|Reverse Engineering|\bAI\b|\bML\b'

LANG_HITS=$(echo "$PDF_TEXT" | _grep -oEi "$SKILL_PAT" | sort -uf | wc -l | tr -d ' ')
TOOL_HITS=$(echo "$PDF_TEXT" | _grep -oEi "$TOOL_PAT" | sort -uf | wc -l | tr -d ' ')
CONCEPT_HITS=$(echo "$PDF_TEXT" | _grep -oEi "$CONCEPT_PAT" | sort -uf | wc -l | tr -d ' ')
SKILL_TOTAL=$((LANG_HITS + TOOL_HITS + CONCEPT_HITS))

if [[ "$SKILL_TOTAL" -gt 15 ]]; then
  SCORE=$((SCORE + 15)); pass "Excellent skill coverage ($LANG_HITS langs, $TOOL_HITS tools, $CONCEPT_HITS concepts)"
elif [[ "$SKILL_TOTAL" -gt 10 ]]; then
  SCORE=$((SCORE + 12)); pass "Good skill coverage ($LANG_HITS langs, $TOOL_HITS tools, $CONCEPT_HITS concepts)"
elif [[ "$SKILL_TOTAL" -gt 5 ]]; then
  SCORE=$((SCORE + 8)); warn "Moderate skill coverage ($SKILL_TOTAL skills)"
else
  SCORE=$((SCORE + 3)); warn "Low skill coverage ($SKILL_TOTAL skills)"
fi

# ================================================================
# PHASE 7 — FORMATTING QUALITY (15 pts, deductive)
# ================================================================

FMT=15

# --- 7a. Non-ASCII noise ---
# En dashes (–), em dashes (—), bullets (•), and smart quotes are standard
# in professionally typeset resumes.  All modern ATS handle them.
# Strip those before counting to avoid false positives.
# NOTE: tr -d with multi-byte chars strips individual BYTES, corrupting
# other sequences that share those bytes.  sed handles whole characters.
CLEAN_TEXT=$(echo "$PDF_TEXT" | sed 's/–//g;s/—//g;s/•//g;s/·//g;s/'\''//g;s/'\''//g;s/"//g;s/"//g')
NON_ASCII=$(echo "$CLEAN_TEXT" | tr -d '[:print:][:space:]' | wc -c | tr -d ' ')
if [[ "$NON_ASCII" -gt 20 ]]; then
  FMT=$((FMT - 5))
  warn "Non-ASCII noise ($NON_ASCII bytes after excluding standard punctuation) — icon fonts or encoding issues"
elif [[ "$NON_ASCII" -gt 5 ]]; then
  FMT=$((FMT - 2))
  warn "Minor non-ASCII noise ($NON_ASCII bytes) — check for icon font remnants"
elif [[ "$NON_ASCII" -gt 0 ]]; then
  warn "Trace non-ASCII ($NON_ASCII bytes) — likely harmless"
fi

# --- 7b. Icon / symbol font detection ---
# FontAwesome, Wingdings, etc. produce glyphs that ATS extracts as garbage
# or skips entirely, destroying adjacent keyword context.
# NOTE: grep bracket expressions match byte-by-byte with UTF-8, causing false
# positives.  Use alternation (literal strings) so each multi-byte char is
# matched as a whole unit.
ICON_PAT='⋆\|★\|⚡\|☎\|✓\|✗\|☐\|☑\|♦\|◆\|▶\|►\|✉\|⌘\|⊕\|⊗'
ICON_CHARS=$(echo "$PDF_TEXT" | _grep -o "$ICON_PAT" | wc -l | tr -d ' ')
if [[ "$ICON_CHARS" -gt 0 ]]; then
  FMT=$((FMT - 3))
  warn "Icon/symbol font characters ($ICON_CHARS found) — ATS extracts these as noise or drops them"
fi

# --- 7c. Ligature extraction (fi/fl) ---
# A common PDF failure: ligatures like "fi" and "fl" extract as blank,
# missing char, or wrong char, breaking keywords ("profile" → "pro le").
GARBLED=$(echo "$PDF_TEXT" | _grep -oEi 'pro le|of ce|ef ci|certi c|con gu|noti c|veri c|identi c' | wc -l | tr -d ' ')
if [[ "$GARBLED" -gt 0 ]]; then
  FMT=$((FMT - 5))
  fail "Ligature extraction broken — fi/fl words garbled ($GARBLED found), keywords won't match"
else
  FI_WORDS=$(echo "$PDF_TEXT" | _grep -oEiw 'profiling|verification|configuration|notification|certification|profile|conflict|file|filter|first|find|final|field' | wc -l | tr -d ' ')
  if [[ "$FI_WORDS" -gt 0 ]]; then
    pass "Ligature extraction intact ($FI_WORDS fi/fl words verified)"
  fi
fi

# --- 7d. Duplicate contact tokens ---
# hyperref renders both the href target and the display text into the PDF
# text layer, causing ATS to see duplicate emails/phones.
EMAIL_DUPES=$(echo "$PDF_TEXT" | _grep -oEi "$EMAIL_RE" | sort | uniq -c | sort -rn | head -1 | awk '{print $1}')
if [[ "${EMAIL_DUPES:-0}" -gt 2 ]]; then
  FMT=$((FMT - 3))
  warn "Email duplicated ${EMAIL_DUPES}x in text layer — hyperref link rendering issue"
fi

PHONE_DUPES=$(echo "$PDF_TEXT" | _grep -oE "$PHONE_RE" | sort | uniq -c | sort -rn | head -1 | awk '{print $1}')
if [[ "${PHONE_DUPES:-0}" -gt 2 ]]; then
  FMT=$((FMT - 3))
  warn "Phone duplicated ${PHONE_DUPES}x in text layer — tel: link rendering issue"
fi

# --- 7e. Column merge detection ---
# Multi-column resumes cause pdftotext to interleave text from different
# columns.  Very long lines are the telltale sign.
MAX_LINE=$(echo "$PDF_TEXT" | awk '{ if (length > max) max = length } END { print max+0 }')
if [[ "$MAX_LINE" -gt 200 ]]; then
  FMT=$((FMT - 3))
  warn "Max line length ${MAX_LINE} chars — possible column merge (single-column is safest)"
fi

# --- 7f. Page count ---
PAGE_EST=$(_grep -c $'\f' <<< "$PDF_TEXT")
PAGE_EST=$((PAGE_EST + 1))
if [[ "$PAGE_EST" -gt 2 ]]; then
  FMT=$((FMT - 2))
  warn "Estimated ${PAGE_EST} pages — most ATS-processed roles expect 1–2 pages"
fi

if [[ "$FMT" -lt 0 ]]; then FMT=0; fi
SCORE=$((SCORE + FMT))
pass "Formatting quality: $FMT/15"

# ================================================================
# PHASE 8 — JOB DESCRIPTION MATCH (bonus +25)
# ================================================================

if [[ -n "$JOB_DESC_FILE" ]] && [[ -f "$JOB_DESC_FILE" ]]; then
  TOTAL=$((TOTAL + 25))
  JOB_DESC=$(cat "$JOB_DESC_FILE")

  RESUME_TOKENS=$(echo "$PDF_TEXT" | tr '[:upper:]' '[:lower:]' | tr -cs '[:alnum:]' '\n' | sort -u)
  JOB_TOKENS=$(echo "$JOB_DESC" | tr '[:upper:]' '[:lower:]' | tr -cs '[:alnum:]' '\n' | sort -u)

  JOB_MATCH=0
  JOB_TOTAL_WORDS=0
  MISSING_KW=""

  while IFS= read -r word; do
    if [[ ${#word} -le 3 ]]; then continue; fi
    JOB_TOTAL_WORDS=$((JOB_TOTAL_WORDS + 1))
    if echo "$RESUME_TOKENS" | grep -qxF "$word"; then
      JOB_MATCH=$((JOB_MATCH + 1))
    else
      MISSING_KW="$MISSING_KW $word"
    fi
  done <<< "$JOB_TOKENS"

  if [[ "$JOB_TOTAL_WORDS" -gt 0 ]]; then
    JOB_PCT=$((100 * JOB_MATCH / JOB_TOTAL_WORDS))
    JOB_SCORE=$((JOB_PCT * 25 / 100))
    SCORE=$((SCORE + JOB_SCORE))

    if [[ "$JOB_PCT" -ge 70 ]]; then
      pass "Job keyword match: ${JOB_PCT}% ($JOB_MATCH/$JOB_TOTAL_WORDS)"
    elif [[ "$JOB_PCT" -ge 40 ]]; then
      warn "Job keyword match: ${JOB_PCT}% ($JOB_MATCH/$JOB_TOTAL_WORDS) — consider tailoring resume"
    else
      fail "Job keyword match: ${JOB_PCT}% ($JOB_MATCH/$JOB_TOTAL_WORDS) — significant keyword gap"
    fi

    TOP_MISSING=$(echo "$MISSING_KW" | tr ' ' '\n' | _grep -v '^$' | head -15 | tr '\n' ' ')
    if [[ -n "$TOP_MISSING" ]]; then
      warn "Missing job keywords: $TOP_MISSING"
    fi
  fi

elif [[ -n "$JOB_DESC_FILE" ]]; then
  warn "Job description file not found: $JOB_DESC_FILE (skipping match phase)"
fi

# ================================================================
# REPORT
# ================================================================

echo ""

if [[ -s "$PASS_LOG" ]]; then
  echo -e "${_B}Passes:${_N}"
  while IFS= read -r line; do
    echo -e "  ${_G}✓${_N} $line"
  done < "$PASS_LOG"
  echo ""
fi

if [[ -s "$WARN_LOG" ]]; then
  echo -e "${_B}Warnings:${_N}"
  while IFS= read -r line; do
    echo -e "  ${_Y}⚠${_N}  $line"
  done < "$WARN_LOG"
  echo ""
fi

if [[ -s "$FAIL_LOG" ]]; then
  echo -e "${_B}Failures:${_N}"
  while IFS= read -r line; do
    echo -e "  ${_R}✗${_N} $line"
  done < "$FAIL_LOG"
  echo ""
fi

# Grade
if   [[ "$SCORE" -ge 90 ]]; then GRADE="A"
elif [[ "$SCORE" -ge 80 ]]; then GRADE="B"
elif [[ "$SCORE" -ge 70 ]]; then GRADE="C"
elif [[ "$SCORE" -ge 60 ]]; then GRADE="D"
else                              GRADE="F"
fi

echo -e "${_D}$(printf '─%.0s' {1..56})${_N}"
echo -e "${_B}SCORE: $SCORE / $TOTAL  ($GRADE)${_N}"
echo -e "${_D}$(printf '─%.0s' {1..56})${_N}"
echo ""
