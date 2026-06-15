from qdrant_client import QdrantClient
client = QdrantClient(":memory:")
print(f"Has search: {hasattr(client, 'search')}")
print(f"Has query: {hasattr(client, 'query')}")
print(f"Methods: {[m for m in dir(client) if not m.startswith('_')]}")
