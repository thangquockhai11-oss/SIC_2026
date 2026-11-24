# TRUSTMEDIA AI — DATASET AUDIT & INVENTORY REPORT

**Date:** 2026-11-24  
**Audit Scope:** Ground-truth Datasets, Schemas, Labels, Quality, Splits, Leakage Prevention  
**Manifest Reference:** `datasets/manifests/train_val_test_manifest.json`  

---

## 1. Dataset Inventory & Quantitative Statistics

| Tên Dataset | Định dạng file | Số lượng mẫu (Samples) | Tác vụ AI phục vụ | Phân bố nhãn (Class Distribution) | Đánh giá chất lượng & Độ rò rỉ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ViFactCheck (AAAI-25)** | Parquet | **7,232** (Train: 5,062, Dev: 723, Test: 1,447) | Evidence Verification / NLI (3-Class) | SUPPORTED (2,510)<br>REFUTED (2,365)<br>NEI (2,357) | Dữ liệu chuẩn vàng học thuật AAAI-25. **Không rò rỉ (Zero-leakage)**: Các bài báo ở tập test hoàn toàn tách biệt tập train. |
| **Claim Classification 9-Class** | JSON / Parquet | **3,600** (Train: 2,520, Val: 540, Test: 540) | 9-Class Claim Classification & Verifiability | Cân bằng hoàn hảo: 400 mẫu / lớp (Train: 280, Val: 60, Test: 60) | Gán nhãn chặt chẽ theo 9 thể loại phát ngôn. Phân tầng ngẫu nhiên (Stratified split, seed 42). |
| **FEVER Benchmark** | JSONL | **175,446** (Train: 145,449, Dev: 19,998, Paper: 9,999) | Cross-Lingual Knowledge Retrieval | SUPPORTS, REFUTES, NOT ENOUGH INFO | Bộ dữ liệu chuẩn quốc tế kiểm chứng thực tế. Sử dụng làm kho đối chuẩn tri thức toàn cầu. |
| **ViWiki / EnWiki Corpus** | Parquet / JSON | **> 1,000,000 thực thể bách khoa** | Dense & Sparse Knowledge Retrieval | Tài liệu bách khoa không gán nhãn sự thật | Đã bổ sung bộ lọc `clean_wikitext` loại bỏ 100% infoboxes, bảng biểu, refs. |
| **UIT-VSFC & UIT-ViSFD** | CSV / Parquet | **16,000+** | Sentiment / Emotion / Reception Analysis | Positive, Negative, Neutral | Phục vụ phân tích tiếp nhận dư luận xã hội. |
| **World Values Survey (WVS)** | Parquet | **393,138,879 bytes** (Train + Test) | Public Trust & Sociological Grounding | Chỉ số đo lường niềm tin công chúng | Cung cấp dữ liệu chuẩn hóa về mức độ hoài nghi truyền thông. |

---

## 2. Schema Analysis of Key Fact-Checking Datasets

### 2.1. ViFactCheck Schema
```json
{
  "annotation_id": "int64",
  "Statement": "string (Phát ngôn cần kiểm chứng)",
  "Evidence": "string (Đoạn trích dẫn bằng chứng thực tế)",
  "Context": "string (Toàn văn ngữ cảnh bài viết)",
  "Author": "string (Cơ quan báo chí / Tác giả phát ngôn)",
  "Url": "string (URL bài báo đối chuẩn)",
  "Topic": "string (Chủ đề: Thời sự, Kinh tế, Y tế, Xã hội)",
  "labels": "int64 (0: SUPPORTED, 1: REFUTED, 2: NOT_ENOUGH_INFORMATION)"
}
```

### 2.2. Claim Classification 9-Class Schema
```json
{
  "id": "string (UUID)",
  "text": "string (Câu phát ngôn trích xuất)",
  "claim_type": "string (FACTUAL, STATISTICAL, HISTORICAL, SCIENTIFIC, QUOTATION, CAUSAL, OPINION, PREDICTION, NOT_CHECKABLE)",
  "is_checkable": "boolean (True nếu là mệnh đề có thể kiểm chứng khách quan)",
  "source_dataset": "string (vifactcheck_stmt | uit_vsfc | domain_template)"
}
```

---

## 3. Data Leakage Prevention Protocol

Hệ thống tuân thủ nghiêm ngặt nguyên tắc **Zero Data Leakage**:
1. **Disjoint Source Partitioning:** Tập kiểm thử (Test Set) của ViFactCheck được giữ nguyên vẹn từ bản phát hành chính thức của AAAI-25, bảo đảm không có bài báo hoặc ngữ cảnh trùng lặp giữa tập Train và tập Test.
2. **Temporal Split Validation:** Không sử dụng các bài báo tương lai để huấn luyện mô hình dự đoán quá khứ.
3. **No Test Set Feedback:** Quá trình tinh chỉnh siêu tham số (Hyperparameter Tuning) và lựa chọn đặc trưng chỉ sử dụng tập Validation / Cross-Validation (K-Fold CV, $K=3$), tập Test chỉ được mở ra ở bước đánh giá cuối cùng.

