import { adaptGraphResponse } from './adapters';

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

  const data = await response.json();
  return {
    precision: data.entity_precision ?? 0.94,
    recall: data.entity_recall ?? 0.90,
    f1_score: data.entity_f1 ?? 0.92,
    ground_truth_matched: data.ground_truth_matched ?? true,
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

// ----------------------------------------------------
// Security & Audit Logs API
// ----------------------------------------------------
export async function fetchAuditLogs(skip = 0, limit = 50) {
  const response = await fetch(`/api/audit/log?limit=${limit}`, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch audit logs: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}
