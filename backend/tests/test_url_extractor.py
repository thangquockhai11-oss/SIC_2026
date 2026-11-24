"""Test suite for SSRF protection, HTML extraction, and syndication fallback in url_extractor."""
import pytest
from app.services.url_extractor import (
    validate_url_safe,
    is_ip_safe,
    extract_slug_title,
    fetch_and_extract_article,
)


def test_ssrf_blocks_private_and_local_ips():
    """Verify private/loopback IP validation rejects internal targets."""
    assert not is_ip_safe("127.0.0.1")
    assert not is_ip_safe("10.0.0.1")
    assert not is_ip_safe("192.168.1.1")
    assert not is_ip_safe("::1")
    assert is_ip_safe("8.8.8.8")
    assert is_ip_safe("1.1.1.1")

    with pytest.raises(ValueError, match="forbidden private/reserved IP|internal host address"):
        validate_url_safe("http://127.0.0.1:8000/internal")

    with pytest.raises(ValueError, match="forbidden private/reserved IP|internal host address"):
        validate_url_safe("http://localhost:5173/admin")


def test_extract_slug_title_from_url():
    """Verify clean title extraction from URL path slug."""
    url = "https://www.msn.com/vi-vn/sports/soccer/simeone-ph%C3%A1-k%E1%BB%B7-%E1%BB%87-th%E1%BA%AFng-t%E1%BB%93n-t%E1%BA%A1i-22-n%C4%83m-%E1%BB%9F-la-liga/ar-AA1vC7P2"
    slug_title = extract_slug_title(url)
    assert len(slug_title) > 10
    assert "simeone" in slug_title.lower()


def test_fetch_with_syndication_fallback_msn():
    """Verify that MSN or dynamic SPA links fallback to syndicated original news."""
    url = "https://www.msn.com/vi-vn/sports/soccer/simeone-ph%C3%A1-k%E1%BB%B7-%E1%BB%87-th%E1%BA%AFng-t%E1%BB%93n-t%E1%BA%A1i-22-n%C4%83m-%E1%BB%9F-la-liga/ar-AA1vC7P2"
    hint_title = "Simeone phá kỷ lục thắng tồn tại 22 năm ở La Liga"
    title, body = fetch_and_extract_article(url, hint_title=hint_title)
    assert "Simeone" in title
    assert len(body) >= 100
    assert "Atletico" in body or "kỷ lục" in body or "Simeone" in body


def test_unextractable_url_raises_informative_vietnamese_message():
    """Verify that unextractable / non-news pages raise a clear Vietnamese guidance message."""
    with pytest.raises(ValueError, match="Không thể tự động tải nội dung|Vui lòng chọn tab"):
        # A URL returning empty content or 404
        fetch_and_extract_article("https://httpbin.org/status/404")
