"""
=============================================================================
CodeForge AI — Qdrant Vector Store Client
=============================================================================

Qdrant is a vector database used for semantic search.
Instead of searching by exact keywords, vectors let you search by MEANING.

Example use cases:
    - "Find functions that handle authentication" → finds relevant code
    - "Show me similar errors to this one" → finds similar past issues
    - "Search repos that use this pattern" → finds similar code patterns

How it works:
    1. We convert text (code, descriptions) into "vectors" (lists of numbers)
       using an embedding model.
    2. We store those vectors in Qdrant.
    3. When searching, we convert the query to a vector and find the
       nearest neighbors (most similar vectors).

=============================================================================
"""

import logging
from qdrant_client import QdrantClient, models
from qdrant_client.http.exceptions import UnexpectedResponse
from app.config import settings

log = logging.getLogger("codeforge.db.qdrant")

# Global Qdrant client instance
_qdrant: QdrantClient | None = None

# Vector dimensions — must match the embedding model you use.
# text-embedding-ada-002 = 1536, all-MiniLM-L6-v2 = 384
VECTOR_SIZE = 1536  # Using OpenAI-compatible embeddings via OpenRouter


def get_qdrant() -> QdrantClient:
    """
    Get or create the Qdrant client.
    - If QDRANT_URL is set: connects to a real Qdrant server (persistent)
    - If not set: uses in-memory mode (data lost on restart, good for dev)
    """
    global _qdrant

    if _qdrant is not None:
        return _qdrant

    if settings.QDRANT_URL:
        # Connect to a running Qdrant server (local Docker or Qdrant Cloud)
        log.info(f"Connecting to Qdrant at {settings.QDRANT_URL}")
        _qdrant = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY or None,
        )
        log.info("✅ Qdrant connected (persistent mode)")
    else:
        # Use in-memory Qdrant — no setup needed, good for development
        log.info("Using Qdrant in-memory mode (data not persisted)")
        _qdrant = QdrantClient(":memory:")
        log.info("✅ Qdrant ready (in-memory mode)")

    return _qdrant


async def ensure_collection(collection_name: str = settings.QDRANT_COLLECTION) -> None:
    """
    Create the Qdrant collection if it doesn't exist.
    A "collection" in Qdrant is like a table in SQL.
    """
    client = get_qdrant()

    try:
        client.get_collection(collection_name)
        log.info(f"Qdrant collection '{collection_name}' already exists")
    except (UnexpectedResponse, Exception):
        # Collection doesn't exist — create it
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=VECTOR_SIZE,
                distance=models.Distance.COSINE,  # Cosine similarity for text
            ),
        )
        log.info(f"✅ Qdrant collection '{collection_name}' created")


async def upsert_code_chunk(
    collection: str,
    chunk_id: str,
    vector: list[float],
    payload: dict,
) -> None:
    """
    Store a code chunk with its vector embedding.

    Args:
        collection: Which collection to store in
        chunk_id:   Unique ID for this chunk (e.g., "repo_123_file_456_chunk_7")
        vector:     The embedding vector (list of floats)
        payload:    Metadata (file path, language, content, repo ID, etc.)
    """
    client = get_qdrant()
    client.upsert(
        collection_name=collection,
        points=[
            models.PointStruct(
                id=abs(hash(chunk_id)) % (2**63),  # Qdrant needs integer IDs
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
    """
    Find the most similar code chunks to the query vector.

    Args:
        collection:     Which collection to search
        query_vector:   The query embedded as a vector
        limit:          How many results to return
        filter_repo_id: Only search within a specific repository

    Returns:
        List of matching chunks with their metadata and similarity scores
    """
    client = get_qdrant()

    # Optional filter to search only within a specific repo
    query_filter = None
    if filter_repo_id:
        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="repo_id",
                    match=models.MatchValue(value=filter_repo_id),
                )
            ]
        )

    results = client.search(
        collection_name=collection,
        query_vector=query_vector,
        limit=limit,
        query_filter=query_filter,
        with_payload=True,
    )

    return [
        {
            "score": r.score,           # Similarity score (0-1, higher = more similar)
            "chunk_id": r.payload.get("chunk_id"),
            "file_path": r.payload.get("file_path"),
            "content": r.payload.get("content"),
            "language": r.payload.get("language"),
            "repo_id": r.payload.get("repo_id"),
        }
        for r in results
    ]
