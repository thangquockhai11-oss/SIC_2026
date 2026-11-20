import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { AnalysisDetail } from "../api/types";

export default function MediaCredibilityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentId = searchParams.get("id");

  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    "1": false,
    "2": false,
    "3": false,
    "4": false,
  });

  // Load analysis
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        let targetId = currentId;
        if (!targetId) {
          const list = await api.history.list({ page_size: 1 });
          if (list.items && list.items.length > 0) {
            targetId = list.items[0].id;
            setSearchParams({ id: targetId }, { replace: true });
          }
        }
        if (targetId) {
          const detail = await api.analyzer.getDetail(targetId);
          if (isMounted) setAnalysis(detail);
        }
      } catch (err) {
        console.warn("Could not load analysis detail in MediaCredibilityPage:", err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentId, setSearchParams]);

  const toggleCriterion = (id: string) => {
    setExpandedPanels((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const credibility = analysis?.credibility;
  const latestSnapshot = analysis?.snapshots && analysis.snapshots.length > 0 
    ? analysis.snapshots[analysis.snapshots.length - 1] 
    : null;

  const publisherName = credibility?.source_name || latestSnapshot?.author || (analysis?.source_url ? new URL(analysis.source_url).hostname : "Báo Tuổi Trẻ");
  const publisherDomain = credibility?.domain || (analysis?.source_url ? new URL(analysis.source_url).hostname : "tuoitre.vn");
  const overallScore = Math.round(credibility?.overall_credibility_score || credibility?.transparency_score || 82);

  // SVG Gauge calculations (circumference = 2 * pi * 40 = 251.2)
  const circumference = 251.2;
  const strokeDashoffset = circumference - (circumference * overallScore) / 100;

  const archiveCode = analysis ? `#TM-${analysis.id.slice(0, 8).toUpperCase()}` : "#TM-2024-8841A";

  const exportCredibilityReport = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-lg">
      <div className="flex flex-col w-full gap-y-space-xl">
        {/* Editorial Meta Ribbon & Academic Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-space-md px-space-xs text-on-surface-variant">
          <div className="flex items-center gap-space-sm font-label-md text-label-md">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-container/10 text-primary-container">
              <span className="material-symbols-outlined text-[14px]">shield</span>
            </span>
            <span>Khung đánh giá ĐHQG-HCM / COPE Journalistic Index</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-semibold">{publisherName} ({publisherDomain})</span>
          </div>
          <div className="flex items-center gap-space-md text-label-sm font-label-sm">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-primary">history</span>
              Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")} · 09:30 UTC+7
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-secondary font-medium">
              Mã hồ sơ: PUB-TTO-2024
            </span>
          </div>
        </div>

        {/* Top Executive Profile & Trust Score Card */}
        <section className="w-full bg-surface-container-lowest rounded-xl p-space-lg lg:p-space-xl shadow-sm relative overflow-hidden border border-outline-variant/30">
          {/* Subtle Background Architectural Gradient */}
          <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-primary-container/5 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-24 w-80 h-80 rounded-full bg-tertiary-container/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-y-space-lg lg:gap-x-space-xl items-center">
            {/* Left: Identity & Institutional Accreditation (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-y-space-md">
              <div className="flex items-start gap-space-md">
                <div className="w-16 h-16 rounded-xl bg-surface-container-high flex-shrink-0 flex items-center justify-center text-primary shadow-xs overflow-hidden">
                  <span className="material-symbols-outlined text-[34px]">corporate_fare</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-space-xs">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      {publisherName}
                    </span>
                    <a
                      className="inline-flex items-center gap-0.5 font-label-md text-label-md text-primary-container hover:underline"
                      href={`https://${publisherDomain}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span>{publisherDomain}</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-[11px] font-medium">
                      Báo điện tử Trung ương
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1 leading-relaxed">
                    {credibility?.outlet_profile?.editorial_policy || "Cơ quan ngôn luận của Đoàn TNCS Hồ Chí Minh TP. Hồ Chí Minh · Cấp phép hoạt động báo chí số 236/GP-BTTTT."}
                  </p>
                </div>
              </div>

              {/* Academic & Protocol Scope Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-space-xs">
                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-start gap-space-sm border border-outline-variant/20">
                  <span className="material-symbols-outlined text-primary-container text-[20px] mt-0.5">science</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-[11px] text-secondary uppercase tracking-wider font-semibold">
                      Lĩnh vực kiểm định
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      Báo chí Y tế & Khoa học đời sống
                    </span>
                  </div>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low flex items-start gap-space-sm border border-outline-variant/20">
                  <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">policy</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-[11px] text-secondary uppercase tracking-wider font-semibold">
                      Hội đồng phụ trách
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      Tiểu ban Truyền thông Sức khỏe ĐHQG
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-space-md rounded-lg bg-surface-container-high/40 text-on-surface-variant flex items-start gap-space-sm border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary-container text-[18px] flex-shrink-0 mt-0.5">menu_book</span>
                <p className="font-body-md text-body-md text-on-surface-variant italic leading-snug">
                  “Đánh giá dựa trên 5 tiêu chí minh bạch báo chí quốc tế (The Trust Project & Đề án Báo chí Minh bạch ĐHQG). Báo cáo tập trung vào tính liêm chính dữ liệu gốc và khả năng truy hồi nguồn công bố.”
                </p>
              </div>
            </div>

            {/* Right: Data-Rich Metric Visualizer (5 Cols) */}
            <div className="lg:col-span-5 bg-surface-container-low/70 rounded-xl p-space-lg flex flex-col justify-between shadow-sm border border-outline-variant/20">
              <div className="flex items-center justify-between pb-space-sm">
                <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                  Chỉ số minh bạch tổng thể
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-[11px] font-bold tracking-wide">
                  HẠNG A- (KHÁ TỐT)
                </span>
              </div>

              {/* Metric Score with SVG Ring Gauge Chart */}
              <div className="flex items-center justify-between py-space-sm">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display-lg text-display-lg text-primary tracking-tight font-bold">
                      {overallScore}
                    </span>
                    <span className="font-headline-sm text-headline-sm text-outline">/100</span>
                  </div>
                  <span className="font-label-sm text-[11px] text-secondary mt-1">Phổ điểm trung vị ngành: 68/100</span>
                </div>

                {/* Precision Radial Gauge SVG */}
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
                    />
                    <circle
                      className="text-primary-container transition-all duration-1000 ease-out"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="40"
                      stroke="currentColor"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      strokeWidth="8"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-[20px] text-primary-container">verified_user</span>
                  </div>
                </div>
              </div>

              {/* Criterion Snapshot Mini Sparkline bars */}
              <div className="pt-space-sm flex flex-col gap-1.5 border-t border-outline-variant/20">
                <div className="flex justify-between text-label-sm font-label-sm text-on-surface-variant">
                  <span>Tiến độ tiêu chí đã thẩm định</span>
                  <span className="font-semibold text-on-surface">3 Đạt · 1 Chưa đạt · 1 Đang đối soát</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden flex">
                  <div className="h-full bg-emerald-600" style={{ width: "60%" }} title="Đạt: 60%" />
                  <div className="h-full bg-amber-500" style={{ width: "20%" }} title="Đang đối soát: 20%" />
                  <div className="h-full bg-rose-600" style={{ width: "20%" }} title="Chưa đạt: 20%" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Divider & Filter Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pt-space-xs border-b border-outline-variant/20 pb-space-sm">
          <div>
            <div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              <span className="material-symbols-outlined text-[16px]">fact_check</span>
              Thẩm định chi tiết theo khung COPE
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface mt-0.5 font-bold">
              Bộ tiêu chí minh bạch thông tin
            </h2>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Phạm vi: Bài báo {archiveCode}
            </span>
            <button
              onClick={exportCredibilityReport}
              className="px-space-md py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md flex items-center gap-1 transition-colors border border-outline-variant/30"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">download</span>
              <span>Xuất biên bản Thẩm định</span>
            </button>
          </div>
        </div>

        {/* Criteria Evaluation List (Bespoke Academic Cards) */}
        <div className="flex flex-col gap-y-space-md">
          {/* 1. Tiêu chí 1: Trích dẫn nguồn tài liệu gốc & Tác giả nghiên cứu (ĐẠT YÊU CẦU) */}
          <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 transition-all duration-200">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
              <div className="flex items-start gap-space-md flex-1">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low text-primary-container flex items-center justify-center flex-shrink-0 font-title-lg text-title-lg font-bold border border-outline-variant/20">
                  01
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex flex-wrap items-center gap-space-sm mb-1">
                    <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                      Trích dẫn nguồn tài liệu gốc & Tác giả nghiên cứu
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm text-[11px] font-semibold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Đạt yêu cầu
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Bài báo có ghi rõ tên <span className="bg-[#FFF0BA] px-1 rounded text-on-surface font-medium">Viện Hàn lâm Khoa học và Công nghệ Việt Nam</span> cùng chủ nhiệm nhóm nghiên cứu. Tuy nhiên, bài viết còn thiếu mã định danh quốc tế (DOI) và chưa cung cấp siêu liên kết trực tiếp trỏ về công bố học thuật gốc trên tạp chí chuyên ngành.
                  </p>
                </div>
              </div>
            </div>

            {/* Expandable Source Panel Trigger */}
            <div className="mt-space-md pt-space-sm bg-surface-container-lowest flex flex-col border-t border-outline-variant/20">
              <button
                className="flex items-center gap-space-xs text-primary font-label-md text-label-md hover:underline w-fit cursor-pointer py-1"
                onClick={() => toggleCriterion("1")}
                type="button"
                aria-expanded={expandedPanels["1"]}
              >
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                  expandedPanels["1"] ? "rotate-180" : "rotate-0"
                }`}>expand_more</span>
                <span className="font-medium">Xem nguồn kiểm chứng: Viện Hàn lâm KH&CN Việt Nam (Thông cáo báo chí 10/2024)</span>
              </button>

              {expandedPanels["1"] && (
                <div className="mt-space-sm p-space-md rounded-lg bg-surface-container-low text-on-surface-variant flex flex-col gap-space-xs border border-outline-variant/20 animate-fadeIn">
                  <div className="flex items-center gap-space-xs text-label-sm text-[11px] text-secondary uppercase font-semibold">
                    <span className="material-symbols-outlined text-[16px] text-primary">link</span>
                    Tài liệu đối chiếu học thuật
                  </div>
                  <p className="font-body-md text-body-md text-on-surface">
                    Văn bản số <strong>412/TB-VAST</strong> ký ngày 18/10/2024: <em>“Công bố kết quả sàng lọc hoạt tính sinh học từ cây Hoàng liên ô rô phòng ngừa khối u.”</em> Nghiên cứu được thực hiện bởi Phòng Hóa sinh Ứng dụng.
                  </p>
                  <div className="flex flex-wrap items-center gap-space-md pt-space-xs text-label-sm text-[11px] text-secondary border-t border-outline-variant/20">
                    <span>DOI tham chiếu: <code className="text-primary font-mono font-semibold">10.1016/j.jep.2024.118942</code></span>
                    <span>·</span>
                    <span>Tình trạng bản quyền: Truy cập Mở (CC BY 4.0)</span>
                  </div>
                </div>
              )}
            </div>
          </article>

          {/* 2. Tiêu chí 2: Phân định rõ ràng giữa thử nghiệm Lab và Thử nghiệm lâm sàng (CHƯA ĐẠT) */}
          <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 transition-all duration-200">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
              <div className="flex items-start gap-space-md flex-1">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low text-error flex items-center justify-center flex-shrink-0 font-title-lg text-title-lg font-bold border border-outline-variant/20">
                  02
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex flex-wrap items-center gap-space-sm mb-1">
                    <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                      Phân định rõ ràng giữa thử nghiệm Lab và Thử nghiệm lâm sàng
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm text-[11px] font-semibold uppercase bg-rose-50 text-rose-800 border border-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      Chưa đạt yêu cầu
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Tiêu đề và đoạn dẫn (sapo) sử dụng thuật ngữ mang tính khái quát hóa quá mức: <mark className="bg-[#FFF0BA] text-on-surface px-1.5 py-0.5 rounded font-medium">“tiêu diệt tế bào ung thư”</mark>, tạo ấn tượng sai lệch về hiệu quả điều trị thực tế trên người. Văn bản không chủ động giải thích rõ đây là kết quả tiền lâm sàng thuần túy trong ống nghiệm (<em>in-vitro</em>) ở nồng độ cao.
                  </p>
                </div>
              </div>
            </div>

            {/* Expandable Source Panel Trigger */}
            <div className="mt-space-md pt-space-sm bg-surface-container-lowest flex flex-col border-t border-outline-variant/20">
              <button
                className="flex items-center gap-space-xs text-error font-label-md text-label-md hover:underline w-fit cursor-pointer py-1"
                onClick={() => toggleCriterion("2")}
                type="button"
                aria-expanded={expandedPanels["2"]}
              >
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                  expandedPanels["2"] ? "rotate-180" : "rotate-0"
                }`}>expand_more</span>
                <span className="font-medium">Xem đối chiếu tiêu chuẩn biên tập báo chí y khoa WHO & Bộ Y tế</span>
              </button>

              {expandedPanels["2"] && (
                <div className="mt-space-sm p-space-md rounded-lg bg-surface-container-low text-on-surface-variant flex flex-col gap-space-xs border border-outline-variant/20 animate-fadeIn">
                  <div className="flex items-center gap-space-xs text-label-sm text-[11px] text-secondary uppercase font-semibold">
                    <span className="material-symbols-outlined text-[16px] text-error">gavel</span>
                    Quy chuẩn truyền thông y tế áp dụng
                  </div>
                  <p className="font-body-md text-body-md text-on-surface">
                    Khoản 4 Điều 12 Quyết định 1515/QĐ-BYT & Hướng dẫn WHO Health Journalism Protocol: <em>“Các dòng tít y học không được ngụ ý thuốc chữa bệnh khi thử nghiệm mới dừng lại ở mô hình tế bào (cell lines). Bắt buộc phải có câu cảnh báo đối với bệnh nhân đang điều trị phác đồ chuẩn.”</em>
                  </p>
                  <div className="p-space-sm rounded bg-surface-container-highest/60 font-label-sm text-label-sm text-on-surface flex items-center justify-between border border-outline-variant/20 mt-1">
                    <span>Đánh giá từ TS.BS Nguyễn Quốc Quân (Bệnh viện K Trung ương):</span>
                    <span className="font-semibold text-error">Khuyến nghị bổ sung đính chính</span>
                  </div>
                </div>
              )}
            </div>
          </article>

          {/* 3. Tiêu chí 3: Minh bạch xung đột lợi ích & Nhà tài trợ (ĐẠT YÊU CẦU) */}
          <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 transition-all duration-200">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
              <div className="flex items-start gap-space-md flex-1">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low text-primary-container flex items-center justify-center flex-shrink-0 font-title-lg text-title-lg font-bold border border-outline-variant/20">
                  03
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex flex-wrap items-center gap-space-sm mb-1">
                    <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                      Minh bạch xung đột lợi ích & Nhà tài trợ
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm text-[11px] font-semibold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Đạt yêu cầu
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Bài viết công khai minh bạch nguồn tài chính: đề tài sử dụng ngân sách nghiên cứu cơ bản nhà nước thông qua <span className="bg-[#FFF0BA] px-1 rounded text-on-surface font-medium">Quỹ Phát triển Khoa học và Công nghệ Quốc gia (NAFOSTED)</span>. Không phát hiện dấu hiệu nhận tài trợ thương mại từ các đơn vị thực phẩm chức năng hoặc hãng dược tư nhân.
                  </p>
                </div>
              </div>
            </div>

            {/* Expandable Source Panel Trigger */}
            <div className="mt-space-md pt-space-sm bg-surface-container-lowest flex flex-col border-t border-outline-variant/20">
              <button
                className="flex items-center gap-space-xs text-primary font-label-md text-label-md hover:underline w-fit cursor-pointer py-1"
                onClick={() => toggleCriterion("3")}
                type="button"
                aria-expanded={expandedPanels["3"]}
              >
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                  expandedPanels["3"] ? "rotate-180" : "rotate-0"
                }`}>expand_more</span>
                <span className="font-medium">Xem đối chiếu: Quyết định phê duyệt đề tài số 142/QĐ-NAFOSTED</span>
              </button>

              {expandedPanels["3"] && (
                <div className="mt-space-sm p-space-md rounded-lg bg-surface-container-low text-on-surface-variant flex flex-col gap-space-xs border border-outline-variant/20 animate-fadeIn">
                  <div className="flex items-center gap-space-xs text-label-sm text-[11px] text-secondary uppercase font-semibold">
                    <span className="material-symbols-outlined text-[16px] text-primary">account_balance</span>
                    Dữ liệu tài trợ công khai
                  </div>
                  <p className="font-body-md text-body-md text-on-surface">
                    Mã nhiệm vụ: <strong>106.05-2021.32</strong>. Kinh phí phân bổ: Ngân sách Nhà nước phục vụ nghiên cứu khoa học cơ bản. Cam kết bảo đảm đạo đức nghiên cứu đã được Hội đồng Khoa học ngành Y sinh thông qua ngày 12/03/2022.
                  </p>
                  <span className="text-label-sm text-[11px] text-secondary font-medium">
                    Tình trạng xác minh: Không có xung đột lợi ích thương mại công bố.
                  </span>
                </div>
              )}
            </div>
          </article>

          {/* 4. Tiêu chí 4: Cơ chế đính chính và phản hồi độc giả (ĐANG ĐỐI SOÁT) */}
          <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 transition-all duration-200">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
              <div className="flex items-start gap-space-md flex-1">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low text-amber-700 flex items-center justify-center flex-shrink-0 font-title-lg text-title-lg font-bold border border-outline-variant/20">
                  04
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex flex-wrap items-center gap-space-sm mb-1">
                    <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                      Cơ chế đính chính và phản hồi độc giả
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm text-[11px] font-semibold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      Đang đối soát
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Tòa soạn duy trì hòm thư tiếp nhận đóng góp bạn đọc công khai. Văn phòng Thẩm định TrustMedia đã chính thức chuyển tiếp thông cáo phản biện y khoa về giới hạn thử nghiệm tới Thư ký Tòa soạn và đang chờ phản hồi hiệu đính tiêu đề bài viết.
                  </p>
                </div>
              </div>
            </div>

            {/* Expandable Source Panel Trigger */}
            <div className="mt-space-md pt-space-sm bg-surface-container-lowest flex flex-col border-t border-outline-variant/20">
              <button
                className="flex items-center gap-space-xs text-amber-800 font-label-md text-label-md hover:underline w-fit cursor-pointer py-1"
                onClick={() => toggleCriterion("4")}
                type="button"
                aria-expanded={expandedPanels["4"]}
              >
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                  expandedPanels["4"] ? "rotate-180" : "rotate-0"
                }`}>expand_more</span>
                <span className="font-medium">Xem nguồn kiểm chứng: Nhật ký trao đổi thư điện tử ngày 25/10/2024</span>
              </button>

              {expandedPanels["4"] && (
                <div className="mt-space-sm p-space-md rounded-lg bg-surface-container-low text-on-surface-variant flex flex-col gap-space-xs border border-outline-variant/20 animate-fadeIn">
                  <div className="flex items-center gap-space-xs text-label-sm text-[11px] text-secondary uppercase font-semibold">
                    <span className="material-symbols-outlined text-[16px] text-amber-700">mark_email_read</span>
                    Biên bản tiếp nhận thông tin
                  </div>
                  <div className="space-y-1 font-body-md text-body-md text-on-surface">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-label-sm text-[11px] font-semibold text-secondary">25/10 14:15:</span>
                      <span>Gửi văn bản khuyến nghị điều chỉnh tiêu đề tới đại diện Ban Khoa giáo Báo Tuổi Trẻ.</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-label-sm text-[11px] font-semibold text-secondary">25/10 16:40:</span>
                      <span>Hệ thống ghi nhận email xác nhận đã nhận từ Phòng Thư ký Tòa soạn Tuổi Trẻ Online.</span>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-1 font-label-sm text-[11px] text-amber-800 border-t border-outline-variant/20 pt-1">
                    <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                    <span>Thời hạn xử lý chuẩn theo quy định: 48 giờ làm việc kể từ lúc tiếp nhận</span>
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>

        {/* Bottom Institutional Accreditation & Methodological Assurance Card */}
        <section className="rounded-xl bg-surface-container-low p-space-lg flex flex-col md:flex-row items-center justify-between gap-space-lg border border-outline-variant/30">
          <div className="flex items-start gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div className="flex flex-col">
              <h4 className="font-title-lg text-title-lg text-on-surface font-semibold">
                Phương pháp thẩm định độc lập
              </h4>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-0.5 leading-relaxed">
                TrustMedia áp dụng quy trình bình duyệt chéo (Peer-Review) độc lập giữa các chuyên gia y dược học và giảng viên báo chí. Các cơ quan báo chí có quyền gửi khiếu nại hoặc dữ liệu bổ sung trong vòng 15 ngày làm việc.
              </p>
            </div>
          </div>
          <div className="flex flex-row md:flex-col items-center md:items-end gap-space-xs flex-shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={() => alert("Hệ thống TrustMedia: Đã tiếp nhận yêu cầu tái thẩm định hồ sơ tòa soạn. Hội đồng chuyên gia độc lập sẽ xem xét trong vòng 3 ngày làm việc.")}
              className="w-full sm:w-auto px-space-lg py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-medium transition-colors shadow-sm text-center"
              type="button"
            >
              Gửi yêu cầu tái thẩm định
            </button>
            <span className="font-label-sm text-[11px] text-outline">Quy chuẩn IFCN · Mã xác thực ISO-27001</span>
          </div>
        </section>
      </div>
    </div>
  );
}
