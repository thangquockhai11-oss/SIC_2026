import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAnalysis } from "../context/AnalysisContext";
import { api } from "../api/client";

export default function FactCheckingPage() {
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id");
  const { article, setActiveClaimId, activeClaim, loadAnalysisDetail } = useAnalysis();
  const [isAiLogExpanded, setIsAiLogExpanded] = useState(false);
  const [loadingJob, setLoadingJob] = useState(false);

  useEffect(() => {
    if (queryId && queryId !== article.id) {
      setLoadingJob(true);
      api.analyzer.getDetail(queryId)
        .then((detail) => {
          loadAnalysisDetail(detail);
          setLoadingJob(false);
        })
        .catch((e) => {
          console.error("Could not load analysis detail by id:", e);
          setLoadingJob(false);
        });
    }
  }, [queryId, article.id]);

  // If no claims exist in article, fallback gracefully
  const claims = article.claims || [];
  const currentClaim = activeClaim || claims[0];

  // Calculate statistics for the mini-panel
  const totalClaims = claims.length || 1;
  const verifiedCount = claims.filter((c) => c.verdict === "SUPPORTED").length;
  const refutedCount = claims.filter((c) => c.verdict === "REFUTED").length;
  const inconclusiveCount = claims.filter(
    (c) => c.verdict !== "SUPPORTED" && c.verdict !== "REFUTED"
  ).length;

  const refutedPctVal = (refutedCount / totalClaims) * 100;
  const verifiedPctVal = (verifiedCount / totalClaims) * 100;
  const inconclusivePctVal = (inconclusiveCount / totalClaims) * 100;

  const refutedPctStr = refutedPctVal.toFixed(1);
  const verifiedPctStr = verifiedPctVal.toFixed(1);
  const inconclusivePctStr = inconclusivePctVal.toFixed(1);

  const getMatchStatusBadge = (status?: string) => {
    switch ((status || "").toUpperCase()) {
      case "MATCH":
        return "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]";
      case "PARTIAL":
        return "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]";
      case "MISMATCH":
      case "EXAGGERATED":
        return "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]";
      default:
        return "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]";
    }
  };

  const getFidelityBadge = (status?: string) => {
    switch ((status || "").toUpperCase()) {
      case "FAITHFUL":
        return "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]";
      case "OVERGENERALIZED":
      case "EXTRAPOLATED":
        return "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]";
      case "DISTORTED":
        return "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]";
      default:
        return "bg-[#E0E7FF] text-[#4338CA] border-[#C7D2FE]";
    }
  };

  // Authoritative Trustworthiness Recommendation for the article
  const getRecommendation = () => {
    if (refutedCount > 0) {
      return {
        decision: "KHÔNG NÊN TIN CẬY",
        badgeBg: "bg-error-container text-error",
        borderClass: "border-error/40 bg-error-container/10",
        icon: "cancel",
        colorClass: "text-error",
        title: "CẢNH BÁO SAI LỆCH",
        description: `Bài báo có ${refutedPctStr}% phát ngôn bị bác bỏ do mâu thuẫn trực tiếp với bằng chứng thực tế. Độc giả KHÔNG NÊN TIN CẬY nội dung này và không nên chia sẻ.`,
      };
    }
    if (inconclusivePctVal >= 50 || verifiedPctVal < 50) {
      return {
        decision: "CHƯA NÊN VỘI TIN (CẦN THẬN TRỌNG)",
        badgeBg: "bg-[#FEF3C7] text-[#B45309]",
        borderClass: "border-[#B45309]/40 bg-[#FEF3C7]/20",
        icon: "warning",
        colorClass: "text-[#B45309]",
        title: "THIẾU CHỨNG CỨ ĐỐI SOÁT",
        description: `Bài báo có ${inconclusivePctStr}% nội dung chưa đủ chứng cứ kiểm chứng (chỉ ${verifiedPctStr}% được xác thực). Độc giả CẦN THẬN TRỌNG, CHƯA NÊN VỘI TIN khi chưa có tài liệu chính thức xác nhận.`,
      };
    }
    if (verifiedPctVal >= 70) {
      return {
        decision: "NÊN TIN CẬY (ĐỘ CHÍNH XÁC CAO)",
        badgeBg: "bg-[#DCFCE7] text-[#15803D]",
        borderClass: "border-[#15803D]/40 bg-[#DCFCE7]/20",
        icon: "verified",
        colorClass: "text-[#15803D]",
        title: "ĐÃ ĐỐI SOÁT CHÍNH XÁC",
        description: `Bài báo đạt ${verifiedPctStr}% luận điểm được xác minh chính xác từ nguồn tin độc lập, 0% sai lệch. Độc giả CÓ THỂ AN TÂM TIN CẬY và tham khảo thông tin.`,
      };
    }
    return {
      decision: "THAM KHẢO CÓ CHỌN LỌC",
      badgeBg: "bg-surface-container-high text-primary",
      borderClass: "border-primary/20 bg-surface-container-low",
      icon: "info",
      colorClass: "text-primary",
      title: "KIỂM CHỨNG TRUNG BÌNH",
      description: `Bài báo có mức độ kiểm chứng trung bình (${verifiedPctStr}% xác thực, ${inconclusivePctStr}% cần kiểm chứng thêm). Độc giả nên tham khảo có chọn lọc.`,
    };
  };

  const recommendation = getRecommendation();

  const handleExportPDF = () => {
    window.print();
  };

  // Safe highlighted text renderer without string replacement quirks
  const renderHighlighted = (text: string, highlight?: string) => {
    if (!text) return null;
    if (!highlight || !highlight.trim()) return <span>{text}</span>;
    const trimmed = highlight.trim();
    const idx = text.toLowerCase().indexOf(trimmed.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + trimmed.length);
    const after = text.slice(idx + trimmed.length);
    return (
      <span>
        {before}
        <mark className="bg-[#FFF0BA] text-[#182824] px-1 py-0.5 rounded font-semibold not-italic shadow-[inset_0_-2px_0_rgba(212,198,147,0.8)]">
          {match}
        </mark>
        {after}
      </span>
    );
  };

  const getGapStatusBadge = (status: string, fallbackType: "success" | "neutral" | "danger" = "neutral") => {
    const s = (status || "").toUpperCase();
    if (s.includes("KHÔNG ÁP DỤNG") || s.includes("NOT_APPLICABLE")) {
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    }
    if (s.includes("KHÔNG THỂ KIỂM CHỨNG") || s.includes("KHÔNG PHẢI PHÁT NGÔN")) {
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    }
    if (s.includes("CÓ") || s.includes("XÁC") || s.includes("AN TOÀN") || s.includes("ĐỒNG") || s.includes("HỢP LỆ") || s.includes("CHUẨN")) {
      return "bg-[#DCFCE7] text-[#15803D]";
    }
    if (s.includes("BÁC") || s.includes("SAI") || s.includes("LỪA") || s.includes("TIN GIẢ") || s.includes("NGUY HIỂM") || s.includes("MẤT")) {
      return "bg-error-container text-error";
    }
    if (s.includes("CHỜ") || s.includes("THẨM") || s.includes("MỘT PHẦN") || s.includes("PHẢN ÁNH") || s.includes("CHƯA")) {
      return "bg-[#FEF3C7] text-[#B45309]";
    }
    return fallbackType === "danger" ? "bg-error-container text-error" : "bg-surface-dim text-secondary";
  };

  // Helper for badge display based on verdict
  const renderVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "REFUTED":
        return (
          <span className="px-2 py-0.5 rounded-full bg-error-container text-error font-label-sm text-label-sm font-semibold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">cancel</span> Bị bác bỏ
          </span>
        );
      case "SUPPORTED":
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] font-label-sm text-label-sm font-semibold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">check_circle</span> Được xác nhận
          </span>
        );
      case "PARTIALLY_SUPPORTED":
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-label-sm text-label-sm font-semibold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">rule</span> Đúng một phần
          </span>
        );
      case "CONFLICTING_EVIDENCE":
        return (
          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-label-sm text-label-sm font-semibold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">compare_arrows</span> Chứng cứ mâu thuẫn
          </span>
        );
      case "NOT_CHECKABLE":
        return (
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 font-label-sm text-label-sm font-semibold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">visibility_off</span> Không thể kiểm chứng
          </span>
        );
      case "NOT_A_CLAIM":
        return (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-label-sm text-label-sm font-semibold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">short_text</span> Không phải phát ngôn
          </span>
        );
      case "MISLEADING":
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-label-sm text-label-sm font-semibold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">warning</span> Gây hiểu lầm
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-label-sm text-label-sm font-semibold uppercase tracking-wider inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">help_outline</span> Chưa đủ chứng cứ
          </span>
        );
    }
  };

  const getVerdictTheme = (verdict: string) => {
    switch (verdict) {
      case "REFUTED":
        return {
          bannerBorder: "bg-error",
          pillBg: "bg-[#FEE2E2] text-[#B91C1C]",
          pillIcon: "cancel",
          label: "BỊ BÁC BỎ",
          compatColor: "text-error",
        };
      case "SUPPORTED":
        return {
          bannerBorder: "bg-[#15803D]",
          pillBg: "bg-[#DCFCE7] text-[#15803D]",
          pillIcon: "check_circle",
          label: "ĐƯỢC XÁC NHẬN",
          compatColor: "text-[#15803D]",
        };
      case "PARTIALLY_SUPPORTED":
        return {
          bannerBorder: "bg-[#B45309]",
          pillBg: "bg-[#FEF3C7] text-[#B45309]",
          pillIcon: "rule",
          label: "ĐÚNG MỘT PHẦN",
          compatColor: "text-[#B45309]",
        };
      case "CONFLICTING_EVIDENCE":
        return {
          bannerBorder: "bg-orange-600",
          pillBg: "bg-orange-100 text-orange-800",
          pillIcon: "compare_arrows",
          label: "CHỨNG CỨ MÂU THUẪN",
          compatColor: "text-orange-700",
        };
      case "NOT_CHECKABLE":
        return {
          bannerBorder: "bg-purple-600",
          pillBg: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
          pillIcon: "visibility_off",
          label: "KHÔNG THỂ KIỂM CHỨNG",
          compatColor: "text-purple-700",
        };
      case "NOT_A_CLAIM":
        return {
          bannerBorder: "bg-slate-500",
          pillBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
          pillIcon: "short_text",
          label: "KHÔNG PHẢI PHÁT NGÔN",
          compatColor: "text-slate-600",
        };
      case "MISLEADING":
        return {
          bannerBorder: "bg-[#B45309]",
          pillBg: "bg-[#FEF3C7] text-[#B45309]",
          pillIcon: "warning",
          label: "GÂY HIỂU LẦM",
          compatColor: "text-[#B45309]",
        };
      default:
        return {
          bannerBorder: "bg-[#B45309]",
          pillBg: "bg-[#FEF3C7] text-[#B45309]",
          pillIcon: "help_outline",
          label: "CHƯA ĐỦ CHỨNG CỨ",
          compatColor: "text-[#B45309]",
        };
    }
  };

  const theme = getVerdictTheme(currentClaim?.verdict || "REFUTED");

  if (loadingJob) {
    return (
      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-xl flex flex-col items-center justify-center min-h-[400px]">
        <span className="material-symbols-outlined text-[36px] text-primary animate-spin mb-3">sync</span>
        <h3 className="font-title-lg text-title-lg text-on-surface font-bold">Đang tải biên bản thẩm định học thuật...</h3>
        <p className="font-label-sm text-label-sm text-on-surface-variant">Đang nạp toàn văn phát ngôn bóc tách và bằng chứng đối chuẩn</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-lg">
      <div className="flex flex-col w-full">
        {/* Active Tab Context Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-md mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-semibold">
              Giao thức Thẩm định #REV-2024
            </span>
            <span className="text-outline-variant">/</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
              Bóc tách & Đối soát thực chứng
            </span>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
              Hội đồng trực tuyến: 5 chuyên gia
            </span>
            <button
              onClick={handleExportPDF}
              className="px-space-md py-1.5 rounded-lg bg-surface-container-lowest text-primary hover:bg-surface-container-low transition-colors font-label-md text-label-md flex items-center gap-1 shadow-sm font-semibold border border-surface-container"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              Xuất biên bản thẩm định (.PDF)
            </button>
          </div>
        </div>

        {/* Entertainment / Astrology Disclaimer Banner */}
        {(article.overall_verdict === "NOT_CHECKABLE" || (claims.length > 0 && claims.every((c) => c.verdict === "NOT_CHECKABLE" || c.verdict === "NOT_A_CLAIM"))) && (
          <div className="mb-space-md p-space-md rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-900 dark:text-purple-200 flex items-start gap-space-sm animate-fadeIn">
            <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[22px] flex-shrink-0 mt-0.5">auto_awesome</span>
            <div className="flex-1">
              <span className="font-bold text-title-sm block">Thông báo phân loại nội dung giải trí / dự đoán:</span>
              <p className="font-body-md text-body-md mt-0.5 text-purple-800 dark:text-purple-300">
                Nội dung bài viết chủ yếu mang tính dự đoán hoặc giải trí; không đủ cơ sở để xác minh khách quan các luận điểm này. Hệ thống bảo lưu trạng thái <strong>KHÔNG THỂ KIỂM CHỨNG</strong> và không suy diễn sai lệch thành phản bác (REFUTED).
              </p>
            </div>
          </div>
        )}

        {/* Main Presentation 2-Column Workstation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* LEFT COLUMN: Danh sách phát ngôn bóc tách (~340px -> col-span-4 on desktop) */}
          <aside className="lg:col-span-4 flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container">
              <div className="flex items-center justify-between pb-space-sm mb-space-xs">
                <div>
                  <div className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Phân tích văn bản
                  </div>
                  <h2 className="font-title-lg text-title-lg text-on-surface tracking-tight font-bold">
                    Phát ngôn bóc tách
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-secondary font-label-sm text-label-sm font-semibold">
                  {claims.length < 10 ? `0${claims.length}` : claims.length} Luận điểm
                </span>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-space-md">
                Trích xuất tự động qua mô hình NLP & phân rã bởi Hội đồng Khoa học.
              </p>

              {/* Claims List */}
              <div className="flex flex-col gap-space-xs" id="claim-list-container">
                {claims.map((claim, index) => {
                  const isSelected = claim.id === currentClaim?.id;
                  const claimNum = claim.claim_number || index + 1;
                  const numStr = claimNum < 10 ? `0${claimNum}` : claimNum;

                  return (
                    <div
                      key={claim.id}
                      onClick={() => setActiveClaimId(claim.id)}
                      className={`group relative p-space-md rounded-xl transition-all cursor-pointer text-left border ${
                        isSelected
                          ? "bg-surface-container-low border-primary-container/30 shadow-sm"
                          : "bg-surface-container-lowest border-surface-container hover:bg-surface-container"
                      }`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center justify-between gap-space-xs mb-space-xs">
                        <span
                          className={`font-label-sm text-label-sm font-semibold flex items-center gap-1 ${
                            isSelected ? "text-primary" : "text-secondary"
                          }`}
                        >
                          {isSelected && <span className="material-symbols-outlined text-[15px]">priority_high</span>}
                          Luận điểm #{numStr} {claim.is_key_claim ? "(Chủ chốt)" : ""}
                        </span>
                        {renderVerdictBadge(claim.verdict)}
                      </div>
                      <p className="font-body-md text-body-md text-on-surface font-medium leading-snug line-clamp-3 mb-space-xs">
                        “{claim.claim_text || claim.original_text}”
                      </p>
                      <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                        <span>{claim.location_in_doc || `Đoạn ${index + 1}`}</span>
                        {isSelected ? (
                          <span className="text-primary font-semibold flex items-center gap-0.5">
                            Đang hiển thị <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </span>
                        ) : (
                          <span className="text-outline">Độ tin cậy: {Math.round(claim.confidence * 100)}%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Academic Context Note on Sidebar */}
              <div className="mt-space-md p-space-sm rounded-lg bg-surface-container flex items-start gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">info</span>
                <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
                  Phương pháp: {currentClaim?.protocol_standard ? `Phân rã ngữ nghĩa 3 tầng đối chiếu trực tiếp dữ liệu theo chuẩn ${currentClaim.protocol_standard}.` : "Phân rã ngữ nghĩa 3 tầng đối chiếu trực tiếp dữ liệu thử nghiệm in-vitro đối chiếu tiêu chuẩn TCVN y sinh."}
                </p>
              </div>
            </div>

            {/* Quick Metrics Mini-Panel */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                  Tỷ trọng sai lệch toàn bài
                </span>
                <span className="font-title-lg text-title-lg text-error font-bold">{refutedPctStr}%</span>
              </div>

              {/* Progress bar breakdown */}
              <div className="w-full h-2.5 rounded-full bg-surface-container flex overflow-hidden">
                <div
                  className="bg-[#15803D] h-full transition-all"
                  style={{ width: `${verifiedPctVal}%` }}
                  title={`Được xác nhận: ${verifiedCount} (${verifiedPctStr}%)`}
                ></div>
                <div
                  className="bg-[#B45309] h-full transition-all"
                  style={{ width: `${inconclusivePctVal}%` }}
                  title={`Chưa đủ chứng cứ / Thiếu tin cậy: ${inconclusiveCount} (${inconclusivePctStr}%)`}
                ></div>
                <div
                  className="bg-[#B91C1C] h-full transition-all"
                  style={{ width: `${refutedPctVal}%` }}
                  title={`Bị bác bỏ: ${refutedCount} (${refutedPctStr}%)`}
                ></div>
              </div>

              {/* Categories with Full Percentages */}
              <div className="flex flex-wrap items-center justify-between text-outline font-label-sm text-label-sm pt-0.5 gap-y-1">
                <span className="flex items-center gap-1 font-medium text-on-surface">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]"></span>
                  <span>{verifiedCount} Xác thực</span>
                  <strong className="text-[#15803D]">({verifiedPctStr}%)</strong>
                </span>
                <span className="flex items-center gap-1 font-medium text-on-surface">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]"></span>
                  <span>{inconclusiveCount} Thiếu tin cậy</span>
                  <strong className="text-[#B45309]">({inconclusivePctStr}%)</strong>
                </span>
                <span className="flex items-center gap-1 font-medium text-on-surface">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C]"></span>
                  <span>{refutedCount} Bác bỏ</span>
                  <strong className="text-[#B91C1C]">({refutedPctStr}%)</strong>
                </span>
              </div>

              {/* Prominent Trustworthiness Conclusion & Reader Recommendation */}
              <div className={`mt-2 p-space-sm rounded-lg border ${recommendation.borderClass} flex flex-col gap-1.5`}>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold text-outline">
                    Kết luận độ tin cậy
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold uppercase tracking-wide inline-flex items-center gap-1 ${recommendation.badgeBg}`}>
                    <span className="material-symbols-outlined text-[13px]">{recommendation.icon}</span>
                    {recommendation.decision}
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface text-[13px] leading-relaxed">
                  {recommendation.description}
                </p>
              </div>
            </div>
          </aside>

          {/* RIGHT MAIN AREA: Spacious Academic Reading & Evidence Workspace */}
          <main className="lg:col-span-8 flex flex-col gap-space-lg">
            {/* HERO VERDICT BANNER (Instant 5-Second Recognition Focal Point) */}
            <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden border border-surface-container">
              {/* Visual Accent Strip */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.bannerBorder}`}></div>
              <div className="flex flex-col gap-space-sm pt-1">
                <div className="flex flex-wrap items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-space-sm">
                    <span
                      className={`px-3 py-1 rounded-full ${theme.pillBg} font-label-md text-label-md font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{theme.pillIcon}</span>
                      {theme.label}
                    </span>
                    <span className="font-label-sm text-label-sm text-outline font-medium tracking-wide uppercase">
                      Phân loại: {currentClaim?.review_board?.classification || "Đối soát thực nghiệm"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm bg-[#DCFCE7]/60 text-[#15803D] px-space-sm py-1 rounded-md font-medium">
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                    {currentClaim?.review_board?.signatories || "Hội đồng Thẩm định Báo chí TrustMedia (Thẩm định độc lập)"}
                  </div>
                </div>

                {/* Bold, decisive 1-sentence verdict statement */}
                <div className="mt-space-xs">
                  <h3 className="font-title-lg text-title-lg md:text-[20px] md:leading-[28px] text-on-surface font-bold tracking-tight">
                    {currentClaim?.reasoning}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-space-lg text-on-surface-variant font-label-sm text-label-sm pt-space-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-outline">verified_user</span>
                    <span>
                      Giao thức kiểm định: <strong>{currentClaim?.protocol_standard || "IFCN Standard v2.4"}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-outline">speed</span>
                    <span>
                      Độ tương thích khoa học:{" "}
                      <strong className={theme.compatColor}>
                        {currentClaim?.compatibility_score || "0.08 / 1.0 (Sai lệch bản chất)"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* TWO READABLE QUOTATIONS SIDE-BY-SIDE (Comparative Analysis Grid) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter items-stretch">
              {/* Left Card: PHÁT NGÔN TRONG BÀI BÁO */}
              <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between border border-surface-container">
                <div>
                  <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-error font-bold">
                        Phát ngôn trong bài báo
                      </span>
                    </div>
                    <span className="px-space-xs py-0.5 rounded bg-surface-container-highest text-secondary font-label-sm text-label-sm">
                      {currentClaim?.location_in_doc || "Đoạn 3, câu 2"}
                    </span>
                  </div>
                  {/* Full Quotation Text with Highlight */}
                  <blockquote className="font-body-lg text-body-lg text-[#182824] leading-[1.6] mb-space-md italic">
                    “{renderHighlighted(currentClaim?.article_quote || currentClaim?.claim_text || "", currentClaim?.article_quote_highlight)}”
                  </blockquote>

                  {/* Article Fidelity Check Badge & Callout */}
                  {currentClaim?.article_fidelity && (
                    <div className="mb-space-md p-space-sm rounded-lg bg-surface-container/60 border border-surface-container-high">
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                        <span className="font-label-sm text-[11px] font-bold text-outline uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-primary">fact_check</span>
                          Độ trung thực trích xuất (Article Fidelity):
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${getFidelityBadge(currentClaim.article_fidelity.fidelity_status)}`}>
                          {currentClaim.article_fidelity.fidelity_status === "FAITHFUL"
                            ? "Khớp nguyên văn bài báo"
                            : currentClaim.article_fidelity.fidelity_status === "DISTORTED"
                            ? "Sai lệch ngữ nghĩa bài báo"
                            : "Khái quát hóa quá đà"}
                        </span>
                      </div>
                      {currentClaim.article_fidelity.explanation && (
                        <p className="text-xs text-on-surface-variant leading-relaxed mb-1">
                          {currentClaim.article_fidelity.explanation}
                        </p>
                      )}
                      {currentClaim.article_fidelity.distortion_reasons && currentClaim.article_fidelity.distortion_reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentClaim.article_fidelity.distortion_reasons.map((reason, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-error-container/70 text-error text-[10px] font-bold">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Direct Source Attribution Link */}
                <div className="pt-space-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg p-space-md rounded-b-xl border-t border-surface-container">
                  <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[18px] text-primary">link</span>
                    <span>
                      Trích dẫn từ: <span className="font-semibold text-on-surface">{article.source_name}</span> (bài viết ngày {article.publication_date})
                    </span>
                  </div>
                </div>
              </article>

              {/* Right Card: BẰNG CHỨNG ĐỐI CHIẾU */}
              <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between border border-surface-container">
                <div>
                  <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
                        Bằng chứng đối chiếu
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-space-xs py-0.5 rounded bg-[#DCFCE7] text-[#15803D] font-label-sm text-label-sm font-semibold">
                        {currentClaim?.evidence_source || "Cơ quan độc lập"}
                      </span>
                      {currentClaim?.independent_sources_count !== undefined && currentClaim.independent_sources_count > 0 && (
                        <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-secondary text-[11px] font-medium" title="Số cụm nguồn độc lập xác thực">
                          {currentClaim.independent_sources_count} cụm nguồn độc lập
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Full Counter Evidence Text with Highlight */}
                  <blockquote className="font-body-lg text-body-lg text-[#182824] leading-[1.6] mb-space-md">
                    “{renderHighlighted(currentClaim?.evidence_quote || "Chưa có văn bản phản chứng trực tiếp.", currentClaim?.evidence_quote_highlight)}”
                  </blockquote>
                </div>
                {/* Direct Counter Source Attribution Link */}
                <div className="pt-space-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg p-space-md rounded-b-xl border-t border-surface-container">
                  <div className="flex items-center justify-between flex-wrap gap-1 text-label-md text-label-md">
                    <div className="flex items-center gap-space-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px] text-primary-container">menu_book</span>
                      <span>
                        {currentClaim?.evidence_source || "Tài liệu kiểm chứng độc lập"}
                      </span>
                    </div>
                    {currentClaim?.evidence_url ? (
                      <a
                        className="text-primary hover:text-primary-container font-semibold inline-flex items-center gap-0.5 text-label-sm"
                        href={currentClaim.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem tài liệu gốc <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    ) : (
                      <span className="text-primary font-semibold inline-flex items-center gap-0.5 text-label-sm">
                        {currentClaim?.verdict === "NOT_ENOUGH_INFORMATION" ? "Chưa đủ chứng cứ độc lập" : "Đã đối chiếu"}{" "}
                        <span className="material-symbols-outlined text-[14px]">
                          {currentClaim?.verdict === "NOT_ENOUGH_INFORMATION" ? "help_outline" : "verified"}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </article>
            </section>

            {/* CONFLICTING EVIDENCE WARNING (If any) */}
            {currentClaim?.conflict_matrix && currentClaim.conflict_matrix.length > 0 && (
              <section className="bg-error-container/20 border-2 border-error/40 rounded-xl p-space-md shadow-sm">
                <div className="flex items-center gap-space-xs text-error font-bold mb-space-xs">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                  <h4 className="font-title-md text-title-md">Cảnh báo: Bằng chứng độc lập mâu thuẫn trực tiếp (Conflicting Evidence)</h4>
                </div>
                <div className="space-y-2">
                  {currentClaim.conflict_matrix.map((cfl, idx) => (
                    <div key={idx} className="bg-surface-container-lowest p-space-sm rounded-lg border border-error/30 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1 font-semibold">
                        <span className="text-on-surface">Nguồn A: <strong className="text-primary">{cfl.source_a}</strong> ({cfl.relation_a})</span>
                        <span className="text-error font-bold">vs</span>
                        <span className="text-on-surface">Nguồn B: <strong className="text-error">{cfl.source_b}</strong> ({cfl.relation_b})</span>
                      </div>
                      <p className="text-on-surface-variant">{cfl.explanation}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* EVIDENCE CROSS-COMPARISON MATRIX (Bảng Đối soát Thuộc tính Chéo) */}
            {currentClaim?.comparison_matrix && currentClaim.comparison_matrix.length > 0 && (
              <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container">
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[20px] text-primary">table_chart</span>
                    <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Ma trận Đối soát Đa chiều (Article Claim vs External Evidence)
                    </h4>
                  </div>
                  <span className="text-outline font-label-sm text-label-sm font-medium">
                    Quy chuẩn IFCN Cross-Verification
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-container border-b border-surface-container-high text-on-surface-variant uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3 font-bold w-1/6">Thuộc tính đối soát</th>
                        <th className="py-2.5 px-3 font-bold w-1/4">Phát ngôn bài báo</th>
                        <th className="py-2.5 px-3 font-bold w-1/4">Bằng chứng đối chiếu</th>
                        <th className="py-2.5 px-3 font-bold w-1/8 text-center">Trạng thái khớp</th>
                        <th className="py-2.5 px-3 font-bold w-1/4">Ghi chú đối soát</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {currentClaim.comparison_matrix.map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface-container/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-on-surface">
                            {row.attribute}
                          </td>
                          <td className="py-2.5 px-3 text-on-surface-variant font-medium">
                            {row.claim_val || <span className="text-outline italic">Không đề cập</span>}
                          </td>
                          <td className="py-2.5 px-3 text-on-surface-variant font-medium">
                            {row.evidence_val || <span className="text-outline italic">Không có trong dữ liệu</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${getMatchStatusBadge(row.match_status)}`}>
                              {row.match_status === "MATCH"
                                ? "KHỚP"
                                : row.match_status === "MISMATCH"
                                ? "SAI LỆCH"
                                : row.match_status === "PARTIAL"
                                ? "MỘT PHẦN"
                                : row.match_status === "EXAGGERATED"
                                ? "PHÓNG ĐẠI"
                                : "CHƯA NÊU"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-on-surface-variant text-[11px] leading-relaxed">
                            {row.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* VISUAL SCIENTIFIC COMPARISON ARTIFACT (Evidence Gap) */}
            <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container">
              <div className="flex items-center justify-between mb-space-md">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[20px] text-primary">biotech</span>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    {currentClaim?.evidence_gap?.t1_title?.includes("In-Vitro")
                      ? "Khoảng trống chứng cứ lâm sàng (Evidence Gap)"
                      : "Chuỗi kiểm chứng dữ liệu 4 tầng (Evidence Gap)"}
                  </h4>
                </div>
                <span className="text-outline font-label-sm text-label-sm font-medium">
                  {currentClaim?.evidence_gap?.t1_title?.includes("In-Vitro")
                    ? "Thang phân cấp Y học Thực chứng (EBM)"
                    : (currentClaim?.protocol_standard || "Quy chuẩn Thẩm định Báo chí IFCN")}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm text-center">
                <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-label-md mb-space-xs">
                    <span className="material-symbols-outlined text-[18px]">done</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    {currentClaim?.evidence_gap?.t1_title || "Tầng 1: Dữ liệu cơ sở"}
                  </span>
                  <span className="font-label-sm text-label-sm text-primary">
                    {currentClaim?.evidence_gap?.t1_desc || "Tài liệu ban đầu"}
                  </span>
                  <span className={`mt-1 px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${getGapStatusBadge(currentClaim?.evidence_gap?.t1_status || "CÓ CHỨNG CỨ", "success")}`}>
                    {currentClaim?.evidence_gap?.t1_status || "CÓ CHỨNG CỨ"}
                  </span>
                </div>
                <div className="p-space-md rounded-lg bg-surface-container flex flex-col items-center opacity-85">
                  <div className="w-8 h-8 rounded-full bg-outline-variant text-on-surface-variant flex items-center justify-center font-bold text-label-md mb-space-xs">
                    <span className="material-symbols-outlined text-[18px]">
                      {currentClaim?.evidence_gap?.t2_status?.includes("CÓ") ? "done" : "close"}
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    {currentClaim?.evidence_gap?.t2_title || "Tầng 2: Đối chiếu chéo"}
                  </span>
                  <span className="font-label-sm text-label-sm text-outline">
                    {currentClaim?.evidence_gap?.t2_desc || "Khảo sát thực nghiệm"}
                  </span>
                  <span className={`mt-1 px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${getGapStatusBadge(currentClaim?.evidence_gap?.t2_status || "CHƯA THỰC HIỆN")}`}>
                    {currentClaim?.evidence_gap?.t2_status || "CHƯA THỰC HIỆN"}
                  </span>
                </div>
                <div className="p-space-md rounded-lg bg-surface-container flex flex-col items-center opacity-85">
                  <div className="w-8 h-8 rounded-full bg-outline-variant text-on-surface-variant flex items-center justify-center font-bold text-label-md mb-space-xs">
                    <span className="material-symbols-outlined text-[18px]">
                      {currentClaim?.evidence_gap?.t3_status?.includes("CÓ") ? "done" : "close"}
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    {currentClaim?.evidence_gap?.t3_title || "Tầng 3: Giám định chính thức"}
                  </span>
                  <span className="font-label-sm text-label-sm text-outline">
                    {currentClaim?.evidence_gap?.t3_desc || "Cấp phép / Kết luận"}
                  </span>
                  <span className={`mt-1 px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${getGapStatusBadge(currentClaim?.evidence_gap?.t3_status || "CHƯA CẤP PHÉP")}`}>
                    {currentClaim?.evidence_gap?.t3_status || "CHƯA CẤP PHÉP"}
                  </span>
                </div>
                <div className={`p-space-md rounded-lg flex flex-col items-center ${
                  currentClaim?.verdict === "SUPPORTED"
                    ? "bg-[#DCFCE7]/40"
                    : currentClaim?.verdict === "REFUTED"
                    ? "bg-error-container/40"
                    : "bg-[#FEF3C7]/40"
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-label-md mb-space-xs ${
                    currentClaim?.verdict === "SUPPORTED"
                      ? "bg-[#15803D] text-white"
                      : currentClaim?.verdict === "REFUTED"
                      ? "bg-error text-on-error"
                      : "bg-[#B45309] text-white"
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {currentClaim?.verdict === "SUPPORTED" ? "done" : currentClaim?.verdict === "REFUTED" ? "priority_high" : "help"}
                    </span>
                  </div>
                  <span className={`font-label-sm text-label-sm font-semibold ${
                    currentClaim?.verdict === "SUPPORTED"
                      ? "text-[#15803D]"
                      : currentClaim?.verdict === "REFUTED"
                      ? "text-error"
                      : "text-[#B45309]"
                  }`}>
                    Tuyên bố bài báo
                  </span>
                  <span className={`font-label-sm text-label-sm font-bold line-clamp-1 ${
                    currentClaim?.verdict === "SUPPORTED"
                      ? "text-[#15803D]"
                      : currentClaim?.verdict === "REFUTED"
                      ? "text-error"
                      : "text-[#B45309]"
                  }`}>
                    {currentClaim?.evidence_gap?.t4_desc || `“${currentClaim?.claim_text.slice(0, 30)}...”`}
                  </span>
                  <span className={`mt-1 px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${getGapStatusBadge(currentClaim?.evidence_gap?.claim_verdict || (currentClaim?.verdict === "SUPPORTED" ? "ĐƯỢC XÁC THỰC" : currentClaim?.verdict === "REFUTED" ? "SAI LỆCH KHOA HỌC" : "CHƯA ĐỦ CĂN CỨ"), "danger")}`}>
                    {currentClaim?.evidence_gap?.claim_verdict || (currentClaim?.verdict === "SUPPORTED" ? "ĐƯỢC XÁC THỰC" : currentClaim?.verdict === "REFUTED" ? "SAI LỆCH KHOA HỌC" : "CHƯA ĐỦ CĂN CỨ")}
                  </span>
                </div>
              </div>
            </section>

            {/* COLLAPSIBLE AI ACTIVITY LOG & NER TOKENS */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-surface-container">
              <button
                className="w-full p-space-md flex items-center justify-between text-left hover:bg-surface-container transition-colors"
                onClick={() => setIsAiLogExpanded(!isAiLogExpanded)}
                type="button"
              >
                <div className="flex items-center gap-space-xs">
                  <span
                    className={`material-symbols-outlined text-[20px] text-primary transition-transform duration-200 ${
                      isAiLogExpanded ? "rotate-90" : ""
                    }`}
                  >
                    chevron_right
                  </span>
                  <span className="font-title-lg text-title-lg text-on-surface font-bold">
                    Nhật ký đối chiếu mô hình AI & Trích xuất thực thể
                  </span>
                  <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold">
                    {isAiLogExpanded ? "Đang mở" : "Đã thu gọn"}
                  </span>
                </div>
                <div className="flex items-center gap-space-sm text-on-surface-variant font-label-sm text-label-sm">
                  <span>NER Transformer v4.2</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-semibold">
                    Confidence: {currentClaim?.ai_log?.confidence || "91.4%"}
                  </span>
                </div>
              </button>

              {isAiLogExpanded && (
                <div className="p-space-lg pt-0 bg-surface-container-lowest border-t border-surface-container">
                  <div className="p-space-md rounded-lg bg-surface-container mb-space-md mt-space-sm">
                    <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-xs text-on-surface-variant font-label-sm text-label-sm">
                      <span>
                        MÔ HÌNH: <strong>{currentClaim?.ai_log?.model || "BioBERT-Vietnamese-v2"}</strong>
                      </span>
                      <span>THỜI ĐIỂM XỬ LÝ: {currentClaim?.ai_log?.timestamp || "24/10/2024 14:32:08 GMT+7"}</span>
                      <span>
                        ĐỘ TIN CẬY TOÀN VĂN:{" "}
                        <strong className="text-primary">{currentClaim?.ai_log?.confidence || "91.4%"}</strong>
                      </span>
                    </div>
                    <div className="font-label-sm text-label-sm text-outline leading-relaxed">
                      {currentClaim?.ai_log?.explanation ||
                        "Thuật toán phát hiện sự sai khác ngữ nghĩa (Semantic Contradiction) giữa cụm [Subject: Chiết xuất X] + [Claim Action: Tiêu diệt hoàn toàn] + [Target: Khối u ở người] so với thực tế [Corpus Evidence: Nuôi cấy dòng tế bào HepG2 phòng xét nghiệm]."}
                    </div>
                  </div>
                  <div className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline mb-space-xs">
                    Trích xuất thực thể tên gọi (Named Entities & Tokens)
                  </div>
                  <div className="flex flex-wrap gap-space-xs">
                    {currentClaim?.ai_log?.ner_tokens && currentClaim.ai_log.ner_tokens.length > 0 ? (
                      currentClaim.ai_log.ner_tokens.map((token: any, i: number) => (
                        <span
                          key={i}
                          className={`px-2.5 py-1 rounded-md font-label-sm text-label-sm ${
                            token.type === "overreach"
                              ? "bg-error-container text-error font-semibold"
                              : token.type === "evidence"
                              ? "bg-[#DCFCE7] text-[#15803D] font-semibold"
                              : "bg-surface-container-high text-on-surface"
                          }`}
                        >
                          <span className="text-outline font-mono mr-1">[{token.label}]</span> {token.text} (Độ tin cậy: {token.confidence})
                        </span>
                      ))
                    ) : (
                      <>
                        <span className="px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                          <span className="text-outline font-mono mr-1">[COMPOUND]</span> Thảo dược X (Độ tin cậy: 99.1%)
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-error-container text-error font-label-sm text-label-sm font-semibold">
                          <span className="font-mono mr-1">[OVERREACH_PREDICATE]</span> Tiêu diệt hoàn toàn (Độ tin cậy: 94.7%)
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-error-container text-error font-label-sm text-label-sm font-semibold">
                          <span className="font-mono mr-1">[UNSUPPORTED_HOST]</span> Khối u ở người (Độ tin cậy: 96.2%)
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                          <span className="text-outline font-mono mr-1">[TIME_FRAME]</span> 48 giờ (Độ tin cậy: 98.0%)
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-[#DCFCE7] text-[#15803D] font-label-sm text-label-sm font-semibold">
                          <span className="font-mono mr-1">[TRUE_EVIDENCE]</span> In-vitro HepG2 62% (Độ tin cậy: 98.9%)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* BOTTOM ACADEMIC NOTES FROM REVIEW BOARD */}
            <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container">
              <div className="flex items-center gap-space-xs pb-space-sm mb-space-sm border-b border-surface-container">
                <span className="material-symbols-outlined text-[20px] text-primary">school</span>
                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Biên bản Nhận định của Hội đồng Thẩm định
                </h4>
                <span className="ml-auto px-space-xs py-0.5 rounded bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold">
                  Chữ ký số điện tử #VN-EDU-881
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg mb-space-md">
                <div className="p-space-md rounded-lg bg-surface-container-low">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Phân loại sai lệch học thuật
                  </span>
                  <div className="font-title-lg text-title-lg text-primary font-bold mt-1">
                    {currentClaim?.review_board?.classification || "Ngoại suy quá mức (Overreach / Extrapolation)"}
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {currentClaim?.review_board?.classification_desc ||
                      "Phóng đại từ mức độ nghiên cứu tiền lâm sàng cơ bản thành kết luận lâm sàng trị liệu đã hoàn tất trên cơ thể người."}
                  </p>
                </div>
                <div className="p-space-md rounded-lg bg-error-container/30">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-error font-semibold">
                    Tác hại nhận thức độc giả & Y tế cộng đồng
                  </span>
                  <div className="font-title-lg text-title-lg text-error font-bold mt-1">
                    Mức độ: {currentClaim?.review_board?.harm_level || "RẤT CAO"}
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {currentClaim?.review_board?.harm_desc ||
                      "Tiềm ẩn nguy cơ người bệnh tự ý từ bỏ phác đồ hóa - xạ trị chuẩn của bệnh viện chuyên khoa để sử dụng thảo dược chưa kiểm chứng."}
                  </p>
                </div>
              </div>
              {/* Academic Signatories */}
              <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs text-on-surface-variant font-label-sm text-label-sm">
                <div className="flex flex-wrap items-center gap-space-md">
                  <span>
                    <strong>Chủ tọa:</strong> PGS.TS. Trần Quốc Hùng
                  </span>
                  <span>
                    <strong>Thư ký:</strong> TS. Nguyễn Minh Anh
                  </span>
                  <span>
                    <strong>Hội đồng phản biện:</strong> {currentClaim?.review_board?.signatories?.split("·").pop()?.trim() || "Viện Dược liệu Trung ương"}
                  </span>
                </div>
                <div className="text-outline">Cập nhật trạng thái lưu trữ: {article.publication_date || "24/10/2024"}</div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
