import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAnalysis } from "../context/AnalysisContext";
import { api } from "../api/client";
import { formatAgentName, formatStatus } from "../utils/i18n";

export default function MultiAgentMonitorPage() {
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id");
  const { article } = useAnalysis();

  const [activeTab, setActiveTab] = useState<"traces" | "models">("traces");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>("");

  // 1. Fetch recent analyses for dropdown
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["history", "agents"],
    queryFn: () => api.history.list({ page_size: 15 }),
  });

  const recentItems = historyData?.items || [];

  // Initialize selected analysis with query param, or active article, or first recent item
  useEffect(() => {
    if (queryId) {
      setSelectedAnalysisId(queryId);
    } else if (article.id && article.id !== "prototype-tuoitre-cancer" && !selectedAnalysisId) {
      setSelectedAnalysisId(article.id);
    } else if (recentItems.length > 0 && !selectedAnalysisId) {
      setSelectedAnalysisId(recentItems[0].id);
    }
  }, [queryId, article.id, recentItems, selectedAnalysisId]);

  const currentAnalysisId = selectedAnalysisId || recentItems[0]?.id || "";

  // 2. Fetch trace for selected analysis
  const {
    data: traceData,
    isLoading: traceLoading,
    refetch: refetchTrace,
  } = useQuery({
    queryKey: ["analyzer", "trace", currentAnalysisId],
    queryFn: () => (currentAnalysisId ? api.analyzer.getTrace(currentAnalysisId) : null),
    enabled: !!currentAnalysisId,
  });

  // 3. Fetch Model Catalog
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ["analyzer", "models"],
    queryFn: () => api.analyzer.getModels(),
  });

  const traces = traceData?.traces || [];
  const models = modelsData || [];

  const totalLatency =
    traceData?.total_latency_ms ||
    traces.reduce((sum: number, t: any) => sum + (t.latency_ms || t.execution_time_ms || 0), 0);

  const disagreementCount = traces.filter((t: any) => t.disagreement_detected).length;

  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-lg flex flex-col gap-space-lg">
      {/* Top Header Ribbon & Tab Switcher */}
      <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
              ĐIỀU PHỐI ĐA TÁC NHÂN & TRUY NGUYÊN NGUỒN GỐC
            </span>
          </div>
          <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
            Giám sát AI — Theo dõi & Truy vết Hệ thống Tác nhân
          </h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 max-w-3xl leading-relaxed">
            Theo dõi thời gian thực quy trình tương tác, độ trễ xử lý (ms), mô hình AI phục vụ, tập dữ liệu gắn kết và hiệu chuẩn đồng thuận EWAC.
          </p>
        </div>

        <div className="flex items-center gap-space-xs self-start md:self-auto shrink-0">
          <button
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 font-semibold ${
              activeTab === "traces"
                ? "bg-primary-container text-on-primary shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
            onClick={() => setActiveTab("traces")}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">account_tree</span>
            <span>Nhật ký Thực thi ({traces.length})</span>
          </button>
          <button
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 font-semibold ${
              activeTab === "models"
                ? "bg-primary-container text-on-primary shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
            onClick={() => setActiveTab("models")}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">memory</span>
            <span>Danh mục Mô hình ({models.length})</span>
          </button>
        </div>
      </section>

      {/* Architecture Diagram Card */}
      <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container">
        <div className="flex items-center justify-between pb-space-sm mb-space-md border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">schema</span>
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold block">
                Mô hình đồ thị điều phối
              </span>
              <h2 className="font-title-lg text-title-lg text-on-surface font-bold tracking-tight">
                Kiến trúc Đa tác nhân Độc lập & Tổng hợp Đồng thuận (EWAC)
              </h2>
            </div>
          </div>
          <span className="px-space-xs py-0.5 rounded-full bg-surface-container-highest text-secondary font-label-sm text-label-sm font-semibold hidden sm:inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
            Event-Driven
          </span>
        </div>

        {/* Horizontal Process Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md items-center my-space-sm">
          {/* Step 1: Input */}
          <div className="bg-surface-container-low rounded-xl p-space-md border border-surface-container flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center font-bold mb-2">
              <span className="material-symbols-outlined text-[22px]">input</span>
            </div>
            <strong className="font-label-md text-label-md text-on-surface font-bold">1. Tiếp nhận đầu vào</strong>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">URL / Toàn văn bài báo</span>
          </div>

          {/* Step 2: Parallel Agents */}
          <div className="bg-surface-container-low rounded-xl p-space-md border border-primary-container/30 flex flex-col items-center text-center relative shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-primary-container/10 text-primary-container flex items-center justify-center font-bold mb-2">
              <span className="material-symbols-outlined text-[22px]">diversity_3</span>
            </div>
            <strong className="font-label-md text-label-md text-primary font-bold">2. Tác nhân song song</strong>
            <div className="grid grid-cols-2 gap-1 w-full mt-1.5 text-[11px] font-semibold">
              <span className="bg-surface-container px-1.5 py-0.5 rounded text-on-surface">Kiểm chứng</span>
              <span className="bg-surface-container px-1.5 py-0.5 rounded text-on-surface">Độ tin cậy</span>
              <span className="bg-surface-container px-1.5 py-0.5 rounded text-on-surface">Dư luận</span>
              <span className="bg-surface-container px-1.5 py-0.5 rounded text-on-surface">Đọc hiểu</span>
            </div>
          </div>

          {/* Step 3: EWAC Consensus */}
          <div className="bg-surface-container-low rounded-xl p-space-md border border-surface-container flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-lg bg-tertiary-container/30 text-tertiary flex items-center justify-center font-bold mb-2">
              <span className="material-symbols-outlined text-[22px]">gavel</span>
            </div>
            <strong className="font-label-md text-label-md text-on-surface font-bold">3. Đồng thuận EWAC</strong>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Trọng số độ tin cậy</span>
          </div>

          {/* Step 4: Calibrated Verdict */}
          <div className="bg-surface-container-low rounded-xl p-space-md border border-surface-container flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center font-bold mb-2">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
            <strong className="font-label-md text-label-md text-[#15803D] font-bold">4. Phán quyết chuẩn</strong>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Hồ sơ thẩm định đầy đủ</span>
          </div>
        </div>

        <div className="mt-space-md p-space-sm rounded-lg bg-surface-container flex items-start gap-space-xs">
          <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">info</span>
          <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
            Nguyên tắc độc lập: Mỗi tác nhân hoạt động độc lập trong miền chuyên môn riêng; Tác nhân không được biểu quyết chéo sang tác vụ của tác nhân khác nhằm triệt tiêu thiên kiến nhận thức.
          </p>
        </div>
      </section>

      {/* Latency and State KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Tác nhân trong Phiên
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </span>
          </div>
          <div>
            <div className="font-title-lg text-title-lg text-on-surface font-bold">
              {traces.length > 0 ? traces.length : 6} Tác nhân
            </div>
            <span className="font-label-sm text-label-sm text-primary font-medium mt-0.5 block">
              Trạng thái: 100% Hoạt động thực tế
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Thời gian xử lý đa tác nhân
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">timer</span>
            </span>
          </div>
          <div>
            <div className="font-title-lg text-title-lg text-on-surface font-bold">
              {totalLatency} ms
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 block">
              Thực thi song song qua Event Loop
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Xung đột quan điểm
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">balance</span>
            </span>
          </div>
          <div>
            <div className="font-title-lg text-title-lg text-on-surface font-bold">
              {disagreementCount === 0 ? "0 Bất đồng" : `${disagreementCount} Cảnh báo`}
            </div>
            <span className="font-label-sm text-label-sm text-primary font-medium mt-0.5 block">
              Độ hội tụ đồng thuận: {disagreementCount === 0 ? "100%" : "Đã hiệu chuẩn"}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Mô hình AI Đăng ký
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">memory</span>
            </span>
          </div>
          <div>
            <div className="font-title-lg text-title-lg text-on-surface font-bold">
              {models.length} Mô hình
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 block line-clamp-1">
              NLI, Extractor, NELA, Opinion, WVS
            </span>
          </div>
        </div>
      </section>

      {/* TAB 1: EXECUTION TRACES */}
      {activeTab === "traces" && (
        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container overflow-hidden">
          {/* Toolbar */}
          <div className="p-space-md border-b border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-low/40">
            <div>
              <h2 className="font-title-lg text-title-lg text-on-surface font-bold">
                Nhật ký Thực thi Từng Tác nhân (Execution Trace)
              </h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Truy nguyên nguồn gốc mô hình, thời gian phản hồi và tập dữ liệu phục vụ
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
                Phiên phân tích:
              </label>
              <select
                value={currentAnalysisId}
                onChange={(e) => setSelectedAnalysisId(e.target.value)}
                className="bg-surface-container-lowest rounded-lg px-space-md py-1.5 border border-surface-container font-label-md text-label-md text-on-surface max-w-[280px] focus:outline-none focus:ring-2 focus:ring-primary-container"
              >
                {recentItems.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({new Date(item.created_at).toLocaleDateString("vi-VN")})
                  </option>
                ))}
              </select>
              <button
                className="p-1.5 rounded-lg border border-surface-container hover:bg-surface-container text-on-surface-variant transition-colors"
                onClick={() => refetchTrace()}
                title="Làm mới trace"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">sync</span>
              </button>
            </div>
          </div>

          {traceLoading || historyLoading ? (
            <div className="p-space-xl flex flex-col items-center justify-center min-h-[300px]">
              <span className="material-symbols-outlined text-[36px] text-primary animate-spin mb-3">sync</span>
              <p className="font-body-md text-body-md text-on-surface-variant">Đang tải dữ liệu vết thực thi tác nhân...</p>
            </div>
          ) : traces.length === 0 ? (
            <div className="p-space-xl flex flex-col items-center justify-center min-h-[300px] text-center">
              <span className="material-symbols-outlined text-[48px] text-outline mb-2">smart_toy</span>
              <strong className="font-title-lg text-title-lg text-on-surface">Chưa có vết thực thi nào cho phiên này</strong>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                Hãy chọn một bài viết khác từ danh sách hoặc gửi bài phân tích mới.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-container">
              {traces.map((agent: any, idx: number) => (
                <div
                  key={agent.id || agent.execution_id || idx}
                  className="p-space-md hover:bg-surface-container-low/40 transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-space-md"
                >
                  {/* Left: Agent Info */}
                  <div className="flex items-start gap-space-md min-w-[240px]">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/10 text-primary-container flex items-center justify-center shrink-0 font-bold">
                      <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                    </div>
                    <div>
                      <h4 className="font-title-lg text-title-lg text-on-surface font-bold">
                        {formatAgentName(agent.agent_name)}
                      </h4>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                        {agent.agent_role}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-mono text-[11px] font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">memory</span>
                          {agent.model_name || "TrustMedia-Agent"} v{agent.model_version || "1.0"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mid: Result Quote & Metas */}
                  <div className="flex-1">
                    <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                      "{agent.result_summary}"
                    </p>

                    {agent.disagreement_detected && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FEF3C7] text-[#B45309] font-label-sm text-label-sm font-semibold mt-2">
                        <span className="material-symbols-outlined text-[15px]">warning</span>
                        Phát hiện xung đột quan điểm giữa các nguồn dữ liệu
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-space-md text-on-surface-variant font-label-sm text-label-sm mt-space-sm pt-space-xs border-t border-surface-container/60">
                      {agent.dataset_ids && agent.dataset_ids.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-primary">database</span>
                          Tập dữ liệu: <strong>{agent.dataset_ids.join(", ")}</strong>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-primary">manage_search</span>
                        Truy xuất tri thức: <strong>{agent.retrieval_count ?? 0} bản ghi</strong>
                      </span>
                      {agent.execution_id && (
                        <span className="font-mono text-outline">
                          Mã thực thi: {agent.execution_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Latency & Status */}
                  <div className="flex items-center lg:flex-col lg:items-end justify-between gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded bg-surface-container font-mono text-label-sm text-on-surface font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-outline">schedule</span>
                      {agent.latency_ms || agent.execution_time_ms || 0} ms
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 ${
                        agent.status === "COMPLETED"
                          ? "bg-[#DCFCE7] text-[#15803D]"
                          : agent.status === "FAILED"
                          ? "bg-error-container text-error"
                          : "bg-surface-container text-secondary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {agent.status === "COMPLETED" ? "check_circle" : "sync"}
                      </span>
                      {formatStatus(agent.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: MODEL CATALOG */}
      {activeTab === "models" && (
        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container overflow-hidden">
          <div className="p-space-md border-b border-surface-container flex items-center justify-between bg-surface-container-low/40">
            <div>
              <h2 className="font-title-lg text-title-lg text-on-surface font-bold">
                Danh Mục Mô Hình AI (Model Catalog & Registry)
              </h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Đăng ký, kiểm tra trạng thái nạp bộ nhớ, trọng số hiệu chuẩn và số liệu đánh giá thực tế
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">
              Đã nạp: {models.length} mô hình
            </span>
          </div>

          {modelsLoading ? (
            <div className="p-space-xl flex flex-col items-center justify-center min-h-[300px]">
              <span className="material-symbols-outlined text-[36px] text-primary animate-spin mb-3">sync</span>
              <p className="font-body-md text-body-md text-on-surface-variant">Đang tải danh mục mô hình NLP...</p>
            </div>
          ) : (
            <div className="p-space-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
              {models.map((m: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-surface-container-low rounded-xl p-space-md border border-surface-container flex flex-col justify-between gap-space-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-title-lg text-title-lg text-on-surface font-bold">
                        <span className="material-symbols-outlined text-[18px] text-primary">memory</span>
                        <span>{m.model_name}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          m.loading_status === "LOADED" || m.loading_status === "BASELINE_CALIBRATED"
                            ? "bg-[#DCFCE7] text-[#15803D]"
                            : "bg-surface-container text-secondary"
                        }`}
                      >
                        {m.loading_status === "LOADED"
                          ? "Đã nạp"
                          : m.loading_status === "BASELINE_CALIBRATED"
                          ? "Đã hiệu chuẩn"
                          : "Chờ kích hoạt"}
                      </span>
                    </div>

                    <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">
                      <strong>Tác vụ:</strong> {m.task}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">
                      <strong>Phiên bản:</strong> v{m.model_version} • <strong>Phần cứng:</strong> {m.device}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      <strong>Nhà cung cấp:</strong> {m.provider}
                    </p>

                    {m.dataset_training_version && (
                      <div className="mt-2 p-1.5 rounded bg-surface-container text-on-surface font-label-sm text-[11px] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-primary">database</span>
                        <span>Huấn luyện: <strong>{m.dataset_training_version}</strong></span>
                      </div>
                    )}
                  </div>

                  {m.evaluation_metrics && (
                    <div className="mt-2 p-2 rounded-lg bg-[#DCFCE7]/40 border border-[#DCFCE7] text-[11px]">
                      <div className="font-bold text-[#15803D] mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">verified</span>
                        Chỉ số Đánh giá Thực tế:
                      </div>
                      <div className="flex flex-wrap gap-x-space-md gap-y-1 text-[#15803D] font-medium">
                        {m.evaluation_metrics.macro_f1 !== undefined && (
                          <span>Macro-F1: <strong>{(m.evaluation_metrics.macro_f1 * 100).toFixed(1)}%</strong></span>
                        )}
                        {m.evaluation_metrics.accuracy !== undefined && (
                          <span>Độ chính xác: <strong>{(m.evaluation_metrics.accuracy * 100).toFixed(1)}%</strong></span>
                        )}
                        {m.evaluation_metrics.calibration_ece !== undefined && (
                          <span>Sai số ECE: <strong>{m.evaluation_metrics.calibration_ece}</strong></span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
