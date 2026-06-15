from qdrant_client import QdrantClient
from qdrant_client.http import models

client = QdrantClient(":memory:")
client.recreate_collection(
    collection_name="test",
    vectors_config=models.VectorParams(size=3, distance=models.Distance.COSINE),
)
client.upsert(
    collection_name="test",
    points=[
        models.PointStruct(id=1, vector=[0.1, 0.2, 0.3], payload={"text": "hello"}),
    ]
)

# Test query_points
res = client.query_points(
    collection_name="test",
    query=[0.1, 0.2, 0.3],
    limit=1
)
print(f"Result type: {type(res)}")
print(f"Points: {res.points}")
print(f"First point: {res.points[0]}")
print(f"First point score: {res.points[0].score}")
print(f"First point payload: {res.points[0].payload}")
