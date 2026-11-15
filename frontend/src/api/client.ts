import axios from "axios";
import type {
  AnalysisDetail,
  AnalysisListResponse,
  DashboardStats,
  DatasetListResponse,
  DatasetRecord,
  HealthResponse,
  InformationReception,
  PublicOpinion,
  PublicTrustSurvey,
  TokenResponse,
  User,
} from "./types";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { Accept: "application/json" },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("trustmedia_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // System Health
  health: async (): Promise<HealthResponse> => {
    const res = await client.get<HealthResponse>("/health");
    return res.data;
  },

  // Auth
  auth: {
    login: async (email: string, password: string): Promise<TokenResponse> => {
      const res = await client.post<TokenResponse>("/auth/login", { email, password });
      return res.data;
    },
    register: async (email: string, password: string, fullName: string): Promise<TokenResponse> => {
      const res = await client.post<TokenResponse>("/auth/register", {
        email,
        password,
        full_name: fullName,
      });
      return res.data;
    },
    me: async (): Promise<User> => {
      const res = await client.get<User>("/auth/me");
      return res.data;
    },
    updateProfile: async (fullName?: string, currentPassword?: string, newPassword?: string): Promise<User> => {
      const res = await client.put<User>("/auth/me", {
        full_name: fullName,
        current_password: currentPassword,
        new_password: newPassword,
      });
      return res.data;
    },
    logout: async () => {
      try {
        await client.post("/auth/logout");
      } finally {
        localStorage.removeItem("trustmedia_token");
        localStorage.removeItem("trustmedia_user");
      }
    },
  },

  // Dashboard Stats
  dashboard: {
    stats: async (): Promise<DashboardStats> => {
      const res = await client.get<DashboardStats>("/dashboard/stats");
      return res.data;
    },
  },

  // News Analyzer
  analyzer: {
    submit: async (data: {
      title?: string;
      source_url?: string;
      content?: string;
      language?: string;
      scope?: string;
    }): Promise<{ id: string; status: string; progress_percent: number }> => {
      const res = await client.post<{ id: string; status: string; progress_percent: number }>(
        "/analyzer/submit",
        data
      );
      return res.data;
    },
    pollStatus: async (
      id: string
    ): Promise<{ id: string; status: string; progress_percent: number; error_message?: string }> => {
      const res = await client.get<{
        id: string;
        status: string;
        progress_percent: number;
        error_message?: string;
      }>(`/analyzer/jobs/${id}`);
      return res.data;
    },
    getDetail: async (id: string): Promise<AnalysisDetail> => {
      const res = await client.get<AnalysisDetail>(`/analyzer/${id}`);
      return res.data;
    },
    getTrace: async (id: string): Promise<{ analysis_id: string; total_latency_ms: number; traces: any[] }> => {
      const res = await client.get<{ analysis_id: string; total_latency_ms: number; traces: any[] }>(`/analyzer/${id}/trace`);
      return res.data;
    },
    getModels: async (): Promise<any[]> => {
      const res = await client.get<any[]>("/analyzer/models/catalog");
      return res.data;
    },
  },

  // History
  history: {
    list: async (params: {
      page?: number;
      page_size?: number;
      q?: string;
      status?: string;
      scope?: string;
    } = {}): Promise<AnalysisListResponse> => {
      const res = await client.get<AnalysisListResponse>("/history", { params });
      return res.data;
    },
    delete: async (id: string): Promise<{ status: string }> => {
      const res = await client.delete<{ status: string }>(`/history/${id}`);
      return res.data;
    },
  },

  // Evidence Explorer
  evidence: {
    list: async (params: {
      page?: number;
      page_size?: number;
      q?: string;
      verdict?: string;
    } = {}): Promise<{ items: any[]; total: number; page: number; page_size: number }> => {
      const res = await client.get<{ items: any[]; total: number; page: number; page_size: number }>(
        "/evidence",
        { params }
      );
      return res.data;
    },
  },

  // Public Opinion
  opinion: {
    analyze: async (data: { topic?: string; comments: string[] }): Promise<PublicOpinion> => {
      const res = await client.post<PublicOpinion>("/opinion/analyze", data);
      return res.data;
    },
    latest: async (): Promise<PublicOpinion[]> => {
      const res = await client.get<PublicOpinion[]>("/opinion/latest");
      return res.data;
    },
  },

  // Public Trust
  trust: {
    listSurveys: async (): Promise<PublicTrustSurvey[]> => {
      const res = await client.get<PublicTrustSurvey[]>("/trust/surveys");
      return res.data;
    },
    createSurvey: async (data: {
      survey_name: string;
      sample_size: number;
      methodology: string;
      trust_source_score: number;
      trust_message_score: number;
      trust_evidence_score: number;
      demographics_breakdown?: Record<string, any>;
      findings_summary: string;
      limitations: string;
    }): Promise<PublicTrustSurvey> => {
      const res = await client.post<PublicTrustSurvey>("/trust/surveys", data);
      return res.data;
    },
  },

  // Information Reception
  reception: {
    listTests: async (): Promise<InformationReception[]> => {
      const res = await client.get<InformationReception[]>("/reception/tests");
      return res.data;
    },
  },

  // Reports
  reports: {
    exportJsonUrl: (id: string) => `${API_BASE_URL}/reports/${id}/export?format=json`,
    exportCsvUrl: (id: string) => `${API_BASE_URL}/reports/${id}/export?format=csv`,
    htmlUrl: (id: string) => `${API_BASE_URL}/reports/${id}/html`,
  },

  // Datasets CRUD
  datasets: {
    list: async (params: {
      page?: number;
      page_size?: number;
      category?: string;
      status?: string;
      language?: string;
      q?: string;
    } = {}): Promise<DatasetListResponse> => {
      const res = await client.get<DatasetListResponse>("/datasets", { params });
      return res.data;
    },
    create: async (data: {
      dataset_id: string;
      name: string;
      category: string;
      source_url?: string;
      languages?: string[];
      intended_tasks?: string[];
      dataset_version?: string;
      license?: string;
      sample_count?: number;
      notes?: string;
    }): Promise<DatasetRecord> => {
      const res = await client.post<DatasetRecord>("/datasets", data);
      return res.data;
    },
    update: async (
      datasetId: string,
      data: Partial<DatasetRecord>
    ): Promise<DatasetRecord> => {
      const res = await client.put<DatasetRecord>(`/datasets/${datasetId}`, data);
      return res.data;
    },
    delete: async (datasetId: string): Promise<{ status: string }> => {
      const res = await client.delete<{ status: string }>(`/datasets/${datasetId}`);
      return res.data;
    },
  },

  // Advanced Hybrid RAG Engine
  rag: {
    stats: async (): Promise<any> => {
      const res = await client.get("/rag/stats");
      return res.data;
    },
    health: async (): Promise<any> => {
      const res = await client.get("/rag/health");
      return res.data;
    },
    search: async (params: {
      query: string;
      top_k?: number;
      method?: "hybrid" | "vector" | "bm25";
      use_reranker?: boolean;
      dataset_filter?: string;
    }): Promise<any> => {
      const res = await client.post("/rag/search", params);
      return res.data;
    },
    retrieve: async (params: { query: string; claim_text?: string; top_k?: number }): Promise<any> => {
      const res = await client.post("/rag/retrieve", params);
      return res.data;
    },
    documents: async (params: { page?: number; page_size?: number; q?: string; dataset_id?: string } = {}): Promise<any> => {
      const res = await client.get("/rag/documents", { params });
      return res.data;
    },
    documentDetail: async (docId: string): Promise<any> => {
      const res = await client.get(`/rag/documents/${docId}`);
      return res.data;
    },
  },
};
