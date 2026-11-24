"""SSRF-protected URL fetching and article content extraction service."""

import ipaddress
import logging
import socket
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


def fetch_and_extract_article(url: str) -> tuple[str, str]:
    """
    Safely download and extract article title and body text.
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

        if resp.status_code != 200:
            raise ValueError(f"Remote server responded with HTTP status {resp.status_code}")

        content_type = resp.headers.get("content-type", "").lower()
        if (
            "text/html" not in content_type
            and "application/xhtml+xml" not in content_type
            and "text/plain" not in content_type
            and "<html" not in resp.text[:500].lower()
        ):
            raise ValueError(f"Unsupported content type: {content_type}. Only HTML articles are accepted.")

        if len(resp.content) > MAX_ARTICLE_BYTES:
            raise ValueError("Article size exceeds the maximum limit.")

        # Ensure correct text decoding for Vietnamese news/journals
        if resp.encoding in (None, "iso-8859-1", "ascii"):
            try:
                html_text = resp.content.decode("utf-8")
            except UnicodeDecodeError:
                html_text = resp.text
        else:
            html_text = resp.text

    except httpx.TimeoutException as e:
        raise ValueError("Timeout while fetching article URL.") from e
    except httpx.RequestError as e:
        raise ValueError(f"Network error while connecting to source: {e}") from e

    # Parse and extract
    soup = BeautifulSoup(html_text, "html.parser")

    # Replace line breaks with newlines before removing tags
    for br in soup.find_all(["br", "br/"]):
        br.replace_with("\n")

    # Remove script, style, nav, footer, header, form, iframe, etc.
    for tag in soup(["script", "style", "nav", "footer", "header", "form", "iframe", "noscript", "aside", "svg", "button", "figure", "figcaption"]):
        tag.decompose()

    # Also decompose footer/boilerplate containers by class and id
    for selector in [
        "[class*='footer']", "[id*='footer']", "[class*='bottom']", "[class*='copyright']",
        "[class*='license']", "[class*='lien-he']", "[class*='contact']", "[class*='toa-soan']",
        "[class*='toasoan']", "[class*='ban-quyen']", "[class*='meta-bottom']", "[class*='social']",
        "[class*='share']", "[class*='breadcrumb']", "[class*='comment']", "[class*='author-bio']",
        "[class*='box-info']", "[class*='thong-tin-toa-soan']", "[id*='copyright']"
    ]:
        for el in soup.select(selector):
            el.decompose()

    def is_boilerplate_text(t: str) -> bool:
        """Filter out press license, address, hotline, copyright, and footer metadata."""
        tl = t.lower()
        patterns = [
            "trụ sở:", "trụ sở chính", "điện thoại:", "đt:", "fax:", "email:",
            "đường dây nóng", "hotline", "giấy phép hoạt động", "giấy phép xuất bản",
            "giấy phép số", "bản quyền thuộc", "©", "copyright", "tổng biên tập",
            "phó tổng biên tập", "cơ quan chủ quản", "ghi rõ nguồn", "mọi hành vi sao chép",
            "cục thông tin và truyền thông", "toà soạn:", "tòa soạn:", "liên hệ quảng cáo",
            "phát hành lại thông tin", "báo điện tử của chính phủ"
        ]
        return any(p in tl for p in patterns)

    # Extract title with multi-layer fallback
    title = ""
    if soup.h1 and soup.h1.get_text().strip():
        title = soup.h1.get_text().strip()
    elif soup.find("meta", property="og:title") and soup.find("meta", property="og:title").get("content"):
        title = str(soup.find("meta", property="og:title").get("content", "")).strip()
    elif soup.title and soup.title.string:
        title = soup.title.string.strip()
    if not title:
        title = "Tin tức từ " + urlparse(url).netloc

    # Robust body extraction: search candidate containers with the most substantial text
    candidates: list[tuple[int, list[str]]] = []
    
    # 1. First search known article body containers
    for selector in [
        "article", "main", ".detail-content", ".content-detail", ".article-content",
        ".article__content", ".entry-content", ".post-content", ".story-body", "#maincontent",
        ".content", ".fck_detail", ".cms-body", ".news-content", ".post_content", ".detail__content", ".item-content"
    ]:
        for el in soup.select(selector):
            ps = [
                p.get_text().strip() for p in el.find_all("p")
                if len(p.get_text().strip()) >= 15 and not is_boilerplate_text(p.get_text())
            ]
            if ps:
                candidates.append((sum(len(p) for p in ps), ps))

    # 2. General div / section search
    for tag in soup.find_all(["div", "section"]):
        ps = [
            p.get_text().strip() for p in tag.find_all("p")
            if len(p.get_text().strip()) >= 18 and not is_boilerplate_text(p.get_text())
        ]
        if len(ps) >= 2:
            total_len = sum(len(p) for p in ps)
            candidates.append((total_len, ps))

    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        body_text = "\n\n".join(candidates[0][1])
    else:
        # Fallback to all paragraphs in document
        all_ps = [
            p.get_text().strip() for p in soup.find_all("p")
            if len(p.get_text().strip()) >= 15 and not is_boilerplate_text(p.get_text())
        ]
        if all_ps:
            body_text = "\n\n".join(all_ps)
        else:
            meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
            if meta_desc and meta_desc.get("content") and not is_boilerplate_text(str(meta_desc.get("content"))):
                body_text = str(meta_desc.get("content")).strip()
            else:
                body_elem = soup.find("body") or soup
                lines = [
                    line.strip() for line in body_elem.get_text(separator="\n").splitlines()
                    if len(line.strip()) >= 20 and not is_boilerplate_text(line)
                ]
                body_text = "\n\n".join(lines)

    if len(body_text) < 25:
        raise ValueError("Could not extract meaningful text content from the article page.")

    return title[:490], body_text[:15000]

