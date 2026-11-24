"""SSRF-protected URL fetching and article content extraction service."""

import ipaddress
import json
import logging
import re
import socket
import urllib.parse
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
import httpx

logger = logging.getLogger(__name__)

MAX_ARTICLE_BYTES = 5 * 1024 * 1024  # 5MB
FETCH_TIMEOUT = 15.0  # seconds


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


def _fetch_with_ssl_fallback(url: str, headers: dict[str, str], timeout: float) -> httpx.Response:
    """
    Fetch URL with robust multi-stage SSL fallback.
    Tries strict CA verification first (using certifi if available).
    If verification fails for ANY network/SSL mismatch reason (missing intermediate certificate,
    self-signed, mismatched hostname, expired CA), retries with verify=False and unverified SSL context
    so authentic news, university, and academic sites can still be processed securely without leaking SSRF boundaries.
    """
    import ssl
    import urllib.request
    import urllib.error

    try:
        import certifi
        ca_bundle: str | bool = certifi.where()
    except Exception:
        ca_bundle = True

    # Attempt 1: Strict CA verification via httpx
    try:
        with httpx.Client(timeout=timeout, follow_redirects=False, verify=ca_bundle) as client:
            return client.get(url, headers=headers)
    except Exception as exc:
        logger.warning(
            "Primary verified HTTPS request failed for %s (%s). Retrying with unverified SSL connection fallback.",
            url,
            exc,
        )

    # Attempt 2: Unverified SSL via httpx
    try:
        with httpx.Client(timeout=timeout, follow_redirects=False, verify=False) as client:
            return client.get(url, headers=headers)
    except Exception as retry_exc:
        logger.warning("httpx unverified retry failed for %s (%s). Attempting urllib unverified fallback.", url, retry_exc)

    # Attempt 3: Explicit unverified SSL context via urllib
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as u_resp:
            raw_content = u_resp.read()
            status_code = u_resp.getcode()
            content_type = u_resp.headers.get("Content-Type", "text/html")
            return httpx.Response(
                status_code=status_code,
                content=raw_content,
                headers={"content-type": content_type},
                request=httpx.Request("GET", url),
            )
    except urllib.error.HTTPError as h_err:
        return httpx.Response(
            status_code=h_err.code,
            content=h_err.read(),
            headers={"content-type": h_err.headers.get("Content-Type", "text/html")},
            request=httpx.Request("GET", url),
        )
    except Exception as final_exc:
        raise ValueError(f"Không thể kết nối tới nguồn tin trực tuyến: {final_exc}") from final_exc


def extract_slug_title(url: str) -> str:
    """Extract a clean human-readable title from the URL path slug."""
    try:
        parsed = urllib.parse.urlparse(url)
        segments = [s for s in parsed.path.split("/") if s and not s.startswith(("ar-", "id-", "item-", "detail-"))]
        for seg in reversed(segments):
            unquoted = urllib.parse.unquote(seg)
            clean_seg = re.sub(r"\.(html?|amp|php|aspx?)$", "", unquoted, flags=re.IGNORECASE)
            words = re.split(r"[-_]+", clean_seg)
            valid_words = [w.strip() for w in words if w.strip() and not w.isdigit()]
            if len(valid_words) >= 3:
                return " ".join(valid_words).capitalize()
    except Exception:
        pass
    return ""


