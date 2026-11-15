import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Edit2,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { api } from "../api/client";
import type { DatasetRecord } from "../api/types";

const categories = [
  ["", "Tất cả lĩnh vực"],
  ["fact_checking", "Fact-checking"],
  ["media_credibility", "Media credibility"],
  ["public_opinion", "Public opinion"],
  ["public_trust", "Public trust"],
  ["information_reception", "Information reception"],
];

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function DatasetsPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<DatasetRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    dataset_id: "",
    name: "",
    category: "fact_checking",
    source_url: "",
    languages: "vi, en",
    intended_tasks: "claim verification",
    dataset_version: "1.0",
    license: "CC-BY-4.0",
    sample_count: 5000,
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const datasets = useQuery({
    queryKey: ["datasets", category, search],
    queryFn: () =>
      api.datasets.list({
        page: 1,
        page_size: 100,
        ...(category ? { category } : {}),
        ...(search.trim() ? { q: search.trim() } : {}),
      }),
  });

  const createMutation = useMutation({
    mutationFn: api.datasets.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || err.message || "Lỗi tạo dataset");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DatasetRecord> }) =>
      api.datasets.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      setEditingDataset(null);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || err.message || "Lỗi cập nhật dataset");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.datasets.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      alert("Lỗi xóa dataset: " + (err.response?.data?.detail || err.message));
      setDeleteTargetId(null);
    },
  });

  const resetForm = () => {
    setFormData({
      dataset_id: "",
      name: "",
      category: "fact_checking",
      source_url: "",
      languages: "vi, en",
      intended_tasks: "claim verification",
      dataset_version: "1.0",
      license: "CC-BY-4.0",
      sample_count: 5000,
      notes: "",
    });
    setFormError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      dataset_id: formData.dataset_id.trim().toLowerCase(),
      name: formData.name.trim(),
      category: formData.category,
      source_url: formData.source_url.trim() || undefined,
      languages: formData.languages.split(",").map((s) => s.trim()).filter(Boolean),
      intended_tasks: formData.intended_tasks.split(",").map((s) => s.trim()).filter(Boolean),
      dataset_version: formData.dataset_version.trim() || undefined,
      license: formData.license.trim() || undefined,
      sample_count: Number(formData.sample_count),
      notes: formData.notes.trim(),
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDataset) return;
    updateMutation.mutate({
      id: editingDataset.dataset_id,
      data: {
        name: editingDataset.name,
        category: editingDataset.category,
        source_url: editingDataset.source_url,
        license: editingDataset.license,
        notes: editingDataset.notes,
        status: editingDataset.status,
      },
    });
  };

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">QUẢN TRỊ DỮ LIỆU HỌC THUẬT</div>
          <h1>Dataset Management — Bộ Dữ liệu Nghiên cứu</h1>
          <p className="page-subtitle">
            Quản lý metadata, giấy phép bản quyền và truy xuất nguồn gốc của 16 dataset nghiên cứu truyền thông số.
          </p>
        </div>
        <button className="button button-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} /> Thêm bộ dữ liệu mới
        </button>
      </section>

      <section className="registry-callout">
        <div className="callout-mark"><TriangleAlert size={18} /></div>
        <div>
          <strong>Quy chuẩn Xác minh (Data Verification Protocol)</strong>
          <span>
            Các tập dữ liệu mặc định ở trạng thái UNVERIFIED cho đến khi nhà nghiên cứu hoàn tất đối soát giấy phép bản quyền và lược đồ nhãn (label schema).
          </span>
        </div>
        <span className="unverified-count">{datasets.data?.total ?? "?"} bộ dữ liệu</span>
      </section>

      <section className="panel registry-panel">
        <div className="registry-toolbar">
          <div className="filter-search">
            <Search size={17} />
            <input
              aria-label="Search datasets"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm dataset, ngôn ngữ hoặc tác vụ..."
              value={search}
            />
          </div>

          <select
            aria-label="Filter by research domain"
            onChange={(e) => setCategory(e.target.value)}
            value={category}
          >
            {categories.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <span className="result-count">{datasets.data?.total ?? 0} bộ dữ liệu</span>
        </div>

        {datasets.isPending ? (
          <div className="registry-state"><div className="loading-line"><span /> Đang tải dữ liệu...</div></div>
        ) : datasets.isError ? (
          <div className="registry-state">
            <div className="empty-state">
              <TriangleAlert size={24} />
              <strong>Không thể tải dữ liệu</strong>
              <span>Kiểm tra backend và kết nối API.</span>
            </div>
          </div>
        ) : datasets.data.items.length === 0 ? (
          <div className="registry-state">
            <div className="empty-state">
              <Search size={24} />
              <strong>Không tìm thấy bộ dữ liệu phù hợp</strong>
              <span>Hãy thử tìm kiếm với từ khóa khác.</span>
            </div>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>BỘ DỮ LIỆU</th>
                  <th>LĨNH VỰC</th>
                  <th>NGÔN NGỮ</th>
                  <th>GIẤY PHÉP / BẢN QUYỀN</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {datasets.data.items.map((item) => (
                  <tr key={item.dataset_id}>
                    <td>
                      <div className="dataset-name">{item.name}</div>
                      <div className="dataset-id">{item.dataset_id}</div>
                    </td>
                    <td>
                      <span className="category-tag">{titleCase(item.category)}</span>
                    </td>
                    <td>
                      <span className="language-tag">{item.languages.join(", ") || "n/a"}</span>
                    </td>
                    <td>
                      <div className="verification-stack">
                        <span>Giấy phép: {item.license || "Chưa xác minh"}</span>
                        <span>Lược đồ: {item.schema_status}</span>
                      </div>
                    </td>
                    <td>
                      <span className={item.status === "VERIFIED" ? "status-badge badge-success" : "status-badge"}>
                        <span />
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-row">
                        {item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="source-link"
                            title="Tới nguồn dataset"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          type="button"
                          className="icon-btn-ghost"
                          title="Sửa metadata"
                          onClick={() => setEditingDataset(item)}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn-ghost text-danger"
                          title="Xóa dataset"
                          onClick={() => setDeleteTargetId(item.dataset_id)}
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

      {/* Modal Add Dataset */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-card auth-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3>Thêm Bộ Dữ liệu Nghiên cứu Mới</h3>
              <button className="icon-btn-ghost" onClick={() => setIsAddModalOpen(false)}><X size={18} /></button>
            </div>

            {formError && (
              <div className="form-error-banner">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="auth-form">
              <div className="form-row-2col">
                <div className="form-field">
                  <label>Mã định danh (ID)</label>
                  <input
                    type="text"
                    placeholder="vietnews-stance"
                    value={formData.dataset_id}
                    onChange={(e) => setFormData({ ...formData, dataset_id: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Tên bộ dữ liệu</label>
                  <input
                    type="text"
                    placeholder="Vietnamese Stance Dataset"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-field">
                  <label>Lĩnh vực chuyên môn</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="fact_checking">Fact-checking</option>
                    <option value="media_credibility">Media credibility</option>
                    <option value="public_opinion">Public opinion</option>
                    <option value="public_trust">Public trust</option>
                    <option value="information_reception">Information reception</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Ngôn ngữ (phân cách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    placeholder="vi, en"
                    value={formData.languages}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>URL nguồn tải (HuggingFace / Zenodo / GitHub)</label>
                <input
                  type="url"
                  placeholder="https://huggingface.co/datasets/..."
                  value={formData.source_url}
                  onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                />
              </div>

              <div className="form-row-2col">
                <div className="form-field">
                  <label>Giấy phép (License)</label>
                  <input
                    type="text"
                    placeholder="MIT, CC-BY-4.0..."
                    value={formData.license}
                    onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Số lượng mẫu ước tính</label>
                  <input
                    type="number"
                    value={formData.sample_count}
                    onChange={(e) => setFormData({ ...formData, sample_count: Number(e.target.value) })}
                    min={0}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Ghi chú nghiên cứu / Provenance</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả nguồn gốc thu thập và split dữ liệu..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <button type="submit" className="button button-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Đang lưu..." : "Lưu vào Cơ sở dữ liệu"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Dataset */}
      {editingDataset && (
        <div className="modal-backdrop" onClick={() => setEditingDataset(null)}>
          <div className="modal-card auth-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Chỉnh sửa Metadata: {editingDataset.dataset_id}</h3>
              <button className="icon-btn-ghost" onClick={() => setEditingDataset(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleEditSubmit} className="auth-form">
              <div className="form-field">
                <label>Tên bộ dữ liệu</label>
                <input
                  type="text"
                  value={editingDataset.name}
                  onChange={(e) => setEditingDataset({ ...editingDataset, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-row-2col">
                <div className="form-field">
                  <label>Lĩnh vực</label>
                  <select
                    value={editingDataset.category}
                    onChange={(e) => setEditingDataset({ ...editingDataset, category: e.target.value })}
                  >
                    <option value="fact_checking">Fact-checking</option>
                    <option value="media_credibility">Media credibility</option>
                    <option value="public_opinion">Public opinion</option>
                    <option value="public_trust">Public trust</option>
                    <option value="information_reception">Information reception</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Trạng thái thẩm định</label>
                  <select
                    value={editingDataset.status}
                    onChange={(e) =>
                      setEditingDataset({
                        ...editingDataset,
                        status: e.target.value as "UNVERIFIED" | "VERIFIED",
                      })
                    }
                  >
                    <option value="UNVERIFIED">UNVERIFIED (Chưa xác minh)</option>
                    <option value="VERIFIED">VERIFIED (Đã xác minh)</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>Giấy phép (License)</label>
                <input
                  type="text"
                  value={editingDataset.license || ""}
                  onChange={(e) => setEditingDataset({ ...editingDataset, license: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>Ghi chú</label>
                <textarea
                  rows={2}
                  value={editingDataset.notes}
                  onChange={(e) => setEditingDataset({ ...editingDataset, notes: e.target.value })}
                />
              </div>

              <button type="submit" className="button button-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Đang cập nhật..." : "Cập nhật Metadata"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete */}
      {deleteTargetId && (
        <div className="modal-backdrop" onClick={() => setDeleteTargetId(null)}>
          <div className="modal-card auth-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-icon" style={{ background: "#fed7d7", color: "#e53e3e" }}>
                  <TriangleAlert size={20} />
                </div>
                <div>
                  <h3>Xác nhận xóa dataset</h3>
                  <p>Bạn có chắc chắn muốn xóa bộ dữ liệu <strong>{deleteTargetId}</strong>?</p>
                </div>
              </div>
              <button className="icon-btn-ghost" onClick={() => setDeleteTargetId(null)}><X size={18} /></button>
            </div>

            <div className="modal-actions-between" style={{ marginTop: 20 }}>
              <button type="button" className="button button-outline" onClick={() => setDeleteTargetId(null)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={() => deleteMutation.mutate(deleteTargetId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Đang xóa..." : "Xóa bộ dữ liệu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
