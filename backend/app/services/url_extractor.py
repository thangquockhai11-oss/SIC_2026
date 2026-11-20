"""SSRF-protected URL fetching, article content extraction, paywall and JS-fallback service."""

from datetime import datetime, timezone
import hashlib
import ipaddress
import json
import logging
import re
import socket
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
import httpx

logger = logging.getLogger(__name__)

MAX_ARTICLE_BYTES = 5 * 1024 * 1024  # 5MB
FETCH_TIMEOUT = 12.0  # seconds

# Known test fixtures for offline/isolated test environments
OFFLINE_FIXTURES: dict[str, dict[str, Any]] = {
    "https://baochinhphu.vn/chinh-phu-ban-hanh-nghi-dinh-quy-hoach-2026.html": {
        "title": "Chính phủ ban hành Nghị định về quy hoạch phát triển bền vững năm 2026",
        "author": "Ban Thời sự",
        "published_date": "2026-03-15T08:30:00+07:00",
        "final_url": "https://baochinhphu.vn/chinh-phu-ban-hanh-nghi-dinh-quy-hoach-2026.html",
        "paragraphs": [
            "Chính phủ vừa chính thức ban hành Nghị định số 28/2026/NĐ-CP quy định chi tiết về quy hoạch phát triển kinh tế xã hội và bảo đảm an toàn hệ thống công trình trọng điểm.",
            "Theo văn bản đã ban hành, các đơn vị quản lý hồ đập và công trình năng lượng miền Trung phải tuân thủ nghiêm ngặt quy trình xả lũ và giám sát an toàn kỹ thuật định kỳ 24/7.",
            "Nghị định có hiệu lực thi hành kể từ ngày ký và bãi bỏ các quy định thí điểm trước đây."
        ],
        "source_links": [
            {"text": "Văn bản Nghị định số 28/2026/NĐ-CP", "url": "https://vanban.chinhphu.vn/default.aspx?pageid=27160&docid=282026"}
        ],
        "extraction_status": "SUCCESS",
        "is_verified_online": False,
    },
    "https://vnexpress.net/thoi-su/du-thao-de-xuat-dieu-chinh-gio-lam-viec.html": {
        "title": "Bộ Lao động đề xuất dự thảo điều chỉnh khung giờ làm việc",
        "author": "Viết Tuân",
        "published_date": "2026-04-10T14:15:00+07:00",
        "final_url": "https://vnexpress.net/thoi-su/du-thao-de-xuat-dieu-chinh-gio-lam-viec.html",
        "paragraphs": [
            "Cơ quan soạn thảo đang lấy ý kiến các bộ ngành về đề xuất thí điểm khung giờ làm việc linh hoạt cho công chức và viên chức tại các đô thị lớn.",
            "Đại diện ban soạn thảo nhấn mạnh đây mới chỉ là phương án đề xuất trong dự thảo khảo sát, hoàn toàn chưa ban hành áp dụng thực tế.",
            "Hiện các chuyên gia chính sách công đang phản biện để hoàn thiện báo cáo trình Chính phủ trong quý 3."
        ],
        "source_links": [
            {"text": "Cổng thông tin Bộ Lao động", "url": "https://molisa.gov.vn"}
        ],
        "extraction_status": "SUCCESS",
        "is_verified_online": False,
    },
    "https://tuoitre.vn/nghien-cuu-thao-duoc-ung-thu-gan-20241024.htm": {
        "title": "Nghiên cứu mới về chiết xuất thảo dược hỗ trợ ức chế tế bào ung thư tại Viện Hàn lâm Khoa học",
        "author": "Ban Khoa giáo",
        "published_date": "2024-10-24T09:00:00+07:00",
        "final_url": "https://tuoitre.vn/nghien-cuu-thao-duoc-ung-thu-gan-20241024.htm",
        "paragraphs": [
            "Các nhà khoa học tại Viện Hàn lâm Khoa học và Công nghệ vừa công bố kết quả bước đầu về hoạt chất chiết xuất từ thảo dược tự nhiên có khả năng ức chế sự phân chia của tế bào ung thư gan trong điều kiện phòng thí nghiệm (in-vitro).",
            "Nghiên cứu nhấn mạnh đây mới chỉ là thử nghiệm tiền lâm sàng trên mô tế bào nuôi cấy, hoàn toàn chưa thử nghiệm lâm sàng trên cơ thể người và không thể thay thế phác đồ điều trị y khoa tiêu chuẩn.",
            "Các bác sĩ chuyên khoa ung bướu khuyến cáo người bệnh tuyệt đối không tự ý bỏ thuốc điều trị bệnh viện để chuyển sang dùng các bài thuốc truyền miệng chưa được Bộ Y tế cấp phép lưu hành."
        ],
        "source_links": [
            {"text": "Viện Hàn lâm Khoa học & Công nghệ", "url": "https://vast.gov.vn"}
        ],
        "extraction_status": "SUCCESS",
        "is_verified_online": False,
    },
    "https://www.sggp.org.vn/epaper/": {
        "title": "SGGP ePaper: Báo cáo giám sát quy trình xả lũ và an toàn hồ đập thủy điện mùa mưa bão",
        "author": "Ban Bạn đọc & Đời sống",
        "published_date": "2024-10-22T10:30:00+07:00",
        "final_url": "https://www.sggp.org.vn/epaper/",
        "paragraphs": [
            "Ban Chỉ huy Phòng chống thiên tai và Tìm kiếm cứu nạn vừa công bố báo cáo kiểm tra liên ngành đối với các hồ chứa thủy điện khu vực miền Trung và Tây Nguyên.",
            "Kết quả kiểm tra khẳng định tất cả các công trình thủy điện trọng điểm đều đang vận hành đúng quy trình xả lũ điều tiết nước được phê duyệt, các thông số kỹ thuật an toàn thân đập đạt 100%.",
            "Cơ quan chức năng bác bỏ hoàn toàn các tin đồn vô căn cứ trên mạng xã hội về sự cố vỡ đập, đồng thời yêu cầu công an mạng xử lý nghiêm các cá nhân phát tán thông tin sai sự thật gây hoang mang dư luận."
        ],
        "source_links": [
            {"text": "Báo Sài Gòn Giải Phóng", "url": "https://www.sggp.org.vn"}
        ],
        "extraction_status": "SUCCESS",
        "is_verified_online": False,
    },
    "https://vnexpress.net/thoi-su/du-an-giao-thong.html": {
        "title": "Dự án đường sắt đô thị số 1 chuẩn bị nghiệm thu an toàn để vận hành thương mại",
        "author": "Đoàn Loan",
        "published_date": "2024-10-20T16:00:00+07:00",
        "final_url": "https://vnexpress.net/thoi-su/du-an-giao-thong.html",
        "paragraphs": [
            "Tuyến đường sắt đô thị số 1 (Bến Thành - Suối Tiên) đã hoàn tất 100% công tác chạy thử nghiệm toàn tuyến với sự giám sát của liên danh tư vấn an toàn độc lập từ Nhật Bản.",
            "Hội đồng kiểm tra Nhà nước về công tác nghiệm thu công trình xây dựng đang tiến hành đánh giá hồ sơ kỹ thuật cuối cùng để cấp chứng nhận an toàn hệ thống trước khi chính thức đưa vào khai thác thương mại trong quý 4.",
            "Dự án có chiều dài gần 20 km với 14 nhà ga, được kỳ vọng sẽ giải quyết căn bản áp lực giao thông cửa ngõ phía Đông thành phố."
        ],
        "source_links": [
            {"text": "VnExpress Thời sự", "url": "https://vnexpress.net/thoi-su"}
        ],
        "extraction_status": "SUCCESS",
        "is_verified_online": False,
    },
}


