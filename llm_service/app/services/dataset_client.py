import httpx
from app.config import API_SERVER_URL


class DatasetFetchError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _error_message(resp: httpx.Response) -> str:
    try:
        body = resp.json()
        parts = [p for p in (body.get("error"), body.get("message")) if p]
        return " — ".join(parts) if parts else resp.text
    except Exception:
        return resp.text


async def fetch_project_dataset(project_id: str | None, dataset_id: str, auth_token: str) -> dict:
    """Fetch GeoJSON + field metadata for a dataset via api_server.

    If `project_id` is provided, uses the project-scoped endpoint (works for
    datasets that were uploaded as files into the project's S3 prefix). Otherwise
    uses the Postgres-backed `/api/datasets/:id/geojson` endpoint — which is
    what the Layers Browser plots directly (projectId: null). This mirrors
    MapArea.loadLayerData's branching.
    """
    headers = {"Authorization": f"Bearer {auth_token}"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        if project_id:
            url = f"{API_SERVER_URL}/api/projects/{project_id}/datasets/{dataset_id}/data"
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                raise DatasetFetchError(resp.status_code, _error_message(resp))
            data = resp.json()
            if data.get("geojson") is None:
                raise DatasetFetchError(502, "api_server response missing 'geojson'")
            return {"geojson": data["geojson"], "fields": data.get("fields", [])}

        url = f"{API_SERVER_URL}/api/datasets/{dataset_id}/geojson"
        resp = await client.get(url, headers=headers)

    if resp.status_code != 200:
        raise DatasetFetchError(resp.status_code, _error_message(resp))

    geojson = resp.json()
    if not isinstance(geojson, dict) or geojson.get("type") != "FeatureCollection":
        raise DatasetFetchError(502, "dataset endpoint did not return a FeatureCollection")
    return {"geojson": geojson, "fields": []}
