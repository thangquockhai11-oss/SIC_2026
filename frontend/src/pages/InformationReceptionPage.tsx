import { useQuery } from "@tanstack/react-query";
import {
  BrainCircuit,
  FileCheck2,
  Share2,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { api } from "../api/client";

export default function InformationReceptionPage() {
  const { data: tests, isLoading } = useQuery({
    queryKey: ["reception", "tests"],
    queryFn: api.reception.listTests,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 font-sans">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* 1. Academic Page Title Section */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-primary-container">psychology</span>
            <span className="font-label-sm text-[11px] uppercase tracking-wider font-semibold text-primary">
              TÂM LÝ HỌC TRUYỀN THÔNG // TIẾP NHẬN &amp; ĐỌC HIỂU (MIND BENCHMARK)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-normal leading-tight">
            Tiếp nhận Thông tin &amp; Đọc hiểu Báo chí (Information Reception)
          </h1>
          <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
            Đo lường mức độ thấu hiểu thông điệp, khả năng nhận diện phát ngôn sai lệch, sức kháng cự nhận thức và ý định chia sẻ lại của độc giả qua các kịch bản thực nghiệm.
          </p>
        </section>

        {/* 2. Metrics Row (3 Academic KPI Cards) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">
                Độ hiểu thông điệp (Comprehension)
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <BrainCircuit size={16} />
              </div>
            </div>
            <div className="text-3xl font-bold text-primary tracking-tight mb-2">
              85.4%
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20">
              Khả năng nắm bắt đúng luận điểm cốt lõi bài viết
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">
                Độ nhạy nhận diện Claim
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <FileCheck2 size={16} />
              </div>
            </div>
            <div className="text-3xl font-bold text-on-surface tracking-tight mb-2">
              88.2%
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20">
              Phát hiện chính xác các phát ngôn thiếu kiểm chứng
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">
                Tỷ lệ kiểm chứng trước chia sẻ
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Share2 size={16} />
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-700 tracking-tight mb-2">
              72.5%
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20">
              Người đọc cam kết tra cứu nguồn đối chứng độc lập
            </div>
          </div>
        </section>

        {/* 3. List of Reception Studies */}
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-4">
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                Kết quả Kiểm định Đọc hiểu &amp; Tiếp nhận Thực nghiệm
              </h2>
              <p className="text-xs text-on-surface-variant">
                Dữ liệu thử nghiệm phản ứng người đọc đối với các dạng tin tức và tin đồn
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 self-start sm:self-auto flex items-center gap-1.5">
              <CheckCircle size={13} />
              <span>Thực nghiệm độc lập</span>
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-sm">
              <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Đang tải dữ liệu kiểm định tiếp nhận...</span>
            </div>
          ) : !tests || tests.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-center">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline">
                <BrainCircuit size={24} />
              </div>
              <strong className="text-base text-on-surface">Chưa có bài kiểm định tiếp nhận nào</strong>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {tests.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-4 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
                    <div>
                      <h3 className="font-bold text-base text-on-surface">
                        Thử nghiệm Tiếp nhận Tin tức Khẩn cấp
                      </h3>
                      <span className="text-xs text-on-surface-variant">
                        Mã phiên thử nghiệm: <span className="font-mono text-outline">{t.id?.slice(0, 8)}...</span>
                      </span>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-surface-container-lowest text-primary text-xs font-semibold border border-outline-variant/20 flex items-center gap-1.5 self-start sm:self-auto">
                      <span>Cỡ mẫu đối chứng: <strong>{t.sample_size}</strong> độc giả</span>
                    </div>
                  </div>

                  {/* 4 Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center text-center">
                      <span className="text-[11px] text-on-surface-variant uppercase font-medium">Hiểu đúng thông tin</span>
                      <strong className="text-xl font-bold text-primary mt-1">{t.comprehension_score}%</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center text-center">
                      <span className="text-[11px] text-on-surface-variant uppercase font-medium">Nhận biết claim</span>
                      <strong className="text-xl font-bold text-on-surface mt-1">{t.claim_identification_rate}%</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center text-center">
                      <span className="text-[11px] text-on-surface-variant uppercase font-medium">Chấp nhận thông điệp</span>
                      <strong className="text-xl font-bold text-on-surface mt-1">{t.acceptance_rate}%</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center text-center">
                      <span className="text-[11px] text-on-surface-variant uppercase font-medium">Kiểm chứng trước share</span>
                      <strong className="text-xl font-bold text-emerald-700 mt-1">{t.verify_before_sharing_rate}%</strong>
                    </div>
                  </div>

                  {/* Sharing intention distribution bar */}
                  <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-on-surface flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-primary" />
                        <span>Ý định chia sẻ tin tức của người đọc:</span>
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span>Thấp: <strong>{t.sharing_intention_low}%</strong></span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span>Trung bình: <strong>{t.sharing_intention_medium}%</strong></span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span>Cao: <strong>{t.sharing_intention_high}%</strong></span>
                        </span>
                      </div>
                    </div>

                    <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${t.sharing_intention_low}%` }}
                        title={`Thấp: ${t.sharing_intention_low}%`}
                      />
                      <div
                        className="bg-amber-400 h-full transition-all"
                        style={{ width: `${t.sharing_intention_medium}%` }}
                        title={`Trung bình: ${t.sharing_intention_medium}%`}
                      />
                      <div
                        className="bg-red-500 h-full transition-all"
                        style={{ width: `${t.sharing_intention_high}%` }}
                        title={`Cao: ${t.sharing_intention_high}%`}
                      />
                    </div>
                  </div>

                  {t.cognitive_resistance_notes && (
                    <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-xs text-on-surface leading-relaxed">
                      <strong className="text-primary font-semibold">Phân tích kháng cự nhận thức:</strong>{" "}
                      {t.cognitive_resistance_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
