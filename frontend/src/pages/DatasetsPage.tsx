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
  CheckCircle,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 font-sans">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* 1. Academic Page Title Section */}
        <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-primary-container">source</span>
              <span className="font-label-sm text-[11px] uppercase tracking-wider font-semibold text-primary">
                QUẢN TRỊ DỮ LIỆU HỌC THUẬT // METADATA, PROVENANCE &amp; OPEN SCIENCE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-normal leading-tight">
              Cơ sở Dữ liệu Mở &amp; Quản trị Dataset (ViFactCheck &amp; VSMEC)
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
              Quản lý metadata, giấy phép bản quyền và truy xuất nguồn gốc của 16 dataset nghiên cứu phục vụ thẩm định truyền thông số.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary text-sm font-semibold transition-all shadow-sm flex items-center gap-2 shrink-0 self-start"
          >
            <Plus size={16} />
            <span>Thêm bộ dữ liệu mới</span>
          </button>
        </section>

        {/* 2. Registry Callout */}
        <section className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <TriangleAlert size={20} />
            </div>
            <div className="flex flex-col gap-0.5 text-xs sm:text-sm">
              <strong className="text-amber-950 font-bold">
                Quy chuẩn Xác minh (Data Verification Protocol)
              </strong>
              <span className="text-amber-900 leading-relaxed">
                Các tập dữ liệu mặc định ở trạng thái UNVERIFIED cho đến khi nhà nghiên cứu hoàn tất đối soát giấy phép bản quyền và lược đồ nhãn (label schema).
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-surface-container-lowest text-amber-900 font-semibold text-xs border border-amber-200 self-start sm:self-auto whitespace-nowrap">
            {datasets.data?.total ?? "?"} bộ dữ liệu
          </span>
        </section>

        {/* 3. Search, Filter & Dataset Table */}
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  aria-label="Search datasets"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm dataset, ngôn ngữ hoặc tác vụ..."
                  value={search}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>

              <select
                aria-label="Filter by research domain"
                onChange={(e) => setCategory(e.target.value)}
                value={category}
                className="px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
              >
                {categories.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <span className="text-xs font-semibold text-primary px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 self-start md:self-auto">
              {datasets.data?.total ?? 0} bộ dữ liệu
            </span>
          </div>

          {datasets.isPending ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-sm">
              <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Đang tải danh mục bộ dữ liệu...</span>
            </div>
          ) : datasets.isError ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-700 flex items-center justify-center">
                <TriangleAlert size={24} />
              </div>
              <strong className="text-base text-on-surface">Không thể tải dữ liệu</strong>
              <span className="text-xs">Kiểm tra backend và kết nối API.</span>
            </div>
          ) : datasets.data.items.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-center">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline">
                <Search size={24} />
              </div>
              <strong className="text-base text-on-surface">Không tìm thấy bộ dữ liệu phù hợp</strong>
              <span className="text-xs">Hãy thử tìm kiếm với từ khóa khác.</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-outline-variant/20">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/20 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Bộ Dữ Liệu</th>
                    <th className="py-3 px-4">Lĩnh Vực</th>
                    <th className="py-3 px-4">Ngôn Ngữ</th>
                    <th className="py-3 px-4">Giấy Phép / Lược Đồ</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {datasets.data.items.map((item) => (
                    <tr key={item.dataset_id} className="hover:bg-surface-container/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm text-on-surface">{item.name}</div>
                        <div className="font-mono text-[11px] text-outline mt-0.5">{item.dataset_id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-surface-container text-primary font-medium text-[11px]">
                          {titleCase(item.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-on-surface-variant">
                          {item.languages.join(", ") || "n/a"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span>Giấy phép: <strong className="text-on-surface">{item.license || "Chưa xác minh"}</strong></span>
                          <span className="text-outline">Lược đồ: {item.schema_status}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
                            item.status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {item.status === "VERIFIED" && <CheckCircle size={11} />}
                          <span>{item.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.source_url && (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md hover:bg-surface-container text-primary transition-colors"
                              title="Tới nguồn dataset"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          <button
                            type="button"
                            className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant transition-colors"
                            title="Sửa metadata"
                            onClick={() => setEditingDataset(item)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-md hover:bg-red-50 text-red-600 transition-colors"
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

        {/* 4. Modal Add Dataset */}
        {isAddModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsAddModalOpen(false)}
          >
            <div
              className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-xl border border-outline-variant/30 flex flex-col gap-5 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <h3 className="font-bold text-lg text-on-surface">Thêm Bộ Dữ liệu Nghiên cứu Mới</h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-on-surface">Mã định danh (ID):</label>
                    <input
                      type="text"
                      placeholder="vietnews-stance"
                      value={formData.dataset_id}
                      onChange={(e) => setFormData({ ...formData, dataset_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-on-surface">Tên bộ dữ liệu:</label>
                    <input
                      type="text"
                      placeholder="Vietnamese Stance Dataset"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-on-surface">Lĩnh vực chuyên môn:</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    >
                      <option value="fact_checking">Fact-checking</option>
                      <option value="media_credibility">Media credibility</option>
                      <option value="public_opinion">Public opinion</option>
                      <option value="public_trust">Public trust</option>
                      <option value="information_reception">Information reception</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-on-surface">Ngôn ngữ (phân cách bằng dấu phẩy):</label>
                    <input
                      type="text"
                      placeholder="vi, en"
                      value={formData.languages}
                      onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">URL nguồn tải (HuggingFace / Zenodo / GitHub):</label>
                  <input
                    type="url"
                    placeholder="https://huggingface.co/datasets/..."
                    value={formData.source_url}
                    onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-on-surface">Giấy phép (License):</label>
                    <input
                      type="text"
                      placeholder="MIT, CC-BY-4.0..."
                      value={formData.license}
                      onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-on-surface">Số lượng mẫu ước tính:</label>
                    <input
                      type="number"
                      value={formData.sample_count}
                      onChange={(e) => setFormData({ ...formData, sample_count: Number(e.target.value) })}
                      min={0}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Ghi chú nghiên cứu / Provenance:</label>
                  <textarea
                    rows={2}
                    placeholder="Mô tả nguồn gốc thu thập và split dữ liệu..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-outline-variant/30 hover:bg-surface-container text-on-surface font-semibold text-xs transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-5 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-semibold text-xs transition-all shadow-sm disabled:opacity-50"
                  >
                    {createMutation.isPending ? "Đang lưu..." : "Lưu vào Cơ sở dữ liệu"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. Modal Edit Dataset */}
        {editingDataset && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setEditingDataset(null)}
          >
            <div
              className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-xl border border-outline-variant/30 flex flex-col gap-5 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <h3 className="font-bold text-lg text-on-surface">Chỉnh sửa Metadata: {editingDataset.dataset_id}</h3>
                <button
                  type="button"
                  onClick={() => setEditingDataset(null)}
                  className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="flex flex-col gap-3.5 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Tên bộ dữ liệu:</label>
                  <input
                    type="text"
                    value={editingDataset.name}
                    onChange={(e) => setEditingDataset({ ...editingDataset, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-on-surface">Lĩnh vực:</label>
                    <select
                      value={editingDataset.category}
                      onChange={(e) => setEditingDataset({ ...editingDataset, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    >
                      <option value="fact_checking">Fact-checking</option>
                      <option value="media_credibility">Media credibility</option>
                      <option value="public_opinion">Public opinion</option>
                      <option value="public_trust">Public trust</option>
                      <option value="information_reception">Information reception</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-on-surface">Trạng thái thẩm định:</label>
                    <select
                      value={editingDataset.status}
                      onChange={(e) =>
                        setEditingDataset({
                          ...editingDataset,
                          status: e.target.value as "UNVERIFIED" | "VERIFIED",
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    >
                      <option value="UNVERIFIED">UNVERIFIED (Chưa xác minh)</option>
                      <option value="VERIFIED">VERIFIED (Đã xác minh)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Giấy phép (License):</label>
                  <input
                    type="text"
                    value={editingDataset.license || ""}
                    onChange={(e) => setEditingDataset({ ...editingDataset, license: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface">Ghi chú:</label>
                  <textarea
                    rows={2}
                    value={editingDataset.notes}
                    onChange={(e) => setEditingDataset({ ...editingDataset, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setEditingDataset(null)}
                    className="px-4 py-2 rounded-lg border border-outline-variant/30 hover:bg-surface-container text-on-surface font-semibold text-xs transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-5 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-semibold text-xs transition-all shadow-sm disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Đang cập nhật..." : "Cập nhật Metadata"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. Modal Confirm Delete */}
        {deleteTargetId && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteTargetId(null)}
          >
            <div
              className="bg-surface-container-lowest rounded-2xl max-w-sm w-full p-6 shadow-xl border border-outline-variant/30 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <TriangleAlert size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface">Xác nhận xóa dataset</h3>
                  <p className="text-xs text-on-surface-variant">
                    Bạn có chắc chắn muốn xóa bộ dữ liệu <strong className="text-on-surface">{deleteTargetId}</strong>?
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(null)}
                  className="px-4 py-2 rounded-lg border border-outline-variant/30 hover:bg-surface-container text-on-surface font-semibold text-xs transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(deleteTargetId)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Đang xóa..." : "Xóa bộ dữ liệu"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
