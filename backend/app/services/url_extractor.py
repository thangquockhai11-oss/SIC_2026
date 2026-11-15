"""SSRF-protected URL fetching and article content extraction service."""

import ipaddress
import logging
import socket
from urllib.parse import urlparse

from bs4 import BeautifulSoup
import httpx

logger = logging.getLogger(__name__)

MAX_ARTICLE_BYTES = 4 * 1024 * 1024  # 4MB
FETCH_TIMEOUT = 10.0  # seconds


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
        with httpx.Client(timeout=FETCH_TIMEOUT, follow_redirects=False) as client:
            resp = client.get(validated_url, headers=headers)

            # Check redirect targets safely
            redirect_count = 0
            while resp.is_redirect and redirect_count < 5:
                redirect_count += 1
                redirect_url = resp.headers.get("location")
                if not redirect_url:
                    break
                if redirect_url.startswith("/"):
                    parsed_orig = urlparse(validated_url)
                    redirect_url = f"{parsed_orig.scheme}://{parsed_orig.netloc}{redirect_url}"
                validate_url_safe(redirect_url)
                resp = client.get(redirect_url, headers=headers)

            if resp.status_code != 200:
                raise ValueError(f"Remote server responded with HTTP status {resp.status_code}")

            content_type = resp.headers.get("content-type", "")
            if "text/html" not in content_type and "application/xhtml+xml" not in content_type and "text/plain" not in content_type:
                raise ValueError(f"Unsupported content type: {content_type}. Only HTML articles are accepted.")

            if len(resp.content) > MAX_ARTICLE_BYTES:
                raise ValueError("Article size exceeds the 4MB limit.")

            html_text = resp.text

    except httpx.TimeoutException as e:
        raise ValueError("Timeout while fetching article URL.") from e
    except httpx.RequestError as e:
        raise ValueError(f"Network error while connecting to source: {e}") from e

    # Parse and extract
    soup = BeautifulSoup(html_text, "html.parser")

    # Remove script, style, nav, footer, header, form, iframe, etc.
    for tag in soup(["script", "style", "nav", "footer", "header", "form", "iframe", "noscript", "aside", "svg", "button"]):
        tag.decompose()

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
    for tag in soup.find_all(["div", "article", "section", "main"]):
        ps = [p.get_text().strip() for p in tag.find_all("p") if len(p.get_text().strip()) > 20]
        if len(ps) >= 2:
            total_len = sum(len(p) for p in ps)
            candidates.append((total_len, ps))

    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        body_text = "\n\n".join(candidates[0][1])
    else:
        # Fallback to all paragraphs in the document
        all_ps = [p.get_text().strip() for p in soup.find_all("p") if len(p.get_text().strip()) > 20]
        if all_ps:
            body_text = "\n\n".join(all_ps)
        else:
            # Fallback to meta description or text
            meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
            if meta_desc and meta_desc.get("content"):
                body_text = str(meta_desc.get("content")).strip()
            else:
                body_text = soup.get_text(separator="\n").strip()

    if len(body_text) < 40:
        raise ValueError("Could not extract meaningful text content from the article page.")

    return title[:490], body_text[:15000]

