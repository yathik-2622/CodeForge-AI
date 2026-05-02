import logging
import hashlib
from qdrant_client import QdrantClient, models
from qdrant_client.http.exceptions import UnexpectedResponse
from app.config import settings

log = logging.getLogger("codeforge.db.qdrant")

_qdrant: QdrantClient | None = None

VECTOR_SIZE = 384  # all-MiniLM-L6-v2 embedding dimensions
_embedder = None


def _get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer("all-MiniLM-L6-v2")
            log.info("✅ Sentence transformer embedder loaded (all-MiniLM-L6-v2)")
        except Exception as e:
            log.warning(f"Sentence transformer unavailable: {e}. Using zero vectors.")
            _embedder = None
    return _embedder


def embed_text(text: str) -> list[float]:
    embedder = _get_embedder()
    if embedder is None:
        return [0.0] * VECTOR_SIZE
    try:
        vec = embedder.encode(text[:512], normalize_embeddings=True)
        return vec.tolist()
    except Exception as e:
        log.error(f"Embedding error: {e}")
        return [0.0] * VECTOR_SIZE


def get_qdrant() -> QdrantClient:
    global _qdrant
    if _qdrant is not None:
        return _qdrant

    if settings.QDRANT_URL and settings.QDRANT_API_KEY:
        log.info(f"Connecting to Qdrant cloud: {settings.QDRANT_URL}")
        _qdrant = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
            timeout=30,
        )
        log.info("✅ Qdrant cloud connected")
    elif settings.QDRANT_URL:
        _qdrant = QdrantClient(url=settings.QDRANT_URL, timeout=30)
        log.info(f"✅ Qdrant connected at {settings.QDRANT_URL}")
    else:
        log.info("Using Qdrant in-memory mode")
        _qdrant = QdrantClient(":memory:")
        log.info("✅ Qdrant ready (in-memory)")

    return _qdrant


async def ensure_collection(collection_name: str = None) -> None:
    name = collection_name or settings.QDRANT_COLLECTION
    client = get_qdrant()
    try:
        info = client.get_collection(name)
        log.info(f"Qdrant collection '{name}' exists ({info.points_count} points)")
    except Exception:
        client.create_collection(
            collection_name=name,
            vectors_config=models.VectorParams(
                size=VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )
        log.info(f"✅ Qdrant collection '{name}' created")


def _stable_id(chunk_id: str) -> int:
    return int(hashlib.md5(chunk_id.encode()).hexdigest(), 16) % (2**63)


async def upsert_code_chunk(
    collection: str,
    chunk_id: str,
    vector: list[float],
    payload: dict,
) -> None:
    client = get_qdrant()
    client.upsert(
        collection_name=collection,
        points=[
            models.PointStruct(
                id=_stable_id(chunk_id),
                vector=vector,
                payload={**payload, "chunk_id": chunk_id},
            )
        ],
    )


async def search_similar_code(
    collection: str,
    query_vector: list[float],
    limit: int = 5,
    filter_repo_id: str | None = None,
) -> list[dict]:
    client = get_qdrant()
    query_filter = None
    if filter_repo_id:
        query_filter = models.Filter(
            must=[models.FieldCondition(
                key="repo_id",
                match=models.MatchValue(value=filter_repo_id),
            )]
        )
    results = client.search(
        collection_name=collection,
        query_vector=query_vector,
        limit=limit,
        query_filter=query_filter,
        with_payload=True,
        score_threshold=0.5,
    )
    return [
        {
            "score": round(r.score, 4),
            "chunk_id": r.payload.get("chunk_id"),
            "file_path": r.payload.get("file_path"),
            "content": r.payload.get("content"),
            "language": r.payload.get("language"),
            "repo_id": r.payload.get("repo_id"),
        }
        for r in results
    ]


async def delete_repo_chunks(collection: str, repo_id: str) -> None:
    client = get_qdrant()
    client.delete(
        collection_name=collection,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[models.FieldCondition(
                    key="repo_id",
                    match=models.MatchValue(value=repo_id),
                )]
            )
        ),
    )
    log.info(f"Deleted Qdrant chunks for repo_id={repo_id}")
