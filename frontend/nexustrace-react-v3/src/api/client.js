import { adaptGraphResponse } from './adapters';

// ----------------------------------------------------
// Local-vs-deployed startup banner. window.location.host is the actual
// origin the browser loaded this page from -- it can't drift out of sync
// with reality the way a separate config value could, which is exactly
// the kind of mismatch (a local test silently talking to a remote
// backend) this is here to make impossible to miss.
// ----------------------------------------------------
(function logConnectionTarget() {
  const host = window.location.host;
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const label = isLocal ? 'LOCAL' : '!!! NON-LOCAL / DEPLOYED !!!';
  console.log(
    `%c[STARTUP] Frontend origin: ${host}  (${label})  -- API/WS calls go to same-origin /api/*`,
    `background:${isLocal ? '#0a6b3a' : '#b00020'}; color:#fff; font-weight:bold; padding:2px 6px;`
  );
})();

// FastAPI validation errors (HTTP 422) return `detail` as an ARRAY of
// {loc, msg, type} objects, not a string -- every other error path here
// (400/403/etc) returns a plain string `detail`. Interpolating the array
// directly into a template string (the old behavior) calls .toString() on
// each object, producing the unreadable "Failed to save case:
// [object Object],[object Object]" that showed up in testing. This handles
// both shapes.
function formatErrorDetail(detail) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : 'field';
        return `${field}: ${d?.msg || 'invalid value'}`;
      })
      .join('; ');
  }
  try {
    return JSON.stringify(detail);
  } catch (_) {
    return String(detail);
  }
}

export const CASE_TO_DOMAIN_MAP = {
  'case-all': null, // All domains unified master graph
  'case-1': '01_narcotics_trafficking',
  'case-2': '02_human_trafficking',
  'case-3': '03_cyber_financial_fraud',
  'case-4': '04_arms_smuggling',
  'case-5': '05_organized_extortion',
  'case-6': '06_kidnapping_for_ransom',
  'case-7': '07_counterfeit_currency',
  'case-8': '08_illegal_betting_hawala',
  'case-9': '09_vehicle_theft_ring',
  'case-10': '10_land_grabbing_fraud',
  'case-11': '11_crimes_against_women',
  '01_narcotics_trafficking': '01_narcotics_trafficking',
  '02_human_trafficking': '02_human_trafficking',
  '03_cyber_financial_fraud': '03_cyber_financial_fraud',
  '04_arms_smuggling': '04_arms_smuggling',
  '05_organized_extortion': '05_organized_extortion',
  '06_kidnapping_for_ransom': '06_kidnapping_for_ransom',
  '07_counterfeit_currency': '07_counterfeit_currency',
  '08_illegal_betting_hawala': '08_illegal_betting_hawala',
  '09_vehicle_theft_ring': '09_vehicle_theft_ring',
  '10_land_grabbing_fraud': '10_land_grabbing_fraud',
  '11_crimes_against_women': '11_crimes_against_women',
};

export const DOMAIN_TITLES = {
  'case-all': 'All Domains (Master View)',
  'case-1': '01: Narcotics Trafficking',
  'case-2': '02: Human Trafficking',
  'case-3': '03: Cyber Financial Fraud',
  'case-4': '04: Arms Smuggling',
  'case-5': '05: Organized Extortion',
  'case-6': '06: Kidnapping for Ransom',
  'case-7': '07: Counterfeit Currency',
  'case-8': '08: Illegal Betting & Hawala',
  'case-9': '09: Vehicle Theft Ring',
  'case-10': '10: Land Grabbing & Fraud',
  'case-11': '11: Crimes Against Women',
};

// ----------------------------------------------------
// Authentication & RBAC Helper
// ----------------------------------------------------
export function getAuthToken() {
  return localStorage.getItem('nexustrace_jwt_token') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('nexustrace_jwt_token', token);
  } else {
    localStorage.removeItem('nexustrace_jwt_token');
  }
}

export function getAuthHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function loginUser(username, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'Authentication failed. Check credentials.');
  }
  const data = await response.json();
  setAuthToken(data.access_token);
  return data;
}

export async function logoutUser() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch (err) {
    console.warn('[Logout Notice]', err);
  } finally {
    setAuthToken(null);
  }
}

export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) {
    return null;
  }
  const headers = getAuthHeaders();
  const response = await fetch('/api/auth/me', { headers });
  if (!response.ok) {
    setAuthToken(null);
    return null;
  }
  return await response.json();
}

