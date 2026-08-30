import axios from 'axios';
import { GraphData, HubInfluencer, DocumentRecord, EvaluationScore } from '../types/graph';

const API_BASE = '/api';

export const fetchGraph = async (domain?: string, entityType?: string): Promise<GraphData> => {
  const params: Record<string, string> = {};
  if (domain) params.domain = domain;
  if (entityType) params.entity_type = entityType;
  const res = await axios.get(`${API_BASE}/graph`, { params });
  return res.data;
};

export const fetchCentralityRankings = async (domain?: string, topN: number = 10): Promise<HubInfluencer[]> => {
  const params: Record<string, any> = { top_n: topN };
  if (domain) params.domain = domain;
  const res = await axios.get(`${API_BASE}/graph/centrality`, { params });
  return res.data;
};

export const fetchDocuments = async (domain?: string): Promise<DocumentRecord[]> => {
  const params: Record<string, string> = {};
  if (domain) params.domain = domain;
  const res = await axios.get(`${API_BASE}/documents`, { params });
  return res.data;
};

export const fetchEvaluations = async (): Promise<EvaluationScore[]> => {
  const res = await axios.get(`${API_BASE}/evaluation`);
  return res.data;
};

export const triggerPipeline = async (domain?: string): Promise<any> => {
  const params: Record<string, string> = {};
  if (domain) params.domain = domain;
  const res = await axios.post(`${API_BASE}/pipeline/run`, null, { params });
  return res.data;
};
