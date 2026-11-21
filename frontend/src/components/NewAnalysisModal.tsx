import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAnalysis } from "../context/AnalysisContext";

const PRESETS = [
  {
    id: "chu-nhi-loi",
    label: "Streamer Chu Nhị Lỗi",
    badge: "CafeF Thời sự",
    title: "Kiếm 2 tỷ đồng mỗi tháng năm 16 tuổi, streamer Trung Quốc bị chính mẹ ruột lừa vào viện tâm thần",
    content:
      "Đang ở đỉnh cao với phòng livestream hơn 100.000 người xem, Chu Nhị Lỗi bị mẹ đưa vào một bệnh viện tâm thần tư nhân. Lý do là bà tin lời họ hàng rằng con trai 'nghiện mạng, đầu óc có vấn đề'. Khi trở ra, sự nghiệp và khoản tiền tích cóp của chàng trai nông thôn Sơn Đông gần như không còn gì.",
    source_url: "https://cafef.vn",
  },
  {
    id: "bep-gas",
    label: "Bếp gas chạy bằng nước lã",
    badge: "Cảnh báo lừa đảo",
    title: "Xác minh thông tin 'bếp gas chạy bằng nước lã' tiết kiệm 100% nhiên liệu",
    content:
      "Gần đây trên mạng xã hội quảng cáo tràn lan thiết bị 'bếp gas chạy bằng nước lã tiết kiệm 100% chi phí gas'. Nhiều người hỏi mua vì tin có thật. Các nhà khoa học khẳng định nước không thể tự cháy, đây là chiêu lừa nguy hiểm.",
    source_url: "",
  },
  {
    id: "vo-dap",
    label: "Tin đồn vỡ đập thủy điện",
    badge: "Xác thực thiên tai",
    title: "Kiểm chứng tin đồn vỡ đập thủy điện miền Trung",
    content:
      "Ban chỉ huy phòng chống thiên tai và EVN khẳng định đập thủy điện vận hành an toàn, không có sự cố nứt vỡ.",
    source_url: "",
  },
];

interface NewAnalysisModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function NewAnalysisModal({ isOpen, onClose }: NewAnalysisModalProps) {
  const navigate = useNavigate();
  const { isModalOpen, closeModal, loadAnalysisDetail, resetToPrototype } = useAnalysis();
  const [mode, setMode] = useState<"text" | "url">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const showModal = isOpen !== undefined ? isOpen : isModalOpen;
  const handleClose = onClose || closeModal;

  if (!showModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !sourceUrl.trim()) return;

    setLoading(true);
    setStatusText("Đang khởi tạo tác nhân AI & truy xuất bằng chứng đối chiếu...");

    try {
      const submitRes = await api.analyzer.submit({
        title: title.trim() || undefined,
        content: content.trim() || undefined,
        source_url: sourceUrl.trim() || undefined,
        language: "vi",
        scope: "full",
      });

      const jobId = submitRes.id;
      setStatusText("Đang thực hiện Hybrid RAG & kiểm chứng NLI qua mạng lưới báo chí...");

      // Poll until complete
      let tries = 0;
      while (tries < 30) {
        await new Promise((r) => setTimeout(r, 1500));
        const statusRes = await api.analyzer.pollStatus(jobId);
        if (statusRes.status === "COMPLETED") {
          const detail = await api.analyzer.getDetail(jobId);
          loadAnalysisDetail(detail);
          handleClose();
          setLoading(false);
          navigate(`/fact-checking?id=${jobId}`);
          return;
        }
        if (statusRes.status === "FAILED") {
          throw new Error(statusRes.error_message || "Quá trình phân tích thất bại.");
        }
        tries++;
      }
      throw new Error("Quá thời gian chờ phân tích (Timeout).");
    } catch (err: any) {
      alert("Lỗi khi thẩm định: " + (err.message || String(err)));
      setLoading(false);
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setTitle(preset.title);
    setContent(preset.content);
    setSourceUrl(preset.source_url);
    setMode(preset.source_url ? "url" : "text");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden border border-outline-variant/30 animate-fadeIn">
        {/* Header */}
        <div className="p-space-lg border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/40">
          <div className="flex items-center gap-space-sm">
            <span className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">fact_check</span>
            </span>
            <div>
              <h3 className="font-title-lg text-title-lg text-on-surface">Thẩm định bài báo mới</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Bóc tách phát ngôn, truy xuất bằng chứng báo chí thời sự và phân tích đa chiều
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-space-lg flex flex-col gap-space-md">
          {/* Presets */}
          <div>
            <label className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline block mb-1.5">
              Mẫu thử nghiệm 1-Click
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="p-2.5 rounded-lg border border-outline-variant/40 hover:border-primary-container text-left bg-surface-container-lowest hover:bg-surface-container-low transition-all"
                >
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-primary uppercase block w-fit mb-1">
                    {p.badge}
                  </span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold line-clamp-1">
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-colors ${
                mode === "text"
                  ? "bg-primary-container text-on-primary font-semibold"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Dán nội dung bài báo
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-colors ${
                mode === "url"
                  ? "bg-primary-container text-on-primary font-semibold"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Nhập liên kết bài báo (URL)
            </button>
          </div>

          {/* Inputs */}
          <div>
            <label className="font-label-sm text-label-sm font-semibold text-on-surface-variant block mb-1">
              Tiêu đề bài viết
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Kiếm 2 tỷ đồng mỗi tháng năm 16 tuổi, streamer bị mẹ đưa vào viện tâm thần..."
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>

          {mode === "url" ? (
            <div>
              <label className="font-label-sm text-label-sm font-semibold text-on-surface-variant block mb-1">
                Đường dẫn URL bài báo
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://tuoitre.vn/... hoặc https://cafef.vn/..."
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>
          ) : (
            <div>
              <label className="font-label-sm text-label-sm font-semibold text-on-surface-variant block mb-1">
                Nội dung hoặc các phát ngôn cần kiểm chứng
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Dán đoạn văn bản hoặc bài báo cần kiểm chứng..."
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container"
                required
              />
            </div>
          )}

          {loading && (
            <div className="p-3 rounded-lg bg-primary-container/10 text-primary flex items-center gap-2 font-label-md text-label-md animate-pulse">
              <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
              <span>{statusText}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-space-xs border-t border-outline-variant/30 mt-2">
            <button
              type="button"
              onClick={() => {
                resetToPrototype();
                handleClose();
              }}
              className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary transition-colors underline"
            >
              Khôi phục mẫu gốc (#TM-2024-8841A)
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading || (!content.trim() && !sourceUrl.trim())}
                className="px-5 py-2 rounded-lg bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary font-label-md text-label-md font-semibold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                <span>Bắt đầu thẩm định</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