// ----------------------------------------------------
// Case Registry API -- the case list is a real backend table now,
// not client-only state (see backend/routers/cases.py).
// ----------------------------------------------------
export async function fetchCases() {
  const response = await fetch('/api/cases', { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch cases: ${response.statusText}`);
  }
  return await response.json();
}

export async function createCaseRecord(caseObj) {
  const response = await fetch('/api/cases', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(caseObj)
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errBody = await response.json();
      if (errBody?.detail) detail = formatErrorDetail(errBody.detail);
    } catch (_) { /* not JSON */ }
    throw new Error(`Failed to save case: ${detail}`);
  }
  return await response.json();
}

export async function archiveCaseRecord(id, archived) {
  const response = await fetch(`/api/cases/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ archived })
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errBody = await response.json();
      if (errBody?.detail) detail = formatErrorDetail(errBody.detail);
    } catch (_) { /* not JSON */ }
    throw new Error(`Failed to update case: ${detail}`);
  }
  return await response.json();
}

// Changes a case's status tag (e.g. Active / Under Review / Closed), as
// distinct from archiving -- archiving hides a case from the default view
// but keeps its tag; this changes the tag itself while the case stays
// visible, for "we found new leads, re-open this" or "trial concluded,
// mark closed" without burying the case in the archive.
export async function updateCaseStatus(id, tag) {
  const response = await fetch(`/api/cases/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ tag })
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errBody = await response.json();
      if (errBody?.detail) detail = formatErrorDetail(errBody.detail);
    } catch (_) { /* not JSON */ }
    throw new Error(`Failed to update case status: ${detail}`);
  }
  return await response.json();
}

export async function deleteCaseRecord(id) {
  const response = await fetch(`/api/cases/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error(`Failed to delete case: ${response.statusText}`);
  }
  return await response.json();
}
// ----------------------------------------------------
// Graph & Analytics API
// ----------------------------------------------------
export async function fetchCaseGraph(caseId, asOfDate = null, includeRejected = false) {
  const domain = CASE_TO_DOMAIN_MAP[caseId] !== undefined ? CASE_TO_DOMAIN_MAP[caseId] : caseId;
  const params = new URLSearchParams();
  if (domain) params.append('domain', domain);
  if (asOfDate) params.append('as_of_date', asOfDate);
  if (includeRejected) params.append('include_rejected', 'true');

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const url = `/api/graph${queryStr}`;

  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch graph data: ${response.statusText}`);
  }

  const data = await response.json();
  return adaptGraphResponse(data);
}

export async function fetchEvaluationMetrics(caseId) {
  const domain = CASE_TO_DOMAIN_MAP[caseId] !== undefined ? CASE_TO_DOMAIN_MAP[caseId] : caseId;
  const url = domain ? `/api/evaluation/${encodeURIComponent(domain)}` : '/api/evaluation/01_narcotics_trafficking';

  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch evaluation metrics`);
  }

  // No hardcoded fallbacks here -- when the backend has no ground truth for
  // this domain, entity_precision/recall/f1 come back as null and
  // ground_truth_matched is false (see backend/routers/evaluation.py). That
  // must reach EvaluationPanel as real null/false, not get papered over
  // with old demo-looking numbers, or a case that's genuinely unscored
  // silently displays as if it scored 94%/90%/92%.
  const data = await response.json();
  return {
    precision: data.entity_precision,
    recall: data.entity_recall,
    f1_score: data.entity_f1,
    ground_truth_matched: data.ground_truth_matched,
    message: data.message,
  };
}

