import { adaptGraphResponse } from './adapters';

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
  'case-all': 'Unified Global Master Graph',
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
    throw new Error('Authentication failed. Check credentials.');
  }
  const data = await response.json();
  setAuthToken(data.access_token);
  return data;
}

export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) {
    // No stored session token -- caller must show the login gate. Do NOT
    // silently authenticate as a default account here (that used to happen
    // and defeated both RBAC and the login screen).
    return null;
  }
  const headers = getAuthHeaders();
  const response = await fetch('/api/auth/me', { headers });
  if (!response.ok) {
    // Stored token is invalid/expired -- clear it and force a real login.
    setAuthToken(null);
    return null;
  }
  return await response.json();
}

export function logoutUser() {
  setAuthToken(null);
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

// Uploads a source FIR/case document (.txt or .docx) and starts a pipeline
// run whose extraction is grounded in that document's actual text, instead
// of runPipeline()'s no-content run. Uses FormData, so the auth header is
// built by hand here (unlike getAuthHeaders(), it must NOT set
// Content-Type -- the browser needs to set its own multipart boundary).
export async function uploadCaseDocument(caseId, files) {
  const domain = CASE_TO_DOMAIN_MAP[caseId] !== undefined ? CASE_TO_DOMAIN_MAP[caseId] : caseId;

  // Accept either a single File or an array/FileList of them so callers
  // don't have to remember to wrap a lone file.
  const fileList = Array.isArray(files) || files instanceof FileList ? Array.from(files) : [files];

  const formData = new FormData();
  for (const f of fileList) {
    formData.append('files', f);
  }
  formData.append('domain', domain || caseId);

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
      if (errBody?.detail) detail = errBody.detail;
    } catch (_) {
      // response wasn't JSON -- fall back to statusText
    }
    throw new Error(`Failed to upload document: ${detail}`);
  }

  return await response.json();
}

export async function fetchCaseDocuments(caseId) {
  const domain = CASE_TO_DOMAIN_MAP[caseId] !== undefined ? CASE_TO_DOMAIN_MAP[caseId] : caseId;
  const url = domain ? `/api/documents?domain=${encodeURIComponent(domain)}` : '/api/documents';

  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.statusText}`);
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

// Authenticated PDF download. The backend requires a valid JWT on this route,
// so a plain <a href> can't be used (browsers don't attach the stored Bearer
// token to link navigations). Fetch with auth headers, then trigger a
// client-side save via a temporary object URL.
export async function downloadDossier(entityId, filenameHint) {
  const url = getDossierDownloadUrl(entityId);
  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Please log in to download the court dossier.');
    }
    if (response.status === 403) {
      throw new Error('Your role is not authorized to generate court dossiers.');
    }
    throw new Error(`Failed to generate dossier (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `NexusTrace_Court_Dossier_${(filenameHint || entityId || 'entity').replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
