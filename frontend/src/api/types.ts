export type HealthResponse = {
  status: string;
  service: string;
  version: string;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type Evidence = {
  id: string;
  evidence_id?: string;
  source_name: string;
  source_url: string | null;
  excerpt: string;
  content?: string;
  stance: "SUPPORTS" | "REFUTES" | "NEUTRAL" | "DISCUSSES" | "CONFLICTING" | string;
  evidence_type?: "DIRECT" | "INDIRECT" | "PRIMARY" | "SECONDARY" | "CONTEXTUAL" | string;
  publication_date?: string | null;
  retrieval_date?: string | null;
  provenance?: Record<string, any> | null;
  reliability_score: number;
  relevance_score?: number;
  dataset_source?: string | null;
  dataset_record_id?: string | null;
  nli_relation?: string | null;
  retrieval_timestamp: string;
};

export type Claim = {
  id: string;
  claim_id?: string;
  claim_text: string;
  original_text?: string | null;
  normalized_claim?: string | null;
  claim_type?: "FACTUAL_CLAIM" | "STATISTICAL_CLAIM" | "HISTORICAL_CLAIM" | "SCIENTIFIC_CLAIM" | "QUOTATION_CLAIM" | "CAUSAL_CLAIM" | "OPINION" | "PREDICTION" | string;
  subject?: string | null;
  predicate?: string | null;
  object?: string | null;
  date_or_time_period?: string | null;
  location?: string | null;
  entities?: Array<string | Record<string, any>> | null;
  numerical_values?: Array<string | Record<string, any>> | null;
  checkability?: boolean;
  checkability_status?: "CHECKABLE" | "NOT_CHECKABLE" | "NOT_A_CLAIM" | "PARTIALLY_CHECKABLE" | "NEEDS_CLARIFICATION" | string;
  checkability_reason?: string | null;
  measurable_conditions?: string[];
  evidence_requirements?: string[];
  extraction_confidence?: number;
  original_sentence?: string | null;
  is_claim?: boolean;
  verdict: "SUPPORTED" | "REFUTED" | "PARTIALLY_SUPPORTED" | "MISLEADING" | "CONFLICTING_EVIDENCE" | "NOT_ENOUGH_INFORMATION" | "NOT_CHECKABLE" | "NOT_A_CLAIM" | string;
  confidence: number;
  reasoning: string;
  limitations: string | null;
  model_name?: string | null;
  model_version?: string | null;
  confidence_metric_type?: string;
  verification_status?: string;
  evidences: Evidence[];
  supporting_evidences?: Evidence[];
  refuting_evidences?: Evidence[];
  other_evidences?: Evidence[];
};

export type MediaCredibility = {
  id: string;
  source_name: string;
  domain: string | null;
  transparency_score: number;
  citation_score: number;
  evidence_score: number;
  journalistic_standard_score: number;
  overall_credibility_score: number;
  reasoning: string;
};

export type PublicOpinion = {
  id: string;
  topic: string;
  sample_size: number;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  sentiment_mixed: number;
  stance_support: number;
  stance_oppose: number;
  stance_discuss: number;
  stance_neutral: number;
  top_emotions: Record<string, number>;
  discussion_summary: string;
  raw_comments_sample?: Array<{
    author: string;
    comment: string;
    sentiment: string;
    stance: string;
  }> | null;
};

export type PublicTrustSurvey = {
  id: string;
  survey_name: string;
  sample_size: number;
  methodology: string;
  trust_source_score: number;
  trust_message_score: number;
  trust_evidence_score: number;
  demographics_breakdown: Record<string, any>;
  findings_summary: string;
  limitations: string;
};

export type InformationReception = {
  id: string;
  sample_size: number;
  comprehension_score: number;
  claim_identification_rate: number;
  acceptance_rate: number;
  sharing_intention_high: number;
  sharing_intention_medium: number;
  sharing_intention_low: number;
  verify_before_sharing_rate: number;
  cognitive_resistance_notes: string;
};

export type AgentExecution = {
  id: string;
  execution_id?: string;
  agent_name: string;
  agent_role: string;
  status: "IDLE" | "RUNNING" | "COMPLETED" | "FAILED";
  latency_ms: number;
  execution_time_ms?: number;
  model_name?: string | null;
  model_version?: string | null;
  dataset_ids?: string[] | null;
  dataset_versions?: Record<string, string> | null;
  evidence_ids?: string[] | null;
  retrieval_count?: number;
  start_time?: string | null;
  end_time?: string | null;
  result_summary: string | null;
  disagreement_detected: boolean;
  errors?: any;
  output?: any;
  details?: Record<string, any> | null;
};

export type AnalysisDetail = {
  id: string;
  user_id: string | null;
  title: string;
  source_url: string | null;
  content: string;
  language: string;
  scope: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  error_message: string | null;
  summary: string | null;
  verdict: string | null;
  confidence_score: number | null;
  disagreement_detected?: boolean;
  fact_checking_report?: {
    overview: {
      article_title: string;
      total_claims_extracted: number;
      total_claims_verified: number;
      supported_claims_count: number;
      refuted_claims_count: number;
      partially_supported_count: number;
      misleading_count: number;
      conflicting_count: number;
      not_enough_info_count: number;
      not_checkable_count: number;
      verifiable_claims_count: number;
      factual_accuracy_score: number;
      accuracy_formula: string;
      accuracy_note: string;
    };
    claim_breakdown: any[];
    overall_synthesis: {
      summary: string;
      cross_claim_conflicts: string[];
      opinion_vs_fact_summary: string;
      context_gaps: string[];
    };
    media_credibility_isolated: {
      source_name: string;
      domain: string | null;
      transparency_score: number;
      citation_score: number;
      evidence_score: number;
      journalistic_standard_score: number;
      overall_credibility_score: number;
      transparency_checklist: {
        clear_byline_author: boolean;
        sources_cited: boolean;
        corrections_policy: boolean;
        contact_ownership: boolean;
      };
      disclaimer: string;
    };
  } | null;
  ai_provider: string;
  created_at: string;
  completed_at: string | null;
  claims: Claim[];
  credibility: MediaCredibility | null;
  opinion: PublicOpinion | null;
  survey: PublicTrustSurvey | null;
  reception: InformationReception | null;
  agent_executions: AgentExecution[];
};

export type AnalysisListItem = {
  id: string;
  title: string;
  source_url: string | null;
  verdict: string | null;
  confidence_score: number | null;
  status: string;
  ai_provider: string;
  created_at: string;
  claims_count: number;
};

export type AnalysisListResponse = {
  items: AnalysisListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type DashboardStats = {
  total_analyses: number;
  completed_analyses: number;
  failed_analyses: number;
  total_claims: number;
  average_confidence: number;
  sentiment_distribution: Record<string, number>;
  stance_distribution: Record<string, number>;
  recent_activities: Array<{
    id: string;
    title: string;
    verdict: string;
    status: string;
    confidence: number;
    created_at: string;
  }>;
  chart_data: Array<{
    name: string;
    count: number;
    color: string;
  }>;
};

export type DatasetRecord = {
  dataset_id: string;
  name: string;
  category: string;
  source_url: string | null;
  languages: string[];
  intended_tasks: string[];
  dataset_version: string | null;
  license: string | null;
  label_schema: string[];
  license_status: "UNVERIFIED" | "VERIFIED";
  schema_status: "UNVERIFIED" | "VERIFIED";
  status: "UNVERIFIED" | "VERIFIED";
  last_downloaded_at: string | null;
  preprocessing_configuration: Record<string, unknown>;
  split_configuration: Record<string, unknown>;
  notes: string;
};

export type DatasetListResponse = {
  items: DatasetRecord[];
  total: number;
  page: number;
  page_size: number;
};