export async function runPipeline(caseId) {
  const domain = CASE_TO_DOMAIN_MAP[caseId] !== undefined ? CASE_TO_DOMAIN_MAP[caseId] : caseId;
  const url = domain ? `/api/pipeline/run?domain=${encodeURIComponent(domain)}` : '/api/pipeline/run';

  const response = await fetch(url, { method: 'POST', headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to trigger pipeline: ${response.statusText}`);
  }

  return await response.json();
}

// Uploads one or more real case documents (.txt/.docx/.pdf) and runs them
// through live extraction, for a genuinely NEW case -- unlike runPipeline()
// above, which only re-runs one of the 10 pre-loaded demo domains. This is
// what "+ Add New Case" should call: without source documents, a brand new
// case id has nothing to extract and silently comes out empty. It's also
// what adding *more* evidence to an EXISTING case should call -- passing
// that case's own id as domainId ingests the new documents incrementally
// against the entities/relationships already resolved for it, rather than
// starting over (see pipeline/resolution/incremental_resolver.py).
export async function uploadCaseDocuments(domainId, files) {
  const formData = new FormData();
  formData.append('domain', domainId);
  for (const file of files) {
    formData.append('files', file);
  }

  // Don't use getAuthHeaders() here -- it sets Content-Type: application/json,
  // which breaks multipart form uploads. The browser sets the correct
  // multipart boundary itself as long as Content-Type is left unset.
  const token = getAuthToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/pipeline/upload', {
    method: 'POST',
    headers,
    body: formData
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errBody = await response.json();
      if (errBody?.detail) detail = formatErrorDetail(errBody.detail);
    } catch (_) { /* not JSON */ }
    throw new Error(`Failed to upload case documents: ${detail}`);
  }
  return await response.json();
}

export async function fetchCaseDocuments(caseId, skip = 0, limit = 50) {
  const domain = CASE_TO_DOMAIN_MAP[caseId] !== undefined ? CASE_TO_DOMAIN_MAP[caseId] : caseId;
  const params = new URLSearchParams();
  if (domain) params.append('domain', domain);
  if (skip) params.append('skip', skip);
  if (limit) params.append('limit', limit);

  const url = `/api/documents?${params.toString()}`;
  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.statusText}`);
  }

  return await response.json();
}

// Polls a pipeline job (returned by runPipeline() or uploadCaseDocuments())
// until it leaves the RUNNING state, so a caller can await a single promise
// instead of hand-rolling setInterval/status-check plumbing every time.
export async function fetchPipelineJobStatus(jobId) {
  const response = await fetch(`/api/pipeline/status/${encodeURIComponent(jobId)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch job status: ${response.statusText}`);
  }
  return await response.json();
}

export async function pollPipelineJob(jobId, { intervalMs = 2000, timeoutMs = 120000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await fetchPipelineJobStatus(jobId);
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for pipeline job ${jobId} to finish.`);
}

// ----------------------------------------------------
// Timeline Events API
// ----------------------------------------------------
export async function fetchTimelineEvents(caseId = null) {
  const domain = caseId && CASE_TO_DOMAIN_MAP[caseId] ? CASE_TO_DOMAIN_MAP[caseId] : null;
  const url = domain ? `/api/graph/timeline?domain=${encodeURIComponent(domain)}` : '/api/graph/timeline';

  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch timeline events: ${response.statusText}`);
  }
  return await response.json();
}

// ----------------------------------------------------
// Bridges & Cut-Vertex Vulnerabilities API
// ----------------------------------------------------
export async function fetchNetworkBridges() {
  const response = await fetch('/api/graph/bridges', { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch network bridges: ${response.statusText}`);
  }
  return await response.json();
}

// ----------------------------------------------------
// Graph Export API
// ----------------------------------------------------
export async function exportGraphData(format = 'json', caseId = null) {
  const domain = caseId && CASE_TO_DOMAIN_MAP[caseId] ? CASE_TO_DOMAIN_MAP[caseId] : '';
  const params = new URLSearchParams({ format });
  if (domain) params.append('domain', domain);

  const response = await fetch(`/api/graph/export?${params.toString()}`, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to export graph data: ${response.statusText}`);
  }
  return await response.json();
}

// ----------------------------------------------------
// Suspicious Pattern Detection API
// ----------------------------------------------------
export async function fetchSuspiciousPatterns(caseId = null) {
  const domain = caseId && CASE_TO_DOMAIN_MAP[caseId] ? CASE_TO_DOMAIN_MAP[caseId] : null;
  const url = domain ? `/api/patterns/suspicious?domain=${encodeURIComponent(domain)}` : '/api/patterns/suspicious';

  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch suspicious patterns`);
  }
  return await response.json();
}

// ----------------------------------------------------
// Human Feedback API
// ----------------------------------------------------
export async function submitInvestigatorFeedback(feedbackPayload) {
  const response = await fetch('/api/graph/feedback', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(feedbackPayload)
  });
  if (!response.ok) {
    throw new Error(`Failed to submit feedback: ${response.statusText}`);
  }
  return await response.json();
}

// ----------------------------------------------------
// Explainable AI (XAI) Pathfinding API
// ----------------------------------------------------
export async function explainPath(sourceId, targetId, maxDepth = 4) {
  const url = `/api/graph/explain?source_id=${encodeURIComponent(sourceId)}&target_id=${encodeURIComponent(targetId)}&max_depth=${maxDepth}`;
  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to compute explainable path`);
  }
  return await response.json();
}

