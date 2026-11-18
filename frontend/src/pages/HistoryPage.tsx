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
import { formatDateTime, formatPercentage, formatVerdict } from "../utils/i18n";

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
          <h1>Lịch sử Phân tích — Nhật ký Nghiên cứu</h1>
          <p className="page-subtitle">
            Toàn bộ các phiên phân tích tin tức và kiểm chứng đa tác nhân đã được thực thi và lưu trữ trong cơ sở dữ liệu.
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
            <option value="COMPLETED">Hoàn thành</option>
            <option value="PROCESSING">Đang xử lý</option>
            <option value="FAILED">Thất bại</option>
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
              <span>Hãy phân tích bài báo đầu tiên qua phân hệ Phân tích bài báo.</span>
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
                  <th>SỐ TUYÊN BỐ</th>
                  <th>HỆ THỐNG AI</th>
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
                        {formatVerdict(item.verdict)}
                      </span>
                    </td>
                    <td>
                      <strong>{formatPercentage(item.confidence_score)}</strong>
                    </td>
                    <td>
                      <span className="category-tag">{item.claims_count} tuyên bố</span>
                    </td>
                    <td>
                      <span className="ai-short-tag">{item.ai_provider}</span>
                    </td>
                    <td>
                      <span className="time-sub">{formatDateTime(item.created_at)}</span>
                    </td>
                    <td>
                      <div className="table-actions-row">
                        <Link
                          to={`/analyzer?id=${item.id}`}
                          className="button button-sm button-outline"
                          title="Xem chi tiết kết quả"
                        >
                          <Eye size={13} /> Xem
                        </Link>
                        <button
                          type="button"
                          className="icon-btn-ghost text-danger"
                          title="Xóa bản ghi này"
                          onClick={() => setDeleteTargetId(item.id)}
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
                <div className="modal-icon" style={{ background: "#fef2f2", color: "#e11d48" }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3>Xác nhận xóa bài phân tích</h3>
                  <p>Mã phiên: {deleteTargetId}</p>
                </div>
              </div>
              <button className="icon-btn-ghost" onClick={() => setDeleteTargetId(null)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "16px 0" }}>
              Bạn có chắc chắn muốn xóa bản ghi phân tích này không? Thao tác này sẽ xóa vĩnh viễn các tuyên bố và bằng chứng liên quan khỏi cơ sở dữ liệu.
            </p>

            <div className="modal-actions-between" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setDeleteTargetId(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="button button-danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTargetId)}
              >
                {deleteMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
