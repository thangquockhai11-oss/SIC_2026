import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Plus,
  ShieldCheck,
  Users,
  X,
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

export default function PublicTrustPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [surveyName, setSurveyName] = useState("");
  const [sampleSize, setSampleSize] = useState(1000);
  const [methodology, setMethodology] = useState("");
  const [trustSource, setTrustSource] = useState(80);
  const [trustMessage, setTrustMessage] = useState(75);
  const [trustEvidence, setTrustEvidence] = useState(85);
  const [findings, setFindings] = useState("");
  const [limitations, setLimitations] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: surveys, isLoading } = useQuery({
    queryKey: ["trust", "surveys"],
    queryFn: api.trust.listSurveys,
  });

  const createMutation = useMutation({
    mutationFn: api.trust.createSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trust", "surveys"] });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.message || "Lỗi tạo khảo sát");
    },
  });

  const resetForm = () => {
    setSurveyName("");
    setSampleSize(1000);
    setMethodology("");
    setTrustSource(80);
    setTrustMessage(75);
    setTrustEvidence(85);
    setFindings("");
    setLimitations("");
    setErrorMsg(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      survey_name: surveyName,
      sample_size: sampleSize,
      methodology,
      trust_source_score: trustSource,
      trust_message_score: trustMessage,
      trust_evidence_score: trustEvidence,
      demographics_breakdown: {
        by_age: { "18-29": 72.0, "30-49": 81.0, "50+": 85.0 },
        by_education: { "Trung học": 74.0, "Đại học": 84.0, "Sau đại học": 88.0 },
      },
      findings_summary: findings,
      limitations,
    });
  };

  // Demo chart for age group comparison
  const demographicChartData = [
    { group: "18-29 tuổi", "Tin tưởng Nguồn chính thống": 72, "Tin tưởng Bằng chứng": 78 },
    { group: "30-49 tuổi", "Tin tưởng Nguồn chính thống": 81, "Tin tưởng Bằng chứng": 84 },
    { group: "Trên 50 tuổi", "Tin tưởng Nguồn chính thống": 85, "Tin tưởng Bằng chứng": 89 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 font-sans">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* 1. Academic Page Title Section */}
        <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-primary-container">groups</span>
              <span className="font-label-sm text-[11px] uppercase tracking-wider font-semibold text-primary">
                ĐO LƯỜNG NIỀM TIN DÂN SỐ // KHẢO SÁT CHỌN MẪU XÃ HỘI HỌC (WVS WAVE 7 STANDARD)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-normal leading-tight">
              Khảo sát Niềm tin Công chúng (Public Trust)
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
              Quản lý và phân tích dữ liệu khảo sát đại diện dân cư; không đồng nhất niềm tin thực tế với các tương tác tự phát trên mạng xã hội.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary text-sm font-semibold transition-all shadow-sm flex items-center gap-2 shrink-0 self-start"
          >
            <Plus size={16} />
            <span>Thêm bộ khảo sát mới</span>
          </button>
        </section>

        {/* 2. Principle Banner */}
        <section className="bg-teal-50/80 border border-teal-200/80 rounded-xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="flex flex-col gap-1 text-xs sm:text-sm">
            <strong className="text-teal-950 font-bold">
              Nguyên tắc phương pháp luận: Khảo sát mẫu chọn lọc vs Dữ liệu mạng xã hội
            </strong>
            <span className="text-teal-900 leading-relaxed">
              Bình luận trên mạng xã hội chịu chi phối nặng nề bởi thuật toán tương tác, tài khoản ẩn danh và hiệu ứng đám đông. Chỉ số niềm tin công chúng hợp lệ bắt buộc phải được thu thập thông qua các phương pháp chọn mẫu khảo sát xã hội học chuẩn mực (World Values Survey).
            </span>
          </div>
        </section>

        {/* 3. Demographic Comparison Chart Card */}
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-outline block mb-1">
                PHÂN TÍCH NHÓM DÂN CƯ
              </span>
              <h2 className="text-lg font-bold text-on-surface">
                So sánh Mức độ Tin tưởng theo Nhóm tuổi (Demographic Trust)
              </h2>
            </div>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demographicChartData} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d4e7e0" />
                <XAxis dataKey="group" tick={{ fontSize: 12, fill: "#3f4946" }} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: "#6f7976" }} />
                <Tooltip formatter={(val: any) => [`${val}%`]} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="Tin tưởng Nguồn chính thống" fill="#145c50" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tin tưởng Bằng chứng" fill="#25695c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 4. Survey Studies List */}
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-4">
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                Danh sách Khảo sát Niềm tin Thực nghiệm ({surveys?.length || 0})
              </h2>
              <p className="text-xs text-on-surface-variant">
                Cơ sở dữ liệu khảo sát có phương pháp luận và kiểm định mẫu
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 self-start sm:self-auto flex items-center gap-1.5">
              <CheckCircle size={13} />
              <span>Dữ liệu thực địa</span>
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-sm">
              <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Đang tải dữ liệu khảo sát...</span>
            </div>
          ) : !surveys || surveys.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-center">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline">
                <Users size={24} />
              </div>
              <strong className="text-base text-on-surface">Chưa có nghiên cứu khảo sát nào</strong>
              <span className="text-xs max-w-sm">
                Bấm "+ Thêm bộ khảo sát mới" để đăng ký bộ dữ liệu thực địa đầu tiên.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {surveys.map((s) => (
                <div
                  key={s.id}
                  className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-4 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
                    <div>
                      <h3 className="font-bold text-base text-on-surface">{s.survey_name}</h3>
                      <span className="text-xs text-on-surface-variant">
                        Phương pháp luận: <strong className="text-on-surface">{s.methodology}</strong>
                      </span>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-surface-container-lowest text-primary text-xs font-semibold border border-outline-variant/20 flex items-center gap-1.5 self-start sm:self-auto">
                      <Users size={13} />
                      <span>Cỡ mẫu: <strong>{s.sample_size}</strong> người</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center text-center">
                      <span className="text-[11px] text-on-surface-variant uppercase font-medium">Tin cậy Nguồn tin</span>
                      <strong className="text-xl font-bold text-primary mt-1">{s.trust_source_score}/100</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center text-center">
                      <span className="text-[11px] text-on-surface-variant uppercase font-medium">Tin cậy Thông điệp</span>
                      <strong className="text-xl font-bold text-on-surface mt-1">{s.trust_message_score}/100</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center text-center">
                      <span className="text-[11px] text-on-surface-variant uppercase font-medium">Tin cậy Bằng chứng</span>
                      <strong className="text-xl font-bold text-primary mt-1">{s.trust_evidence_score}/100</strong>
                    </div>
                  </div>

                  <p className="text-xs text-on-surface leading-relaxed">
                    <strong className="font-semibold text-on-surface">Kết quả chính:</strong> {s.findings_summary}
                  </p>

                  {s.limitations && (
                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-700 shrink-0" />
                      <span>
                        <strong className="font-semibold">Giới hạn khảo sát:</strong> {s.limitations}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 5. Modal Add Survey */}
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
                <h3 className="font-bold text-lg text-on-surface">Đăng ký Bộ Khảo sát Niềm tin</h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-on-surface">Tên khảo sát / Đề tài nghiên cứu:</label>
                  <input
                    type="text"
                    placeholder="VD: Khảo sát niềm tin tin tức thiên tai 2026..."
                    value={surveyName}
                    onChange={(e) => setSurveyName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-on-surface">Cỡ mẫu (người):</label>
                    <input
                      type="number"
                      value={sampleSize}
                      onChange={(e) => setSampleSize(Number(e.target.value))}
                      min={10}
                      className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-on-surface">Điểm tin cậy nguồn tin (0-100):</label>
                    <input
                      type="number"
                      value={trustSource}
                      onChange={(e) => setTrustSource(Number(e.target.value))}
                      min={0}
                      max={100}
                      className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-on-surface">Phương pháp luận chọn mẫu:</label>
                  <input
                    type="text"
                    placeholder="VD: Chọn mẫu ngẫu nhiên phân tầng theo tỉnh thành..."
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-on-surface">Tóm tắt phát hiện nghiên cứu:</label>
                  <textarea
                    rows={3}
                    placeholder="Ghi nhận tỷ lệ người dân tin tưởng thông tin chính thức..."
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-on-surface">Giới hạn của khảo sát:</label>
                  <input
                    type="text"
                    placeholder="VD: Chỉ khảo sát các hộ gia đình có kết nối điện thoại..."
                    value={limitations}
                    onChange={(e) => setLimitations(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    required
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
                    {createMutation.isPending ? "Đang lưu..." : "Lưu dữ liệu khảo sát"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
