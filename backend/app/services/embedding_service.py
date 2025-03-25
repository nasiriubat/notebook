import faiss
import numpy as np

class EmbeddingService:
    def __init__(self, dimension=768):  # Default dimension for embeddings
        self.index = faiss.IndexFlatL2(dimension)

    def add_embedding(self, embedding):
        self.index.add(np.array([embedding]))

    def search(self, query_embedding, k=5):
        distances, indices = self.index.search(np.array([query_embedding]), k)
        return distances, indices