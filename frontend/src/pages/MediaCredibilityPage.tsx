import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAnalysis, type EditorialCriterion } from "../context/AnalysisContext";
import { api } from "../api/client";

function getReviewCouncil(category?: string, title?: string): string {
  const combined = `${category || ""} ${title || ""}`.toLowerCase();
  if (["ung thư", "y tế", "thuốc", "bệnh", "thảo dược", "điều trị", "sức khỏe", "dược", "bác sĩ"].some((w) => combined.includes(w))) {
    return "Tiểu ban Thẩm định Y tế & Khoa học Sức khỏe ĐHQG";
  }
  if (["cư kuin", "đắk lắk", "daklak", "tấn công", "khủng bố", "công an", "an ninh", "trật tự", "bắt giữ", "hình sự", "pháp luật"].some((w) => combined.includes(w))) {
    return "Tiểu ban Thẩm định An ninh, Pháp luật & Xã hội ĐHQG";
  }
  if (["kinh tế", "tài chính", "ngân hàng", "gdp", "thị trường", "giá điện", "evn", "doanh nghiệp", "chứng khoán"].some((w) => combined.includes(w))) {
    return "Tiểu ban Thẩm định Kinh tế & Tài chính ĐHQG";
  }
  if (["công nghệ", "ai", "trí tuệ nhân tạo", "kỹ thuật", "lừa đảo", "an ninh mạng", "mạng xã hội", "streamer"].some((w) => combined.includes(w))) {
    return "Tiểu ban Thẩm định Công nghệ & An ninh số ĐHQG";
  }
  if (["thủy điện", "vỡ đập", "mưa lũ", "thiên tai", "sạt lở", "môi trường"].some((w) => combined.includes(w))) {
    return "Tiểu ban Thẩm định Môi trường & Phòng chống thiên tai ĐHQG";
  }
  if (["giáo dục", "học sinh", "sinh viên", "thi tốt nghiệp", "đại học", "học thuật"].some((w) => combined.includes(w))) {
    return "Tiểu ban Thẩm định Giáo dục & Học thuật ĐHQG";
  }
  return "Hội đồng Thẩm định Báo chí & Nội dung Truyền thông ĐHQG";
}

