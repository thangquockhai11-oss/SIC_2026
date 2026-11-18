import vi from "../locales/vi.json";
import en from "../locales/en.json";

export type SupportedLocale = "vi" | "en";

let currentLocale: SupportedLocale = "vi";

const localeMap: Record<SupportedLocale, any> = {
  vi,
  en,
};

export function setLocale(locale: SupportedLocale) {
  currentLocale = locale;
}

export function getLocale(): SupportedLocale {
  return currentLocale;
}

export function t(key: string, fallback?: string): string {
  const keys = key.split(".");
  let current: any = localeMap[currentLocale] || vi;
  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = current[k];
    } else {
      return fallback !== undefined ? fallback : key;
    }
  }
  return typeof current === "string" ? current : (fallback ?? key);
}

export function formatDateTime(date: string | number | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return String(date);
  }
}

export function formatDate(date: string | number | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return String(date);
  }
}

export function formatPercentage(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || isNaN(value)) return "0%";
  const pct = value <= 1.0 && value >= 0 ? value * 100 : value;
  return `${pct.toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function formatVerdict(verdict: string | null | undefined): string {
  if (!verdict) return "Chưa đủ bằng chứng";
  const upper = verdict.toUpperCase().trim();
  const mapping: Record<string, string> = {
    SUPPORTED: "Được bằng chứng hỗ trợ",
    REFUTED: "Bị bằng chứng bác bỏ",
    PARTIALLY_SUPPORTED: "Đúng một phần",
    MISLEADING: "Gây hiểu lầm",
    CONFLICTING_EVIDENCE: "Bằng chứng mâu thuẫn",
    NOT_ENOUGH_INFORMATION: "Chưa đủ bằng chứng",
    INSUFFICIENT_EVIDENCE: "Chưa đủ bằng chứng",
    NOT_CHECKABLE: "Không thể kiểm chứng",
    ABSTAIN: "Từ chối kết luận do thiếu căn cứ",
    UNRESOLVED: "Chưa giải quyết được",
  };
  return mapping[upper] || upper;
}

export function formatStatus(status: string | null | undefined): string {
  if (!status) return "Đang chờ";
  const upper = status.toUpperCase().trim();
  const mapping: Record<string, string> = {
    PROCESSING: "Đang xử lý",
    COMPLETED: "Hoàn thành",
    FAILED: "Thất bại",
    PENDING: "Đang chờ",
    QUEUED: "Đang chờ xử lý",
    RUNNING: "Đang thực thi",
    IDLE: "Sẵn sàng",
    SUCCESS: "Thành công",
    ERROR: "Lỗi xử lý",
  };
  return mapping[upper] || upper;
}

export function formatAgentName(agentName: string | null | undefined): string {
  if (!agentName) return "Tác nhân AI";
  const lower = agentName.toLowerCase().trim();
  if (lower.includes("fact") || lower.includes("kiểm chứng")) return "Tác nhân kiểm chứng thông tin";
  if (lower.includes("credibility") || lower.includes("nguồn") || lower.includes("truyền thông")) return "Tác nhân đánh giá nguồn truyền thông";
  if (lower.includes("opinion") || lower.includes("dư luận")) return "Tác nhân phân tích dư luận";
  if (lower.includes("trust") || lower.includes("niềm tin")) return "Tác nhân phân tích niềm tin công chúng";
  if (lower.includes("reception") || lower.includes("tiếp nhận")) return "Tác nhân phân tích khả năng tiếp nhận thông tin";
  if (lower.includes("meta") || lower.includes("tổng hợp") || lower.includes("điều phối")) return "Tác nhân tổng hợp và điều phối";
  return agentName;
}

export function formatClaimType(claimType: string | null | undefined): string {
  if (!claimType) return "Tuyên bố sự kiện";
  const upper = claimType.toUpperCase().trim();
  const mapping: Record<string, string> = {
    FACTUAL_CLAIM: "Tuyên bố sự kiện",
    STATISTICAL_CLAIM: "Tuyên bố số liệu",
    HISTORICAL_CLAIM: "Tuyên bố lịch sử",
    SCIENTIFIC_CLAIM: "Tuyên bố khoa học",
    QUOTATION_CLAIM: "Tuyên bố phát ngôn",
    CAUSAL_CLAIM: "Tuyên bố quan hệ nhân quả",
    OPINION: "Quan điểm / Nhận định",
    PREDICTION: "Dự đoán tương lai",
  };
  return mapping[upper] || upper;
}

export function formatStance(stance: string | null | undefined): string {
  if (!stance) return "Chưa xác định";
  const upper = stance.toUpperCase().trim();
  const mapping: Record<string, string> = {
    SUPPORT: "Ủng hộ",
    SUPPORTS: "Ủng hộ",
    SUPPORTED: "Ủng hộ",
    REFUTE: "Bác bỏ",
    REFUTES: "Bác bỏ",
    REFUTED: "Bác bỏ",
    CONTRADICT: "Bác bỏ",
    CONTRADICTS: "Bác bỏ",
    NEUTRAL: "Trung lập",
    NOT_ENOUGH_INFO: "Thiếu dữ kiện",
    INSUFFICIENT: "Thiếu dữ kiện",
  };
  return mapping[upper] || upper;
}
