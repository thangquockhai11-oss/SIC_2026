import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Sparkles,
  MessageSquare,
  BarChart3,
  Smile,
  CheckCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import type { PublicOpinion } from "../api/types";

export default function PublicOpinionPage() {
  const [topic, setTopic] = useState("Đánh giá dư luận về thông tin xả lũ thiên tai");
  const [commentsText, setCommentsText] = useState(
    "Đề nghị các trang mạng đừng đưa tin giật gân làm người dân hoang mang!\n" +
    "Tôi thấy thông tin này rất đáng ngờ, bà con cần kiểm tra đài truyền hình trước khi share.\n" +
    "Sợ quá, mong là không có sự cố gì xảy ra cho đồng bào miền Trung.\n" +
    "Chờ thông báo chính thức từ chính quyền địa phương, đừng nghe tin đồn thất thiệt.\n" +
    "Cảm ơn cơ quan chức năng đã kịp thời bác bỏ thông tin sai sự thật này."
  );
  const [loading, setLoading] = useState(false);
  const [adhocResult, setAdhocResult] = useState<PublicOpinion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: latestOpinions } = useQuery({
    queryKey: ["opinion", "latest"],
    queryFn: api.opinion.latest,
  });

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const commentsList = commentsText
      .split("\n")
      .map((c) => c.trim())
      .filter((c) => c.length > 5);

    if (commentsList.length === 0) {
      setError("Vui lòng nhập ít nhất 1 bình luận hợp lệ (trên 5 ký tự).");
      return;
    }

    setLoading(true);
    try {
      const res = await api.opinion.analyze({
        topic: topic.trim() || undefined,
        comments: commentsList,
      });
      setAdhocResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Lỗi phân tích bình luận");
    } finally {
      setLoading(false);
    }
  };

  const activeData = adhocResult || (latestOpinions && latestOpinions[0]) || null;

  const comparisonChartData = activeData
    ? [
        {
          category: "Tích cực / Ủng hộ",
          sentiment: Math.round((activeData.sentiment_positive ?? 0) * 100),
          stance: Math.round((activeData.stance_support ?? 0) * 100),
        },
        {
          category: "Trung lập / Thảo luận",
          sentiment: Math.round((activeData.sentiment_neutral ?? 0) * 100),
          stance: Math.round((activeData.stance_discuss ?? 0) * 100),
        },
        {
          category: "Tiêu cực / Phản đối",
          sentiment: Math.round((activeData.sentiment_negative ?? 0) * 100),
          stance: Math.round((activeData.stance_oppose ?? 0) * 100),
        },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 font-sans">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* 1. Academic Page Title Section */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-primary-container">forum</span>
            <span className="font-label-sm text-[11px] uppercase tracking-wider font-semibold text-primary">
              PHÂN TÍCH DƯ LUẬN XÃ HỘI // TÁCH BẠCH CẢM XÚC (SENTIMENT) VS LẬP TRƯỜNG (STANCE)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-normal leading-tight">
            Lập trường &amp; Dư luận Xã hội (Public Opinion)
          </h1>
          <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
            Phân tích đa chiều phản hồi từ cộng đồng mạng, phân biệt rạch ròi giữa cảm xúc ngôn từ (Sentiment) và lập trường đối với chủ đề (Stance) theo chuẩn UIT-VSMEC &amp; TweetEval.
          </p>
        </section>

        {/* 2. Interactive Comment Input Tool */}
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-outline block mb-1">
                CÔNG CỤ THỬ NGHIỆM TRỰC TIẾP
              </span>
              <h2 className="text-lg font-bold text-on-surface">
                Bóc tách Cảm xúc &amp; Lập trường từ Tập Bình luận
              </h2>
              <p className="text-xs text-on-surface-variant">
                Nhập danh sách bình luận (mỗi bình luận một dòng) để AI Agent phân tích tự động
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface uppercase tracking-wide">
                Chủ đề / Phát ngôn thảo luận:
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="VD: Tin đồn xả lũ thủy điện..."
                className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface uppercase tracking-wide">
                Nội dung các bình luận (mỗi dòng một bình luận):
              </label>
              <textarea
                rows={5}
                value={commentsText}
                onChange={(e) => setCommentsText(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container font-mono leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 self-start disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý phân tích tác tử...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Phân tích Cảm xúc &amp; Lập trường ngay</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* 3. Display Results */}
        {activeData && (
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-4">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Kết quả Phân tích: {activeData.topic}</h3>
                <p className="text-xs text-on-surface-variant">
                  Quy mô mẫu: <strong className="text-on-surface">{activeData.sample_size}</strong> phản hồi • Phân biệt rạch ròi Cảm xúc vs Lập trường
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 self-start sm:self-auto flex items-center gap-1.5">
                <CheckCircle size={13} />
                <span>Đã bóc tách độc lập</span>
              </span>
            </div>

            {/* AI Summary Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <MessageSquare size={14} />
                <span>Tóm lược Luồng Thảo luận từ AI Engine</span>
              </span>
              <p className="text-sm text-on-surface leading-relaxed">
                {activeData.discussion_summary}
              </p>
            </div>

            {/* Comparison Bar Chart */}
            <div className="p-4 sm:p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Biểu đồ Đối chuẩn: Cảm xúc vs Lập trường</h4>
                  <span className="text-xs text-on-surface-variant">Tỷ lệ phần trăm phân bố theo từng thái cực</span>
                </div>
                <BarChart3 size={18} className="text-primary" />
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d4e7e0" />
                    <XAxis dataKey="category" tick={{ fontSize: 12, fill: "#3f4946" }} />
                    <YAxis unit="%" tick={{ fontSize: 11, fill: "#6f7976" }} />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`]}
                      contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #bfc9c5" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar dataKey="sentiment" name="Cảm xúc (Sentiment)" fill="#25695c" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="stance" name="Lập trường (Stance)" fill="#145c50" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Emotions Breakdown */}
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                <Smile size={16} className="text-primary" />
                <span>Các sắc thái cảm xúc chi phối (Emotion Analysis):</span>
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {Object.entries(activeData.top_emotions || {}).map(([emo, score]) => (
                  <div
                    key={emo}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-center gap-2 text-xs"
                  >
                    <span className="text-on-surface-variant capitalize">{emo}:</span>
                    <strong className="text-primary font-bold">{score}%</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample comments */}
            {activeData.raw_comments_sample && activeData.raw_comments_sample.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-on-surface">Mẫu phân loại chi tiết từng bình luận:</h4>
                <div className="flex flex-col gap-2.5">
                  {activeData.raw_comments_sample.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="flex items-start gap-2 flex-1">
                        <span className="font-bold text-on-surface shrink-0">
                          {typeof c === "string" ? "Độc giả" : (c.author || "Độc giả")}:
                        </span>
                        <span className="italic text-on-surface-variant">
                          "{typeof c === "string" ? c : (c.comment || c.text || "")}"
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {typeof c !== "string" && c.sentiment && (
                          <span className="px-2 py-0.5 rounded-md bg-surface-container-lowest text-primary font-medium border border-outline-variant/20">
                            Cảm xúc: {c.sentiment}
                          </span>
                        )}
                        {typeof c !== "string" && c.stance && (
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                            Lập trường: {c.stance}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
