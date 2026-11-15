import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Eye,
  History,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["history", searchTerm, statusFilter, page],
    queryFn: () =>
      api.history.list({
        q: searchTerm || undefined,
        status: statusFilter || undefined,
        page,
        page_size: 15,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.history.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      alert("Lỗi khi xóa bài phân tích: " + (err.response?.data?.detail || err.message));
      setDeleteTargetId(null);
    },
  });

  const items = data?.items || [];

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">NHẬT KÝ NGHIÊN CỨU</div>
          <h1>Analysis History — Lịch sử Phân tích</h1>
          <p className="page-subtitle">
            Toàn bộ các phiên phân tích tin tức và kiểm chứng đa tác tử đã được thực thi và lưu trữ trong cơ sở dữ liệu.
          </p>
        </div>
        <Link to="/analyzer" className="button button-primary">
          <Sparkles size={15} /> Phân tích bài mới
        </Link>
      </section>

      {/* Toolbar */}
      <section className="panel registry-panel">
        <div className="registry-toolbar">
          <div className="filter-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, nội dung hoặc URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
            <option value="PROCESSING">Đang xử lý (PROCESSING)</option>
            <option value="FAILED">Thất bại (FAILED)</option>
          </select>

          <span className="result-count">Tổng số: {data?.total || 0} bài</span>
        </div>

        {isLoading ? (
          <div className="loading-line"><span /> Đang tải lịch sử phân tích...</div>
        ) : items.length === 0 ? (
          <div className="registry-state">
            <div className="empty-state">
              <History size={32} />
              <strong>Chưa có bản ghi lịch sử nào</strong>
              <span>Hãy phân tích bài báo đầu tiên qua News Analyzer.</span>
            </div>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>TIÊU ĐỀ BÀI VIẾT</th>
                  <th>KẾT LUẬN</th>
                  <th>ĐỘ TIN CẬY</th>
                  <th>SỐ CLAIMS</th>
                  <th>AI ENGINE</th>
                  <th>THỜI GIAN</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="dataset-name">{item.title}</div>
                      {item.source_url && (
                        <div className="source-domain-sub">{item.source_url}</div>
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          item.verdict === "REFUTED"
                            ? "status-badge badge-danger"
                            : item.verdict === "SUPPORTED"
                            ? "status-badge badge-success"
                            : "status-badge badge-warning"
                        }
                      >
                        <span />
                        {item.verdict || "Chưa có"}
                      </span>
                    </td>
                    <td>
                      <strong>{Math.round((item.confidence_score ?? 0.8) * 100)}%</strong>
                    </td>
                    <td>
                      <span className="category-tag">{item.claims_count} claims</span>
                    </td>
                    <td>
                      <span className="ai-short-tag">{item.ai_provider}</span>
                    </td>
                    <td>
                      <span className="time-sub">
                        {new Date(item.created_at).toLocaleString("vi-VN")}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-row">
                        <Link
                          to={`/analyzer?id=${item.id}`}
                          className="button button-sm button-outline"
                          title="Xem chi tiết báo cáo"
                        >
                          <Eye size={13} /> Xem
                        </Link>
                        <button
                          type="button"
                          className="button button-sm button-outline-danger icon-only-btn"
                          onClick={() => setDeleteTargetId(item.id)}
                          title="Xóa bản ghi"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="modal-backdrop" onClick={() => setDeleteTargetId(null)}>
          <div className="modal-card auth-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-icon" style={{ background: "#fed7d7", color: "#e53e3e" }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3>Xác nhận xóa bản ghi</h3>
                  <p>Hành động này sẽ xóa vĩnh viễn phân tích và các claims liên quan khỏi cơ sở dữ liệu.</p>
                </div>
              </div>
              <button className="icon-btn-ghost" onClick={() => setDeleteTargetId(null)}><X size={18} /></button>
            </div>

            <div className="modal-actions-between" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="button button-outline"
                onClick={() => setDeleteTargetId(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={() => deleteMutation.mutate(deleteTargetId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Đang xóa..." : "Xác nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
