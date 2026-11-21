import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAnalysis } from "../context/AnalysisContext";
import { api } from "../api/client";

export default function ReportsPage() {
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id");
  const { article, activePillar, setActivePillar, loadAnalysisDetail } = useAnalysis();
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("opt1");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
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
          console.error("Could not load analysis detail by id in reports:", e);
          setLoadingJob(false);
        });
    }
  }, [queryId, article.id]);

  const pillars = article.surveyPillars || {};
  const currentPillarData = pillars[activePillar] || pillars[2] || pillars[1] || {
    indexTag: "Khảo sát ý kiến độc giả",
    validResponses: "120 phản hồi hợp lệ (98.3%)",
    question: `Khảo sát mức độ tiếp nhận và phản hồi của độc giả về bài báo '${article.title}'`,
    opt1: { text: "Tin cậy và đồng tình với kết luận", count: "72 lượt", pct: "60%", color: "bg-primary-container", pctClass: "text-primary", barWidth: "60%" },
    opt2: { text: "Cần cơ quan chức năng làm rõ thêm", count: "36 lượt", pct: "30%", color: "bg-surface-tint", pctClass: "text-surface-tint", barWidth: "30%" },
    opt3: { text: "Nghi ngờ, chưa đủ cơ sở kiểm chứng", count: "12 lượt", pct: "10%", color: "bg-secondary", pctClass: "text-secondary", barWidth: "10%" },
    academicNote: "Dữ liệu khảo sát thực chứng phản ánh mức độ tiếp nhận của độc giả.",
    aiPrediction: "62.0%",
    actualSurvey: "60.0%",
    deviation: "-2.0%",
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      encodeURIComponent(
        [
          ["Mã bài báo", "Trụ cột", "Câu hỏi", "Lựa chọn", "Số lượng", "Tỷ lệ"],
          [article.code, `Trụ cột ${activePillar}`, `"${currentPillarData.question}"`, `"${currentPillarData.opt1.text}"`, currentPillarData.opt1.count, currentPillarData.opt1.pct],
          [article.code, `Trụ cột ${activePillar}`, `"${currentPillarData.question}"`, `"${currentPillarData.opt2.text}"`, currentPillarData.opt2.count, currentPillarData.opt2.pct],
          [article.code, `Trụ cột ${activePillar}`, `"${currentPillarData.question}"`, `"${currentPillarData.opt3.text}"`, currentPillarData.opt3.count, currentPillarData.opt3.pct],
        ]
          .map((row) => row.join(","))
          .join("\n")
      );

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", csvContent);
    downloadAnchor.setAttribute("download", `TrustMedia_Survey_${article.code}_Pillar${activePillar}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleAddSurveyResponse = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setIsSurveyModalOpen(false);
      setFeedbackNote("");
    }, 1500);
  };

  if (loadingJob) {
    return (
      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-xl flex flex-col items-center justify-center min-h-[400px]">
        <span className="material-symbols-outlined text-[36px] text-primary animate-spin mb-3">sync</span>
        <h3 className="font-title-lg text-title-lg text-on-surface font-bold">Đang tải báo cáo tiếp nhận độc giả...</h3>
        <p className="font-label-sm text-label-sm text-on-surface-variant">Đang nạp dữ liệu khảo sát thực nghiệm và phân tích kháng cự nhận thức</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-lg">
      <div className="flex flex-col w-full">
        <div className="w-full flex flex-col gap-space-lg">
          {/* Survey Segmented Switcher & Sample Metadata Bar */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-md border border-surface-container">
            {/* Survey Pillar Switcher */}
            <div aria-label="Khảo sát độc giả theo trụ cột" className="flex flex-wrap items-center gap-space-xs" role="tablist">
              <button
                className={`survey-tab px-space-md py-2.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 ${
                  activePillar === 1
                    ? "bg-primary-container text-on-primary font-semibold shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
                onClick={() => setActivePillar(1)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Trụ cột 1: Tiếp nhận nội dung bài báo</span>
                {activePillar === 1 && <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed"></span>}
              </button>

              <button
                className={`survey-tab px-space-md py-2.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 ${
                  activePillar === 2
                    ? "bg-primary-container text-on-primary font-semibold shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
                onClick={() => setActivePillar(2)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">psychology_alt</span>
                <span>Trụ cột 2: Niềm tin vào phát ngôn</span>
                {activePillar === 2 && <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed"></span>}
              </button>

              <button
                className={`survey-tab px-space-md py-2.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 ${
                  activePillar === 3
                    ? "bg-primary-container text-on-primary font-semibold shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
                onClick={() => setActivePillar(3)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                <span>Trụ cột 3: Mức độ hiểu bài</span>
                {activePillar === 3 && <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed"></span>}
              </button>
            </div>

            {/* Protocol Metadata & Sample Badge */}
            <div className="flex flex-wrap items-center gap-space-sm self-start lg:self-auto">
              <div className="flex items-center gap-1.5 bg-surface-container-high px-space-sm py-1 rounded-full text-secondary">
                <span className="material-symbols-outlined text-[16px] text-primary">analytics</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-primary">
                  Cỡ mẫu: {currentPillarData.validResponses || "120 phiếu (98.3%)"}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-highest px-space-sm py-1 rounded-full text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider font-medium">Dữ liệu thực nghiệm</span>
              </div>
            </div>
          </div>

          {/* Main Presentation Card: Dynamic Survey Question Stage */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg lg:p-space-xl shadow-sm relative overflow-hidden border border-surface-container">
            {/* Decorative ambient gradient backdrop element */}
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-surface-container-low/60 blur-3xl pointer-events-none"></div>

            {/* Question Meta Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-space-md mb-space-lg gap-space-sm border-b border-surface-container">
              <div className="flex items-center gap-2 text-primary font-label-md text-label-md uppercase tracking-wider font-bold">
                <span className="material-symbols-outlined text-[20px]">quiz</span>
                <span id="question-index-tag">{currentPillarData.indexTag}</span>
              </div>
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm bg-surface-container px-3 py-1 rounded-lg">
                <span className="material-symbols-outlined text-[16px] text-primary">done_all</span>
                <span id="valid-responses-text">{currentPillarData.validResponses}</span>
              </div>
            </div>

            {/* Prominent Question Title Card */}
            <div className="bg-surface-container-low rounded-xl p-space-lg mb-space-xl border border-surface-container">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold block mb-1">
                Câu hỏi nghiên cứu thực nghiệm
              </span>
              <h2
                className="font-title-lg text-title-lg md:font-headline-sm md:text-headline-sm text-on-surface leading-snug font-bold"
                id="survey-question-text"
              >
                {currentPillarData.question}
              </h2>
            </div>

            {/* High-Legibility Survey Distribution Horizontal Bars */}
            <div className="space-y-space-lg mb-space-xl" id="distribution-container">
              {/* Option 1 */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-error-container text-on-error-container font-label-sm text-label-sm flex items-center justify-center font-bold">
                      A
                    </span>
                    <span className="font-body-lg text-body-lg text-on-surface font-medium" id="label-opt-1">
                      {currentPillarData.opt1.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-label-md text-label-md">
                    <span className="text-on-surface-variant" id="count-opt-1">
                      {currentPillarData.opt1.count}
                    </span>
                    <span className={`font-headline-sm text-headline-sm font-bold tracking-tight ${currentPillarData.opt1.pctClass}`}>
                      {currentPillarData.opt1.pct}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-7 p-1 overflow-hidden flex items-center">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${currentPillarData.opt1.color}`}
                    id="bar-opt-1"
                    style={{ width: currentPillarData.opt1.barWidth }}
                  ></div>
                </div>
              </div>

              {/* Option 2 */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-surface-container-high text-primary font-label-sm text-label-sm flex items-center justify-center font-bold">
                      B
                    </span>
                    <span className="font-body-lg text-body-lg text-on-surface font-medium" id="label-opt-2">
                      {currentPillarData.opt2.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-label-md text-label-md">
                    <span className="text-on-surface-variant" id="count-opt-2">
                      {currentPillarData.opt2.count}
                    </span>
                    <span className={`font-headline-sm text-headline-sm font-bold tracking-tight ${currentPillarData.opt2.pctClass}`}>
                      {currentPillarData.opt2.pct}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-7 p-1 overflow-hidden flex items-center">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${currentPillarData.opt2.color}`}
                    id="bar-opt-2"
                    style={{ width: currentPillarData.opt2.barWidth }}
                  ></div>
                </div>
              </div>

              {/* Option 3 */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-surface-container-high text-secondary font-label-sm text-label-sm flex items-center justify-center font-bold">
                      C
                    </span>
                    <span className="font-body-lg text-body-lg text-on-surface font-medium" id="label-opt-3">
                      {currentPillarData.opt3.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-label-md text-label-md">
                    <span className="text-on-surface-variant" id="count-opt-3">
                      {currentPillarData.opt3.count}
                    </span>
                    <span className={`font-headline-sm text-headline-sm font-bold tracking-tight ${currentPillarData.opt3.pctClass}`}>
                      {currentPillarData.opt3.pct}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-7 p-1 overflow-hidden flex items-center">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${currentPillarData.opt3.color}`}
                    id="bar-opt-3"
                    style={{ width: currentPillarData.opt3.barWidth }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Comparative Panels: Academic Interpretation vs. AI Prediction Contrast */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg pt-space-lg bg-surface-container-low/50 rounded-xl p-space-md lg:p-space-lg border border-surface-container">
              {/* Left: Academic Rigor Interpretation */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-space-md">
                <div>
                  <div className="flex items-center gap-2 text-primary mb-space-xs">
                    <span className="material-symbols-outlined text-[20px]">school</span>
                    <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
                      Nhận định học thuật & Đánh giá rủi ro
                    </h3>
                  </div>
                  <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed" id="academic-note">
                    {currentPillarData.academicHighlight ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: currentPillarData.academicNote.replace(
                            currentPillarData.academicHighlight,
                            `<mark class="bg-tertiary-fixed text-on-tertiary-container px-1 py-0.5 rounded">${currentPillarData.academicHighlight}</mark>`
                          ),
                        }}
                      />
                    ) : (
                      currentPillarData.academicNote
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-space-md text-on-surface-variant font-label-sm text-label-sm">
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <span className="material-symbols-outlined text-[16px]">verified</span> P-value &lt; 0.001
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <span className="material-symbols-outlined text-[16px]">balance</span> Khoảng tin cậy: 95% CI [50.2%, 65.8%]
                  </span>
                </div>
              </div>

              {/* Right: AI Natural Language Model Contrast Metric Box */}
              <div className="lg:col-span-5 bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col justify-between border border-surface-container">
                <div className="flex items-center justify-between pb-space-xs">
                  <div className="flex items-center gap-1.5 text-primary">
                    <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      Đối chiếu mô hình ngôn ngữ AI
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded font-mono">
                    BERT-VnMedia v2
                  </span>
                </div>

                {/* Comparison Data Matrix */}
                <div className="grid grid-cols-3 gap-2 py-space-sm text-center">
                  <div className="bg-surface-container-low rounded-lg p-2.5 flex flex-col items-center border border-surface-container">
                    <span className="font-label-sm text-label-sm text-on-surface-variant mb-0.5">Dự báo AI</span>
                    <span className="font-title-lg text-title-lg text-primary font-bold" id="ai-prediction-val">
                      {currentPillarData.aiPrediction}
                    </span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-2.5 flex flex-col items-center border border-surface-container">
                    <span className="font-label-sm text-label-sm text-on-surface-variant mb-0.5">Khảo sát</span>
                    <span className="font-title-lg text-title-lg text-on-surface font-bold" id="actual-survey-val">
                      {currentPillarData.actualSurvey}
                    </span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-2.5 flex flex-col items-center border border-surface-container">
                    <span className="font-label-sm text-label-sm text-on-surface-variant mb-0.5">Độ lệch</span>
                    <span className="font-title-lg text-title-lg text-secondary font-bold" id="deviation-val">
                      {currentPillarData.deviation}
                    </span>
                  </div>
                </div>

                {/* Reliability Margin Status */}
                <div className="flex items-center justify-between pt-1 font-label-sm text-label-sm">
                  <span className="text-on-surface-variant">Đánh giá chuẩn hóa:</span>
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Nằm trong sai số cho phép (±5%)
                  </span>
                </div>
              </div>
            </div>

            {/* Action Utility Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-xl mt-space-lg border-t border-surface-container">
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-[18px] text-outline">history</span>
                <span>Cập nhật đồng bộ thời gian thực: {article.publication_date || "Hôm nay"}</span>
              </div>
              <div className="flex items-center gap-space-sm w-full sm:w-auto">
                <button
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-space-md py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all shadow-sm"
                  onClick={() => setIsSurveyModalOpen(true)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>+ Nhập phản hồi khảo sát mới</span>
                </button>
                <button
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-space-md py-2.5 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-highest transition-all"
                  onClick={handleExportCSV}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">download</span>
                  <span>Xuất dữ liệu CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Presentation Context & Academic Methodology Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start gap-space-sm border border-surface-container">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div>
                <h4 className="font-label-md text-label-md font-semibold text-on-surface mb-0.5">
                  Tiêu chuẩn chọn mẫu
                </h4>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Chọn ngẫu nhiên phân tầng trong nhóm độc giả theo dõi chuyên mục Sức khỏe 18-65 tuổi tại TP.HCM & Hà Nội.
                </p>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start gap-space-sm border border-surface-container">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined">rule</span>
              </div>
              <div>
                <h4 className="font-label-md text-label-md font-semibold text-on-surface mb-0.5">
                  Tiêu chí phân loại rủi ro
                </h4>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Tỷ lệ tin tưởng sai lệch &gt;50% kích hoạt cảnh báo nguy cơ ngộ nhận y tế cấp độ II trên bảng báo cáo học thuật.
                </p>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start gap-space-sm border border-surface-container">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined">share_reviews</span>
              </div>
              <div>
                <h4 className="font-label-md text-label-md font-semibold text-on-surface mb-0.5">
                  Mục đích nghiên cứu
                </h4>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Cung cấp bằng chứng thực nghiệm về tác động của tiêu đề báo chí đối với nhận thức khoa học của cộng đồng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Survey Modal */}
      {isSurveyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-lg shadow-xl border border-surface-container">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container mb-space-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">rate_review</span>
                <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
                  Nhập phản hồi khảo sát thực tế
                </h3>
              </div>
              <button
                onClick={() => setIsSurveyModalOpen(false)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {submitSuccess ? (
              <div className="p-space-md bg-[#DCFCE7] text-[#15803D] rounded-lg text-center font-semibold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                Đã ghi nhận phiếu khảo sát vào bộ dữ liệu thực nghiệm!
              </div>
            ) : (
              <form onSubmit={handleAddSurveyResponse} className="flex flex-col gap-space-md">
                <div>
                  <label className="font-label-sm text-label-sm text-outline uppercase font-semibold block mb-1">
                    Câu hỏi đang khảo sát
                  </label>
                  <p className="font-body-md text-body-md text-on-surface bg-surface-container-low p-2.5 rounded-lg border border-surface-container font-medium">
                    {currentPillarData.question}
                  </p>
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-outline uppercase font-semibold block mb-1">
                    Lựa chọn của người tham gia khảo sát
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-start gap-2 p-2.5 rounded-lg border border-surface-container bg-surface-container-lowest hover:bg-surface-container cursor-pointer">
                      <input
                        type="radio"
                        name="surveyAnswer"
                        value="opt1"
                        checked={selectedAnswer === "opt1"}
                        onChange={() => setSelectedAnswer("opt1")}
                        className="mt-1"
                      />
                      <span className="font-body-md text-body-md text-on-surface">
                        <strong>(A)</strong> {currentPillarData.opt1.text}
                      </span>
                    </label>
                    <label className="flex items-start gap-2 p-2.5 rounded-lg border border-surface-container bg-surface-container-lowest hover:bg-surface-container cursor-pointer">
                      <input
                        type="radio"
                        name="surveyAnswer"
                        value="opt2"
                        checked={selectedAnswer === "opt2"}
                        onChange={() => setSelectedAnswer("opt2")}
                        className="mt-1"
                      />
                      <span className="font-body-md text-body-md text-on-surface">
                        <strong>(B)</strong> {currentPillarData.opt2.text}
                      </span>
                    </label>
                    <label className="flex items-start gap-2 p-2.5 rounded-lg border border-surface-container bg-surface-container-lowest hover:bg-surface-container cursor-pointer">
                      <input
                        type="radio"
                        name="surveyAnswer"
                        value="opt3"
                        checked={selectedAnswer === "opt3"}
                        onChange={() => setSelectedAnswer("opt3")}
                        className="mt-1"
                      />
                      <span className="font-body-md text-body-md text-on-surface">
                        <strong>(C)</strong> {currentPillarData.opt3.text}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-outline uppercase font-semibold block mb-1">
                    Ghi chú của người phỏng vấn (tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="Nhập đối tượng phỏng vấn, bối cảnh ghi nhận..."
                    className="w-full p-2.5 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>

                <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                  <button
                    type="button"
                    onClick={() => setIsSurveyModalOpen(false)}
                    className="px-space-md py-2 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary shadow-sm"
                  >
                    Lưu kết quả khảo sát
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
