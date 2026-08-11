/**
 * Transifex Batch Translation Helper (TypeScript)
 *
 * Inject this script via page.evaluate() in a Playwright browser session
 * that is logged into Transifex. It provides reusable functions for:
 *   - Listing untranslated resources
 *   - Fetching untranslated source strings for a resource
 *   - Saving translations in bulk
 *
 * Usage pattern:
 *   1. Navigate to the project translate page first.
 *   2. Call window.tx.listUntranslated() to get resources.
 *   3. Call window.tx.fetchStrings(slugs) to get source strings.
 *   4. Build translations array, call window.tx.saveBatch(translations).
 */

/** A resource with untranslated strings. */
interface UntranslatedResource {
  slug: string;
  untranslated: number;
}

/** A source string fetched from Transifex. */
interface SourceString {
  id: number;
  source: string;
  resource: string;
}

/** A translation to save: { id, t } pair. */
interface Translation {
  id: number;
  t: string;
}

/** Result of a batch save operation. */
interface SaveResult {
  saved: number;
  ok: boolean;
  errors: number;
}

/** The Transifex API response for project language stats. */
interface ResourceStats {
  resource__slug: string;
  resource__last_update: string;
  translated: number;
  untranslated: number;
  review_steps: Record<string, number>;
}

/** The Transifex API response for string segment details. */
interface StringSegment {
  id: number;
  source: string;
  translation: string;
  supports_raw_mode: boolean;
  resource_slug: string;
  errors: unknown[];
  warnings: unknown[];
  tags: unknown[];
  wordcount: number;
  completed_review_steps: number;
  i18n_type: string;
  tqi: number | null;
  tqi_uuid: string | null;
  exclusivity_status: Record<string, unknown>;
  description: string;
}

/** The save translation request body. */
interface SaveRequestBody {
  translations: { "5": { string: string } };
  raw_mode_enabled: boolean;
  previous_translations: { "5": { tr_hash: string } };
  suggestions: unknown[];
}

/** The Transifex helper API exposed on `window.tx`. */
interface TransifexAPI {
  getCSRF: () => string;
  listUntranslated: (
    org: string,
    project: string,
    lang: string,
  ) => Promise<UntranslatedResource[]>;
  fetchStrings: (
    org: string,
    project: string,
    lang: string,
    resourceSlugs: string[],
  ) => Promise<SourceString[]>;
  saveBatch: (
    org: string,
    project: string,
    lang: string,
    translations: Translation[],
  ) => Promise<SaveResult>;
}

declare global {
  interface Window {
    tx: TransifexAPI;
  }
}

/** MD5 hash of empty string — used for untranslated strings. */
const EMPTY_TR_HASH = "d41d8cd98f00b204e9800998ecf8427e";

/**
 * Get CSRF token from cookies.
 * @throws {Error} if not logged in or not on a Transifex page
 */
function getCSRF(): string {
  const m = document.cookie.match(/csrftoken=([^;]+)/);
  if (!m) {
    throw new Error(
      "No csrftoken cookie — not logged in or not on Transifex page",
    );
  }
  return m[1];
}

/** Common headers for AJAX requests. */
function ajaxHeaders(csrf: string, json = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };
  if (csrf) headers["X-CSRFToken"] = csrf;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

/**
 * Fetch the list of resources with untranslated strings.
 * @param org - Organization slug (e.g. "tkoyama010")
 * @param project - Project slug (e.g. "geovista-doc")
 * @param lang - Target language code (e.g. "ja")
 * @returns Resources sorted by untranslated count (smallest first)
 */
async function listUntranslated(
  org: string,
  project: string,
  lang: string,
): Promise<UntranslatedResource[]> {
  const resp = await fetch(
    `/_/editor/ajax/${org}/${project}/project_lang_stats/${lang}/`,
    { headers: ajaxHeaders("") },
  );
  if (!resp.ok) {
    throw new Error(`project_lang_stats failed: ${resp.status}`);
  }
  const data: ResourceStats[] = await resp.json();
  return data
    .filter((r) => r.untranslated > 0)
    .map((r) => ({
      slug: r.resource__slug,
      untranslated: r.untranslated,
    }))
    .sort((a, b) => a.untranslated - b.untranslated);
}

/**
 * Fetch untranslated source strings for one or more resources.
 * @param org - Organization slug
 * @param project - Project slug
 * @param lang - Target language code
 * @param resourceSlugs - Resource slugs to fetch strings from
 * @returns Array of { id, source, resource } for each untranslated string
 */
async function fetchStrings(
  org: string,
  project: string,
  lang: string,
  resourceSlugs: string[],
): Promise<SourceString[]> {
  const csrf = getCSRF();
  const all: SourceString[] = [];

  for (const slug of resourceSlugs) {
    try {
      const idsResp = await fetch(
        `/_/editor/ajax/${org}/${project}/string/${slug}/${lang}/ids/`,
        {
          method: "POST",
          headers: ajaxHeaders(csrf, true),
          body: JSON.stringify({
            escape: false,
            translated: "no",
            s: "default:asc",
          }),
        },
      );
      if (!idsResp.ok) continue;
      const ids: number[] = await idsResp.json();
      if (ids.length === 0) continue;

      const segResp = await fetch(
        `/_/editor/ajax/${org}/${project}/string/${slug}/${lang}/segment/`,
        {
          method: "POST",
          headers: ajaxHeaders(csrf, true),
          body: JSON.stringify({
            ids,
            escape: "no",
            query: "translated=no&s=default:asc",
          }),
        },
      );
      if (!segResp.ok) continue;
      const strings: StringSegment[] = await segResp.json();
      for (const s of strings) {
        all.push({ id: s.id, source: s.source, resource: slug });
      }
    } catch {
      // skip resource on error
    }
  }
  return all;
}

/**
 * Save a batch of translations.
 * @param org - Organization slug
 * @param project - Project slug
 * @param lang - Target language code
 * @param translations - Array of { id, t } pairs
 * @returns Summary: { saved, ok, errors }
 */
async function saveBatch(
  org: string,
  project: string,
  lang: string,
  translations: Translation[],
): Promise<SaveResult> {
  const csrf = getCSRF();
  const results: number[] = [];

  for (const { id, t } of translations) {
    const body: SaveRequestBody = {
      translations: { "5": { string: t } },
      raw_mode_enabled: false,
      previous_translations: { "5": { tr_hash: EMPTY_TR_HASH } },
      suggestions: [],
    };
    try {
      const resp = await fetch(
        `/_/editor/ajax/${org}/${project}/string_detail/${lang}/${id}/`,
        {
          method: "POST",
          headers: ajaxHeaders(csrf, true),
          body: "data=" + encodeURIComponent(JSON.stringify(body)),
        },
      );
      results.push(resp.status);
    } catch {
      results.push(0);
    }
  }

  return {
    saved: results.length,
    ok: results.every((s) => s === 200),
    errors: results.filter((s) => s !== 200).length,
  };
}

// Export to window for use in page.evaluate()
if (typeof window !== "undefined") {
  window.tx = {
    getCSRF,
    listUntranslated,
    fetchStrings,
    saveBatch,
  };
}

export { getCSRF, listUntranslated, fetchStrings, saveBatch };
export type {
  UntranslatedResource,
  SourceString,
  Translation,
  SaveResult,
  TransifexAPI,
};
