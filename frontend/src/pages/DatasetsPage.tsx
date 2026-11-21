import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import type { DatasetRecord } from "../api/types";

const categories = [
  ["", "Tất cả lĩnh vực"],
  ["fact_checking", "Kiểm chứng thông tin (Fact-checking)"],
  ["media_credibility", "Độ tin cậy truyền thông (Media credibility)"],
  ["public_opinion", "Dư luận xã hội (Public opinion)"],
  ["public_trust", "Niềm tin công chúng (Public trust)"],
  ["information_reception", "Tiếp nhận thông tin (Information reception)"],
];

function formatCategory(value: string) {
  const map: Record<string, string> = {
    fact_checking: "Kiểm chứng thông tin",
    media_credibility: "Độ tin cậy truyền thông",
    public_opinion: "Dư luận xã hội",
    public_trust: "Niềm tin công chúng",
    information_reception: "Tiếp nhận thông tin",
  };
  return map[value] || value;
}

export default function DatasetsPage() {
  const queryClient = useQueryClient();
  const { user, isAdmin, openAuthModal } = useAuth();
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
    intended_tasks: "Kiểm chứng phát ngôn",
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
      alert("Lỗi khi xóa dataset: " + (err.response?.data?.detail || err.message));
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
      intended_tasks: "Kiểm chứng phát ngôn",
      dataset_version: "1.0",
      license: "CC-BY-4.0",
      sample_count: 5000,
      notes: "",
    });
    setFormError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: DatasetRecord) => {
    setEditingDataset(item);
    setFormData({
      dataset_id: item.dataset_id,
      name: item.name,
      category: item.category,
      source_url: item.source_url || "",
      languages: Array.isArray(item.languages) ? item.languages.join(", ") : String(item.languages || "vi"),
      intended_tasks: Array.isArray(item.intended_tasks) ? item.intended_tasks.join(", ") : String(item.intended_tasks || ""),
      dataset_version: item.dataset_version || "1.0",
      license: item.license || "CC-BY-4.0",
      sample_count: (item as any).sample_count || 5000,
      notes: item.notes || "",
    });
    setFormError(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dataset_id.trim() || !formData.name.trim()) {
      setFormError("Vui lòng điền mã ID và tên Dataset");
      return;
    }

    const langs = formData.languages.split(",").map((s) => s.trim()).filter(Boolean);
    const tasks = formData.intended_tasks.split(",").map((s) => s.trim()).filter(Boolean);

    if (editingDataset) {
      updateMutation.mutate({
        id: editingDataset.dataset_id,
        data: {
          name: formData.name,
          category: formData.category,
          source_url: formData.source_url,
          languages: langs,
          intended_tasks: tasks,
          dataset_version: formData.dataset_version,
          license: formData.license,
          notes: formData.notes,
        },
      });
    } else {
      createMutation.mutate({
        dataset_id: formData.dataset_id.trim(),
        name: formData.name.trim(),
        category: formData.category,
        source_url: formData.source_url.trim() || undefined,
        languages: langs,
        intended_tasks: tasks,
        dataset_version: formData.dataset_version,
        license: formData.license,
        sample_count: Number(formData.sample_count),
        notes: formData.notes,
      });
    }
  };

  const items = datasets.data?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-lg flex flex-col gap-space-lg">
      {/* Top Header Ribbon & Action */}
      <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[18px] text-primary">storage</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
              KHO DỮ LIỆU ĐỐI CHUẨN ĐÃ NẠP
            </span>
          </div>
          <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
            Quản lý Dữ liệu — Kho Dataset Thẩm định
          </h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 max-w-3xl leading-relaxed">
            Quản lý các bộ dữ liệu nghiên cứu chuẩn hóa phục vụ huấn luyện và đối soát thực chứng: ViFactCheck, FEVER, X-FACT, ViWiki, EnWiki, MIND, WVS Wave 7, UIT-VSFC.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all shadow-sm shrink-0 self-start md:self-auto"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Thêm Dataset Mới</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (!user) openAuthModal();
              else alert("Chức năng thêm mới tập dữ liệu yêu cầu quyền hạn Hội đồng Khoa học (Admin). Tài khoản của bạn hiện tại là Chuyên gia Thẩm định (Chỉ đọc).");
            }}
            className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container text-outline hover:text-on-surface hover:bg-surface-container-high font-label-md text-label-md font-semibold transition-all shrink-0 self-start md:self-auto border border-surface-container"
            type="button"
            title="Chỉ Hội đồng Khoa học (Admin) có quyền thêm mới"
          >
            <span className="material-symbols-outlined text-[18px] text-outline">lock</span>
            <span>+ Thêm Dataset (Chỉ Admin)</span>
          </button>
        )}
      </section>

      {/* RBAC Role Notice Banner */}
      <section className="bg-surface-container-low rounded-xl p-space-md border border-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm shadow-xs">
        <div className="flex items-center gap-space-sm">
          <span className={`material-symbols-outlined text-[22px] ${isAdmin ? "text-primary" : "text-secondary"}`}>
            {isAdmin ? "admin_panel_settings" : user ? "verified" : "info"}
          </span>
          <div>
            <div className="font-label-md text-label-md font-bold text-on-surface">
              {isAdmin ? (
                <span className="text-primary">Quyền Quản trị viên (Admin) đã kích hoạt</span>
              ) : user ? (
                <span className="text-secondary">Chế độ Thẩm định viên (User / Read-only)</span>
              ) : (
                <span className="text-on-surface-variant">Chế độ Khách vãng lai (Read-only)</span>
              )}
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {isAdmin
                ? "Bạn có toàn quyền thêm mới, chỉnh sửa metadata và xóa các bộ dữ liệu thẩm định học thuật."
                : user
                ? "Bạn được phép tra cứu, xem chi tiết và đối chiếu các tập dữ liệu. Thao tác Thêm/Sửa/Xóa bị khóa để bảo toàn dữ liệu chuẩn."
                : "Đăng nhập tài khoản Hội đồng Khoa học (Admin) để có toàn quyền quản lý kho dữ liệu."}
            </p>
          </div>
        </div>

        {!isAdmin && (
          <button
            onClick={openAuthModal}
            className="px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold border border-surface-container transition-all shrink-0"
            type="button"
          >
            {user ? "Đổi tài khoản Admin" : "Đăng nhập ngay"}
          </button>
        )}
      </section>

      {/* Toolbar & Filter */}
      <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm flex-1 max-w-lg">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm dataset theo mã ID, tên hoặc tác vụ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-space-md py-1.5 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-surface-container-low rounded-lg px-space-md py-1.5 border border-surface-container font-label-md text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
          >
            {categories.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>

          <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold whitespace-nowrap">
            Tổng cộng: {datasets.data?.total || items.length} tập dữ liệu
          </span>
        </div>
      </section>

      {/* Dataset Cards Grid */}
      {datasets.isLoading ? (
        <div className="bg-surface-container-lowest rounded-xl p-space-xl border border-surface-container shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <span className="material-symbols-outlined text-[36px] text-primary animate-spin mb-3">sync</span>
          <p className="font-body-md text-body-md text-on-surface-variant">Đang tải danh mục tập dữ liệu...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-space-xl border border-surface-container shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
          <span className="material-symbols-outlined text-[48px] text-outline mb-2">folder_off</span>
          <strong className="font-title-lg text-title-lg text-on-surface">Không tìm thấy tập dữ liệu phù hợp</strong>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
            Hãy chọn bộ lọc khác hoặc tạo mới một tập dữ liệu thẩm định.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {items.map((item) => (
            <div
              key={item.dataset_id}
              className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container shadow-sm flex flex-col justify-between hover:border-primary-container/40 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-[11px] font-semibold uppercase tracking-wider">
                    {formatCategory(item.category)}
                  </span>
                  <span className="font-mono text-outline font-label-sm text-[11px]">
                    v{item.dataset_version || "1.0"}
                  </span>
                </div>

                <h3 className="font-title-lg text-title-lg text-on-surface font-bold mb-1">
                  {item.name}
                </h3>
                <span className="font-mono text-[11px] text-primary block mb-2">
                  ID: #{item.dataset_id}
                </span>

                <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-3">
                  {Array.isArray(item.intended_tasks) ? item.intended_tasks.join(", ") : item.intended_tasks || item.notes || "Phục vụ đối soát chéo và đối chiếu dữ liệu."}
                </p>

                <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-surface-container-low text-[11px] text-on-surface mb-3">
                  <div>
                    <span className="text-outline block">Quy mô mẫu:</span>
                    <strong>{(item as any).sample_count ? (item as any).sample_count.toLocaleString("vi-VN") : "Chuẩn hóa"} bản ghi</strong>
                  </div>
                  <div>
                    <span className="text-outline block">Bản quyền:</span>
                    <strong>{item.license || "CC-BY-4.0"}</strong>
                  </div>
                  <div>
                    <span className="text-outline block">Ngôn ngữ:</span>
                    <strong>{Array.isArray(item.languages) ? item.languages.join(", ") : item.languages || "vi, en"}</strong>
                  </div>
                  <div>
                    <span className="text-outline block">Trạng thái:</span>
                    <strong className="text-[#15803D]">Đã sẵn sàng</strong>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                {item.source_url ? (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:text-primary-container font-semibold inline-flex items-center gap-0.5 font-label-sm text-label-sm"
                  >
                    Xem kho nguồn
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>
                ) : (
                  <span className="text-outline font-label-sm text-label-sm">Dữ liệu nội bộ</span>
                )}

                {isAdmin ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors"
                      title="Chỉnh sửa thông tin dataset"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(item.dataset_id)}
                      className="p-1.5 rounded-lg hover:bg-error-container text-error transition-colors"
                      title="Xóa dataset này"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container text-outline flex items-center gap-1 cursor-default"
                    title="Chỉ đọc (Cần quyền Admin để chỉnh sửa/xóa)"
                  >
                    <span className="material-symbols-outlined text-[13px]">visibility</span>
                    <span>Chỉ đọc</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dataset Modal */}
      {(isAddModalOpen || editingDataset) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => {
            setIsAddModalOpen(false);
            setEditingDataset(null);
          }}
        >
          <div
            className="w-full max-w-xl bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden border border-surface-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-space-lg border-b border-surface-container flex items-center justify-between bg-surface-container-low/40">
              <div className="flex items-center gap-space-sm">
                <span className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">
                    {editingDataset ? "edit" : "add_box"}
                  </span>
                </span>
                <div>
                  <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
                    {editingDataset ? "Chỉnh sửa tập dữ liệu" : "Đăng ký tập dữ liệu mới"}
                  </h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Khai báo metadata chuẩn hóa phục vụ tra cứu và kiểm định
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingDataset(null);
                }}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-space-lg flex flex-col gap-space-md">
              {formError && (
                <div className="p-2.5 rounded-lg bg-error-container text-error font-label-md text-label-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div>
                  <label className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline block mb-1">
                    Mã Dataset ID:
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingDataset}
                    value={formData.dataset_id}
                    onChange={(e) => setFormData({ ...formData, dataset_id: e.target.value })}
                    placeholder="VD: viwiki_verified_2024"
                    className="w-full px-space-md py-2 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline block mb-1">
                    Lĩnh vực chuyên môn:
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-space-md py-2 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                  >
                    {categories.filter(([k]) => k).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline block mb-1">
                  Tên hiển thị Dataset:
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Bộ ngữ liệu Bách khoa toàn thư Tiếng Việt"
                  className="w-full px-space-md py-2 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                <div>
                  <label className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline block mb-1">
                    Quy mô số mẫu:
                  </label>
                  <input
                    type="number"
                    value={formData.sample_count}
                    onChange={(e) => setFormData({ ...formData, sample_count: Number(e.target.value) })}
                    className="w-full px-space-md py-2 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>

                <div>
                  <label className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline block mb-1">
                    Ngôn ngữ:
                  </label>
                  <input
                    type="text"
                    value={formData.languages}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                    className="w-full px-space-md py-2 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>

                <div>
                  <label className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline block mb-1">
                    Bản quyền:
                  </label>
                  <input
                    type="text"
                    value={formData.license}
                    onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                    className="w-full px-space-md py-2 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline block mb-1">
                  Đường dẫn kho nguồn (URL):
                </label>
                <input
                  type="url"
                  value={formData.source_url}
                  onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-space-md py-2 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-outline block mb-1">
                  Mô tả tác vụ / Ghi chú nghiên cứu:
                </label>
                <textarea
                  rows={3}
                  value={formData.notes || formData.intended_tasks}
                  onChange={(e) => setFormData({ ...formData, intended_tasks: e.target.value, notes: e.target.value })}
                  placeholder="Mô tả mục đích sử dụng và các tiêu chí đánh giá..."
                  className="w-full px-space-md py-2 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingDataset(null);
                  }}
                  className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-space-lg py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all shadow-sm"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Đang lưu..."
                    : editingDataset
                    ? "Cập nhật Dataset"
                    : "Đăng ký Dataset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden border border-surface-container p-space-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-space-md mb-space-md">
              <span className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </span>
              <div>
                <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
                  Xác nhận xóa Dataset
                </h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                  Mã ID: {deleteTargetId}
                </p>
              </div>
            </div>

            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-space-lg">
              Bạn có chắc chắn muốn xóa bản ghi Dataset này không? Thao tác này sẽ gỡ bỏ metadata của tập dữ liệu khỏi danh mục quản lý.
            </p>

            <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-surface-container">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTargetId)}
                className="px-space-md py-2 rounded-lg bg-error text-on-error font-label-md text-label-md font-semibold hover:bg-red-700 transition-colors shadow-sm"
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
