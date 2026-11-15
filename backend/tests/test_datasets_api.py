"""Metadata registry API tests."""

from fastapi.testclient import TestClient


def test_registry_has_16_unverified_metadata_records(client: TestClient) -> None:
    response = client.get("/api/v1/datasets", params={"page_size": 100})
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 16
    assert all(item["status"] == "UNVERIFIED" for item in payload["items"])
    assert all(item["license_status"] == "UNVERIFIED" for item in payload["items"])
    assert all(item["schema_status"] == "UNVERIFIED" for item in payload["items"])
    assert all(item["license"] is None for item in payload["items"])
    assert all(item["label_schema"] == [] for item in payload["items"])


def test_registry_filters_category_and_language(client: TestClient) -> None:
    response = client.get(
        "/api/v1/datasets",
        params={"category": "fact_checking", "language": "vi"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["dataset_id"] == "vifactcheck"


def test_registry_paginates(client: TestClient) -> None:
    response = client.get("/api/v1/datasets", params={"page": 2, "page_size": 5})
    assert response.status_code == 200
    assert response.json()["total"] == 16
    assert len(response.json()["items"]) == 5


def test_registry_rejects_unknown_category(client: TestClient) -> None:
    response = client.get("/api/v1/datasets", params={"category": "fake_or_real"})
    assert response.status_code == 422