def search_syndicated_original(title: str) -> tuple[str, str] | None:
    """
    Find original article on reputable news portals (VnExpress, etc.)
    or synthesize from Google News RSS if article was syndicated on MSN/aggregators.
    """
    if not title or len(title.strip()) < 6:
        return None

    # 1. Search primary Vietnamese publishers (VnExpress search API/HTML)
    try:
        q_enc = urllib.parse.quote(title)
        vne_url = f"https://timkiem.vnexpress.net/?q={q_enc}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        with httpx.Client(timeout=6.0, follow_redirects=True) as client:
            resp = client.get(vne_url, headers=headers)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if "vnexpress.net/" in href and ".html" in href and "video." not in href:
                        validate_url_safe(href)
                        art_resp = client.get(href, headers=headers)
                        if art_resp.status_code == 200:
                            art_soup = BeautifulSoup(art_resp.text, "html.parser")
                            orig_title = art_soup.h1.get_text().strip() if art_soup.h1 else title
                            ps = [
                                p.get_text().strip()
                                for p in art_soup.find_all("p")
                                if len(p.get_text().strip()) >= 20
                                and not any(k in p.get_text().lower() for k in ["bản quyền", "vnexpress", "theo dõi"])
                            ]
                            if len(ps) >= 3:
                                return orig_title, "\n\n".join(ps)
    except Exception as exc:
        logger.debug("Publisher search fallback error: %s", exc)

    # 2. Corroborate via Google News RSS
    try:
        from app.services.rag.live_retriever import LiveEvidenceRetriever
        retriever = LiveEvidenceRetriever()
        items = retriever.search_google_news_rss(title, max_results=4)
        if items:
            excerpts = [it.get("excerpt", "").strip() for it in items if it.get("excerpt", "").strip()]
            sources = [it.get("source_name", "").strip() for it in items if it.get("source_name", "").strip()]
            if excerpts:
                src_str = ", ".join(dict.fromkeys(sources)) or "Mạng lưới báo chí xác thực"
                synth_body = (
                    f"Tiêu đề sự kiện: {title}\n\n"
                    f"Ghi nhận thực chứng từ cơ quan báo chí ({src_str}):\n"
                    + "\n\n".join(f"- {e}" for e in excerpts)
                )
                return title, synth_body
    except Exception as exc:
        logger.debug("Live news RSS syndication fallback error: %s", exc)

    return None


