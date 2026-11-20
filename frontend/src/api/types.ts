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
  original_sentence?: string | null;
  paragraph_id?: number | null;
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

export type OutletProfile = {
  publisher_name: string;
  ownership?: string | null;
  editorial_policy?: string | null;
  correction_policy?: string | null;
  verification_source?: string | null;
};

export type ArticleQuality = {
  author?: string | null;
  data_sources?: string[];
  cited_documents?: string[];
  citation_density?: number;
  sensationalism_assessment?: string | null;
};

export type OutletSummary = {
  has_sufficient_sample: boolean;
  sample_size?: number | null;
  survey_timeframe?: string | null;
  outlet_score?: number | null;
  summary_note: string;
};

export type MediaCredibility = {
  id: string;
  source_name: string;
  domain: string | null;
  transparency_score: number;
  citation_score: number;
  evidence_score: number;
  journalistic_standard_score: number;
  overall_credibility_score: number | null;
  reasoning: string;
  outlet_profile?: OutletProfile | null;
  article_quality?: ArticleQuality | null;
  outlet_summary?: OutletSummary | null;
};

export type PublicOpinion = {
  id: string;
  topic: string;
  sample_size: number;
  sentiment_positive: number | null;
  sentiment_neutral: number | null;
  sentiment_negative: number | null;
  sentiment_mixed: number | null;
  stance_support: number | null;
  stance_oppose: number | null;
  stance_discuss: number | null;
  stance_neutral: number | null;
  top_emotions: Record<string, number>;
  discussion_summary: string;
  raw_comments_sample?: any;
  data_provenance_type?: "OBSERVED" | "PREDICTED" | "ILLUSTRATIVE" | null;
  input_summary?: string | null;
  method_applied?: string | null;
  fallback_reason?: string | null;
};

export type PublicTrustSurvey = {
  id: string;
  survey_name: string;
  sample_size: number;
  methodology: string;
  trust_source_score: number | null;
  trust_message_score: number | null;
  trust_evidence_score: number | null;
  demographics_breakdown: Record<string, any>;
  findings_summary: string;
  limitations: string;
  data_provenance_type?: "OBSERVED" | "PREDICTED" | "ILLUSTRATIVE" | null;
  input_summary?: string | null;
  method_applied?: string | null;
  fallback_reason?: string | null;
};

export type InformationReception = {
  id: string;
  sample_size: number;
  comprehension_score: number | null;
  comprehension_ratio_str?: string | null;
  claim_identification_rate: number | null;
  acceptance_rate: number | null;
  sharing_intention_high: number | null;
  sharing_intention_medium: number | null;
  sharing_intention_low: number | null;
  verify_before_sharing_rate: number | null;
  cognitive_resistance_notes: string;
  data_provenance_type?: "OBSERVED" | "PREDICTED" | "ILLUSTRATIVE" | null;
  input_summary?: string | null;
  method_applied?: string | null;
  fallback_reason?: string | null;
};

export type QuizQuestion = {
  id: string;
  analysis_id: string;
  snapshot_id?: string | null;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
};

export type ReaderSurveyCreate = {
  trust_outlet_score: number;
  claim_trust_ratings?: Record<string, number>;
  quiz_answers: Record<string, number>;
  sharing_intention: string;
  verify_before_sharing: boolean;
  session_id?: string;
  submission_batch_id?: string;
};

export type UserCommentCreate = {
  comment_text: string;
  author_name?: string;
  submission_batch_id?: string;
};

export type BatchFeedbackSubmission = {
  surveys: ReaderSurveyCreate[];
  comments: UserCommentCreate[];
  batch_id?: string;
};

export type BatchFeedbackResponse = {
  analysis_id: string;
  submitted_surveys: number;
  submitted_comments: number;
  batch_id: string;
  comprehension_score: number | null;
  comprehension_ratio_str: string | null;
  updated_stance_distribution: Record<string, number | null>;
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

export type ArticleSnapshot = {
  id: string;
  analysis_id?: string | null;
  source_url: string;
  final_url?: string | null;
  title: string;
  author?: string | null;
  published_date?: string | null;
  extraction_status: "SUCCESS" | "PAYWALL_DETECTED" | "TITLE_ONLY_EXTRACTED" | "FIXTURE_FALLBACK";
  paragraphs: string[];
  source_links: Array<{ text: string; url: string }>;
  version: number;
  is_verified_online: boolean;
  created_at: string;
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
  snapshot?: ArticleSnapshot | null;
  snapshots?: ArticleSnapshot[];
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

export type EvidenceDocument = {
  id: string;
  title: string;
  publisher: string;
  original_source: string;
  publication_date: string | null;
  retrieval_date: string;
  document_version: string;
  source_url: string | null;
  chunks_count: number;
  created_at: string;
};

export type Entities5D = {
  people: string[];
  action: string[];
  location: string[];
  event_date: string[];
  scope: string;
};

export type SyndicatedOrigin = {
  original_source: string;
  copies_count: number;
  copy_urls: string[];
  is_syndicated: boolean;
};

export type ReferencePassage = {
  chunk_id: string;
  source_name: string;
  original_source: string;
  source_url: string | null;
  excerpt: string;
  publication_date?: string | null;
  relevance_score: number;
  nli_relation: string;
  entities_5d: Entities5D;
  date_conflict?: string | null;
};

export type FindReferencesResult = {
  claim_id: string;
  claim_text: string;
  original_sentence?: string | null;
  paragraph_id?: number | null;
  verdict: string;
  verification_status: string;
  claim_5d: Entities5D;
  passages: ReferencePassage[];
  syndicated_origins: SyndicatedOrigin[];
  independent_origins_count: number;
  disputed_detail: string | null;
  has_conflict: boolean;
  reasoning: string;
};
