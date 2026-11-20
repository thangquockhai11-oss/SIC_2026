import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { AnalysisDetail, Claim, FindReferencesResult } from "../api/types";

export default function FactCheckingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentId = searchParams.get("id");

  // State
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [aiLogOpen, setAiLogOpen] = useState(true);

  // Cross-reference modal state
  const [crossRefModalOpen, setCrossRefModalOpen] = useState(false);
  const [crossRefLoading, setCrossRefLoading] = useState(false);
  const [crossRefResult, setCrossRefResult] = useState<FindReferencesResult | null>(null);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceText, setNewSourceText] = useState("");
  const [rerunLoading, setRerunLoading] = useState(false);
  const [rerunSuccessMsg, setRerunSuccessMsg] = useState<string | null>(null);

  // Load analysis
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        let targetId = currentId;
        if (!targetId) {
          // Fetch latest from history
          const historyRes = await api.history.list({ page: 1, page_size: 1 });
          if (historyRes.items.length > 0) {
            targetId = historyRes.items[0].id;
            setSearchParams({ id: targetId });
          }
        }

        if (targetId) {
          const detail = await api.analyzer.getDetail(targetId);
          if (isMounted) {
            setAnalysis(detail);
            if (detail?.claims && detail.claims.length > 0) {
              setSelectedClaimId(detail.claims[0].id);
            }
          }
        }
      } catch (err: any) {
        console.warn("Could not load analysis detail:", err);
        if (isMounted) setError(err?.message || "Không thể tải hồ sơ thẩm định");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentId]);

  // Claims to display
  const claims: Claim[] = useMemo(() => {
    if (analysis && analysis.claims && analysis.claims.length > 0) {
      return analysis.claims;
    }
    return [];
  }, [analysis]);

  // Selected claim
  const selectedClaim = useMemo(() => {
    if (!claims.length) return null;
    if (!selectedClaimId) return claims[0];
    return claims.find((c) => c.id === selectedClaimId) || claims[0];
  }, [claims, selectedClaimId]);

  // Primary evidence
  const primaryEvidence = useMemo(() => {
    if (!selectedClaim?.evidences || selectedClaim.evidences.length === 0) return null;
    return selectedClaim.evidences[0];
  }, [selectedClaim]);

  // Determine if this analysis is about biomedical/cancer research
  const isMedicalArticle = useMemo(() => {
    const text = `${analysis?.title || ""} ${selectedClaim?.claim_text || ""}`.toLowerCase();
    return (
      (text.includes("ung thư") || text.includes("chiết xuất") || text.includes("thảo dược") || text.includes("hepg2")) &&
      Boolean(primaryEvidence?.excerpt?.toLowerCase().includes("in-vitro"))
    );
  }, [analysis, selectedClaim, primaryEvidence]);

  // Verdict style mapper
  const getVerdictBadge = (verdict?: string) => {
    switch (verdict) {
      case "REFUTED":
        return {
          bg: "bg-error-container",
          text: "text-error",
          label: "Bác bỏ (Refuted)",
          icon: "cancel",
          borderTop: "bg-error",
          scoreText: "Mâu thuẫn thực nghiệm",
          scoreClass: "text-error",
          category: "Sai lệch học thuật / Ngoại suy quá mức",
        };
      case "SUPPORTED":
        return {
          bg: "bg-[#DCFCE7]",
          text: "text-[#15803D]",
          label: "Xác thực (Supported)",
          icon: "check_circle",
          borderTop: "bg-[#15803D]",
          scoreText: "Trùng khớp dữ liệu",
          scoreClass: "text-[#15803D]",
          category: "Khớp hồ sơ công bố chính thống",
        };
      case "NOT_CHECKABLE":
        return {
          bg: "bg-surface-container-high",
          text: "text-on-surface-variant",
          label: "Không thể kiểm chứng",
          icon: "help_outline",
          borderTop: "bg-outline",
          scoreText: "Ý kiến / Tu từ",
          scoreClass: "text-outline",
          category: "Nhận định chủ quan",
        };
      case "NOT_ENOUGH_INFORMATION":
      default:
        return {
          bg: "bg-[#FEF3C7]",
          text: "text-[#B45309]",
          label: "Chưa đủ bằng chứng",
          icon: "help",
          borderTop: "bg-[#B45309]",
          scoreText: "Thiếu dữ liệu gốc",
          scoreClass: "text-[#B45309]",
          category: "Chưa có tài liệu đối chuẩn",
        };
    }
  };

  const currentBadge = getVerdictBadge(selectedClaim?.verdict);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = claims.length || 1;
    const refuted = claims.filter((c) => c.verdict === "REFUTED").length;
    const supported = claims.filter((c) => c.verdict === "SUPPORTED").length;
    const inconclusive = total - refuted - supported;

    const refPct = Math.round((refuted / total) * 100);
    const supPct = Math.round((supported / total) * 100);
    const incPct = 100 - refPct - supPct;

    return {
      total,
      refuted,
      supported,
      inconclusive,
      refPct,
      supPct,
      incPct,
      skewRate: refPct,
    };
  }, [claims]);

  // Open Cross-Reference Modal for a Claim
  const handleOpenCrossReference = async (claim: Claim) => {
    setSelectedClaimId(claim.id);
    setCrossRefModalOpen(true);
    setCrossRefLoading(true);
    setCrossRefResult(null);
    setRerunSuccessMsg(null);
    try {
      const res = await api.evidence.findReferences(claim.id);
      setCrossRefResult(res);
    } catch (err: any) {
      console.error("Find references failed:", err);
    } finally {
      setCrossRefLoading(false);
    }
  };

  // Rerun Claim Verification with new source
  const handleRerunVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    if (!newSourceUrl.trim() && !newSourceText.trim()) return;

    setRerunLoading(true);
    setRerunSuccessMsg(null);
    try {
      const res = await api.evidence.rerunClaim(
        selectedClaim.id,
        newSourceUrl.trim() || undefined,
        newSourceText.trim() || undefined
      );
      setCrossRefResult(res);
      setRerunSuccessMsg("Đã nạp nguồn đối chứng và cập nhật thẩm định thành công!");
      setNewSourceUrl("");
      setNewSourceText("");

      // Refresh article detail to update claim list in parent state
      if (currentId) {
        const updatedDetail = await api.analyzer.getDetail(currentId);
        setAnalysis(updatedDetail);
      }
    } catch (err: any) {
      console.error("Rerun verification failed:", err);
    } finally {
      setRerunLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-outline">Đang tải hồ sơ thẩm định và dữ liệu kiểm chứng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined text-[36px] text-error">error</span>
        <p className="text-sm text-error font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 font-sans">
      <div className="flex flex-col gap-space-lg">
        {/* TOP ARTICLE CONTEXT BANNER */}
        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-space-xs">
          <div className="flex flex-wrap items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[18px] text-primary">fact_check</span>
            <span className="font-semibold text-primary uppercase tracking-wider">
              Hồ sơ Kiểm chứng Phát ngôn // ViFactCheck &amp; X-FACT Protocol
            </span>
            <span className="text-outline">•</span>
            <span className="text-outline">Mã lưu trữ: #{analysis?.id ? analysis.id.slice(0, 8) : "TM-DEMO"}</span>
          </div>

          <h1 className="font-headline-sm sm:font-headline-md text-headline-sm sm:text-headline-md text-on-surface font-bold tracking-tight mt-1">
            {analysis?.title || "Hồ sơ Thẩm định & Đối soát Phát ngôn Đa nguồn"}
          </h1>

          <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 text-on-surface-variant font-label-sm text-label-sm pt-space-xs border-t border-outline-variant/20 mt-space-xs">
            <span>
              <strong>Tòa soạn:</strong> {analysis?.credibility?.source_name || analysis?.source_url || "Cơ quan báo chí"}
            </span>
            <span className="text-outline">•</span>
            <span>
              <strong>Ngày thẩm định:</strong> {new Date().toLocaleDateString("vi-VN")}
            </span>
            <span className="text-outline">•</span>
            <span>
              <strong>Độ tin cậy tổng thể:</strong>{" "}
              <strong className="text-primary">{Math.round((analysis?.confidence_score || 0.85) * 100)}%</strong>
            </span>
            <Link
              to={analysis?.id ? `/reports?id=${analysis.id}` : "/reports"}
              className="px-4 py-2.5 rounded-lg bg-[#00514f] hover:bg-[#0d6b68] text-[#ffffff] font-mono text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">analytics</span>
              <span>Xem báo cáo người đọc</span>
            </Link>
          </div>
        </section>

        {/* MAIN COMPARATIVE 2-COLUMN VIEWPORT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* LEFT SIDEBAR: List of Extracted Claims */}
          <aside className="lg:col-span-4 flex flex-col gap-space-md">
            {/* Card 1: Phát ngôn bóc tách */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30">
              <div className="flex items-center justify-between pb-space-xs mb-space-xs border-b border-outline-variant/20">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[20px] text-primary">segment</span>
                  <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">
                    Phát ngôn bóc tách
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-secondary font-label-sm text-label-sm font-semibold">
                  0{claims.length} Luận điểm
                </span>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-space-md leading-relaxed">
                Trích xuất theo câu và đoạn thân bài, loại bỏ hoàn toàn măng-sét tòa soạn, menu và chân trang.
              </p>

              {/* Claims List */}
              <div className="flex flex-col gap-space-xs" role="tablist">
                {claims.length === 0 ? (
                  <div className="p-4 text-center text-sm text-outline">
                    Chưa có luận điểm nào được trích xuất.
                  </div>
                ) : (
                  claims.map((claim, idx) => {
                    const isSelected = claim.id === selectedClaim?.id;
                    const b = getVerdictBadge(claim.verdict);
                    return (
                      <div
                        key={claim.id}
                        onClick={() => setSelectedClaimId(claim.id)}
                        className={`group relative p-space-md rounded-xl transition-all cursor-pointer text-left border ${isSelected
                          ? "bg-surface-container-low border-primary-container/40 shadow-sm"
                          : "bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container shadow-xs"
                          }`}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-center justify-between gap-space-xs mb-space-xs">
                          <span
                            className={`font-label-sm text-label-sm font-semibold flex items-center gap-1 ${isSelected ? "text-primary" : "text-secondary"
                              }`}
                          >
                            {isSelected && (
                              <span className="material-symbols-outlined text-[15px] text-primary">
                                priority_high
                              </span>
                            )}
                            Luận điểm #{idx < 9 ? `0${idx + 1}` : idx + 1} {idx === 0 && "(Chủ chốt)"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1 ${b.bg} ${b.text}`}
                          >
                            <span className="material-symbols-outlined text-[12px]">{b.icon}</span> {b.label}
                          </span>
                        </div>

                        <p
                          className={`font-body-md text-body-md text-on-surface leading-snug line-clamp-2 mb-space-xs ${isSelected ? "font-medium" : ""
                            }`}
                        >
                          “{claim.claim_text}”
                        </p>

                        <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm pt-0.5">
                          <span className="text-outline">
                            Đoạn P{claim.paragraph_id || idx + 1}
                          </span>
                          <span className="text-outline">
                            Độ tin cậy: {Math.round((claim.confidence || 0.85) * 100)}%
                          </span>
                        </div>

                        {/* Action: Tìm nguồn đối chiếu button */}
                        <div className="mt-2.5 pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCrossReference(claim);
                            }}
                            className="w-full py-1.5 px-2 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-primary text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-[14px]">find_in_page</span>
                            Tìm nguồn đối chiếu
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Methodology Note */}
              <div className="mt-space-md p-space-sm rounded-lg bg-surface-container flex items-start gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">info</span>
                <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
                  Phương pháp: Phân rã mệnh đề đa tầng, đối soát Hybrid (BM25 + Dense Vector) và suy luận hàm ý tự nhiên NLI theo chuẩn IFCN.
                </p>
              </div>
            </div>

            {/* Card 2: Quy chuẩn phân định */}
            <div className="bg-[#f7f3ef] rounded-2xl p-5 border border-[#bec9c7]/30">
              <h3 className="font-serif text-sm font-bold text-[#1c1b19] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#00514f]">rule</span>
                <span>Quy chuẩn phân định (IFCN)</span>
              </h3>
              <ul className="flex flex-col gap-2.5 text-xs text-[#6f7978]">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#1f6c3a] mt-1 shrink-0"></span>
                  <span>
                    <strong className="text-[#1c1b19]">Được xác thực:</strong> Mệnh đề trùng khớp với nguồn dữ liệu kiểm chứng độc lập.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#901316] mt-1 shrink-0"></span>
                  <span>
                    <strong className="text-[#1c1b19]">Bị bác bỏ:</strong> Tồn tại mâu thuẫn trực tiếp (Contradiction ≥ 85%) hoặc ngụy tạo thông tin.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#c28400] mt-1 shrink-0"></span>
                  <span>
                    <strong className="text-[#1c1b19]">Chưa đủ bằng chứng:</strong> Phát biểu tương lai, nguồn tin chưa công bố hoặc số liệu chưa đối chiếu được.
                  </span>
                </li>
              </ul>
            </div>

            {/* Card 3: Quick Metrics Mini-Panel */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                  Tỷ trọng phát ngôn
                </span>
                <span className="font-title-lg text-title-lg text-primary font-bold">
                  {stats.total} Mệnh đề
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container flex overflow-hidden mb-space-xs">
                <div
                  className="bg-[#15803D] h-full"
                  style={{ width: `${stats.supPct}%` }}
                  title={`Xác thực: ${stats.supPct}%`}
                />
                <div
                  className="bg-[#B45309] h-full"
                  style={{ width: `${stats.incPct}%` }}
                  title={`Chưa đủ bằng chứng: ${stats.incPct}%`}
                />
                <div
                  className="bg-[#B91C1C] h-full"
                  style={{ width: `${stats.refPct}%` }}
                  title={`Bác bỏ: ${stats.refPct}%`}
                />
              </div>
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm pt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#15803D]" /> {stats.supported} Xác thực
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#B45309]" /> {stats.inconclusive} Thiếu chứng cứ
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#B91C1C]" /> {stats.refuted} Bác bỏ
                </span>
              </div>
            </div>
          </aside>

            {/* RIGHT MAIN AREA: Reading & Evidence Workspace */}
            <main className="lg:col-span-8 flex flex-col gap-space-lg">
              {/* HERO VERDICT BANNER */}
              <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden border border-outline-variant/30">
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${currentBadge.borderTop}`} />
                <div className="flex flex-col gap-space-sm pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-space-sm">
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <span
                        className={`px-3 py-1 rounded-full font-label-md text-label-md font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm ${currentBadge.bg} ${currentBadge.text}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{currentBadge.icon}</span>
                        {currentBadge.label}
                      </span>
                      <div>
                        <h4 className="font-sans text-xs font-bold text-[#1c1b19]">Luận điểm trong bài báo</h4>
                        <span className="font-mono text-[11px] text-[#6f7978]">Ngữ cảnh văn bản gốc</span>
                      </div>
                    </div>

                    {/* Dynamic Model / Review Status */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm bg-surface-container px-space-sm py-1 rounded-md">
                        <span className="material-symbols-outlined text-[16px] text-primary-container">
                          psychology
                        </span>
                        <span>Mô hình: {selectedClaim?.model_name || "TrustMedia-NLI-HybridVerifier"}</span>
                      </div>

                      {selectedClaim && (
                        <button
                          type="button"
                          onClick={() => handleOpenCrossReference(selectedClaim)}
                          className="px-2.5 py-1 rounded-md bg-primary text-on-primary hover:bg-primary-container text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">compare_arrows</span>
                          Tìm đối chiếu
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Verdict Reasoning Statement */}
                  <div className="mt-space-xs">
                    <h3 className="font-title-lg text-title-lg md:text-[20px] md:leading-[28px] text-on-surface font-bold tracking-tight">
                      {selectedClaim?.reasoning || "Đang phân tích và đối soát phát ngôn với cơ sở dữ liệu xác thực..."}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-space-lg text-on-surface-variant font-label-sm text-label-sm pt-space-xs border-t border-outline-variant/20">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-outline">verified_user</span>
                      <span>
                        Giao thức: <strong>IFCN Standard v2.4</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-outline">speed</span>
                      <span>
                        Độ tương thích khoa học:{" "}
                        <strong className={currentBadge.scoreClass}>{currentBadge.scoreText}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* TWO QUOTATIONS SIDE-BY-SIDE */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter items-stretch">
                {/* Left Card: PHÁT NGÔN TRONG BÀI BÁO */}
                <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between border border-outline-variant/30">
                  <div>
                    <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant/20">
                      <div className="flex items-center gap-space-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-error" />
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-error font-bold">
                          Phát ngôn trong bài báo
                        </span>
                      </div>
                      <span className="px-space-xs py-0.5 rounded bg-surface-container-highest text-secondary font-label-sm text-[11px]">
                        Đoạn P{selectedClaim?.paragraph_id || 1}
                      </span>
                    </div>
                    <blockquote className="font-body-lg text-body-lg text-[#182824] leading-[1.6] mb-space-md italic">
                      “{selectedClaim?.original_sentence || selectedClaim?.claim_text || "Chưa chọn phát ngôn"}”
                    </blockquote>
                  </div>

                  <div className="pt-space-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg p-space-md rounded-b-xl border-t border-outline-variant/20">
                    <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
                      <span className="material-symbols-outlined text-[18px] text-primary">link</span>
                      <span>
                        Trích dẫn từ:{" "}
                        <span className="font-semibold text-on-surface">
                          {analysis?.credibility?.source_name || analysis?.source_url || "Bài báo đang phân tích"}
                        </span>
                      </span>
                    </div>
                  </div>
                </article>

          {/* Right Card: BẰNG CHỨNG ĐỐI CHIẾU */}
          {primaryEvidence && primaryEvidence.excerpt ? (
            <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between border border-outline-variant/30">
              <div>
                <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant/20">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
                      Bằng chứng đối chiếu
                    </span>
                  </div>
                  <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-[11px] font-semibold">
                    {primaryEvidence.source_name || "Nguồn đối chuẩn"}
                  </span>
                </div>
                <blockquote className="font-body-lg text-body-lg text-[#182824] leading-[1.6] mb-space-md">
                  “{primaryEvidence.excerpt}”
                </blockquote>
              </div>

              <div className="pt-space-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg p-space-md rounded-b-xl border-t border-outline-variant/20">
                <div className="flex items-center justify-between flex-wrap gap-1 text-label-md text-label-md">
                  <div className="flex items-center gap-space-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px] text-primary-container">
                      menu_book
                    </span>
                    <span className="line-clamp-1">{primaryEvidence.source_name}</span>
                  </div>
                  {primaryEvidence.source_url ? (
                    <a
                      href={primaryEvidence.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-container font-semibold inline-flex items-center gap-0.5 text-label-sm"
                    >
                      Mở tài liệu nguồn{" "}
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  ) : (
                    <span className="text-secondary font-label-sm">Kho lưu trữ thực nghiệm</span>
                  )}
                </div>
              </div>
            </article>
          ) : (
            <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between border border-outline-variant/30">
              <div>
                <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant/20">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]" />
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#B45309] font-bold">
                      Bằng chứng đối chiếu
                    </span>
                  </div>
                  <span className="px-space-xs py-0.5 rounded bg-[#FEF3C7] text-[#B45309] font-label-sm text-[11px] font-semibold">
                    Chưa đủ chứng cứ
                  </span>
                </div>
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-[36px] text-outline mb-2">
                    find_in_page
                  </span>
                  <h4 className="font-semibold text-on-surface text-sm">
                    Chưa đủ bằng chứng trong kho tri thức
                  </h4>
                  <p className="text-xs text-outline max-w-xs mt-1 leading-relaxed">
                    Hệ thống không tìm thấy tài liệu gốc hoặc đoạn trích đối chứng trực tiếp. Kết luận được giữ ở mức "Chưa đủ bằng chứng".
                  </p>
                  <button
                    type="button"
                    onClick={() => selectedClaim && handleOpenCrossReference(selectedClaim)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">add_link</span>
                    Tìm hoặc nạp nguồn đối chiếu
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-2 font-mono text-[11px] text-[#1f6c3a] font-semibold border-t border-[#bec9c7]/20">
                MINH BẠCH CAO
              </div>
              <div className="pt-space-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg p-space-md rounded-b-xl border-t border-outline-variant/20 text-xs text-outline">
                Trạng thái kiểm định: INSUFFICIENT_EVIDENCE
              </div>
            </article>
          )}
        </section>

        {/* CLINICAL EVIDENCE GAP GRID (Only displayed for biomedical articles) */}
        {isMedicalArticle && (
          <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[20px] text-primary">biotech</span>
                <h4 className="font-title-lg text-title-lg text-on-surface font-semibold">
                  Khoảng trống chứng cứ lâm sàng (Evidence Gap)
                </h4>
              </div>
              <span className="text-outline font-label-sm text-label-sm">
                Thang phân cấp Y học Thực chứng (EBM)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-space-sm text-center">
              <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col items-center border border-outline-variant/20">
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-label-md mb-space-xs shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">done</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                  Tầng 1: In-Vitro
                </span>
                <span className="font-label-sm text-label-sm text-primary">Dòng tế bào nuôi cấy</span>
                <span className="mt-1 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] font-label-sm text-[10px] font-bold">
                  CÓ CHỨNG CỨ
                </span>
              </div>
              <div className="p-space-md rounded-lg bg-surface-container flex flex-col items-center opacity-85 border border-outline-variant/20">
                <div className="w-8 h-8 rounded-full bg-outline-variant text-on-surface-variant flex items-center justify-center font-bold text-label-md mb-space-xs">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                  Tầng 2: In-Vivo
                </span>
                <span className="font-label-sm text-label-sm text-outline">Động vật thực nghiệm</span>
                <span className="mt-1 px-2 py-0.5 rounded-full bg-surface-dim text-secondary font-label-sm text-[10px] font-bold">
                  CHƯA THỰC HIỆN
                </span>
              </div>
              <div className="p-space-md rounded-lg bg-surface-container flex flex-col items-center opacity-85 border border-outline-variant/20">
                <div className="w-8 h-8 rounded-full bg-outline-variant text-on-surface-variant flex items-center justify-center font-bold text-label-md mb-space-xs">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                  Tầng 3: Thử nghiệm LS
                </span>
                <span className="font-label-sm text-label-sm text-outline">Bệnh nhân tình nguyện</span>
                <span className="mt-1 px-2 py-0.5 rounded-full bg-surface-dim text-secondary font-label-sm text-[10px] font-bold">
                  CHƯA CẤP PHÉP
                </span>
              </div>
              <div className="p-space-md rounded-lg bg-error-container/40 flex flex-col items-center border border-error/30">
                <div className="w-8 h-8 rounded-full bg-error text-on-error flex items-center justify-center font-bold text-label-md mb-space-xs shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                </div>
                <span className="font-label-sm text-label-sm text-error font-semibold">
                  Tuyên bố bài báo
                </span>
                <span className="font-label-sm text-label-sm text-error font-bold">
                  “Điều trị ở người”
                </span>
                <span className="mt-1 px-2 py-0.5 rounded-full bg-error-container text-error font-label-sm text-[10px] font-bold">
                  NGOẠI SUY QUÁ MỨC
                </span>
              </div>
            </div>
          </section>
        )}

        {/* AI ACTIVITY LOG & ENTITY TOKENS */}
        <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/30">
          <button
            className="w-full p-space-md flex items-center justify-between text-left hover:bg-surface-container transition-colors"
            onClick={() => setAiLogOpen(!aiLogOpen)}
            type="button"
            aria-expanded={aiLogOpen}
          >
            <div className="flex items-center gap-space-xs">
              <span
                className={`material-symbols-outlined text-[20px] text-primary transition-transform duration-200 ${aiLogOpen ? "rotate-90" : "rotate-0"
                  }`}
              >
                chevron_right
              </span>
              <span className="font-title-lg text-title-lg text-on-surface font-semibold">
                Nhật ký đối chiếu mô hình AI &amp; Mệnh đề
              </span>
              <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-[11px]">
                {aiLogOpen ? "Đang mở" : "Đã thu gọn"}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-space-sm text-on-surface-variant font-label-sm text-label-sm">
              <span>{selectedClaim?.model_name || "TrustMedia-NLI-HybridVerifier"}</span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-semibold">
                Confidence: {Math.round((selectedClaim?.confidence || 0.85) * 100)}%
              </span>
            </div>
          </button>

          {aiLogOpen && (
            <div className="p-space-lg pt-0 bg-surface-container-lowest border-t border-outline-variant/20 animate-fadeIn">
              <div className="p-space-md rounded-lg bg-surface-container mb-space-md mt-space-md">
                <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-xs text-on-surface-variant font-label-sm text-label-sm">
                  <span>
                    MÔ HÌNH: <strong>{selectedClaim?.model_name || "TrustMedia-NLI-HybridVerifier"}</strong>
                  </span>
                  <span>
                    PHIÊN BẢN: <strong>{selectedClaim?.model_version || "1.2.0-calibrated"}</strong>
                  </span>
                  <span>
                    ĐỘ TIN CẬY:{" "}
                    <strong className="text-primary">
                      {Math.round((selectedClaim?.confidence || 0.85) * 100)}%
                    </strong>
                  </span>
                </div>
                <div className="font-label-sm text-label-sm text-outline leading-relaxed">
                  {selectedClaim?.reasoning ||
                    "Đối soát ngữ nghĩa và kiểm định hàm ý tự nhiên giữa phát ngôn và nguồn dữ liệu kiểm chứng."}
                </div>
              </div>

              {selectedClaim?.limitations && (
                <div className="p-3 rounded-lg bg-surface-container-low text-xs text-on-surface-variant border border-outline-variant/20 mt-3">
                  <strong>Hạn chế / Lưu ý:</strong> {selectedClaim.limitations}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
      </div >

    {/* CROSS-REFERENCE & 5D COMPARISON MODAL */ }
  {
    crossRefModalOpen && (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-surface-container-lowest rounded-2xl max-w-4xl w-full p-6 shadow-xl border border-outline-variant/40 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px] text-primary">compare_arrows</span>
              <div>
                <h3 className="text-lg font-bold text-on-surface">
                  Đối chiếu Nguồn tin &amp; Kiểm soát Mâu thuẫn Thực nghiệm
                </h3>
                <p className="text-xs text-outline">
                  So sánh 5 chiều thực thể (Nhân vật · Hành động · Địa điểm · Thời gian · Phạm vi) và nhóm nguồn phân phối.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCrossRefModalOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Current Claim Information */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Luận điểm đang thẩm định (Claim #{selectedClaim?.id.slice(0, 8)})
              </span>
              <span className="text-xs text-outline font-semibold">
                Đoạn P{selectedClaim?.paragraph_id || 1}
              </span>
            </div>
            <p className="text-sm font-semibold text-on-surface">
              “{selectedClaim?.claim_text}”
            </p>
            {selectedClaim?.original_sentence && selectedClaim.original_sentence !== selectedClaim.claim_text && (
              <p className="text-xs text-on-surface-variant italic">
                Câu gốc: “{selectedClaim.original_sentence}”
              </p>
            )}
          </div>

          {crossRefLoading ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-outline">Đang truy xuất đoạn trích đối chuẩn và phân tích 5 chiều...</p>
            </div>
          ) : crossRefResult ? (
            <div className="flex flex-col gap-5">
              {/* 5-Dimension Entity Comparison Pills */}
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-outline">
                  Thực thể 5 chiều của Luận điểm (5D Entity Extraction)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-surface-container">
                    <div className="text-[11px] text-outline font-semibold">Nhân vật (People)</div>
                    <div className="font-semibold text-on-surface mt-0.5 line-clamp-1">
                      {crossRefResult.claim_5d?.people?.join(", ") || "—"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container">
                    <div className="text-[11px] text-outline font-semibold">Hành động (Action)</div>
                    <div className="font-semibold text-on-surface mt-0.5 line-clamp-1">
                      {crossRefResult.claim_5d?.action?.join(", ") || "—"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container">
                    <div className="text-[11px] text-outline font-semibold">Địa điểm (Location)</div>
                    <div className="font-semibold text-on-surface mt-0.5 line-clamp-1">
                      {crossRefResult.claim_5d?.location?.join(", ") || "—"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container">
                    <div className="text-[11px] text-outline font-semibold">Thời gian (Event Date)</div>
                    <div className="font-semibold text-on-surface mt-0.5 line-clamp-1">
                      {crossRefResult.claim_5d?.event_date?.join(", ") || "—"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container">
                    <div className="text-[11px] text-outline font-semibold">Phạm vi (Scope)</div>
                    <div className="font-semibold text-on-surface mt-0.5 line-clamp-1">
                      {crossRefResult.claim_5d?.scope === "ENACTED"
                        ? "Đã ban hành"
                        : crossRefResult.claim_5d?.scope === "PROPOSAL"
                          ? "Đang đề xuất"
                          : "Sự kiện chung"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Syndicated Origins Breakdown */}
          {crossRefResult.syndicated_origins && crossRefResult.syndicated_origins.length > 0 && (
            <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">hub</span>
                  Nhóm nguồn phân phối ({crossRefResult.independent_origins_count} nguồn gốc độc lập)
                </span>
                <span className="text-outline">
                  Hai hay nhiều liên kết cùng sao chép 1 bản tin chỉ tính là 1 nguồn gốc
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {crossRefResult.syndicated_origins.map((orig, i) => (
                  <div
                    key={i}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-xs flex items-center gap-2"
                  >
                    <span className="font-bold text-on-surface">{orig.original_source}</span>
                    <span className="px-1.5 py-0.5 rounded bg-surface-container text-[11px] text-secondary font-mono">
                      {orig.copies_count} bài đăng
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passages List */}
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase font-bold tracking-wider text-outline">
              Đoạn trích đối chiếu tìm thấy ({crossRefResult.passages.length})
            </span>
            {crossRefResult.passages.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-surface-container text-xs text-outline">
                Chưa tìm thấy đoạn trích phù hợp. Vui lòng thêm nguồn URL hoặc tài liệu bên dưới để đối soát.
              </div>
            ) : (
              crossRefResult.passages.map((p, idx) => (
                <div
                  key={p.chunk_id || idx}
                  className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface">{p.source_name}</span>
                      <span className="px-2 py-0.5 rounded bg-surface-container text-secondary font-medium text-[11px]">
                        Nguồn gốc: {p.original_source}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${p.nli_relation === "SUPPORTS"
                          ? "bg-[#DCFCE7] text-[#15803D]"
                          : p.nli_relation === "REFUTES"
                            ? "bg-error-container text-error"
                            : "bg-surface-container text-outline"
                          }`}
                      >
                        {p.nli_relation}
                      </span>
                      {p.source_url && (
                        <a
                          href={p.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-semibold flex items-center gap-0.5"
                        >
                          Mở nguồn gốc <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <blockquote className="text-xs sm:text-sm text-on-surface leading-relaxed italic bg-surface-container-low/60 p-3 rounded-lg border-l-3 border-primary">
                    “{p.excerpt}”
                  </blockquote>

                  {p.date_conflict && (
                    <div className="text-xs text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-md font-medium">
                      ⚠️ {p.date_conflict}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add Another Source & Rerun Verification */}
          <form
            onSubmit={handleRerunVerification}
            className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Bổ sung nguồn đối chứng &amp; Chạy lại kiểm chứng (Rerun)
            </div>

            {rerunSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-teal-50 text-teal-800 text-xs font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                {rerunSuccessMsg}
              </div>
            )}

                  <div className="flex flex-col gap-2">
                    <input
                      type="url"
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      placeholder="Dán URL bài báo đối chứng mới (vd: https://baochinhphu.vn/...)"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary"
                    />
                    <textarea
                      rows={2}
                      value={newSourceText}
                      onChange={(e) => setNewSourceText(e.target.value)}
                      placeholder="Hoặc dán trực tiếp đoạn trích văn bản đối chuẩn mới..."
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      disabled={rerunLoading || (!newSourceUrl.trim() && !newSourceText.trim())}
                      className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      {rerunLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang nạp &amp; chạy lại...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">replay</span>
                          Nạp nguồn &amp; Thẩm định lại
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