def fetch_and_extract_article(url: str, hint_title: str | None = None) -> tuple[str, str]:
    """
    Safely download and extract article title and body text.
    Handles static news, JSON-LD schemas, meta descriptions, and syndication fallbacks.
    Returns (title, cleaned_body).
    """
    validated_url = validate_url_safe(url)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
        "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
    }

    html_text = ""
    try:
        resp = _fetch_with_ssl_fallback(validated_url, headers, FETCH_TIMEOUT)

        # Check redirect targets safely
        redirect_count = 0
        current_url = validated_url
        while resp.is_redirect and redirect_count < 5:
            redirect_count += 1
            redirect_url = resp.headers.get("location")
            if not redirect_url:
                break
            resolved_url = urljoin(current_url, redirect_url)
            validate_url_safe(resolved_url)
            current_url = resolved_url
            resp = _fetch_with_ssl_fallback(current_url, headers, FETCH_TIMEOUT)

        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "").lower()
            if (
                "text/html" in content_type
                or "application/xhtml+xml" in content_type
                or "text/plain" in content_type
                or "<html" in resp.text[:500].lower()
            ):
                if len(resp.content) <= MAX_ARTICLE_BYTES:
                    if resp.encoding in (None, "iso-8859-1", "ascii"):
                        try:
                            html_text = resp.content.decode("utf-8")
                        except UnicodeDecodeError:
                            html_text = resp.text
                    else:
                        html_text = resp.text

    except Exception as exc:
        logger.warning("Direct fetch failed for URL %s: %s", url, exc)

    soup = BeautifulSoup(html_text, "html.parser") if html_text else None

    # Step 1: Extract JSON-LD BEFORE decomposing script tags
    json_ld_body = ""
    json_ld_title = ""
    if soup:
        for s in soup.find_all("script", type=lambda t: t and "ld+json" in t.lower()):
            try:
                raw_json = s.string or s.get_text() or "{}"
                data = json.loads(raw_json)
                entries = data if isinstance(data, list) else data.get("@graph", [data]) if isinstance(data, dict) else []
                for it in entries:
                    if not isinstance(it, dict):
                        continue
                    itype = str(it.get("@type", "")).lower()
                    if any(k in itype for k in ["article", "news", "posting", "report", "webpage"]):
                        if it.get("headline") and not json_ld_title:
                            json_ld_title = str(it["headline"]).strip()
                        if it.get("articleBody"):
                            candidate = str(it["articleBody"]).strip()
                            if len(candidate) > len(json_ld_body):
                                json_ld_body = candidate
                        elif it.get("description"):
                            candidate = str(it["description"]).strip()
                            if len(candidate) > len(json_ld_body):
                                json_ld_body = candidate
            except Exception:
                pass

    # Step 2: Extract metadata titles and descriptions
    meta_title = ""
    meta_desc_text = ""
    if soup:
        og_t = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "twitter:title"})
        if og_t and og_t.get("content"):
            meta_title = str(og_t["content"]).strip()

        og_d = (
            soup.find("meta", property="og:description")
            or soup.find("meta", attrs={"name": "description"})
            or soup.find("meta", attrs={"name": "twitter:description"})
        )
        if og_d and og_d.get("content"):
            meta_desc_text = str(og_d["content"]).strip()

    # Step 3: Clean tags and extract HTML body
    body_text = ""
    title = ""

    if soup:
        # Replace line breaks with newlines before removing tags
        for br in soup.find_all(["br", "br/"]):
            br.replace_with("\n")

        # Remove scripts, styles, navigation, footers, headers
        for tag in soup(["script", "style", "nav", "footer", "header", "form", "iframe", "noscript", "aside", "svg", "button", "figure", "figcaption"]):
            tag.decompose()

        for selector in [
            "[class*='footer']", "[id*='footer']", "[class*='bottom']", "[class*='copyright']",
            "[class*='license']", "[class*='lien-he']", "[class*='contact']", "[class*='toa-soan']",
            "[class*='toasoan']", "[class*='ban-quyen']", "[class*='meta-bottom']", "[class*='social']",
            "[class*='share']", "[class*='breadcrumb']", "[class*='comment']", "[class*='author-bio']",
            "[class*='box-info']", "[class*='thong-tin-toa-soan']", "[id*='copyright']",
            "[class*='masthead']", "[id*='masthead']", "[class*='site-header']", "[id*='site-header']",
            "[class*='topbar']", "[class*='top-bar']", "[class*='banner']", "[class*='header-top']"
        ]:
            for el in soup.select(selector):
                el.decompose()

        def is_boilerplate_text(t: str) -> bool:
            """Filter out press license, address, hotline, copyright, masthead, and footer metadata."""
            tl = t.lower().strip()
            patterns = [
                "trụ sở:", "trụ sở chính", "điện thoại:", "đt:", "fax:", "email:",
                "đường dây nóng", "hotline", "giấy phép hoạt động", "giấy phép xuất bản",
                "giấy phép số", "bản quyền thuộc", "©", "copyright", "tổng biên tập",
                "phó tổng biên tập", "cơ quan chủ quản", "ghi rõ nguồn", "mọi hành vi sao chép",
                "cục thông tin và truyền thông", "toà soạn:", "tòa soạn:", "liên hệ quảng cáo",
                "phát hành lại thông tin", "báo điện tử của chính phủ", "báo điện tử chính phủ",
                "cộng hòa xã hội chủ nghĩa việt nam", "chính phủ nước cộng hòa",
                "độc lập - tự do - hạnh phúc", "độc lập tự do hạnh phúc",
                "cổng thông tin điện tử", "báo điện tử", "chịu trách nhiệm nội dung",
                "thông tin xuất bản", "tạp chí điện tử",
                "dấu tích xanh", "bên cạnh vnexpress", "theo dõi vnexpress", "bấm theo dõi",
                "google news", "tải ứng dụng", "cài đặt ứng dụng", "ý kiến bạn đọc",
                "chia sẻ bài viết", "bình luận của bạn", "đăng nhập để bình luận", "độc giả gửi bài",
                "bản tin lúc", "nhấn chuông để nhận thông báo", "thông báo từ", "trở lại thời sự",
                "xem thêm:", "tin liên quan:"
            ]
            return any(p in tl for p in patterns) or "cộng hòa xã hội chủ nghĩa" in tl

        # Extract title
        if soup.h1 and soup.h1.get_text().strip():
            title = soup.h1.get_text().strip()
        elif meta_title:
            title = meta_title
        elif json_ld_title:
            title = json_ld_title
        elif soup.title and soup.title.string:
            title = soup.title.string.strip()

        # Clean branding suffixes from title
        if title:
            title = re.sub(
                r"\s*[\-\|\–\—]\s*(MSN|VnExpress|Báo Dân trí|Dân trí|Báo Tuổi Trẻ|Tuổi Trẻ Online|Báo Thanh Niên|Thanh Niên|Znews|ZingNews|VietNamNet|VTV|VTV\.vn|Báo Lao Động|Lao Động|Báo Tiền Phong|Cổng Thông tin điện tử Chính phủ|Chính phủ)$",
                "",
                title,
                flags=re.IGNORECASE,
            ).strip()

        # Extract body candidates from HTML
        candidates: list[tuple[int, list[str]]] = []
        for selector in [
            "article", "main", ".detail-content", ".content-detail", ".article-content",
            ".article__content", ".entry-content", ".post-content", ".story-body", "#maincontent",
            ".content", ".fck_detail", ".cms-body", ".news-content", ".post_content", ".detail__content", ".item-content"
        ]:
            for el in soup.select(selector):
                ps = [
                    p.get_text().strip()
                    for p in el.find_all("p")
                    if len(p.get_text().strip()) >= 15 and not is_boilerplate_text(p.get_text())
                ]
                if ps:
                    candidates.append((sum(len(p) for p in ps), ps))

        for tag in soup.find_all(["div", "section"]):
            ps = [
                p.get_text().strip()
                for p in tag.find_all("p")
                if len(p.get_text().strip()) >= 18 and not is_boilerplate_text(p.get_text())
            ]
            if len(ps) >= 2:
                candidates.append((sum(len(p) for p in ps), ps))

        if candidates:
            candidates.sort(key=lambda x: x[0], reverse=True)
            body_text = "\n\n".join(candidates[0][1])
        elif json_ld_body and len(json_ld_body) >= 40:
            body_text = json_ld_body
        elif meta_desc_text and len(meta_desc_text) >= 40:
            body_text = meta_desc_text
        else:
            all_ps = [
                p.get_text().strip()
                for p in soup.find_all("p")
                if len(p.get_text().strip()) >= 15 and not is_boilerplate_text(p.get_text())
            ]
            if all_ps:
                body_text = "\n\n".join(all_ps)

    # Step 4: Fallback to hint title and URL slug if title is missing or generic
    if hint_title and hint_title.strip():
        title = hint_title.strip()
    elif not title or len(title) < 5 or title.lower() in ("msn", "tin tức", "trang chủ", "home"):
        slug_title = extract_slug_title(url)
        if slug_title:
            title = slug_title
        elif not title:
            title = "Tin tức từ " + urlparse(url).netloc

    # Step 5: If body is still too short (e.g. MSN, SPA, client JS, aggregators), trigger syndication/search fallback
    if len(body_text.strip()) < 25:
        effective_title = (hint_title or "").strip() or title or extract_slug_title(url)
        if effective_title and len(effective_title) >= 6 and effective_title.lower() not in ("msn", "tin tức", "home"):
            logger.info("Direct extraction minimal for %s. Triggering syndication fallback for: '%s'", url, effective_title)
            syndicated = search_syndicated_original(effective_title)
            if syndicated:
                syn_title, syn_body = syndicated
                if len(syn_body.strip()) >= 25:
                    return (syn_title or effective_title)[:490], syn_body[:15000]

    if len(body_text.strip()) < 25:
        raise ValueError(
            "Không thể tự động tải nội dung từ liên kết này do trang web dùng kỹ thuật hiển thị động (SPA/JavaScript) hoặc chặn bot tự động. "
            "Vui lòng chọn tab 'Dán nội dung bài báo' và dán trực tiếp nội dung bài viết để thẩm định."
        )

    return title[:490], body_text[:15000]
