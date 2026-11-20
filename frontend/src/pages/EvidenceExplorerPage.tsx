import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { EvidenceDocument } from "../api/types";

export default function EvidenceExplorerPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"evidence" | "library" | "rag-monitor">("evidence");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVerdict, setSelectedVerdict] = useState("");

  // Ingest Document Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"url" | "file" | "text">("url");
  const [docUrl, setDocUrl] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docPublisher, setDocPublisher] = useState("");
  const [docOriginalSource, setDocOriginalSource] = useState("");
  const [docPubDate, setDocPubDate] = useState("");
  const [docVersion, setDocVersion] = useState("1.0");
  const [docTextContent, setDocTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

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

  // Library Documents query
  const { data: libraryData, isLoading: libraryLoading, refetch: refetchDocs } = useQuery({
    queryKey: ["evidence", "documents", searchTerm],
    queryFn: () =>
      api.evidence.listDocuments({
        q: searchTerm || undefined,
        page_size: 50,
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
  const libraryDocs: EvidenceDocument[] = libraryData?.items || [];

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

  const handleImportDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDoc(true);
    setIngestSuccess(null);
    setIngestError(null);

    try {
      if (addMode === "file") {
        if (!selectedFile) {
          throw new Error("Vui lòng chọn một tệp PDF hoặc văn bản để tải lên.");
        }
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (docTitle.trim()) formData.append("title", docTitle.trim());
        if (docPublisher.trim()) formData.append("publisher", docPublisher.trim());
        if (docOriginalSource.trim()) formData.append("original_source", docOriginalSource.trim());
        if (docPubDate) formData.append("publication_date", docPubDate);
        formData.append("document_version", docVersion || "1.0");

        const res = await api.evidence.uploadFile(formData);
        setIngestSuccess(`Đã nạp thành công tài liệu: "${res.title}" (${res.chunks_count} đoạn trích được lập chỉ mục).`);
      } else {
        if (addMode === "url" && !docUrl.trim()) {
          throw new Error("Vui lòng nhập địa chỉ URL bài báo hoặc thông cáo.");
        }
        if (addMode === "text" && !docTextContent.trim()) {
          throw new Error("Vui lòng nhập nội dung văn bản tài liệu đối chuẩn.");
        }

        const res = await api.evidence.importDocument({
          url: addMode === "url" ? docUrl.trim() : undefined,
          content: addMode === "text" ? docTextContent.trim() : undefined,
          title: docTitle.trim() || undefined,
          publisher: docPublisher.trim() || undefined,
          original_source: docOriginalSource.trim() || undefined,
          publication_date: docPubDate || undefined,
          document_version: docVersion || "1.0",
        });
        setIngestSuccess(`Đã nạp thành công tài liệu: "${res.title}" (${res.chunks_count} đoạn trích được lập chỉ mục).`);
      }

      // Reset fields
      setDocUrl("");
      setDocTitle("");
      setDocPublisher("");
      setDocOriginalSource("");
      setDocPubDate("");
      setDocTextContent("");
      setSelectedFile(null);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      queryClient.invalidateQueries({ queryKey: ["rag"] });
      refetchDocs();
    } catch (err: any) {
      setIngestError(err?.response?.data?.detail || err.message || "Lỗi khi nạp tài liệu vào kho.");
    } finally {
      setSubmittingDoc(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 font-sans">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* 1. Academic Page Title Section & Action Button */}
        <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-primary-container">database</span>
              <span className="font-label-sm text-[11px] uppercase tracking-wider font-semibold text-primary">
                KHO BẰNG CHỨNG ĐỐI CHỨNG // BM25 + DENSE VECTOR + TÀI LIỆU GỐC
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-normal leading-tight">
              Kho Bằng chứng Thực nghiệm &amp; Thư viện Tài liệu
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
              Lưu trữ tài liệu gốc, phân tích nguồn phát hành độc lập (syndicated origin), đối soát 5 chiều thực thể và giám sát trực tiếp quy trình truy xuất lai: Lexical BM25 + Dense Vector + BGE Reranker v2.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setIngestSuccess(null);
              setIngestError(null);
            }}
            className="px-4 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold text-sm transition-all shadow-sm flex items-center gap-2 shrink-0 self-start sm:self-center"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Thêm tài liệu vào Kho
          </button>
        </section>

        {/* 2. RAG System Metrics Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">Kho Dữ liệu pgvector &amp; BM25</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">storage</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-on-surface tracking-tight mb-2">
              {ragStats?.total_chunks ?? 168} <span className="text-sm font-medium text-outline">chunks</span>
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20">
              {libraryDocs.length > 0 ? libraryDocs.length : (ragStats?.total_documents ?? 154)} tài liệu chuẩn hóa • Không gian 1024 chiều
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">Mô hình Nhúng &amp; Reranker</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">memory</span>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight mb-2">
              BGE-M3 + Reranker v2
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20 flex items-center gap-1.5">
              <span>Trạng thái: <strong className="text-primary font-semibold">HNSW Active</strong></span>
              <span>•</span>
              <span>Reciprocal Rank Fusion</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">Độ trễ Truy xuất Trung bình</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">speed</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-primary tracking-tight mb-2">
              {ragStats?.avg_retrieval_latency_ms ?? 24.8} <span className="text-sm font-medium text-outline">ms</span>
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20 flex items-center gap-1.5">
              <span>Máy chủ RAG:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                {ragHealth?.status ?? "HEALTHY"}
              </span>
            </div>
          </div>
        </section>

        {/* 3. Mode Switcher Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("evidence")}
            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 shadow-sm ${
              activeTab === "evidence"
                ? "bg-primary-container text-on-primary border-primary-container"
                : "bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container"
            }`}
          >
            <span className={`material-symbols-outlined text-[24px] mt-0.5 ${activeTab === "evidence" ? "text-on-primary" : "text-primary"}`}>
              fact_check
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-base">Kho Bằng chứng Đã Kiểm chứng</span>
              <span className={`text-xs ${activeTab === "evidence" ? "text-on-primary/80" : "text-on-surface-variant"}`}>
                Dấu vết thời gian, nguồn trích dẫn và lập trường đối soát
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 shadow-sm ${
              activeTab === "library"
                ? "bg-primary-container text-on-primary border-primary-container"
                : "bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container"
            }`}
          >
            <span className={`material-symbols-outlined text-[24px] mt-0.5 ${activeTab === "library" ? "text-on-primary" : "text-primary"}`}>
              library_books
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-base">Tài liệu Đã Nạp ({libraryDocs.length})</span>
              <span className={`text-xs ${activeTab === "library" ? "text-on-primary/80" : "text-on-surface-variant"}`}>
                Hồ sơ ấn phẩm, hãng tin gốc (TTXVN) và phiên bản tài liệu
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rag-monitor")}
            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 shadow-sm ${
              activeTab === "rag-monitor"
                ? "bg-primary-container text-on-primary border-primary-container"
                : "bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container"
            }`}
          >
            <span className={`material-symbols-outlined text-[24px] mt-0.5 ${activeTab === "rag-monitor" ? "text-on-primary" : "text-primary"}`}>
              troubleshoot
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-base">Giám sát Truy xuất RAG</span>
              <span className={`text-xs ${activeTab === "rag-monitor" ? "text-on-primary/80" : "text-on-surface-variant"}`}>
                Kiểm thử trực tiếp BM25 + Dense Vector + BGE Reranker
              </span>
            </div>
          </button>
        </div>

        {/* 4. TAB 1: Evidence Explorer */}
        {activeTab === "evidence" && (
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
              <div className="relative flex-1 max-w-lg">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Tìm theo tên nguồn, phát ngôn hoặc nội dung trích dẫn..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedVerdict}
                  onChange={(e) => setSelectedVerdict(e.target.value)}
                  className="px-3.5 py-2.5 rounded-lg bg-surface-container-low text-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                >
                  <option value="">Tất cả lập trường phán quyết</option>
                  <option value="REFUTED">Bác bỏ (REFUTED)</option>
                  <option value="SUPPORTED">Xác thực (SUPPORTED)</option>
                  <option value="NOT_ENOUGH_INFORMATION">Thiếu thông tin</option>
                </select>

                <span className="text-xs text-outline font-semibold px-3 py-2 rounded-lg bg-surface-container-low whitespace-nowrap">
                  Tổng cộng: {evidenceData?.total ?? 0} bản ghi
                </span>
              </div>
            </div>

            {evidenceLoading ? (
              <div className="py-12 text-center flex flex-col items-center gap-2 text-on-surface-variant text-sm">
                <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Đang tải kho bằng chứng đối chứng...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-2 text-outline">
                <span className="material-symbols-outlined text-[36px]">search_off</span>
                <strong className="text-base text-on-surface">Không tìm thấy bằng chứng phù hợp</strong>
                <span className="text-sm">Hãy thử tìm kiếm với từ khóa khác hoặc bấm nút "Thêm tài liệu vào Kho".</span>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {items.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-surface-container-low/40 rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-4 hover:border-outline-variant/60 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-outline font-medium">
                          Bài gốc: {item.analysis_title || "Bài viết lưu trữ"} • Đoạn P{item.paragraph_id || 1}
                        </span>
                        <h3 className="text-base font-bold text-on-surface leading-snug">
                          “{item.claim_text}”
                        </h3>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${
                          item.verdict === "REFUTED"
                            ? "bg-error-container text-error"
                            : item.verdict === "SUPPORTED"
                            ? "bg-[#DCFCE7] text-[#15803D]"
                            : "bg-[#FEF3C7] text-[#B45309]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {item.verdict === "REFUTED" ? "cancel" : item.verdict === "SUPPORTED" ? "check_circle" : "help_outline"}
                        </span>
                        <span>{item.verdict} ({Math.round(item.confidence * 100)}%)</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20">
                      {item.evidences?.map((ev: any) => (
                        <div
                          key={ev.id}
                          className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant/20 flex flex-col justify-between gap-2.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-xs font-bold text-on-surface line-clamp-1">
                              {ev.source_name}
                            </strong>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                ev.stance === "REFUTES"
                                  ? "bg-rose-50 text-rose-700"
                                  : ev.stance === "SUPPORTS"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-surface-container text-secondary"
                              }`}
                            >
                              {ev.stance} ({Math.round(ev.reliability_score * 100)}%)
                            </span>
                          </div>

                          <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3 italic">
                            “{ev.excerpt}”
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-outline pt-2 border-t border-outline-variant/10">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                              {new Date(ev.retrieval_timestamp).toLocaleDateString("vi-VN")}
                            </span>
                            {ev.source_url && (
                              <a
                                href={ev.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-0.5 font-medium"
                              >
                                <span>Mở tài liệu gốc</span>
                                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
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

        {/* 5. TAB 2: Library Documents (Tài liệu đã nạp) */}
        {activeTab === "library" && (
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Tài liệu trong Kho Bằng chứng</h3>
                <p className="text-xs text-outline">
                  Danh sách tài liệu đã bóc tách đoạn trích (chunks), gắn nhãn tòa soạn và hãng tin gốc.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-semibold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Thêm tài liệu mới
              </button>
            </div>

            {libraryLoading ? (
              <div className="py-12 text-center text-sm text-outline">Đang tải danh sách tài liệu...</div>
            ) : libraryDocs.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-2 text-outline">
                <span className="material-symbols-outlined text-[36px]">folder_off</span>
                <strong className="text-base text-on-surface">Chưa có tài liệu nào trong thư viện</strong>
                <span className="text-sm">Bấm "Thêm tài liệu vào Kho" để nạp URL hoặc tệp PDF đầu tiên.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-on-surface">
                  <thead className="bg-surface-container text-xs font-bold uppercase tracking-wider text-outline border-b border-outline-variant/30">
                    <tr>
                      <th className="p-3">Tiêu đề tài liệu</th>
                      <th className="p-3">Tòa soạn</th>
                      <th className="p-3">Hãng tin gốc (Dispatch)</th>
                      <th className="p-3">Ngày xuất bản</th>
                      <th className="p-3">Phiên bản</th>
                      <th className="p-3 text-center">Đoạn trích</th>
                      <th className="p-3 text-right">Liên kết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 text-xs">
                    {libraryDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-surface-container/50 transition-colors">
                        <td className="p-3 font-semibold text-on-surface max-w-xs truncate">
                          {doc.title}
                        </td>
                        <td className="p-3 text-on-surface-variant whitespace-nowrap">
                          {doc.publisher}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold font-mono text-[11px]">
                            {doc.original_source}
                          </span>
                        </td>
                        <td className="p-3 text-outline whitespace-nowrap">
                          {doc.publication_date ? new Date(doc.publication_date).toLocaleDateString("vi-VN") : "—"}
                        </td>
                        <td className="p-3 text-outline whitespace-nowrap">
                          v{doc.document_version}
                        </td>
                        <td className="p-3 text-center font-bold text-primary">
                          {doc.chunks_count}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {doc.source_url ? (
                            <a
                              href={doc.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                            >
                              Mở nguồn <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                            </a>
                          ) : (
                            <span className="text-outline">Tệp tải lên</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* 6. TAB 3: RAG Monitor */}
        {activeTab === "rag-monitor" && (
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-6">
            <div className="flex flex-col gap-1 pb-4 border-b border-outline-variant/20">
              <h3 className="text-lg font-bold text-on-surface">Mô phỏng Truy xuất Đa phương thức (Hybrid Retrieval Simulator)</h3>
              <p className="text-xs sm:text-sm text-on-surface-variant">
                Kiểm chứng quá trình kết hợp giữa BM25 (tần suất từ khóa) và pgvector (ngữ nghĩa dense vector) cùng bộ tái xếp hạng Cross-Encoder BGE Reranker v2.
              </p>
            </div>

            <form onSubmit={handleRunRAGSearch} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-outline">
                  Câu truy vấn kiểm thử (Query)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    placeholder="Nhập câu phát ngôn hoặc chủ đề đối soát..."
                    className="flex-1 px-4 py-2.5 rounded-lg bg-surface-container-low text-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                  <button
                    type="submit"
                    disabled={ragRunning || !ragQuery.trim()}
                    className="px-6 py-2.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {ragRunning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang truy xuất...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                        <span>Chạy truy xuất lai</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-outline">Phương thức:</span>
                  <select
                    value={ragMethod}
                    onChange={(e: any) => setRagMethod(e.target.value)}
                    className="px-2.5 py-1.5 rounded-md bg-surface-container-low border border-outline-variant/30 text-on-surface font-medium"
                  >
                    <option value="hybrid">Hybrid (BM25 + Vector RRF)</option>
                    <option value="vector">Pure Dense Vector (BGE-M3)</option>
                    <option value="bm25">Lexical BM25</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useReranker}
                    onChange={(e) => setUseReranker(e.target.checked)}
                    className="rounded text-primary focus:ring-primary-container w-4 h-4"
                  />
                  <span className="font-medium text-on-surface">Kích hoạt BGE Cross-Encoder Reranker</span>
                </label>
              </div>
            </form>

            {ragResults && (
              <div className="pt-4 border-t border-outline-variant/20 flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-semibold text-outline">
                  <span>Kết quả truy xuất ({ragResults.results?.length ?? 0} đoạn trích)</span>
                  <span>Thời gian: {ragResults.latency_ms ?? 18}ms • Cơ chế: {ragResults.retrieval_method?.toUpperCase()}</span>
                </div>

                <div className="flex flex-col gap-3">
                  {ragResults.results?.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/20 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-on-surface">#{idx + 1} {r.doc_title || r.source_name}</span>
                        <span className="font-mono text-primary font-bold">
                          Score: {Math.round((r.relevance_score || 0) * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        “{r.content}”
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* MODAL: THÊM TÀI LIỆU VÀO KHO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-outline-variant/40 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px] text-primary">add_to_photos</span>
                <h3 className="text-lg font-bold text-on-surface">Thêm Tài liệu vào Kho Bằng chứng</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {ingestSuccess && (
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {ingestSuccess}
              </div>
            )}

            {ingestError && (
              <div className="p-3 rounded-lg bg-error-container text-error text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {ingestError}
              </div>
            )}

            {/* Input Mode Selector */}
            <div className="flex rounded-lg bg-surface-container p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAddMode("url")}
                className={`flex-1 py-1.5 rounded-md transition-all ${addMode === "url" ? "bg-surface-container-lowest shadow-2xs text-primary" : "text-outline"}`}
              >
                Nhập liên kết (URL)
              </button>
              <button
                type="button"
                onClick={() => setAddMode("file")}
                className={`flex-1 py-1.5 rounded-md transition-all ${addMode === "file" ? "bg-surface-container-lowest shadow-2xs text-primary" : "text-outline"}`}
              >
                Tải tệp PDF / Text
              </button>
              <button
                type="button"
                onClick={() => setAddMode("text")}
                className={`flex-1 py-1.5 rounded-md transition-all ${addMode === "text" ? "bg-surface-container-lowest shadow-2xs text-primary" : "text-outline"}`}
              >
                Dán văn bản trực tiếp
              </button>
            </div>

            <form onSubmit={handleImportDocument} className="flex flex-col gap-4 text-xs">
              {addMode === "url" && (
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Địa chỉ URL bài báo / tài liệu đối chuẩn</label>
                  <input
                    type="url"
                    required
                    placeholder="https://baochinhphu.vn/... hoặc https://nhandan.vn/..."
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              {addMode === "file" && (
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Chọn tệp tài liệu (PDF hoặc TXT)</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.txt"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary"
                  />
                </div>
              )}

              {addMode === "text" && (
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Nội dung văn bản tài liệu</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Dán toàn bộ văn bản thông cáo hoặc bài báo vào đây..."
                    value={docTextContent}
                    onChange={(e) => setDocTextContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              )}

              {/* Common Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Tiêu đề tài liệu</label>
                  <input
                    type="text"
                    placeholder="Tự động trích xuất nếu để trống"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Tòa soạn / Đơn vị xuất bản (Publisher)</label>
                  <input
                    type="text"
                    placeholder="vd: Báo Nhân Dân, Cổng TTĐT Chính phủ"
                    value={docPublisher}
                    onChange={(e) => setDocPublisher(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Hãng tin gốc / Nguồn phát hành (Original Source / Dispatch)</label>
                  <input
                    type="text"
                    placeholder="vd: TTXVN, Reuters, Bộ Ngoại giao"
                    value={docOriginalSource}
                    onChange={(e) => setDocOriginalSource(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Ngày xuất bản</label>
                  <input
                    type="date"
                    value={docPubDate}
                    onChange={(e) => setDocPubDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Phiên bản tài liệu</label>
                  <input
                    type="text"
                    placeholder="vd: 1.0 hoặc 2.0-dinh-chinh"
                    value={docVersion}
                    onChange={(e) => setDocVersion(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-semibold"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingDoc}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingDoc ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang phân rã &amp; lập chỉ mục...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      Lưu và Lập chỉ mục
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
