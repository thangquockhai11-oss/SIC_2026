import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Sparkles,
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
          sentiment: Math.round(activeData.sentiment_positive * 100),
          stance: Math.round(activeData.stance_support * 100),
        },
        {
          category: "Trung lập / Thảo luận",
          sentiment: Math.round(activeData.sentiment_neutral * 100),
          stance: Math.round(activeData.stance_discuss * 100),
        },
        {
          category: "Tiêu cực / Phản đối",
          sentiment: Math.round(activeData.sentiment_negative * 100),
          stance: Math.round(activeData.stance_oppose * 100),
        },
      ]
    : [];

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">PHÂN TÍCH DƯ LUẬN XÃ HỘI</div>
          <h1>Public Opinion — Cảm xúc & Lập trường</h1>
          <p className="page-subtitle">
            Phân tích đa chiều phản hồi từ cộng đồng mạng, phân biệt rạch ròi giữa cảm xúc ngôn từ (Sentiment) và lập trường đối với chủ đề (Stance).
          </p>
        </div>
      </section>

      {/* Interactive Comment Input Tool */}
      <section className="panel analyzer-input-panel">
        <div className="panel-heading">
          <div>
            <h2>Công cụ Thử nghiệm Phân tích Bình luận Tức thì</h2>
            <span className="muted-label">Nhập danh sách bình luận (mỗi bình luận một dòng) để AI bóc tách Cảm xúc & Lập trường</span>
          </div>
          <Sparkles size={18} className="text-teal" />
        </div>

        {error && (
          <div className="inline-error" style={{ margin: "12px 0" }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAnalyze} className="analyzer-form">
          <div className="form-field">
            <label>Chủ đề / Phát ngôn thảo luận</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="VD: Tin đồn xả lũ thủy điện..."
              required
            />
          </div>

          <div className="form-field">
            <label>Nội dung các bình luận (mỗi dòng một bình luận)</label>
            <textarea
              rows={5}
              value={commentsText}
              onChange={(e) => setCommentsText(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? "Đang xử lý phân tích..." : "Phân tích Cảm xúc & Lập trường ngay"}
          </button>
        </form>
      </section>

      {/* Display Results */}
      {activeData && (
        <section className="panel tab-panel-body">
          <div className="section-title-box">
            <h3>Kết quả Phân tích: {activeData.topic}</h3>
            <p>Quy mô mẫu: {activeData.sample_size} phản hồi • Tách bạch Cảm xúc (Sentiment) vs Lập trường (Stance)</p>
          </div>

          <div className="opinion-summary-card">
            <h4>Tóm lược Luồng Thảo luận từ AI Engine</h4>
            <p>{activeData.discussion_summary}</p>
          </div>

          {/* Comparison Bar Chart */}
          <div className="chart-wrap" style={{ height: 260, marginTop: 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#4a5568" }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: "#718096" }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`]}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="sentiment" name="Cảm xúc (Sentiment)" fill="#4299e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stance" name="Lập trường (Stance)" fill="#319795" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Emotions Breakdown */}
          <div className="emotions-block" style={{ marginTop: 25 }}>
            <h4>Các sắc thái cảm xúc chi phối (Emotion Analysis):</h4>
            <div className="emotion-chips-row">
              {Object.entries(activeData.top_emotions || {}).map(([emo, score]) => (
                <div key={emo} className="emotion-chip">
                  <span>{emo}</span>
                  <strong>{score}%</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Sample comments */}
          {activeData.raw_comments_sample && activeData.raw_comments_sample.length > 0 && (
            <div style={{ marginTop: 25 }}>
              <h4>Mẫu phân loại chi tiết từng bình luận:</h4>
              <div className="comments-sample-list">
                {activeData.raw_comments_sample.map((c, i) => (
                  <div key={i} className="comment-sample-row">
                    <span className="comment-user"><strong>{c.author}:</strong></span>
                    <span className="comment-quote">"{c.comment}"</span>
                    <div className="comment-tags">
                      <span className="comment-tag-sentiment">Cảm xúc: {c.sentiment}</span>
                      <span className="comment-tag-stance">Lập trường: {c.stance}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
