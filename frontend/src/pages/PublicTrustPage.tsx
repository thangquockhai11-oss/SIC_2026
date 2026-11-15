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
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">ĐO LƯỜNG NIỀM TIN DÂN SỐ</div>
          <h1>Public Trust — Niềm tin Công chúng Khảo sát Thực địa</h1>
          <p className="page-subtitle">
            Quản lý và phân tích dữ liệu khảo sát đại diện dân cư; không đồng nhất niềm tin thực tế với các tương tác tự phát trên mạng xã hội.
          </p>
        </div>
        <button className="button button-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} /> Thêm bộ khảo sát mới
        </button>
      </section>

      {/* Principle Banner */}
      <section className="status-banner">
        <div className="banner-icon"><ShieldCheck size={20} /></div>
        <div className="banner-copy">
          <strong>Nguyên tắc phương pháp luận: Khảo sát mẫu vs Dữ liệu mạng xã hội</strong>
          <span>
            Bình luận trên mạng xã hội chịu chi phối nặng nề bởi thuật toán tương tác, tài khoản ẩn danh và hội chứng đám đông. Chỉ số niềm tin công chúng hợp lệ bắt buộc phải được thu thập thông qua các phương pháp chọn mẫu khảo sát xã hội học chuẩn mực.
          </span>
        </div>
      </section>

      {/* Demographic Comparison Chart */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">PHÂN TÍCH NHÓM DÂN CƯ</div>
            <h2>So sánh Mức độ Tin tưởng theo Nhóm tuổi (Demographic Trust)</h2>
          </div>
          <BarChart3 size={18} className="text-teal" />
        </div>

        <div className="chart-wrap" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demographicChartData} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
              <XAxis dataKey="group" tick={{ fontSize: 11, fill: "#4a5568" }} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: "#718096" }} />
              <Tooltip formatter={(val: any) => [`${val}%`]} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="Tin tưởng Nguồn chính thống" fill="#319795" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Tin tưởng Bằng chứng" fill="#4299e1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Survey Studies List */}
      <section className="panel registry-panel">
        <div className="registry-toolbar">
          <h2>Danh sách Khảo sát Niềm tin Thực nghiệm ({surveys?.length || 0})</h2>
          <span className="result-count">Cơ sở dữ liệu khảo sát có phương pháp luận và kiểm định</span>
        </div>

        {isLoading ? (
          <div className="loading-line"><span /> Đang tải dữ liệu khảo sát...</div>
        ) : !surveys || surveys.length === 0 ? (
          <div className="registry-state">
            <div className="empty-state">
              <Users size={32} />
              <strong>Chưa có nghiên cứu khảo sát nào</strong>
              <span>Bấm "+ Thêm bộ khảo sát mới" để đăng ký dữ liệu.</span>
            </div>
          </div>
        ) : (
          <div className="survey-cards-list">
            {surveys.map((s) => (
              <div key={s.id} className="survey-study-card">
                <div className="study-card-top">
                  <div>
                    <h3>{s.survey_name}</h3>
                    <span className="study-methodology">Phương pháp: {s.methodology}</span>
                  </div>
                  <div className="study-sample-tag">
                    <Users size={13} /> Mẫu: <strong>{s.sample_size}</strong> người
                  </div>
                </div>

                <div className="study-metrics-3col">
                  <div className="metric-box">
                    <span>Tin cậy Nguồn tin:</span>
                    <strong className="text-teal">{s.trust_source_score}/100</strong>
                  </div>
                  <div className="metric-box">
                    <span>Tin cậy Thông điệp:</span>
                    <strong>{s.trust_message_score}/100</strong>
                  </div>
                  <div className="metric-box">
                    <span>Tin cậy Bằng chứng:</span>
                    <strong className="text-teal">{s.trust_evidence_score}/100</strong>
                  </div>
                </div>

                <p className="study-findings">
                  <strong>Kết quả chính:</strong> {s.findings_summary}
                </p>

                <div className="study-limits">
                  <AlertTriangle size={13} />
                  <span><strong>Giới hạn khảo sát:</strong> {s.limitations}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Add Survey */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-card auth-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3>Đăng ký Bộ Khảo sát Niềm tin</h3>
              <button className="icon-btn-ghost" onClick={() => setIsAddModalOpen(false)}><X size={18} /></button>
            </div>

            {errorMsg && (
              <div className="form-error-banner">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="auth-form">
              <div className="form-field">
                <label>Tên khảo sát / Đề tài nghiên cứu</label>
                <input
                  type="text"
                  placeholder="VD: Khảo sát niềm tin tin tức thiên tai 2026..."
                  value={surveyName}
                  onChange={(e) => setSurveyName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2col">
                <div className="form-field">
                  <label>Cỡ mẫu (người)</label>
                  <input
                    type="number"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(Number(e.target.value))}
                    min={10}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Điểm tin cậy nguồn tin (0-100)</label>
                  <input
                    type="number"
                    value={trustSource}
                    onChange={(e) => setTrustSource(Number(e.target.value))}
                    min={0}
                    max={100}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Phương pháp luận chọn mẫu</label>
                <input
                  type="text"
                  placeholder="VD: Chọn mẫu ngẫu nhiên phân tầng theo tỉnh thành..."
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>Tóm tắt phát hiện nghiên cứu</label>
                <textarea
                  rows={3}
                  placeholder="Ghi nhận tỷ lệ người dân tin tưởng thông tin chính thức..."
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>Giới hạn của khảo sát</label>
                <input
                  type="text"
                  placeholder="VD: Chỉ khảo sát các hộ gia đình có kết nối điện thoại..."
                  value={limitations}
                  onChange={(e) => setLimitations(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="button button-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Đang lưu..." : "Lưu dữ liệu khảo sát"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