// ----------------------------------------------------
// Court Dossier Download Link Helper
// ----------------------------------------------------
export function getDossierDownloadUrl(entityId) {
  return `/api/dossier/download/${encodeURIComponent(entityId || 'ENT_HUB_IQBAL_ANSARI')}`;
}

// The endpoint above requires an authenticated Bearer token (see backend
// routers/dossier.py). A plain <a href={...}> tag never sends that header,
// so a bare click just hits the browser's default fetch with no auth and
// fails silently / shows a JSON 401 instead of downloading the PDF. This
// helper does a real authenticated fetch, pulls the PDF back as a Blob,
// and triggers the save via a temporary object URL + programmatic click --
// the standard pattern for downloading an auth-gated file from the browser.
export async function downloadDossier(entityId, fileName) {
  const url = getDossierDownloadUrl(entityId);
  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = formatErrorDetail(body?.detail) || detail;
    } catch (_) {
      // response wasn't JSON (e.g. an actual PDF error page) -- keep the status code
    }
    throw new Error(`Failed to download dossier: ${detail}`);
  }
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName || `dossier_${entityId || 'entity'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

// ----------------------------------------------------
// Security & Audit Logs API
// ----------------------------------------------------
// cache: 'no-store' for the same reason as verifyAuditChain() below -- an
// evidentiary ledger view must never show a browser-cached, potentially
// stale copy of itself.
export async function fetchAuditLogs(skip = 0, limit = 50) {
  const response = await fetch(`/api/audit/log?limit=${limit}`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch audit logs: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

// Recomputes every audit_logs row's hash from its own stored fields plus
// the previous row's hash and checks it against what's actually stored --
// this is what proves the chain tamper-EVIDENT, not just tamper-resistant.
// AUDITOR / OFFICER_IN_CHARGE only (backend-enforced).
//
// cache: 'no-store' is deliberate, not defensive boilerplate -- this is a
// pass/fail security check, so every click must hit the network and get a
// genuinely fresh answer. fetch()'s default cache mode ('default') is
// otherwise free to satisfy a repeat GET to this exact same URL from the
// browser's HTTP cache instead of re-querying the server, which is exactly
// what would make a real tamper look like a stale PASS until something
// (e.g. a full page reload) happens to force a network round-trip.
export async function verifyAuditChain() {
  const response = await fetch('/api/audit/verify', { headers: getAuthHeaders(), cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to verify audit chain: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

// ----------------------------------------------------
// Case Live-Sync WebSocket
// ----------------------------------------------------
// Pushes an event whenever the watched case's entities/relationships/
// evidence change server-side (pipeline completion, investigator
// feedback) so the board can pick it up without a manual page reload.
// Scoped to case-level data only -- see backend/routers/ws.py. Returns
// the raw WebSocket (or null if there's no session yet) so the caller
// owns its lifecycle and can close() it on cleanup.
export function openCaseLiveSync(caseId, onEvent) {
  const token = getAuthToken();
  if (!token) return null;

  const domain = CASE_TO_DOMAIN_MAP[caseId] !== undefined ? CASE_TO_DOMAIN_MAP[caseId] : caseId;
  const params = new URLSearchParams({ token });
  if (domain) params.append('domain', domain);

  // Native WebSocket can't set an Authorization header on the handshake,
  // so the token rides in the query string instead (see backend/routers/
  // ws.py's _authenticate_ws_token).
  //
  // Same-origin /api/ws/case, mirroring every REST call in this file --
  // the Vite dev proxy (vite.config.js, ws: true) and the production Nginx
  // config (frontend/nexustrace-react-v3/Dockerfile, Upgrade/Connection
  // headers) both forward this path to the real backend, so this never
  // needs a hardcoded host and can't silently point at the wrong
  // environment the way a literal localhost:8000 would once deployed.
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${wsProtocol}//${window.location.host}/api/ws/case?${params.toString()}`);

  ws.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data));
    } catch (err) {
      console.warn('[Live Sync] Malformed event', err);
    }
  };
  ws.onerror = (err) => console.warn('[Live Sync] Connection error', err);

  return ws;
}
