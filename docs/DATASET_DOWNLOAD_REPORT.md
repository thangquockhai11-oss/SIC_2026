# BÁO CÁO TỔNG KẾT TẢI VÀ TÍCH HỢP DATASET — TRUSTMEDIA AI
*TrustMedia AI Research & Engineering Pipeline Report*  
*Thời gian hoàn thành: 15/11/2026*  
*Workspace: `d:\HOC\SIC` | Môi trường: Python 3.12, PyTorch/NLP, FastAPI, SQLite*

---

## 1. BẢNG TỔNG HỢP TOÀN BỘ DATASET NGHIÊN CỨU

| # | Dataset | Phân hệ AI Agent | Trạng thái kỹ thuật | Thư mục lưu trữ | Dung lượng thực tế | Số lượng bản ghi | Checksum (SHA-256 tóm tắt) | Giấy phép (License) |
|---|---|---|---|---|---|---|---|---|
| **1** | **FEVER** | Fact-Checking Agent | **VALIDATED** | `datasets/raw/fever/` | 39,543,005 bytes (~37.7 MB) | **175,446 claims** | `eba7e8f8...` (train) | CC-BY-SA-3.0 |
| **2** | **ViFactCheck** | Fact-Checking Agent | **VALIDATED** | `datasets/raw/vifactcheck/` | 11,789,100 bytes (~11.2 MB) | **7,232 claims** | `c6cb3562...` (train) | MIT / Academic Research |
| **3** | **X-FACT** | Fact-Checking Agent | **VALIDATED** | `datasets/raw/xfact/` | 127,343,965 bytes (~121.4 MB) | **31,189 claims** (all-lang) | `0f7236a2...` (train) | CC-BY-SA-4.0 |
| **4** | **GoEmotions** | Public Opinion Agent | **VALIDATED** | `datasets/raw/goemotions/` | 42,742,918 bytes (~40.8 MB) | **211,225 comments** | `cac04903...` (part 1) | Apache-2.0 |
| **5** | **UIT-VSMEC** | Public Opinion Agent | **VALIDATED** | `datasets/raw/uit_vsmec/` | 582,271 bytes (~568 KB) | **6,927 sentences** | `f53a479b...` (train) | CC-BY-NC-SA-4.0 |
| **6** | **PHEME** | Fact-Checking / Rumour | **VALIDATED** | `datasets/raw/pheme/` & `datasets/extracted/pheme/` | 46,529,729 bytes (archive) + 255,945 files giải nén | **6,425 threads** (9 sự kiện) | `4859a1f2...` (archive) | CC-BY-4.0 (Annotations) |
| **7** | **TweetEval** | Public Opinion / Stance | **VALIDATED (Review Req.)** | `datasets/raw/tweeteval/` | 14,259,947 bytes (~13.6 MB) | **200,785 tweets** (11 tasks) | `b680c451...` (sentiment) | Twitter Dev Policy Terms |
| **8** | **NELA-GT-2020** | Media Credibility Agent | **BLOCKED_BY_WAF_CHALLENGE** | `datasets/raw/nela_gt/` | Đã chuẩn bị sẵn benchmark loader | 0 (Blocked tại Harvard Dataverse) | Cần người dùng tải thủ công | CC0 (Public Domain) |
| **9** | **UIT-VSFC** | Public Opinion Agent | **WAITING_USER_PERMISSION** | `datasets/raw/uit_vsfc/` | Chờ ký thỏa thuận nghiên cứu | 0 (Cần xác nhận biểu mẫu) | — | Non-commercial Research |
| **10** | **WVS Wave 7** | Public Trust Agent | **WAITING_USER_PERMISSION** | `datasets/raw/wvs/` | Chờ đăng ký tài khoản WVS | 0 (Cần đăng ký tài khoản) | — | WVS Research Agreement |
| **11** | **Microsoft MIND** | Information Reception Agent | **WAITING_USER_PERMISSION** | `datasets/raw/mind/` | Chờ chấp thuận điều khoản Microsoft | 0 (Cần chấp thuận thỏa thuận) | — | Microsoft Research Terms |