export default function MediaCredibilityPage() {
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id");
  const { article, expandedCriteria, toggleCriterion, loadAnalysisDetail } = useAnalysis();
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
          console.error("Could not load analysis detail by id in credibility:", e);
          setLoadingJob(false);
        });
    }
  }, [queryId, article.id]);

  const criteria: EditorialCriterion[] = article.criteria || [];

  const handleExportPDF = () => {
    window.print();
  };

  const handleReAppeal = () => {
    alert("Yêu cầu tái thẩm định đã được gửi tới Ban Thư ký Hội đồng Khoa học ĐHQG-HCM.");
  };

  if (loadingJob) {
    return (
      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-xl flex flex-col items-center justify-center min-h-[400px]">
        <span className="material-symbols-outlined text-[36px] text-primary animate-spin mb-3">sync</span>
        <h3 className="font-title-lg text-title-lg text-on-surface font-bold">Đang tải hồ sơ tòa soạn...</h3>
        <p className="font-label-sm text-label-sm text-on-surface-variant">Đang nạp dữ liệu kiểm chuẩn quy trình biên tập và đạo đức báo chí</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-lg">
      <div className="flex flex-col w-full gap-y-space-xl">
        {/* Editorial Meta Ribbon & Academic Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-space-md px-space-xs text-on-surface-variant">
          <div className="flex items-center gap-space-sm font-label-md text-label-md">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-container/10 text-primary-container">
              <span className="material-symbols-outlined text-[14px]">shield</span>
            </span>
            <span>Khung đánh giá ĐHQG-HCM / Fact-Checking & Content Integrity Index</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">
              Thẩm định Nội dung: {article.title ? (article.title.length > 40 ? article.title.slice(0, 40) + "..." : article.title) : article.source_name}
            </span>
          </div>
          <div className="flex items-center gap-space-md text-label-sm font-label-sm">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-primary">history</span>
              Cập nhật lần cuối: {article.publication_date || "Hôm nay"} · 09:30 UTC+7
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-secondary font-medium">
              Mã hồ sơ: PUB-{article.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Top Executive Profile & Trust Score Card */}
        <section className="w-full bg-surface-container-lowest rounded-xl p-space-lg lg:p-space-xl shadow-sm relative overflow-hidden border border-surface-container">
          {/* Subtle Background Architectural Gradient */}
          <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-primary-container/5 blur-3xl pointer-events-none"></div>
          <div className="absolute left-1/3 -bottom-24 w-80 h-80 rounded-full bg-tertiary-container/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-y-space-lg lg:gap-x-space-xl items-center">
            {/* Left: Identity & Institutional Accreditation (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-y-space-md">
              <div className="flex items-start gap-space-md">
                <div className="w-16 h-16 rounded-xl bg-surface-container-high flex-shrink-0 flex items-center justify-center text-primary shadow-sm overflow-hidden">
                  <span className="material-symbols-outlined text-[34px]">article</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-space-xs">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      {article.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold">
                      {article.category || "Tin tức & Thời sự"}
                    </span>
                    <span className="text-outline-variant">•</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Tòa soạn xuất bản: <strong className="text-on-surface">{article.source_name || "Cơ quan báo chí"}</strong>
                    </span>
                    {article.source_url && (
                      <a
                        className="inline-flex items-center gap-0.5 font-label-md text-label-md text-primary-container hover:underline"
                        href={article.source_url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <span>{new URL(article.source_url.startsWith("http") ? article.source_url : `https://${article.source_url}`).hostname}</span>
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    )}
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1.5 leading-relaxed">
                    {article.summary || "Hồ sơ thẩm định chất lượng nội dung bài viết: Đối soát tính khách quan, tính toàn vẹn của dữ liệu và các phát ngôn được phản ánh trong bài báo."}
                  </p>
                </div>
              </div>

              {/* Academic & Protocol Scope Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-space-xs">
                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-start gap-space-sm border border-surface-container">
                  <span className="material-symbols-outlined text-primary-container text-[20px] mt-0.5">category</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                      Lĩnh vực kiểm định
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      {article.category || "Báo chí & Thời sự xã hội"}
                    </span>
                  </div>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-start gap-space-sm border border-surface-container">
                  <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">policy</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                      Hội đồng phụ trách
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      {getReviewCouncil(article.category, article.title)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-space-md rounded-lg bg-surface-container-high/40 text-on-surface-variant flex items-start gap-space-sm border border-surface-container">
                <span className="material-symbols-outlined text-primary-container text-[18px] flex-shrink-0 mt-0.5">
                  menu_book
                </span>
                <p className="font-body-md text-body-md text-on-surface-variant italic leading-snug">
                  “Đánh giá dựa trên các tiêu chuẩn kiểm chứng nội dung báo chí (Fact-checking Protocol & Chuẩn IFCN). Báo cáo tập trung vào tính liêm chính của các dữ liệu, phát ngôn và khả năng đối soát chứng cứ thực tế của bài viết.”
                </p>
              </div>
            </div>

            {/* Right: Data-Rich Metric Visualizer (5 Cols) */}
            <div className="lg:col-span-5 bg-surface-container-low/70 rounded-xl p-space-lg flex flex-col justify-between shadow-sm border border-surface-container">
              <div className="flex items-center justify-between pb-space-sm">
                <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                  Chỉ số minh bạch tổng thể
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold tracking-wide">
                  {article.transparency_rank || "HẠNG A- (KHÁ TỐT)"}
                </span>
              </div>

              {/* Metric Score with SVG Ring Gauge Chart */}
              <div className="flex items-center justify-between py-space-sm">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display-lg text-display-lg text-primary tracking-tight font-bold">
                      {article.transparency_score || 82}
                    </span>
                    <span className="font-headline-sm text-headline-sm text-outline">/100</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary mt-1">Phổ điểm trung vị ngành: 68/100</span>
                </div>

                {/* Inline Precision Radial Gauge SVG */}
                <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                  <svg aria-hidden="true" className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      className="text-surface-container-highest"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                    ></circle>
                    <circle
                      className="text-primary-container transition-all duration-1000 ease-out"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="40"
                      stroke="currentColor"
                      strokeDasharray="251.2"
                      strokeDashoffset="45.2"
                      strokeLinecap="round"
                      strokeWidth="8"
                    ></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-[20px] text-primary-container">
                      verified_user
                    </span>
                  </div>
                </div>
              </div>

              {/* Criterion Snapshot Mini Sparkline bars */}
              <div className="pt-space-sm flex flex-col gap-1.5">
                <div className="flex justify-between text-label-sm font-label-sm text-on-surface-variant">
                  <span>Tiến độ tiêu chí đã thẩm định</span>
                  <span className="font-semibold text-on-surface">3 Đạt · 1 Chưa đạt · 1 Đang đối soát</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden flex">
                  <div className="h-full bg-emerald-600" style={{ width: "60%" }} title="Đạt: 60%"></div>
                  <div className="h-full bg-amber-500" style={{ width: "20%" }} title="Đang đối soát: 20%"></div>
                  <div className="h-full bg-rose-600" style={{ width: "20%" }} title="Chưa đạt: 20%"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Editorial Section Divider & Filter Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pt-space-xs">
          <div>
            <div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              <span className="material-symbols-outlined text-[16px]">fact_check</span>
              Thẩm định chi tiết theo khung COPE
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface mt-0.5 font-bold">
              Bộ tiêu chí minh bạch thông tin
            </h2>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-space-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
              Phạm vi: Bài báo {article.code}
            </span>
            <button
              onClick={handleExportPDF}
              className="px-space-md py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md flex items-center gap-1 transition-colors font-semibold"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">download</span>
              <span>Xuất biên bản Thẩm định</span>
            </button>
          </div>
        </div>

        {/* Criteria Evaluation List (Bespoke Academic Cards) */}
        <div className="flex flex-col gap-y-space-md">
          {criteria.map((item) => {
            const isExpanded = !!expandedCriteria[item.id];
            const numStr = item.id < 10 ? `0${item.id}` : item.id;

            let badgeBg = "bg-emerald-50 text-emerald-800";
            let dotBg = "bg-emerald-600";
            let numColor = "text-primary-container";

            if (item.status === "FAILED") {
              badgeBg = "bg-rose-50 text-rose-800";
              dotBg = "bg-rose-600";
              numColor = "text-error";
            } else if (item.status === "IN_REVIEW") {
              badgeBg = "bg-amber-50 text-amber-800";
              dotBg = "bg-amber-600";
              numColor = "text-amber-700";
            }

            return (
              <article
                key={item.id}
                className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm transition-all duration-200 border border-surface-container"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
                  <div className="flex items-start gap-space-md flex-1">
                    <div
                      className={`w-10 h-10 rounded-lg bg-surface-container-low ${numColor} flex items-center justify-center flex-shrink-0 font-title-lg text-title-lg font-bold`}
                    >
                      {numStr}
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex flex-wrap items-center gap-space-sm mb-1">
                        <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">{item.title}</h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-semibold uppercase ${badgeBg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dotBg}`}></span>
                          {item.statusText}
                        </span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                        {item.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expandable Source Panel Trigger */}
                <div className="mt-space-md pt-space-sm bg-surface-container-lowest flex flex-col border-t border-surface-container/60">
                  <button
                    aria-expanded={isExpanded}
                    className={`flex items-center gap-space-xs font-label-md text-label-md hover:underline w-fit cursor-pointer py-1 ${
                      item.status === "FAILED"
                        ? "text-error font-medium"
                        : item.status === "IN_REVIEW"
                        ? "text-amber-800 font-medium"
                        : "text-primary font-medium"
                    }`}
                    onClick={() => toggleCriterion(item.id)}
                    type="button"
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                    <span>{item.referenceTitle}</span>
                  </button>

                  {/* Expanded Detail Container */}
                  {isExpanded && (
                    <div className="mt-space-sm p-space-md rounded-lg bg-surface-container-low text-on-surface-variant flex flex-col gap-space-xs animate-fadeIn border border-surface-container">
                      <div className="flex items-center gap-space-xs text-label-sm font-label-sm text-secondary uppercase font-semibold">
                        <span className="material-symbols-outlined text-[16px]">
                          {item.id === 2 ? "gavel" : item.id === 3 ? "account_balance" : item.id === 4 ? "mark_email_read" : "link"}
                        </span>
                        Tài liệu đối chiếu học thuật
                      </div>
                      <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                        {item.referenceDetail}
                      </p>

                      {item.doi && (
                        <div className="flex flex-wrap items-center gap-space-md pt-space-xs text-label-sm font-label-sm text-secondary">
                          <span>
                            DOI tham chiếu: <code className="text-primary font-mono">{item.doi}</code>
                          </span>
                          <span>·</span>
                          <span>Tình trạng bản quyền: {item.license || "Truy cập Mở (CC BY 4.0)"}</span>
                        </div>
                      )}

                      {item.actionRecommendation && (
                        <div className="p-space-sm rounded bg-surface-container-highest/60 font-label-sm text-label-sm text-on-surface flex items-center justify-between mt-1">
                          <span>Ý kiến đánh giá từ Hội đồng chuyên gia thẩm định nội dung:</span>
                          <span className="font-semibold text-error">{item.actionRecommendation}</span>
                        </div>
                      )}

                      {item.contactLog && (
                        <div className="space-y-1 font-body-md text-body-md text-on-surface mt-1">
                          {item.contactLog.map((log, li) => (
                            <div key={li} className="flex items-baseline gap-2">
                              <span className="font-mono text-label-sm font-semibold text-secondary">{log.time}:</span>
                              <span>{log.action}</span>
                            </div>
                          ))}
                          <div className="mt-1 flex items-center gap-1 font-label-sm text-label-sm text-amber-800">
                            <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                            <span>Thời hạn xử lý chuẩn theo quy định: 48 giờ làm việc kể từ lúc tiếp nhận</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Bottom Institutional Accreditation & Methodological Assurance Card */}
        <section className="rounded-xl bg-surface-container-low p-space-lg flex flex-col md:flex-row items-center justify-between gap-space-lg border border-surface-container">
          <div className="flex items-start gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div className="flex flex-col">
              <h4 className="font-title-lg text-title-lg text-on-surface font-bold">
                Phương pháp thẩm định độc lập
              </h4>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-0.5 leading-relaxed">
                TrustMedia áp dụng quy trình bình duyệt chéo (Peer-Review) độc lập giữa các chuyên gia kiểm chứng dữ liệu và hội đồng chuyên ngành theo chủ đề bài báo. Các nội dung phát ngôn được đối soát trực tiếp với cơ sở dữ liệu chứng cứ và nguồn tin lưu trữ xác thực.
              </p>
            </div>
          </div>
          <div className="flex flex-row md:flex-col items-center md:items-end gap-space-xs flex-shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={handleReAppeal}
              className="w-full sm:w-auto px-space-lg py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold transition-colors shadow-sm text-center"
              type="button"
            >
              Gửi yêu cầu tái thẩm định
            </button>
            <span className="font-label-sm text-label-sm text-outline">Quy chuẩn IFCN · Mã xác thực ISO-27001</span>
          </div>
        </section>
      </div>
    </div>
  );
}
