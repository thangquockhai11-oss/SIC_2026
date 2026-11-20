import React, { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { AnalysisDetail, AnalysisListItem } from "../api/types";

export default function NewsAnalyzerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get("id");

  // Input states
  const [sourceUrl, setSourceUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Workflow states
  const [submitting, setSubmitting] = useState(false);
  const [pollingProgress, setPollingProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History & Modal states
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisListItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showTextModal, setShowTextModal] = useState(false);
  const [copiedCleanText, setCopiedCleanText] = useState(false);

  // Load recent analyses
  const loadRecent = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.history.list({ page: 1, page_size: 10 });
      setRecentAnalyses(res.items);
    } catch (err) {
      console.warn("Could not load recent analyses:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  // Load article if activeId param is present
  useEffect(() => {
    if (!activeId) return;
    let isMounted = true;
    api.analyzer
      .getDetail(activeId)
      .then((detail) => {
        if (isMounted) {
          setActiveAnalysis(detail);
          setJobStatus("COMPLETED");
          if (detail.source_url) setSourceUrl(detail.source_url);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err.response?.data?.detail || "Không thể tải dữ liệu hồ sơ bài báo.");
        }
      });
    return () => {
      isMounted = false;
    };
  }, [activeId]);

  // Keyboard navigation for text modal (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showTextModal) {
        setShowTextModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showTextModal]);

  // Submit URL workflow
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sourceUrl.trim() && !manualText.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);
    setJobStatus("SUBMITTED");
    setPollingProgress(20);

    try {
      const payload: { source_url?: string; content?: string } = {};
      if (sourceUrl.trim()) payload.source_url = sourceUrl.trim();
      if (manualText.trim()) payload.content = manualText.trim();

      const job = await api.analyzer.submit(payload);
      setSearchParams({ id: job.id });
      setJobStatus(job.status);

      // Poll until completed
      const pollTimer = setInterval(async () => {
        try {
          const statusRes = await api.analyzer.pollStatus(job.id);
          setPollingProgress(statusRes.progress_percent || 50);
          setJobStatus(statusRes.status);

          if (statusRes.status === "COMPLETED" || statusRes.status === "FAILED") {
            clearInterval(pollTimer);
            setSubmitting(false);

            if (statusRes.status === "COMPLETED") {
              const detail = await api.analyzer.getDetail(job.id);
              setActiveAnalysis(detail);
              loadRecent();
            } else {
              setErrorMessage(statusRes.error_message || "Quá trình trích xuất và phân tích thất bại.");
            }
          }
        } catch (err: any) {
          clearInterval(pollTimer);
          setSubmitting(false);
          setJobStatus("FAILED");
          setErrorMessage(err.response?.data?.detail || err.message || "Mất kết nối tới máy chủ phân tích tác tử.");
        }
      }, 1000);
    } catch (err: any) {
      setSubmitting(false);
      setJobStatus("FAILED");
      setErrorMessage(err.response?.data?.detail || "Không thể khởi tạo phiên phân tích URL.");
    }
  };

  // Derive current extraction state
  const extractionState = useMemo(() => {
    if (submitting) return "loading";
    if (errorMessage || jobStatus === "FAILED") return "failed";
    if (!activeAnalysis) return "idle";

    const snapshot = activeAnalysis.snapshots?.[0];
    if (snapshot?.extraction_status === "PAYWALL_DETECTED") return "partial";
    if (snapshot?.extraction_status === "TITLE_ONLY_EXTRACTED") return "partial";
    return "complete";
  }, [submitting, errorMessage, jobStatus, activeAnalysis]);

  const latestSnapshot = activeAnalysis?.snapshots?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 font-sans">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* Academic Page Title Section */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-primary-container">travel_explore</span>
            <span className="font-label-sm text-[11px] uppercase tracking-wider font-semibold text-primary">
              Mô-đun NLP Đầu vào // 01 · Trích xuất ngữ nghĩa
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-normal leading-tight">
            Phân tích bài viết &amp; Trích xuất Dữ liệu Đa Tác tử
          </h1>
          <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
            Thu thập trang đích theo luồng redirect, bóc tách cấu trúc DOM, lập hồ sơ phiên bản và trích xuất mệnh đề phục vụ đối soát thực nghiệm.
          </p>
        </section>

        {/* Primary URL Submission Workspace Card */}
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="url-input" className="font-label-md text-sm font-semibold text-on-surface flex items-center justify-between">
                <span>Địa chỉ trang báo cần phân tích (URL)</span>
                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-primary hover:underline text-xs font-normal"
                >
                  {showManualInput ? "Ẩn khung nhập thủ công" : "+ Nhập nội dung văn bản trực tiếp"}
                </button>
              </label>

              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">link</span>
                  <input
                    id="url-input"
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="Dán URL bài báo (VnExpress, Tuổi Trẻ, SGGP, Thanh Niên, VietnamNet...)"
                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-surface-container-low text-base text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || (!sourceUrl.trim() && !manualText.trim())}
                  className="px-6 py-3 rounded-lg bg-primary-container text-on-primary hover:bg-primary text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                      <span>Đang trích xuất...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">manage_search</span>
                      <span>Phân tích bài viết</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Manual text area collapsible */}
            {showManualInput && (
              <div className="flex flex-col gap-1.5 pt-2 animate-fadeIn">
                <label className="text-xs text-outline uppercase font-semibold">
                  Nội dung bài báo hoặc đoạn trích kiểm tra
                </label>
                <textarea
                  rows={4}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Dán toàn văn bài viết hoặc các đoạn trích dẫn báo chí cần bóc tách thực thể..."
                  className="w-full p-4 rounded-lg bg-surface-container-low text-base text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>
            )}
          </form>

          {/* Quick Examples */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant/20 text-xs text-on-surface-variant">
            <span className="text-outline font-semibold">Ví dụ kiểm chứng:</span>
            {[
              {
                label: "Tuổi Trẻ - Chiết xuất thảo dược",
                url: "https://tuoitre.vn/nghien-cuu-thao-duoc-ung-thu-gan-20241024.htm",
              },
              {
                label: "SGGP - ePaper Lưu trữ",
                url: "https://www.sggp.org.vn/epaper/",
              },
              {
                label: "VnExpress - Dự án đường sắt",
                url: "https://vnexpress.net/thoi-su/du-an-giao-thong.html",
              },
            ].map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => setSourceUrl(ex.url)}
                className="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface text-xs transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </section>

        {/* SINGLE EXTRACTION STATE DISPLAY */}
        {extractionState === "loading" && (
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-primary">
                <span className="material-symbols-outlined text-[24px] animate-spin">sync</span>
                <span className="text-lg font-semibold">
                  Đang thu thập và phân tích dữ liệu...
                </span>
              </div>
              <span className="font-mono font-semibold text-primary">{pollingProgress}%</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary-container transition-all duration-300 ease-out"
                style={{ width: `${pollingProgress}%` }}
              />
            </div>
            <p className="text-xs text-on-surface-variant">
              Tiến trình: Bóc tách DOM trang đích → Chuẩn hóa văn bản tiếng Việt → Phân rã mệnh đề và thực thể.
            </p>
          </section>
        )}

        {extractionState === "failed" && (
          <section className="bg-error-container/30 rounded-xl p-6 shadow-sm border border-error/20 flex flex-col gap-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-error">
              <span className="material-symbols-outlined text-[24px]">error</span>
              <h3 className="text-lg font-bold">Lỗi khi trích xuất hoặc xử lý bài báo</h3>
            </div>
            <p className="text-base text-on-surface-variant">
              {errorMessage || "Hệ thống không thể tải nội dung từ đường dẫn được cung cấp. Vui lòng kiểm tra lại URL hoặc sử dụng chức năng nhập văn bản trực tiếp."}
            </p>
          </section>
        )}

        {extractionState === "partial" && latestSnapshot && (
          <section className="bg-amber-50 rounded-xl p-6 shadow-sm border border-amber-200 flex flex-col gap-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="text-lg font-bold">
                Trích xuất giới hạn (Paywall hoặc Chỉ đọc tiêu đề)
              </h3>
            </div>
            <p className="text-base text-amber-900 leading-relaxed">
              Trang web có rào cản truy cập hoặc nội dung yêu cầu đăng nhập. Hệ thống chỉ trích xuất được tiêu đề: <strong>“{latestSnapshot.title}”</strong>.
            </p>
          </section>
        )}

        {extractionState === "complete" && activeAnalysis && (
          <section className="bg-surface-container-lowest rounded-xl p-6 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-outline-variant/20">
              <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                Đã đọc hoàn tất
              </span>
              <span className="text-xs text-outline font-mono">
                Mã lưu trữ: #TM-{activeAnalysis.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface leading-snug">
                {activeAnalysis.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 text-on-surface-variant text-sm pt-1">
                <span className="text-on-surface font-semibold">
                  {activeAnalysis.credibility?.source_name || (activeAnalysis.source_url ? new URL(activeAnalysis.source_url).hostname : "Tòa soạn")}
                </span>
                <span>•</span>
                <span>{latestSnapshot?.author || "Ban Biên tập"}</span>
                <span>•</span>
                <span>{latestSnapshot?.paragraphs?.length || 0} đoạn văn</span>
                <span>•</span>
                <span>{activeAnalysis.claims?.length || 0} luận điểm bóc tách</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setShowTextModal(true)}
                className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">subject</span>
                <span>Xem văn bản đã đọc</span>
              </button>

              <Link
                to={`/fact-checking?id=${activeAnalysis.id}`}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span>Hồ sơ kiểm chứng phát ngôn</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>

              <Link
                to={`/reports?id=${activeAnalysis.id}`}
                className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-sm transition-colors"
              >
                Báo cáo người đọc
              </Link>
            </div>
          </section>
        )}

        {/* Recent Analyses Archive Table */}
        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                Kho lưu trữ thực chứng
              </span>
              <h3 className="text-lg font-bold text-on-surface">
                Bài báo đã phân tích gần đây
              </h3>
            </div>
            <Link to="/history" className="text-primary hover:underline text-sm font-medium flex items-center gap-0.5">
              <span>Xem toàn bộ lịch sử</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>

          {loadingHistory ? (
            <div className="py-8 text-center text-on-surface-variant text-sm">
              Đang tải danh sách bài báo lưu trữ...
            </div>
          ) : recentAnalyses.length === 0 ? (
            <div className="py-8 text-center text-outline text-base">
              Chưa có bài báo nào trong cơ sở dữ liệu.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-outline text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Tiêu đề bài viết</th>
                    <th className="pb-3 font-semibold">Nguồn tin</th>
                    <th className="pb-3 font-semibold">Ngày tạo</th>
                    <th className="pb-3 font-semibold">Mệnh đề</th>
                    <th className="pb-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {recentAnalyses.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3.5 pr-4 max-w-md">
                        <Link
                          to={`/fact-checking?id=${item.id}`}
                          className="font-medium text-on-surface hover:text-primary line-clamp-1"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="py-3.5 pr-4 text-on-surface-variant text-xs">
                        {item.source_url ? new URL(item.source_url).hostname : "Nội dung dán"}
                      </td>
                      <td className="py-3.5 pr-4 text-outline text-xs whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-3.5 pr-4 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary font-medium">
                          {item.claims_count} luận điểm
                        </span>
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <Link
                          to={`/fact-checking?id=${item.id}`}
                          className="text-primary hover:underline text-xs font-semibold inline-flex items-center gap-0.5"
                        >
                          Đối soát <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal: "Xem văn bản đã đọc" */}
      {showTextModal && activeAnalysis && (
        <div
          className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowTextModal(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] bg-surface-container-lowest rounded-xl shadow-2xl p-6 flex flex-col border border-outline-variant/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">menu_book</span>
                <h3 className="text-lg font-bold text-on-surface">
                  Văn bản hệ thống đã đọc
                </h3>
              </div>
              <button
                onClick={() => setShowTextModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="py-3 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-on-surface-variant text-xs">
              <span className="font-medium text-on-surface line-clamp-1">{activeAnalysis.title}</span>
              <button
                type="button"
                onClick={() => {
                  const text = latestSnapshot?.paragraphs?.join("\n\n") || activeAnalysis.content || "";
                  navigator.clipboard.writeText(text);
                  setCopiedCleanText(true);
                  setTimeout(() => setCopiedCleanText(false), 2000);
                }}
                className="text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                <span>{copiedCleanText ? "Đã sao chép" : "Sao chép văn bản"}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {latestSnapshot?.paragraphs && latestSnapshot.paragraphs.length > 0 ? (
                latestSnapshot.paragraphs.map((p, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="font-mono text-outline font-semibold text-xs pt-1 select-none">
                      #{idx + 1}
                    </span>
                    <p className="text-base text-[#182824] leading-relaxed flex-1">
                      {p}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-base text-on-surface leading-relaxed whitespace-pre-wrap">
                  {activeAnalysis.content || "Chưa có nội dung toàn văn được lưu trữ."}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-outline">
              <span>Định dạng: Trích xuất DOM làm sạch tiếng Việt</span>
              <button
                type="button"
                onClick={() => setShowTextModal(false)}
                className="px-4 py-1.5 rounded-lg bg-surface-container-high text-on-surface text-sm font-medium hover:bg-surface-container-highest"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
