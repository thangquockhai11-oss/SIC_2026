# THIẾT KẾ KIẾN TRÚC BÓC TÁCH PHÁT NGÔN (CLAIM EXTRACTION ENGINE)
**Chuẩn hóa 11 slots ngữ nghĩa, phân rã phát ngôn phức và bảo toàn trung thực ngữ cảnh**

---

## 1. MỤC TIÊU VÀ NGUYÊN TẮC CỐT LÕI

Hệ thống không coi một câu văn dài là một claim đơn nhất. Phát ngôn trong bài báo thường là phát ngôn phức hợp (compound statements) chứa nhiều sự kiện độc lập.

**Nguyên tắc vàng:**
1. **Phân rã nguyên tử (Atomic Decomposition):** Một claim nguyên tử chỉ chứa đúng MỘT sự kiện có thể kiểm chứng độc lập.
2. **Khử tạp âm (Boilerplate Stripping):** Loại bỏ 100% các câu hành chính, bản quyền, trích dẫn mạng xã hội, câu hỏi tu từ.
3. **Neo chủ đề tiêu đề (Title Anchor):** Luôn đảm bảo luận điểm số 1 (#01) giải quyết trực tiếp nghi vấn trọng tâm được nêu ở tiêu đề bài báo.

---

## 2. ĐẶC TẢ SCHEMA 11 SLOTS NGỮ NGHĨA

Mỗi phát ngôn sau khi trích xuất được biểu diễn dưới dạng cấu trúc dữ liệu chuẩn hóa:

```python
class ClaimAttributes(BaseModel):
    claim_text: str          # Văn bản phát ngôn nguyên tử chuẩn hóa
    subject: str | None      # Chủ ngữ / Thực thể chịu trách nhiệm
    predicate: str | None    # Vị ngữ / Hành động hoặc khẳng định
    object: str | None       # Đối tượng bị tác động / Bổ ngữ
    value: float | None      # Giá trị định lượng (số thực)
    unit: str | None         # Đơn vị tính đo lường
    time: str | None         # Mốc thời gian được xác định
    location: str | None     # Địa danh địa lý liên quan
    modality: str            # Mức độ chắc chắn: asserted | possible | reported
    causal_relation: bool    # True nếu chứa quan hệ nhân quả (gây ra, làm cho)
    attribution: str | None  # Nguồn trích dẫn (theo ai, tổ chức nào)
    claim_type: str          # Phân loại IFCN Taxonomy
    negation: bool           # True nếu là câu phủ định (không, chẳng, chưa)
    qualifiers: list[str]    # Các điều kiện giới hạn (ví dụ: chỉ ở người cao tuổi)
```

---

## 3. VÍ DỤ PHÂN RÃ PHÁT NGÔN PHỨC

### Câu gốc trong bài báo:
> "Năm 2025, GDP Việt Nam tăng trưởng 8,02%, xuất khẩu đạt kỷ lục 400 tỷ USD và tỷ lệ thất nghiệp tại khu vực thành thị giảm xuống dưới 2%."

### Kết quả phân rã thành 3 claim nguyên tử:
1. **Luận điểm 1:**
   - Text: `"GDP Việt Nam tăng trưởng 8,02% vào năm 2025."`
   - Subject: `"GDP Việt Nam"`, Value: `8.02`, Unit: `"%"`, Time: `"năm 2025"`.
2. **Luận điểm 2:**
   - Text: `"Kim ngạch xuất khẩu của Việt Nam đạt kỷ lục 400 tỷ USD vào năm 2025."`
   - Subject: `"xuất khẩu"`, Value: `400.0`, Unit: `"tỷ USD"`, Time: `"năm 2025"`.
3. **Luận điểm 3:**
   - Text: `"Tỷ lệ thất nghiệp tại khu vực thành thị của Việt Nam giảm xuống dưới 2% năm 2025."`
   - Subject: `"Tỷ lệ thất nghiệp"`, Value: `2.0`, Unit: `"%"`, Location: `"khu vực thành thị"`, Time: `"năm 2025"`.

---

## 4. BỘ LỌC TẠP ÂM (BOILERPLATE FILTERING ENGINE)

Hệ thống tích hợp biểu thức chính quy và phân tích cú pháp để loại bỏ các mẫu câu không chứa giá trị thông tin kiểm chứng:
- Bản quyền: `"Bản quyền thuộc về...", "Mọi hành vi sao chép phải có văn bản đồng ý..."`
- Kêu gọi hành động: `"Hãy like và chia sẻ bài viết để ủng hộ...", "Theo dõi chúng tôi trên Zalo/TikTok..."`
- Quảng cáo / Khuyến cáo: `"Sản phẩm này không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh..."`
- Lời kết / Ý kiến bạn đọc: `"Ý kiến của bạn đọc xin gửi về...", "Bạn có đồng tình với quan điểm trên không?"`

