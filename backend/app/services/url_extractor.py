"""SSRF-protected URL fetching and article content extraction service."""

import ipaddress
import logging
import socket
from urllib.parse import urlparse

from bs4 import BeautifulSoup
import httpx

logger = logging.getLogger(__name__)

MAX_ARTICLE_BYTES = 2 * 1024 * 1024  # 2MB
FETCH_TIMEOUT = 6.0  # seconds


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
        "User-Agent": "TrustMediaAI-ResearchBot/1.0 (+https://trustmedia.ai; media-analysis)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
    }

    try:
        with httpx.Client(timeout=FETCH_TIMEOUT, follow_redirects=False) as client:
            resp = client.get(validated_url, headers=headers)

            # Check redirect targets safely
            redirect_count = 0
            while resp.is_redirect and redirect_count < 3:
                redirect_count += 1
                redirect_url = resp.headers.get("location")
                if not redirect_url:
                    break
                # Validate the redirect target
                validate_url_safe(redirect_url)
                resp = client.get(redirect_url, headers=headers)

            if resp.status_code != 200:
                raise ValueError(f"Remote server responded with HTTP status {resp.status_code}")

            content_type = resp.headers.get("content-type", "")
            if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
                raise ValueError(f"Unsupported content type: {content_type}. Only HTML articles are accepted.")

            if len(resp.content) > MAX_ARTICLE_BYTES:
                raise ValueError("Article size exceeds the 2MB limit.")

            html_text = resp.text

    except httpx.TimeoutException as e:
        raise ValueError("Timeout while fetching article URL.") from e
    except httpx.RequestError as e:
        raise ValueError(f"Network error while connecting to source: {e}") from e

    # Parse and extract
    soup = BeautifulSoup(html_text, "html.parser")

    # Remove script, style, nav, footer, header, form, iframe, etc.
    for tag in soup(["script", "style", "nav", "footer", "header", "form", "iframe", "noscript", "aside"]):
        tag.decompose()

    # Extract title
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    elif soup.h1:
        title = soup.h1.get_text().strip()
    if not title:
        title = "Tin tức từ " + urlparse(url).netloc

    # Extract paragraphs
    paragraphs = []
    # Search common article tags first
    article_body = soup.find("article") or soup.find(class_=lambda c: c and any(x in str(c).lower() for x in ["article", "content", "post-body", "detail-content"]))
    container = article_body if article_body else soup.body or soup

    for p in container.find_all("p"):
        text = p.get_text().strip()
        if len(text) > 25:  # filter noise
            paragraphs.append(text)

    if not paragraphs:
        # Fallback to all text
        body_text = container.get_text(separator="\n").strip()
    else:
        body_text = "\n\n".join(paragraphs)

    if len(body_text) < 50:
        raise ValueError("Could not extract meaningful text content from the article page.")

    return title[:490], body_text[:10000]

