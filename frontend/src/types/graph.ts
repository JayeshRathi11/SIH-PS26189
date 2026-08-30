export interface EntityNode {
  id: string;
  canonical_name: string;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'VEHICLE' | 'PHONE_NUMBER' | 'FINANCIAL_ACCOUNT' | 'DOCUMENT_FRONT';
  aliases: string[];
  domains: string[];
  hub_score?: number;
  community_cluster?: number;
}

export interface RelationshipEdge {
  source: string;
  source_id: string;
  relationship_type: string;
  raw_relationship_type?: string;
  target: string;
  target_id: string;
  confidence?: number;
  domain: string;
  evidence?: string;
}

export interface GraphData {
  nodes: EntityNode[];
  edges: RelationshipEdge[];
  total_nodes: number;
  total_edges: number;
}

export interface HubInfluencer {
  entity_id: string;
  name: string;
  type: string;
  pagerank_score: number;
  betweenness_score: number;
  combined_hub_score: number;
  community_cluster: number;
  degree: number;
}

export interface DocumentRecord {
  doc_id: string;
  doc_type: string;
  domain: string;
  text: string;
  source_file?: string;
}

export interface EvaluationScore {
  domain: string;
  entity_precision: number;
  entity_recall: number;
  entity_f1: number;
  relationship_precision: number;
  relationship_recall: number;
  relationship_f1: number;
  ground_truth_matched: boolean;
}

export interface DomainMeta {
  id: string;
  name: string;
  folder: string;
  hub_alias: string;
}
