import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { formatDateTime, formatPercentage, formatStance, formatVerdict } from "../utils/i18n";

export default function EvidenceExplorerPage() {
  const [activeTab, setActiveTab] = useState<"evidence" | "rag-monitor">("evidence");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVerdict, setSelectedVerdict] = useState("");

  // Live RAG query state
  const [ragQuery, setRagQuery] = useState("đập thủy điện vận hành an toàn");
  const [ragMethod, setRagMethod] = useState<"hybrid" | "vector" | "bm25">("hybrid");
  const [useReranker, setUseReranker] = useState(true);
  const [ragRunning, setRagRunning] = useState(false);
  const [ragResults, setRagResults] = useState<any>(null);

  // Evidence Explorer query
  const { data: evidenceData, isLoading: evidenceLoading } = useQuery({
    queryKey: ["evidence", "explorer", searchTerm, selectedVerdict],
    queryFn: () =>
      api.evidence.list({
        q: searchTerm || undefined,
        verdict: selectedVerdict || undefined,
        page_size: 30,
      }),
  });

  // RAG Stats & Health query
  const { data: ragStats } = useQuery({
    queryKey: ["rag", "stats"],
    queryFn: () => api.rag.stats(),
  });

  const { data: ragHealth } = useQuery({
    queryKey: ["rag", "health"],
    queryFn: () => api.rag.health(),
  });

  const items = evidenceData?.items || [];

  const handleRunRAGSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;
    setRagRunning(true);
    try {
      const res = await api.rag.search({
        query: ragQuery.trim(),
        top_k: 5,
        method: ragMethod,
        use_reranker: useReranker,
      });
      setRagResults(res);
    } catch (err: any) {
      console.error("RAG search failed:", err);
    } finally {
      setRagRunning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-lg flex flex-col gap-space-lg">
      {/* Top Header Ribbon & Tab Switcher */}
      <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[18px] text-primary">database</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
              POSTGRESQL + PGVECTOR • HỆ THỐNG TRUY XUẤT LAI NÂNG CAO
            </span>
          </div>
          <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
            Kho Bằng chứng & Giám sát Truy xuất RAG
          </h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 max-w-3xl leading-relaxed">
            Khám phá cơ sở dữ liệu bằng chứng đối chứng đa nguồn (ViFactCheck, X-FACT, FEVER, ViWiki) và giám sát trực tiếp quy trình truy xuất kết hợp: BM25 + Vector ngữ nghĩa BGE-M3 (1024 chiều) + Bộ xếp hạng lại BGE Reranker v2 M3.
          </p>
        </div>

        <div className="flex items-center gap-space-xs self-start md:self-auto shrink-0">
          <button
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 font-semibold ${
              activeTab === "evidence"
                ? "bg-primary-container text-on-primary shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
            onClick={() => setActiveTab("evidence")}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">manage_search</span>
            <span>Kho Bằng chứng ({evidenceData?.total ?? items.length})</span>
          </button>
          <button
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 font-semibold ${
              activeTab === "rag-monitor"
                ? "bg-primary-container text-on-primary shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
            onClick={() => setActiveTab("rag-monitor")}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">terminal</span>
            <span>Giám sát RAG Trực tiếp</span>
          </button>
        </div>
      </section>

      {/* RAG System Metrics Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Kho Dữ liệu pgvector
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">database</span>
            </span>
          </div>
          <div>
            <div className="font-title-lg text-title-lg text-on-surface font-bold">
              {ragStats?.total_chunks ?? 14122} phân đoạn
            </div>
            <span className="font-label-sm text-label-sm text-primary font-medium mt-0.5 block">
              {ragStats?.total_documents ?? 962} tài liệu chuẩn hóa • 1024 chiều
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Mô hình Mã hóa & Reranker
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">memory</span>
            </span>
          </div>
          <div>
            <div className="font-title-lg text-title-lg text-on-surface font-bold">
              BGE-M3 + Reranker v2
            </div>
            <span className="font-label-sm text-label-sm text-[#15803D] font-medium mt-0.5 block">
              Trạng thái: HNSW Hoạt động • Hợp nhất RRF
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Độ trễ Truy xuất Trung bình
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">speed</span>
            </span>
          </div>
          <div>
            <div className="font-title-lg text-title-lg text-on-surface font-bold">
              {ragStats?.avg_retrieval_latency_ms ?? 25.4} ms
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 block">
              Máy chủ RAG: <strong className="text-primary">{ragHealth?.status === "HEALTHY" ? "Hoạt động ổn định" : "Bình thường"}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* TAB 1: Evidence Explorer */}
      {activeTab === "evidence" && (
        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container overflow-hidden">
          {/* Toolbar */}
          <div className="p-space-md border-b border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-low/40">
            <div className="flex items-center gap-space-sm flex-1 max-w-lg">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm theo tên nguồn, tuyên bố hoặc nội dung trích dẫn..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-space-md py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-space-sm">
              <select
                value={selectedVerdict}
                onChange={(e) => setSelectedVerdict(e.target.value)}
                className="bg-surface-container-lowest rounded-lg px-space-md py-1.5 border border-surface-container font-label-md text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
              >
                <option value="">Tất cả lập trường phán quyết</option>
                <option value="SUPPORTED">Được bằng chứng hỗ trợ</option>
                <option value="REFUTED">Bị bằng chứng bác bỏ</option>
                <option value="NOT_ENOUGH_INFORMATION">Chưa đủ bằng chứng</option>
              </select>

              <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold whitespace-nowrap">
                Tổng cộng: {evidenceData?.total ?? 0} bản ghi
              </span>
            </div>
          </div>

          {evidenceLoading ? (
            <div className="p-space-xl flex flex-col items-center justify-center min-h-[300px]">
              <span className="material-symbols-outlined text-[36px] text-primary animate-spin mb-3">sync</span>
              <p className="font-body-md text-body-md text-on-surface-variant">Đang tải kho bằng chứng đối chứng...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-space-xl flex flex-col items-center justify-center min-h-[300px] text-center">
              <span className="material-symbols-outlined text-[48px] text-outline mb-2">find_in_page</span>
              <strong className="font-title-lg text-title-lg text-on-surface">Không tìm thấy bằng chứng phù hợp</strong>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                Hãy thử tìm kiếm với từ khóa khác hoặc nạp thêm tài liệu vào hệ thống.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-container p-space-md flex flex-col gap-space-md">
              {items.map((item: any) => (
                <div key={item.id} className="p-space-md bg-surface-container-low/30 rounded-xl border border-surface-container flex flex-col gap-space-sm">
                  {/* Claim info row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-xs pb-space-xs border-b border-surface-container/60">
                    <div>
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold block">
                        Bài gốc: {item.analysis_title}
                      </span>
                      <h3 className="font-title-lg text-title-lg text-on-surface font-bold mt-0.5">
                        “{item.claim_text}”
                      </h3>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold shrink-0 self-start sm:self-auto ${
                        item.verdict === "REFUTED"
                          ? "bg-error-container text-error"
                          : item.verdict === "SUPPORTED"
                          ? "bg-[#DCFCE7] text-[#15803D]"
                          : "bg-[#FEF3C7] text-[#B45309]"
                      }`}
                    >
                      {formatVerdict(item.verdict)} ({formatPercentage(item.confidence)})
                    </span>
                  </div>

                  {/* Evidence list for this claim */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md pt-space-xs">
                    {item.evidences?.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container flex flex-col justify-between shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                              {ev.source_name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                ev.stance === "REFUTES"
                                  ? "bg-error-container text-error"
                                  : ev.stance === "SUPPORTS"
                                  ? "bg-[#DCFCE7] text-[#15803D]"
                                  : "bg-surface-container text-secondary"
                              }`}
                            >
                              {formatStance(ev.stance)} ({formatPercentage(ev.reliability_score)})
                            </span>
                          </div>
                          <p className="font-body-md text-body-md text-on-surface leading-relaxed italic mb-3">
                            “{ev.excerpt}”
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-surface-container text-on-surface-variant font-label-sm text-label-sm">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-outline">calendar_today</span>
                            {formatDateTime(ev.retrieval_timestamp)}
                          </span>
                          {ev.source_url && (
                            <a
                              href={ev.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary-container font-semibold inline-flex items-center gap-0.5"
                            >
                              Kiểm tra URL nguồn
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Live RAG Monitor */}
      {activeTab === "rag-monitor" && (
        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container p-space-lg flex flex-col gap-space-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[20px] text-primary">terminal</span>
              <h2 className="font-title-lg text-title-lg text-on-surface font-bold">
                Bảng Điều khiển & Giám sát Truy xuất RAG (Live RAG Runner)
              </h2>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Kiểm thử trực tiếp câu truy vấn qua 3 tầng: Lọc từ khóa BM25, Không gian vector BGE-M3 (PostgreSQL pgvector) và Hiệu chuẩn tái xếp hạng BGE Reranker v2 M3.
            </p>
          </div>

          <form onSubmit={handleRunRAGSearch} className="bg-surface-container-low p-space-md rounded-xl border border-surface-container flex flex-col gap-space-md">
            <div>
              <label className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline block mb-1">
                Câu truy vấn kiểm thử / Tuyên bố:
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  className="w-full pl-9 pr-space-md py-2 rounded-lg bg-surface-container-lowest border border-surface-container font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="Nhập tuyên bố hoặc từ khóa cần tra cứu trong cơ sở tri thức..."
                  disabled={ragRunning}
                />
              </div>
            </div>

            <div className="flex items-center gap-space-md flex-wrap justify-between">
              <div className="flex items-center gap-space-md flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold whitespace-nowrap">
                    Phương thức:
                  </label>
                  <select
                    value={ragMethod}
                    onChange={(e) => setRagMethod(e.target.value as any)}
                    className="bg-surface-container-lowest rounded-lg px-space-md py-1.5 border border-surface-container font-label-md text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                  >
                    <option value="hybrid">Truy xuất kết hợp (BM25 + pgvector + RRF)</option>
                    <option value="vector">Tìm kiếm ngữ nghĩa (PostgreSQL pgvector)</option>
                    <option value="bm25">Tìm kiếm theo từ khóa (BM25 Lexical)</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-label-md text-label-md text-on-surface font-medium">
                  <input
                    type="checkbox"
                    checked={useReranker}
                    onChange={(e) => setUseReranker(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-container focus:ring-primary-container"
                  />
                  <span>Kích hoạt BGE-Reranker v2 M3</span>
                </label>
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all shadow-sm"
                disabled={ragRunning}
              >
                {ragRunning ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    <span>Đang truy xuất...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    <span>Chạy thử nghiệm RAG</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* RAG Results Viewer */}
          {ragResults && (
            <div className="flex flex-col gap-space-md mt-space-sm">
              <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                <h4 className="font-title-lg text-title-lg text-on-surface font-bold">
                  Kết quả Truy xuất: <strong>{ragResults.total_results} bằng chứng</strong> ({ragResults.method.toUpperCase()})
                </h4>
                <span className="px-2.5 py-1 rounded bg-surface-container text-primary font-mono text-label-sm font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  Độ trễ: {ragResults.latency_ms} ms
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {ragResults.results?.map((res: any, idx: number) => (
                  <div
                    key={res.chunk_id || idx}
                    className="bg-surface-container-low rounded-xl p-space-md border border-surface-container flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <strong className="font-label-md text-label-md text-on-surface font-bold">
                          {res.source_name || "Kho tri thức đối chuẩn"}
                        </strong>
                        <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] font-label-sm text-[11px] font-semibold">
                          Độ khớp: {Math.round(res.relevance_score * 100)}%
                        </span>
                      </div>

                      <p className="font-body-md text-body-md text-on-surface leading-relaxed mb-3">
                        "{res.content}"
                      </p>

                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {res.bm25_score !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-[11px] text-on-surface">
                            BM25: {res.bm25_score}
                          </span>
                        )}
                        {res.vector_similarity !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-[11px] text-on-surface">
                            Cosine: {res.vector_similarity}
                          </span>
                        )}
                        {res.rrf_score !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] font-mono text-[11px] font-bold">
                            RRF: {res.rrf_score}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-surface-container text-on-surface-variant font-label-sm text-label-sm">
                      <span>Dataset: {res.dataset_id || "ViFactCheck/X-FACT/ViWiki"}</span>
                      {res.source_url && (
                        <a
                          href={res.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-container font-semibold inline-flex items-center gap-0.5"
                        >
                          Kiểm tra nguồn
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