> **Tổng số bản ghi nghiên cứu thực tế đã tải và xác thực:** **639,229 bản ghi** và **255,945 tập tin hội thoại/annotation**.

---

## 2. CHI TIẾT CÁC DATASET ĐÃ TẢI VÀ XÁC THỰC

### A. FEVER (Fact Extraction and VERification)
- **Nguồn chính thức:** [fever.ai](https://fever.ai/dataset/fever.html)
- **Thư mục lưu trữ:** `datasets/raw/fever/`
- **Các file đã tải thực tế:**
  1. `train.jsonl`: 33,024,303 bytes (145,449 claims) | SHA-256: `eba7e8f87076753f8494718b9a857827af7bf73e76c9e4b75420207d26e588b6`
  2. `shared_task_dev.jsonl`: 4,349,935 bytes (19,998 claims) | SHA-256: `e89865bfe1b4dd054e03dd57d7241a6fde24862905f31117cf0cd719f7c78df7`
  3. `paper_dev.jsonl`: 2,168,767 bytes (9,999 claims) | SHA-256: `41158707810008747946bf23471e82df53e77a513524b9e3ec1c2e674ef5ef8c`
- **Tổng số claim:** 175,446 bản ghi.
- **Cấu trúc trường:** `id`, `verifiable`, `label` (`SUPPORTS`, `REFUTES`, `NOT ENOUGH INFO`), `claim`, `evidence`.
- **Ứng dụng:** Huấn luyện và làm dữ liệu đối chuẩn cho Fact-Checking Agent trong việc xác minh tính chính xác của phát biểu dựa trên bằng chứng Wikipedia.

### B. ViFactCheck (Vietnamese Fact-Checking Dataset)
- **Nguồn chính thức:** [Hugging Face: tranthaihoa/vifactcheck](https://huggingface.co/datasets/tranthaihoa/vifactcheck)
- **Thư mục lưu trữ:** `datasets/raw/vifactcheck/data/`
- **Các file đã tải thực tế:**
  1. `train-00000-of-00001.parquet`: 8,071,153 bytes (5,062 claims)
  2. `dev-00000-of-00001.parquet`: 1,225,466 bytes (723 claims)
  3. `test-00000-of-00001.parquet`: 2,484,723 bytes (1,447 claims)
- **Tổng số claim:** 7,232 bản ghi tiếng Việt được gán nhãn thủ công cẩn trọng.
- **Cấu trúc trường giữ nguyên:** `Statement`, `Context`, `Evidence`, `Topic`, `Author`, `Url`, `labels` (0: Supported, 1: Refuted, 2: Not Enough Information), `annotation_id`.
- **Ứng dụng:** Trực tiếp tích hợp vào `FactCheckingLoader` phục vụ truy xuất bằng chứng tiếng Việt, phân loại phát ngôn theo 3 mức thẩm định chuẩn xác.

### C. X-FACT (Multilingual Fact-Checking)
- **Nguồn chính thức:** [GitHub utahnlp/x-fact](https://github.com/utahnlp/x-fact) & Hugging Face
- **Thư mục lưu trữ:** `datasets/raw/xfact/`
- **Cấu trúc tập dữ liệu:** Bao gồm 25 ngôn ngữ và thư mục tổng hợp `all_languages/` (121 files, tổng dung lượng 127.3 MB).
- **Các split chính trong `all_languages/`:**
  - `train-00000-of-00001.csv`: 19,079 claims
  - `test-00000-of-00001.csv`: 3,826 claims
  - `dev-00000-of-00001.csv`: 2,535 claims
  - `ood-00000-of-00001.csv`: 2,368 claims
  - `zeroshot-00000-of-00001.csv`: 3,381 claims
- **Tổng số claim:** 31,189 bản ghi đa ngôn ngữ.
- **Cấu trúc trường:** `language`, `site`, `evidence_1` đến `evidence_5`, `link_1` đến `link_5`, `claimDate`, `reviewDate`, `claimant`, `claim`, `label`.

### D. GoEmotions (Fine-Grained Emotion Dataset)
- **Nguồn chính thức:** Google Research ([storage.googleapis.com](https://storage.googleapis.com/gresearch/goemotions/data/full_dataset/))
- **Thư mục lưu trữ:** `datasets/raw/goemotions/`
- **Các file đã tải thực tế:**
  1. `goemotions_1.csv`: 14,174,600 bytes (70,000 dòng) | SHA-256: `cac049036bad5d68d1081f72b65f2cc51e4df82af05e3e22cfa747051cac1af3`
  2. `goemotions_2.csv`: 14,173,154 bytes (70,000 dòng) | SHA-256: `f699ecc5aa425c1720c1d02475f1e41815244b680bd75b282eb770d2c76cd84d`
  3. `goemotions_3.csv`: 14,395,164 bytes (71,225 dòng) | SHA-256: `467f1e7191af00f2e76cc7f425885c2dc304bea8aff284b10e8c460d22f2e1af`
- **Tổng số bản ghi:** 211,225 bình luận được gán nhãn 28 trạng thái cảm xúc (27 cảm xúc chi tiết + neutral).

### E. UIT-VSMEC (Vietnamese Social Media Emotion Corpus)
- **Nguồn chính thức:** [ura-hcmut/UIT-VSMEC](https://huggingface.co/datasets/ura-hcmut/UIT-VSMEC)
- **Thư mục lưu trữ:** `datasets/raw/uit_vsmec/`
- **Các file đã tải thực tế:**
  1. `train.csv`: 463,018 bytes (5,548 câu)
  2. `test.csv`: 57,164 bytes (693 câu)
  3. `validation.csv`: 57,833 bytes (686 câu)
- **Tổng số bản ghi:** 6,927 câu tiếng Việt mạng xã hội.
- **7 nhãn cảm xúc chuẩn hóa:** `Enjoyment`, `Disgust`, `Other`, `Sadness`, `Anger`, `Fear`, `Surprise`.
- **Ứng dụng:** Trực tiếp tích hợp vào `OpinionLoader` để hiệu chỉnh phân phối cảm xúc tiếng Việt cho Public Opinion Agent.

### F. PHEME (Rumour and Veracity Dataset)
- **Nguồn chính thức:** Figshare ([ndownloader.figshare.com/files/11767817](https://ndownloader.figshare.com/files/11767817))
- **File nén gốc:** `datasets/raw/pheme/PHEME_veracity.tar.bz2` (46,529,729 bytes) + `convert_veracity_annotations.py` (1,728 bytes).
- **Thư mục giải nén:** `datasets/extracted/pheme/all-rnr-annotated-threads/` (255,945 files được giải nén).
- **Tổng số luồng hội thoại:** **6,425 threads** trải dài qua 9 sự kiện tin đồn lớn:
  - `charliehebdo-all-rnr-threads`: 458 rumours, 1,621 non-rumours (2,079 threads)
  - `ferguson-all-rnr-threads`: 284 rumours, 859 non-rumours (1,143 threads)
  - `germanwings-crash-all-rnr-threads`: 238 rumours, 231 non-rumours (469 threads)
  - `ottawashooting-all-rnr-threads`: 470 rumours, 420 non-rumours (890 threads)
  - `sydneysiege-all-rnr-threads`: 522 rumours, 699 non-rumours (1,221 threads)
  - `prince-toronto-all-rnr-threads`: 229 rumours, 4 non-rumours (233 threads)
  - `putinmissing-all-rnr-threads`: 126 rumours, 112 non-rumours (238 threads)
  - `gurlitt-all-rnr-threads`: 61 rumours, 77 non-rumours (138 threads)
  - `ebola-essien-all-rnr-threads`: 14 rumours, 0 non-rumours (14 threads)
- **Cấu trúc mỗi thread:** `source-tweets/`, `reactions/`, `structure.json`, `annotation.json` (veracity: True, False, Unverified).

### G. TweetEval (Unified Twitter Benchmark)
- **Nguồn chính thức:** CardiffNLP ([cardiffnlp/tweet_eval](https://huggingface.co/datasets/cardiffnlp/tweet_eval))
- **Thư mục lưu trữ:** `datasets/raw/tweeteval/` (73 files, tổng 14.3 MB).
- **Phân loại 11 nhiệm vụ chuyên biệt:**
  - `stance_abortion`: 933 bản ghi
  - `stance_atheism`: 733 bản ghi
  - `stance_climate`: 564 bản ghi
  - `stance_feminist`: 949 bản ghi
  - `stance_hillary`: 984 bản ghi
  - `sentiment`: 59,899 bản ghi
  - `emotion`: 5,052 bản ghi
  - `offensive`: 14,100 bản ghi
  - `hate`: 12,970 bản ghi
  - `irony`: 4,601 bản ghi
  - `emoji`: 100,000 bản ghi
- **Tổng số bản ghi:** 200,785 bản ghi.
- **Lưu ý pháp lý:** Đặt trạng thái `LICENSE_REVIEW_REQUIRED` do dữ liệu phụ thuộc vào Developer Agreement của X (Twitter); phù hợp sử dụng cho nghiên cứu nội bộ và hiệu chỉnh mô hình.

---

## 3. BÁO CÁO CÁC DATASET CẦN SỰ PHÊ DUYỆT TỪ NGƯỜI DÙNG VÀ BỊ CHẶN WAF

Tuân thủ nghiêm ngặt nguyên tắc cốt lõi:
1. *Không tự ý đồng ý các thỏa thuận pháp lý thay cho người dùng.*
2. *Không giải CAPTCHA, Cloudflare Turnstile hoặc vượt rào cản chống bot của máy chủ bảo mật.*
3. *Không khai báo tải thành công đối với dữ liệu chưa tồn tại trên ổ đĩa.*

### 1. NELA-GT-2020 — Bị chặn bởi AWS WAF Challenge (Harvard Dataverse)
- **Hiện tượng kỹ thuật:** Khi gọi endpoint tải dữ liệu của Harvard Dataverse (`https://dataverse.harvard.edu/api/access/datafile/4366864`), máy chủ trả về mã lỗi `HTTP 202` kèm tiêu đề:
  `x-amzn-waf-action: challenge` | `Server: awselb/2.0`
- **Phân tích:** Harvard Dataverse đã áp dụng tường lửa AWS WAF chống truy vấn tự động, yêu cầu giải câu đố JavaScript / CAPTCHA tương tác trực tiếp trên trình duyệt của người dùng thật.
- **Giải pháp TrustMedia AI đã thực thi:**
  - Hệ thống đã thiết lập module `CredibilityLoader` với bộ dữ liệu đối chuẩn NELA-GT / Media Bias Fact Check (MBFC) tích hợp sẵn các cơ quan báo chí chủ chốt Việt Nam và quốc tế (Báo Chính phủ, Tuổi Trẻ, VnExpress, Reuters, BBC, AP, VAFC).
- **Hướng dẫn cho người dùng muốn tải trọn vẹn tệp SQLite 1.5GB:**
  1. Mở trình duyệt và truy cập: [https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/CHMUYZ](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/CHMUYZ).
  2. Hoàn thành xác thực hình ảnh / AWS Challenge nếu xuất hiện trên màn hình.
  3. Tải file `labels.csv` hoặc `nela-gt-2020.sqlite`.
  4. Lưu file vào đường dẫn: `datasets/raw/nela_gt/nela_gt_source_labels.csv`.

### 2. UIT-VSFC (Vietnamese Students' Feedback Corpus)
- **Lý do chờ người dùng:** Nhóm nghiên cứu UIT-VNUHCM yêu cầu người dùng điền biểu mẫu cam kết mục đích sử dụng học thuật phi thương mại trước khi được cấp quyền tải file nhãn chi tiết.
- **Hướng dẫn người dùng:**
  1. Truy cập kho lưu trữ chính thức: [https://github.com/kietnv/VietnameseDatasets](https://github.com/kietnv/VietnameseDatasets).
  2. Điền form đăng ký sử dụng dataset sinh viên theo đường dẫn của tác giả.
  3. Sau khi nhận được link tải, lưu các file vào thư mục: `datasets/raw/uit_vsfc/`.

### 3. World Values Survey (WVS) Wave 7 (2017–2022)
- **Lý do chờ người dùng:** Thỏa thuận bản quyền của Tổ chức Khảo sát Giá trị Thế giới (WVS Association) nghiêm cấm việc tải tự động hàng loạt hoặc phân phối lại mà không đăng ký tài khoản nghiên cứu viên cá nhân.
- **Hướng dẫn người dùng:**
  1. Truy cập: [https://www.worldvaluessurvey.org/WVSDocumentationWV7.jsp](https://www.worldvaluessurvey.org/WVSDocumentationWV7.jsp).
  2. Đăng ký tài khoản nghiên cứu cá nhân miễn phí và chấp thuận Điều khoản Sử dụng (Terms of Use).
  3. Tải tệp dữ liệu Wave 7 (định dạng CSV, Stata hoặc SPSS).
  4. Lưu tệp vào: `datasets/raw/wvs/wvs_wave_7.csv`.

### 4. Microsoft News Dataset (MIND)
- **Lý do chờ người dùng:** Microsoft quy định thỏa thuận giấy phép riêng (Microsoft Research License Terms) yêu cầu người dùng bấm đồng ý với điều khoản độc quyền của Microsoft.
- **Hướng dẫn người dùng:**
  1. Truy cập: [https://msnews.github.io/](https://msnews.github.io/).
  2. Đọc và chấp thuận điều khoản Microsoft Research License Terms.
  3. Tải gói dữ liệu `MINDsmall_train.zip` hoặc `MINDlarge_train.zip`.
  4. Lưu vào: `datasets/raw/mind/`.

---

## 4. KẾT QUẢ BỘ KIỂM ĐỊNH TỰ ĐỘNG (10 CRITERIA VALIDATION SUITE)

Mọi dataset trong `datasets/raw/` đều phải trải qua kiểm định 10 tiêu chí nghiêm ngặt thông qua kịch bản `scripts/datasets/verify_all.py`:

```
======================================================================
TRUSTMEDIA AI — DATASET VERIFICATION SUMMARY
======================================================================
[FEVER         ] Status: VALIDATED                           | Records:  175,446
[VIFACTCHECK   ] Status: VALIDATED                           | Records:    7,232
[XFACT         ] Status: VALIDATED                           | Records:   31,189
[GOEMOTIONS    ] Status: VALIDATED                           | Records:  211,225
[UIT_VSMEC     ] Status: VALIDATED                           | Records:    6,927
[PHEME         ] Status: VALIDATED                           | Records:    6,425
[TWEETEVAL     ] Status: VALIDATED_LICENSE_REVIEW_REQUIRED   | Records:  200,785
[NELA_GT       ] Status: BLOCKED_BY_WAF_CHALLENGE            | Records:        0
[UIT_VSFC      ] Status: WAITING_USER_PERMISSION             | Records:        0
[WVS           ] Status: WAITING_USER_PERMISSION             | Records:        0
[MIND          ] Status: WAITING_USER_PERMISSION             | Records:        0
======================================================================
```

### 10 Tiêu chí kiểm định:
1. **File existence:** Tệp tin thực tế tồn tại trên hệ thống tệp Windows.
2. **Non-zero size:** Dung lượng tệp > 0 bytes (không phải file rỗng hay HTML lỗi).
3. **Format integrity:** Định dạng đúng tiêu chuẩn (JSONL, Parquet, CSV, GZIP/Tar).
4. **Extraction success:** Giải nén hoàn tất không bị lỗi checksum (ví dụ PHEME giải nén 255,945 files).
5. **Encoding validity:** Mã hóa chuẩn UTF-8, không lỗi ký tự tiếng Việt.
6. **Python parseability:** Các thư viện `pandas`, `pyarrow`, `json`, `tarfile` đọc dữ liệu thành công.
7. **Record counts:** Số lượng bản ghi khớp chính xác với công bố khoa học của tác giả.
8. **Required schema:** Đầy đủ các trường nghiệp vụ bắt buộc (`Statement`, `Evidence`, `labels`...).
9. **Label validity:** Nhãn phân loại nằm trong không gian nhãn quy chuẩn (0/1/2, SUPPORTS/REFUTES...).
10. **Duplicate checks:** Kiểm tra tính toàn vẹn và mức độ trùng lặp bản ghi giữa các split.

---

## 5. TÍCH HỢP HỆ THỐNG VÀ KIỂM THỬ PHẦN MỀM

### A. Bộ nạp dữ liệu (Dataset Loaders) trong `backend/app/services/dataset_loaders/`
1. **`fact_checking_loader.py`**:
   - Tải và lập chỉ mục `ViFactCheck` (7,232 records) và `X-FACT` (31,189 records).
   - Hàm `retrieve_evidences_for_claim(claim_text, verdict, language)` tìm kiếm văn bản đối sánh, trích xuất trích đoạn bằng chứng thực tế, tác giả, đường dẫn và điểm tin cậy.
2. **`credibility_loader.py`**:
   - Phân tích nguồn tin độc lập với nội dung bài viết theo quy chuẩn NELA-GT.
   - Chấm điểm đa chiều: Điểm minh bạch, chất lượng trích dẫn, chất lượng bằng chứng, tiêu chuẩn báo chí.
3. **`opinion_loader.py`**:
   - Sử dụng phân phối cảm xúc từ `UIT-VSMEC` (7 nhãn) và `GoEmotions` (28 nhãn).
   - Phân định rạch ròi giữa **Sentiment** (phân cực cảm xúc chung) và **Stance** (lập trường đồng tình / phản đối hướng vào claim cụ thể).
4. **`rumour_loader.py`**:
   - Khai thác 6,425 luồng hội thoại của `PHEME`, phân tích hành vi lan truyền tin đồn và các phản hồi cộng đồng (Support, Deny, Query, Comment).

### B. Kết quả kiểm thử tự động (Unit & Integration Tests)
- Toàn bộ **16/16 bài kiểm thử** trong `backend/tests/` đều vượt qua thành công (`16 passed in 2.69s`):
  - `test_auth_api.py`: Xác thực JWT, đăng ký, đăng nhập.
  - `test_dataset_loaders.py`: Kiểm tra 6 trường hợp tải và truy vấn thực tế của ViFactCheck, X-FACT, Credibility, UIT-VSMEC, PHEME.
  - `test_datasets_api.py`: Lọc, phân trang danh mục dataset.
  - `test_full_pipeline.py`: Luồng phân tích đa tác tử bất đồng bộ (202 Accepted -> Polling -> Completed).
  - `test_health_api.py`: Kiểm tra trạng thái máy chủ.
- **Frontend Build:** `npm --prefix frontend run build` hoàn thành không cảnh báo TypeScript (`built in 495ms`).

---

## 6. KẾT LUẬN VÀ BÀN GIAO

1. **Dữ liệu thật 100%:** Đã tải và lưu trữ an toàn **639,229 bản ghi nghiên cứu chuẩn mực** trên ổ đĩa vật lý của máy tính.
2. **Cấu trúc phân tầng hoàn chỉnh:** Đầy đủ các thư mục `datasets/raw/`, `datasets/extracted/`, `datasets/processed/`, `datasets/splits/`, `datasets/manifests/`.
3. **Hồ sơ minh chứng đầy đủ:**
   - Manifest chuẩn JSON: `datasets/manifests/datasets_manifest.json`
   - Báo cáo kiểm định: `datasets/manifests/verification_report.json`
   - Nhật ký tải chi tiết: `datasets/manifests/download_run_log.json`
4. **Hệ thống sẵn sàng vận hành:** Các AI Agent của TrustMedia AI giờ đây đã được kết nối trực tiếp với các cơ sở dữ liệu kiểm chứng và ngữ liệu cảm xúc, sẵn sàng phục vụ phân tích tin tức thực tế.

