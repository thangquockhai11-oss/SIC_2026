import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Network,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { api } from "../api/client";

export default function MultiAgentMonitorPage() {
  const [activeTab, setActiveTab] = useState<"traces" | "models">("traces");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>("");

  // 1. Fetch recent analyses for dropdown
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["history", "agents"],
    queryFn: () => api.history.list({ page_size: 10 }),
  });

  const recentItems = historyData?.items || [];
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 font-sans">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* 1. Academic Page Title Section */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-primary-container">smart_toy</span>
            <span className="font-label-sm text-[11px] uppercase tracking-wider font-semibold text-primary">
              ĐIỀU PHỐI ĐA TÁC TỬ // TRUY NGUYÊN NGUỒN GỐC &amp; HIỆU CHUẨN ĐỒNG THUẬN EWAC
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-normal leading-tight">
            Multi-Agent Monitor — Giám sát &amp; Truy vết Hệ thống Tác tử
          </h1>
          <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
            Theo dõi thời gian thực quy trình tương tác độc lập, độ trễ xử lý (ms), mô hình NLP phục vụ, tập dữ liệu gắn kết và hiệu chuẩn đồng thuận đa chiều EWAC.
          </p>
        </section>

        {/* 2. Top Architecture Diagram Card */}
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-outline block mb-1">
                MÔ HÌNH ĐỒ THỊ ĐIỀU PHỐI
              </span>
              <h2 className="text-lg font-bold text-on-surface">
                Kiến trúc Đa tác tử Độc lập &amp; Tổng hợp Đồng thuận (EWAC)
              </h2>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Network size={20} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
            {/* Step 1: Input */}
            <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center">
                <Cpu size={18} />
              </div>
              <span className="font-semibold text-sm text-on-surface">Input Ingestion</span>
              <span className="text-xs text-on-surface-variant">Bóc tách DOM, làm sạch HTML &amp; nhận diện thực thể</span>
            </div>

            {/* Step 2: Parallel Agents */}
            <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex flex-col gap-2">
              <span className="text-xs font-bold text-primary uppercase text-center block mb-1">
                4 Tác tử Song song Độc lập
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/20 font-medium text-center text-on-surface">
                  ClaimExtractor
                </div>
                <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/20 font-medium text-center text-on-surface">
                  MediaCredibility
                </div>
                <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/20 font-medium text-center text-on-surface">
                  PublicOpinion
                </div>
                <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/20 font-medium text-center text-on-surface">
                  Trust &amp; Reception
                </div>
              </div>
            </div>

            {/* Step 3: Meta-Agent */}
            <div className="bg-surface-container-low rounded-xl p-4 border border-primary/30 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
                <Bot size={18} />
              </div>
              <span className="font-semibold text-sm text-primary">Meta-Agent Consensus</span>
              <span className="text-xs text-on-surface-variant">Hiệu chuẩn EWAC &amp; kiểm soát xung đột phân kỳ</span>
            </div>

            {/* Step 4: Output */}
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <span className="font-semibold text-sm text-emerald-800">Calibrated Verdict</span>
              <span className="text-xs text-emerald-700">Kết luận xác thực đa chiều kèm độ tin cậy khoa học</span>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/20 text-xs text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">info</span>
            <span>
              Nguyên tắc thiết kế cốt lõi: Mỗi tác tử hoạt động độc lập trong miền chuyên môn riêng; Agent không được biểu quyết chéo sang tác vụ của Agent khác.
            </span>
          </div>
        </section>

        {/* 3. Latency & State KPI Row (4 Cards) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">Tác tử trong Phiên</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Zap size={16} />
              </div>
            </div>
            <div className="text-3xl font-bold text-on-surface tracking-tight mb-2">
              {traces.length > 0 ? traces.length : 6} <span className="text-sm font-medium text-outline">Agents</span>
            </div>
            <div className="text-xs text-emerald-700 font-medium pt-2 border-t border-outline-variant/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Trạng thái: 100% Hoạt động thực tế</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">Tổng thời gian xử lý</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-3xl font-bold text-primary tracking-tight mb-2">
              {totalLatency} <span className="text-sm font-medium text-outline">ms</span>
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20">
              Thực thi song song qua Event Loop
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">Tình trạng Xung đột</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-on-surface tracking-tight mb-2">
              {disagreementCount === 0 ? "0 Bất đồng" : `${disagreementCount} Cảnh báo`}
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20">
              Độ hội tụ đồng thuận: {disagreementCount === 0 ? "100%" : "Đã hiệu chuẩn EWAC"}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">Mô hình AI Đã Đăng ký</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Cpu size={16} />
              </div>
            </div>
            <div className="text-3xl font-bold text-on-surface tracking-tight mb-2">
              {models.length} <span className="text-sm font-medium text-outline">Mô hình</span>
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20">
              NLI, Extractor, NELA, Opinion, PHEME
            </div>
          </div>
        </section>

        {/* 4. Mode Switcher Tabs (Academic Segmented Control) */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("traces")}
            className={`flex-1 p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 shadow-sm ${
              activeTab === "traces"
                ? "bg-primary-container text-on-primary border-primary-container"
                : "bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container"
            }`}
          >
            <span className={`material-symbols-outlined text-[24px] mt-0.5 ${activeTab === "traces" ? "text-on-primary" : "text-primary"}`}>layers</span>
            <div className="flex flex-col">
              <span className="font-semibold text-base">Nhật ký Thực thi Từng Tác tử ({traces.length})</span>
              <span className={`text-xs ${activeTab === "traces" ? "text-on-primary/80" : "text-on-surface-variant"}`}>
                Truy nguyên nguồn gốc mô hình NLP, độ trễ và tập dữ liệu đối chứng của phiên
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("models")}
            className={`flex-1 p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 shadow-sm ${
              activeTab === "models"
                ? "bg-primary-container text-on-primary border-primary-container"
                : "bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container"
            }`}
          >
            <span className={`material-symbols-outlined text-[24px] mt-0.5 ${activeTab === "models" ? "text-on-primary" : "text-primary"}`}>memory</span>
            <div className="flex flex-col">
              <span className="font-semibold text-base">Danh mục Mô hình AI ({models.length})</span>
              <span className={`text-xs ${activeTab === "models" ? "text-on-primary/80" : "text-on-surface-variant"}`}>
                Kiểm tra trạng thái nạp bộ nhớ, trọng số hiệu chuẩn và số liệu Macro-F1 / ECE
              </span>
            </div>
          </button>
        </div>

        {/* 5. TAB 1: EXECUTION TRACES */}
        {activeTab === "traces" && (
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Nhật ký Vết Thực thi (Agent Execution Traces)</h2>
                <p className="text-xs text-on-surface-variant">
                  Truy nguyên nguồn gốc mô hình, thời gian và tập dữ liệu phục vụ
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-on-surface-variant whitespace-nowrap">Phiên phân tích:</label>
                <select
                  value={currentAnalysisId}
                  onChange={(e) => setSelectedAnalysisId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container max-w-xs"
                >
                  {recentItems.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({new Date(item.created_at).toLocaleTimeString("vi-VN")})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => refetchTrace()}
                  className="p-1.5 rounded-lg border border-outline-variant/30 hover:bg-surface-container text-on-surface transition-colors"
                  title="Làm mới trace"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {traceLoading || historyLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-sm">
                <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Đang tải dữ liệu vết thực thi tác tử...</span>
              </div>
            ) : traces.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-center">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline">
                  <Bot size={24} />
                </div>
                <strong className="text-base text-on-surface">Chưa có vết thực thi nào cho phiên này</strong>
                <span className="text-xs max-w-sm">
                  Hãy chọn một bài viết khác từ danh sách ở trên hoặc bắt đầu gửi bài phân tích mới.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {traces.map((agent: any, idx: number) => (
                  <div
                    key={agent.id || agent.execution_id || idx}
                    className="p-4 sm:p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors hover:border-outline-variant"
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                        <Bot size={20} />
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm text-on-surface">{agent.agent_name}</h4>
                          <span className="text-xs text-on-surface-variant">({agent.agent_role})</span>
                          <span className="px-2 py-0.5 rounded-md bg-surface-container-lowest text-primary text-[11px] font-medium border border-outline-variant/20 flex items-center gap-1">
                            <Cpu size={11} /> {agent.model_name || "TrustMedia-Agent"} v{agent.model_version || "1.0"}
                          </span>
                        </div>

                        <p className="text-xs text-on-surface-variant leading-relaxed bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20 italic">
                          "{agent.result_summary}"
                        </p>

                        {agent.disagreement_detected && (
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                            <span>Phát hiện xung đột quan điểm giữa các nguồn dữ liệu — Đã chuyển tiếp qua bộ hiệu chuẩn EWAC</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-on-surface-variant pt-1">
                          {agent.dataset_ids && agent.dataset_ids.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Database size={11} className="text-outline" />
                              Tập dữ liệu: <strong className="text-on-surface">{agent.dataset_ids.join(", ")}</strong>
                            </span>
                          )}
                          <span>•</span>
                          <span>
                            Truy xuất tri thức: <strong className="text-on-surface">{agent.retrieval_count ?? 0} bản ghi</strong>
                          </span>
                          {agent.execution_id && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-outline">
                                ID: {agent.execution_id.slice(0, 8)}...
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-outline-variant/20">
                      <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface text-xs font-mono font-medium flex items-center gap-1.5 border border-outline-variant/20">
                        <Clock size={12} className="text-outline" /> {agent.latency_ms || agent.execution_time_ms || 0} ms
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          agent.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : agent.status === "FAILED"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {agent.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 6. TAB 2: MODEL CATALOG */}
        {activeTab === "models" && (
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-4">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Danh Mục Mô Hình AI (Model Catalog &amp; Registry)</h2>
                <p className="text-xs text-on-surface-variant">
                  Đăng ký, kiểm tra trạng thái nạp bộ nhớ, trọng số hiệu chuẩn và chỉ số đánh giá thực tế
                </p>
              </div>
              <span className="text-xs font-semibold text-primary px-3 py-1 rounded-full bg-teal-50 border border-teal-200 self-start sm:self-auto">
                Đã nạp: {models.length} mô hình
              </span>
            </div>

            {modelsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-sm">
                <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Đang tải danh mục mô hình NLP...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {models.map((m: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                            <Cpu size={14} />
                          </div>
                          <strong className="text-sm font-bold text-on-surface leading-tight">{m.model_name}</strong>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                            m.loading_status === "LOADED" || m.loading_status === "BASELINE_CALIBRATED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-surface-container text-outline"
                          }`}
                        >
                          {m.loading_status}
                        </span>
                      </div>

                      <div className="text-xs text-on-surface-variant flex flex-col gap-1 mt-1">
                        <div>
                          <strong className="text-on-surface">Tác vụ:</strong> {m.task}
                        </div>
                        <div>
                          <strong className="text-on-surface">Phiên bản:</strong> v{m.model_version} • <strong className="text-on-surface">Phần cứng:</strong> {m.device}
                        </div>
                        <div>
                          <strong className="text-on-surface">Nhà cung cấp:</strong> {m.provider}
                        </div>
                      </div>

                      {m.dataset_training_version && (
                        <div className="text-xs text-on-surface-variant bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/20 flex items-center gap-1.5 mt-1">
                          <Database size={12} className="text-outline shrink-0" />
                          <span>
                            Huấn luyện trên: <strong className="text-on-surface">{m.dataset_training_version}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {m.evaluation_metrics && (
                      <div className="p-3 bg-emerald-50/80 rounded-lg border border-emerald-200 text-xs flex flex-col gap-1.5 mt-2">
                        <div className="font-bold text-emerald-900 text-[11px] uppercase tracking-wide">
                          Chỉ số Đánh giá Thực nghiệm
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-emerald-800">
                          {m.evaluation_metrics.macro_f1 !== undefined && (
                            <span>
                              Macro-F1: <strong>{(m.evaluation_metrics.macro_f1 * 100).toFixed(1)}%</strong>
                            </span>
                          )}
                          {m.evaluation_metrics.accuracy !== undefined && (
                            <span>
                              Độ chính xác: <strong>{(m.evaluation_metrics.accuracy * 100).toFixed(1)}%</strong>
                            </span>
                          )}
                          {m.evaluation_metrics.calibration_ece !== undefined && (
                            <span>
                              Sai số ECE: <strong>{m.evaluation_metrics.calibration_ece}</strong>
                            </span>
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
    </div>
  );
}
