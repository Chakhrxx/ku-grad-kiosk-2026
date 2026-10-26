"""Short-lived client tokens so the kiosk browser can open the realtime try-on stream without the real key."""

import httpx

TOKENS_URL = "https://api.decart.ai/v1/client/tokens"
MODELS = ["lucy-vton-latest", "lucy-vton-3.6"]
TOKEN_TTL_S = 60  # only gates opening the stream; a connected session keeps running past it


def create_client_token(api_key: str) -> dict:
    r = httpx.post(
        TOKENS_URL,
        headers={"X-API-KEY": api_key},
        json={"expiresIn": TOKEN_TTL_S, "allowedModels": MODELS},
        timeout=15,
    )
    r.raise_for_status()
    body = r.json()
    return {"apiKey": body["apiKey"], "expiresAt": body["expiresAt"]}