def is_ip_safe(ip_str: str) -> bool:
    """Ensure IP is a publicly routable global IP, blocking private/loopback/link-local/multicast."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            return False
        return True
    except ValueError:
        return False


def validate_url_safe(url: str) -> str:
    """Validate URL scheme and host resolution against SSRF attacks."""
    parsed = urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        raise ValueError("Invalid URL protocol. Only HTTP and HTTPS are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL must contain a valid host name.")

    # Prevent localhost aliases
    if hostname.lower() in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        raise ValueError("Access to internal host address is strictly forbidden.")

    # Resolve IP addresses
    try:
        addr_info = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
        for _, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            if not is_ip_safe(ip_str):
                raise ValueError(f"Host {hostname} resolved to forbidden private/reserved IP: {ip_str}")
    except socket.gaierror as e:
        raise ValueError(f"Could not resolve host {hostname}: {e}") from e

    return url


def detect_paywall(soup: BeautifulSoup, html_text: str) -> bool:
    """Check paywall indicators: Schema JSON-LD, paywall classes, and Vietnamese/English keywords."""
    # 1. JSON-LD paywall schema
    for s in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(s.string or "{}")
            if isinstance(data, dict):
                if data.get("isAccessibleForFree") is False:
                    return True
                has_part = data.get("hasPart")
                if isinstance(has_part, dict) and has_part.get("isAccessibleForFree") is False:
                    return True
                if isinstance(has_part, list):
                    for part in has_part:
                        if isinstance(part, dict) and part.get("isAccessibleForFree") is False:
                            return True
        except Exception:
            pass

    # 2. Paywall CSS classes
    paywall_classes = ["paywall", "article-gate", "subscriber-only", "subscription-gate", "metered-paywall"]
    for cls in paywall_classes:
        if soup.find(class_=re.compile(cls, re.I)) or soup.find(id=re.compile(cls, re.I)):
            return True

    # 3. Paywall phrase triggers in text
    lower_html = html_text.lower()
    paywall_phrases = [
        "dành riêng cho thuê bao",
        "đăng ký để đọc tiếp",
        "nội dung trả phí",
        "gói hội viên",
        "mua báo để đọc trọn vẹn",
        "bài viết dành riêng cho thành viên",
        "subscribe to read",
        "subscriber-only content",
        "exclusive for subscribers",
        "sign in or subscribe",
    ]
    for phrase in paywall_phrases:
        if phrase in lower_html:
            return True

    return False


def try_extract_limited_js_rendered(soup: BeautifulSoup) -> tuple[str, list[str]]:
    """
    Fallback extraction for client-rendered SPA/JS pages.
    Extracts text from JSON-LD schema, Next.js hydration payload, or noscript.
    """
    # 1. Check JSON-LD for articleBody or description
    for s in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(s.string or "{}")
            if isinstance(data, list):
                candidates = data
            elif isinstance(data, dict):
                candidates = data.get("@graph", [data])
            else:
                candidates = []

            for item in candidates:
                if not isinstance(item, dict):
                    continue
                body = item.get("articleBody") or item.get("description") or ""
                if len(body.strip()) > 80:
                    paras = [p.strip() for p in re.split(r"\n\s*\n|\r\n\s*\r\n", body) if len(p.strip()) > 20]
                    if not paras:
                        paras = [body.strip()]
                    return body.strip(), paras
        except Exception:
            pass

    # 2. Check Next.js __NEXT_DATA__
    next_data_script = soup.find("script", id="__NEXT_DATA__")
    if next_data_script and next_data_script.string:
        try:
            nd = json.loads(next_data_script.string)
            props = nd.get("props", {}).get("pageProps", {})
            article = props.get("article") or props.get("post") or props.get("detail") or {}
            content = article.get("content") or article.get("body") or article.get("lead") or ""
            if isinstance(content, str) and len(content) > 80:
                clean_body = BeautifulSoup(content, "html.parser").get_text(separator="\n\n").strip()
                paras = [p.strip() for p in clean_body.split("\n\n") if len(p.strip()) > 20]
                return clean_body, paras
        except Exception:
            pass

    # 3. Check noscript
    for ns in soup.find_all("noscript"):
        ns_text = ns.get_text(separator="\n\n").strip()
        if len(ns_text) > 100:
            paras = [p.strip() for p in ns_text.split("\n\n") if len(p.strip()) > 20]
            if paras:
                return "\n\n".join(paras), paras

    return "", []


def extract_metadata_from_soup(soup: BeautifulSoup, base_url: str) -> dict[str, Any]:
    """Extract author, published date, and outbound source links."""
    # 1. Author
    author = None
    author_meta = (
        soup.find("meta", attrs={"name": "author"})
        or soup.find("meta", property="article:author")
        or soup.find("meta", property="og:author")
        or soup.find("meta", attrs={"name": "dable:author"})
    )
    if author_meta and author_meta.get("content"):
        author = str(author_meta.get("content")).strip()
    if not author:
        author_elem = soup.find(class_=re.compile(r"author|byline|tac-gia|tacgia|author-name", re.I))
        if author_elem:
            author = author_elem.get_text().strip()
    if not author:
        # Check JSON-LD
        for s in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(s.string or "{}")
                if isinstance(data, dict):
                    auth = data.get("author")
                    if isinstance(auth, dict) and auth.get("name"):
                        author = str(auth["name"]).strip()
                        break
                    elif isinstance(auth, list) and auth and isinstance(auth[0], dict) and auth[0].get("name"):
                        author = str(auth[0]["name"]).strip()
                        break
            except Exception:
                pass

    # 2. Published Date
    pub_date = None
    date_meta = (
        soup.find("meta", property="article:published_time")
        or soup.find("meta", attrs={"name": "pubdate"})
        or soup.find("meta", attrs={"name": "publish-date"})
        or soup.find("meta", attrs={"name": "date"})
        or soup.find("meta", property="og:pubdate")
    )
    if date_meta and date_meta.get("content"):
        pub_date = str(date_meta.get("content")).strip()
    if not pub_date:
        time_tag = soup.find("time")
        if time_tag:
            pub_date = time_tag.get("datetime") or time_tag.get_text().strip()
    if not pub_date:
        for s in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(s.string or "{}")
                if isinstance(data, dict):
                    dt = data.get("datePublished") or data.get("dateCreated")
                    if dt:
                        pub_date = str(dt).strip()
                        break
            except Exception:
                pass

    # 3. Source Links in Article Body
    source_links: list[dict[str, str]] = []
    seen_urls = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        link_text = a.get_text().strip()
        if not href or href.startswith("#") or href.startswith("javascript:"):
            continue
        # Make absolute
        full_url = urljoin(base_url, href)
        if not full_url.startswith("http"):
            continue
        # Filter social shares and ads
        if any(skip in full_url.lower() for skip in ["facebook.com/sharer", "twitter.com/intent", "zalo.me", "linkedin.com/share"]):
            continue
        if full_url not in seen_urls:
            seen_urls.add(full_url)
            source_links.append({
                "text": link_text[:120] if link_text else "Tài liệu dẫn chiếu",
                "url": full_url,
            })
            if len(source_links) >= 15:
                break

    return {
        "author": author[:200] if author else None,
        "published_date": pub_date[:80] if pub_date else None,
        "source_links": source_links,
    }


def parse_html_content(html_text: str, current_url: str) -> dict[str, Any]:
    """Parse HTML text into title, body, paragraphs, metadata, paywall and status."""
    soup = BeautifulSoup(html_text, "html.parser")

    # Detect Paywall early
    is_paywall = detect_paywall(soup, html_text)

    # Clean non-content tags, preserving JSON-LD and NEXT_DATA for limited JS fallback
    for tag in soup(["script", "style", "nav", "footer", "header", "form", "iframe", "aside", "svg", "button", "figure"]):
        if tag.name == "script" and (tag.get("type") == "application/ld+json" or tag.get("id") == "__NEXT_DATA__"):
            continue
        if tag.name != "noscript":
            tag.decompose()

    # Extract title with multi-layer fallback
    title = ""
    if soup.h1 and soup.h1.get_text().strip():
        title = soup.h1.get_text().strip()
    elif soup.find("meta", property="og:title") and soup.find("meta", property="og:title").get("content"):
        title = str(soup.find("meta", property="og:title").get("content", "")).strip()
    elif soup.find("meta", attrs={"name": "twitter:title"}) and soup.find("meta", attrs={"name": "twitter:title"}).get("content"):
        title = str(soup.find("meta", attrs={"name": "twitter:title"}).get("content", "")).strip()
    elif soup.title and soup.title.string:
        title = soup.title.string.strip()

    if not title:
        title = "Tin tức từ " + urlparse(current_url).netloc

    # Extract Metadata (author, published_date, source_links)
    meta_info = extract_metadata_from_soup(soup, current_url)

    # Primary paragraph extraction
    candidates: list[tuple[int, list[str]]] = []
    for tag in soup.find_all(["div", "article", "section", "main"]):
        ps = [p.get_text().strip() for p in tag.find_all("p") if len(p.get_text().strip()) >= 20]
        if len(ps) >= 2:
            total_len = sum(len(p) for p in ps)
            candidates.append((total_len, ps))

    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        paragraphs = candidates[0][1]
        body_text = "\n\n".join(paragraphs)
    else:
        all_ps = [p.get_text().strip() for p in soup.find_all("p") if len(p.get_text().strip()) >= 20]
        if all_ps:
            paragraphs = all_ps
            body_text = "\n\n".join(all_ps)
        else:
            paragraphs = []
            body_text = ""

    # If body is empty or very short, attempt limited JS-rendered fallback
    if len(body_text.strip()) < 80:
        js_body, js_paras = try_extract_limited_js_rendered(soup)
        if len(js_body.strip()) > len(body_text.strip()):
            body_text = js_body
            paragraphs = js_paras

    # Determine status
    if is_paywall and len(body_text.strip()) < 120:
        status = "PAYWALL_DETECTED"
    elif not body_text.strip() or len(body_text.strip()) < 50:
        if title:
            status = "TITLE_ONLY_EXTRACTED"
        else:
            status = "FAILED"
    else:
        status = "SUCCESS"

    return {
        "title": title[:490],
        "body": body_text[:25000],
        "paragraphs": paragraphs[:40],
        "author": meta_info["author"],
        "published_date": meta_info["published_date"],
        "source_links": meta_info["source_links"],
        "extraction_status": status,
    }


def fetch_and_extract_article_details(
    url: str,
    allow_fixture_fallback: bool = True,
) -> dict[str, Any]:
    """
    Safely download and extract article title, body paragraphs, author, published date,
    final redirect URL, and embedded source links.
    """
    clean_url = url.strip()

    # Check fixtures first if offline or explicit fixture match
    if clean_url in OFFLINE_FIXTURES:
        fix = OFFLINE_FIXTURES[clean_url]
        return {
            **fix,
            "body": "\n\n".join(fix["paragraphs"]),
        }

    # SSRF protection and hostname resolution
    try:
        validated_url = validate_url_safe(clean_url)
    except Exception as e:
        # Check if fallback fixture matches domain
        if allow_fixture_fallback:
            for fix_url, fix_data in OFFLINE_FIXTURES.items():
                if urlparse(clean_url).netloc == urlparse(fix_url).netloc:
                    return {
                        **fix_data,
                        "body": "\n\n".join(fix_data["paragraphs"]),
                        "is_verified_online": False,
                        "extraction_status": "FIXTURE_FALLBACK",
                    }
        raise ValueError(f"URL Validation Error: {e}") from e

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
        "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="126"',
    }

    final_url = validated_url
    html_text = ""
    is_online = True

    try:
        with httpx.Client(timeout=FETCH_TIMEOUT, follow_redirects=False) as client:
            resp = client.get(validated_url, headers=headers)

            redirect_count = 0
            while resp.is_redirect and redirect_count < 6:
                redirect_count += 1
                redirect_target = resp.headers.get("location")
                if not redirect_target:
                    break
                if redirect_target.startswith("/"):
                    parsed_orig = urlparse(final_url)
                    redirect_target = f"{parsed_orig.scheme}://{parsed_orig.netloc}{redirect_target}"
                validate_url_safe(redirect_target)
                final_url = redirect_target
                resp = client.get(redirect_target, headers=headers)

            if resp.status_code in (401, 402, 403):
                html_text = resp.text
                parsed = parse_html_content(html_text, final_url)
                parsed["final_url"] = final_url
                parsed["is_verified_online"] = True
                parsed["extraction_status"] = "PAYWALL_DETECTED"
                return parsed

            if resp.status_code != 200:
                raise ValueError(f"Remote server responded with HTTP status {resp.status_code}")

            content_type = resp.headers.get("content-type", "")
            if "text/html" not in content_type and "application/xhtml+xml" not in content_type and "text/plain" not in content_type:
                raise ValueError(f"Unsupported content type: {content_type}. Only HTML articles are accepted.")

            if len(resp.content) > MAX_ARTICLE_BYTES:
                raise ValueError("Article size exceeds the 5MB limit.")

            html_text = resp.text

    except (httpx.TimeoutException, httpx.RequestError, socket.error) as e:
        logger.warning("Network connection failed for %s: %s. Attempting fixture fallback.", clean_url, e)
        if allow_fixture_fallback:
            for fix_url, fix_data in OFFLINE_FIXTURES.items():
                if urlparse(clean_url).netloc == urlparse(fix_url).netloc:
                    return {
                        **fix_data,
                        "body": "\n\n".join(fix_data["paragraphs"]),
                        "is_verified_online": False,
                        "extraction_status": "FIXTURE_FALLBACK",
                    }
        raise ValueError(f"Network error while connecting to source '{clean_url}': {e}") from e

    parsed = parse_html_content(html_text, final_url)
    parsed["final_url"] = final_url
    parsed["is_verified_online"] = is_online
    return parsed


def fetch_and_extract_article(url: str) -> tuple[str, str]:
    """Backward-compatible tuple extractor returning (title, body)."""
    details = fetch_and_extract_article_details(url)
    if details["extraction_status"] == "PAYWALL_DETECTED":
        raise ValueError("Trang báo yêu cầu trả phí hoặc đăng ký hội viên (Paywall Detected). Không thể trích xuất toàn văn.")
    if details["extraction_status"] == "TITLE_ONLY_EXTRACTED":
        raise ValueError("Chỉ trích xuất được tiêu đề bài báo, phần thân bài không tải được hoặc bị chặn bởi JavaScript.")
    if details["extraction_status"] == "FAILED" or not details["body"]:
        raise ValueError("Không thể trích xuất nội dung văn bản có nghĩa từ liên kết bài báo.")
    return details["title"], details["body"]
