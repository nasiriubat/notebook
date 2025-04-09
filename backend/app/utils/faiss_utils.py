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
import concurrent.futures
import time
import hashlib
import json

# Load OpenAI API key from .env file
openai.api_key = api_key=app.config["OPENAI_API_KEY"]

EMBEDDINGS_FOLDER = Path("dataembedding")
EMBEDDINGS_FOLDER.mkdir(parents=True, exist_ok=True)

# Create cache directory
CACHE_FOLDER = EMBEDDINGS_FOLDER / "cache"
CACHE_FOLDER.mkdir(parents=True, exist_ok=True)

encoding = tiktoken.encoding_for_model("text-embedding-ada-002")
MAX_TOKENS = 8192
BATCH_SIZE = 10  # Process embeddings in batches for better performance

def split_into_chunks(text: str, max_tokens: int = MAX_TOKENS) -> List[str]:
    tokens = encoding.encode(text)
    return [encoding.decode(tokens[i:i+max_tokens]) for i in range(0, len(tokens), max_tokens)]

def get_cache_key(text: str) -> str:
    """Generate a cache key for a text chunk."""
    return hashlib.md5(text.encode()).hexdigest()

def get_cached_embedding(text: str) -> Optional[np.ndarray]:
    """Check if embedding exists in cache and return it if found."""
    cache_key = get_cache_key(text)
    cache_file = CACHE_FOLDER / f"{cache_key}.json"
    
    if cache_file.exists():
        try:
            with open(cache_file, 'r') as f:
                cached_data = json.load(f)
                return np.array(cached_data['embedding'], dtype=np.float32)
        except Exception as e:
            print(f"Error reading cache: {e}")
    
    return None

def save_to_cache(text: str, embedding: np.ndarray) -> None:
    """Save embedding to cache."""
    cache_key = get_cache_key(text)
    cache_file = CACHE_FOLDER / f"{cache_key}.json"
    
    try:
        with open(cache_file, 'w') as f:
            json.dump({
                'text': text,
                'embedding': embedding.tolist()
            }, f)
    except Exception as e:
        print(f"Error saving to cache: {e}")

def create_embedding(text: str) -> Optional[np.ndarray]:
    """Create embedding for a single text chunk with caching."""
    # Check cache first
    cached_embedding = get_cached_embedding(text)
    if cached_embedding is not None:
        return cached_embedding
    
    try:
        response = openai.embeddings.create(
            input=text,
            model="text-embedding-ada-002"
        )
        embedding = np.array(response.data[0].embedding, dtype=np.float32)
        
        # Save to cache
        save_to_cache(text, embedding)
        
        return embedding
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

def process_chunk_batch(chunks: List[str]) -> List[Optional[np.ndarray]]:
    """Process a batch of chunks in parallel."""
    embeddings = []
    
    # Use ThreadPoolExecutor for parallel processing
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(chunks), BATCH_SIZE)) as executor:
        # Submit all tasks
        future_to_chunk = {executor.submit(create_embedding, chunk): chunk for chunk in chunks}
        
        # Process results as they complete
        for future in concurrent.futures.as_completed(future_to_chunk):
            chunk = future_to_chunk[future]
            try:
                embedding = future.result()
                embeddings.append(embedding)
            except Exception as e:
                print(f"Error processing chunk: {e}")
                embeddings.append(None)
    
    return embeddings

def generate_and_store_embeddings(text: str) -> Optional[str]:
    """Generate and store embeddings with optimized batch processing."""
    start_time = time.time()
    file_id = str(uuid.uuid4())
    
    # Split text into chunks
    chunks = split_into_chunks(text)
    
    if not chunks:
        print("No valid chunks created from input text")
        return None
    
    # Process chunks in batches
    all_embeddings = []
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i+BATCH_SIZE]
        batch_embeddings = process_chunk_batch(batch)
        all_embeddings.extend(batch_embeddings)
    
    # Filter out None values
    embeddings = [e for e in all_embeddings if e is not None]
    
    if not embeddings:
        print("No embeddings generated for the text")
        return None
    
    # Save chunks
    chunks_file = EMBEDDINGS_FOLDER / f"{file_id}_chunks.npy"
    np.save(chunks_file, np.array(chunks))
    
    # Save embeddings
    embeddings_np = np.array(embeddings, dtype=np.float32)
    embeddings_file = EMBEDDINGS_FOLDER / f"{file_id}_embeddings.npy"
    np.save(embeddings_file, embeddings_np)
    
    # Create and save FAISS index
    dimension = embeddings_np.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings_np)
    index_file = EMBEDDINGS_FOLDER / f"{file_id}_index.faiss"
    faiss.write_index(index, str(index_file))
    
    end_time = time.time()
    print(f"Embedding generation completed in {end_time - start_time:.2f} seconds")
    
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