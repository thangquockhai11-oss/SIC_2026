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
  source_name: string;
  source_url: string | null;
  excerpt: string;
  stance: "SUPPORTS" | "REFUTES" | "NEUTRAL";
  reliability_score: number;
  relevance_score?: number;
  dataset_source?: string | null;
  dataset_record_id?: string | null;
  nli_relation?: string | null;
  retrieval_timestamp: string;
};

export type Claim = {
  id: string;
  claim_text: string;
  verdict: "SUPPORTED" | "REFUTED" | "NOT_ENOUGH_INFORMATION" | "NOT_CHECKABLE";
  confidence: number;
  reasoning: string;
  limitations: string | null;
  model_name?: string | null;
  model_version?: string | null;
  confidence_metric_type?: string;
  verification_status?: string;
  evidences: Evidence[];
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
