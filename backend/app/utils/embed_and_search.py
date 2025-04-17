import os
# Set OpenMP environment variable to handle multiple runtime libraries
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import openai
import faiss
import numpy as np
import uuid
from app import app, db
from pathlib import Path
from typing import List, Dict, Optional
from tqdm import tqdm
import tiktoken

# Load OpenAI API key from .env file
openai.api_key = api_key=app.config["OPENAI_API_KEY"]

EMBEDDINGS_FOLDER = Path("dataembedding")
EMBEDDINGS_FOLDER.mkdir(parents=True, exist_ok=True)

encoding = tiktoken.encoding_for_model("text-embedding-ada-002")
MAX_TOKENS = 8000

def split_into_chunks(text: str, max_tokens: int = MAX_TOKENS, overlap: int = 200) -> List[str]:
    tokens = encoding.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        chunk = encoding.decode(tokens[start:end])
        chunks.append(chunk)
        start += max_tokens - overlap
    return chunks


def create_embedding(text: str) -> Optional[np.ndarray]:
    try:
        response = openai.embeddings.create(
            input=text,
            model="text-embedding-ada-002"
        )
        return np.array(response.data[0].embedding, dtype=np.float32)
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

def generate_and_store_embeddings(text: str) -> Optional[str]:
    file_id = str(uuid.uuid4())
    chunks = split_into_chunks(text)
    
    if not chunks:
        print("No valid chunks created from input text")
        return None
    
    embeddings = []
    for chunk in chunks:
        embedding = create_embedding(chunk)
        if embedding is not None:
            embeddings.append(embedding)
    
    if not embeddings:
        print("No embeddings generated for the text")
        return None
    
    # Save chunks
    chunks_file = EMBEDDINGS_FOLDER / f"{file_id}_chunks.npy"
    np.save(chunks_file, np.array(chunks))
    
    # Save embeddings
    embeddings_np = np.array(embeddings, dtype=np.float32)
    embeddings_np = embeddings_np / np.linalg.norm(embeddings_np, axis=1, keepdims=True)
    embeddings_file = EMBEDDINGS_FOLDER / f"{file_id}_embeddings.npy"
    np.save(embeddings_file, embeddings_np)
    
    # Create and save FAISS index
    dimension = embeddings_np.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings_np)
    index_file = EMBEDDINGS_FOLDER / f"{file_id}_index.faiss"
    faiss.write_index(index, str(index_file))
    
    return file_id

def load_indices(file_ids: List[str]) -> tuple[dict, dict]:
    indices = {}
    chunk_data = {}
    
    for file_id in file_ids:
        try:
            index_path = EMBEDDINGS_FOLDER / f"{file_id}_index.faiss"
            index = faiss.read_index(str(index_path))
            
            chunks_path = EMBEDDINGS_FOLDER / f"{file_id}_chunks.npy"
            chunks = np.load(chunks_path, allow_pickle=True)
            
            embeddings_path = EMBEDDINGS_FOLDER / f"{file_id}_embeddings.npy"
            embeddings = np.load(embeddings_path)
            embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
            
            indices[file_id] = (index, embeddings)
            chunk_data[file_id] = chunks
            
        except Exception as e:
            print(f"Error loading {file_id}: {e}")
    
    return indices, chunk_data

def search_across_indices(query: str, file_ids: List[str], top_k: int = 5) -> List[Dict]:
    query_embedding = create_embedding(query)
    if query_embedding is None:
        return []
    
    query_embedding = query_embedding / np.linalg.norm(query_embedding)
    indices, chunk_data = load_indices(file_ids)
    
    results = []
    
    for file_id, (index, embeddings) in indices.items():
        D, I = index.search(np.expand_dims(query_embedding, 0), top_k)
        
        for distance, idx in zip(D[0], I[0]):
            if idx >= 0 and idx < len(chunk_data[file_id]):
                results.append({
                    "file_id": file_id,
                    "chunk": chunk_data[file_id][idx],
                    "distance": float(distance),
                    "score": 1 - distance
                })
    
    # Sort and return top results
    return sorted(results, key=lambda x: x["score"], reverse=True)[:top_k]

# # Example usage:
# if __name__ == "__main__":
#     # Process single text
#     text = "Your long document text goes here..."
#     file_id = generate_and_store_embeddings(text)
    
#     if file_id:
#         # Search across specific files (could include multiple file IDs)
#         query = "What is the main topic?"
#         results = search_across_indices(query, [file_id], top_k=3)
        
#         for result in results:
#             print(f"\nFile ID: {result['file_id']}")
#             print(f"Score: {result['score']:.3f}")
#             print(f"Content: {result['chunk'][:200]}...")