import os
import uuid
import numpy as np
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
from pathlib import Path
import json
import re
from functools import lru_cache
import threading
from concurrent.futures import ThreadPoolExecutor
import logging
from transformers import AutoTokenizer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the sentence transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')
tokenizer = AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')

# Create directory for storing embeddings
EMBEDDINGS_FOLDER = Path("simple_vector_data")
EMBEDDINGS_FOLDER.mkdir(parents=True, exist_ok=True)

# Cache for embeddings
embedding_cache = {}
embedding_cache_lock = threading.Lock()

# Maximum tokens per chunk (leaving some buffer for the model)
MAX_TOKENS_PER_CHUNK = 7000

@lru_cache(maxsize=1000)
def get_cached_embedding(text: str) -> np.ndarray:
    """Get cached embedding for text or generate new one."""
    return model.encode([text], show_progress_bar=False)[0]

def count_tokens(text: str) -> int:
    """Count the number of tokens in a text."""
    return len(tokenizer.encode(text))

def split_into_chunks(text: str) -> List[str]:
    """Split text into chunks based on token count and natural boundaries."""
    # First split by paragraphs
    paragraphs = re.split(r'\n\s*\n', text)
    
    chunks = []
    current_chunk = []
    current_token_count = 0
    
    for paragraph in paragraphs:
        # If paragraph is too large, split by sentences
        if count_tokens(paragraph) > MAX_TOKENS_PER_CHUNK:
            sentences = re.split(r'(?<=[.!?])\s+', paragraph)
            for sentence in sentences:
                sentence_tokens = count_tokens(sentence)
                
                # If adding this sentence would exceed the limit, save current chunk and start new one
                if current_token_count + sentence_tokens > MAX_TOKENS_PER_CHUNK and current_chunk:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_token_count = 0
                
                current_chunk.append(sentence)
                current_token_count += sentence_tokens
        else:
            paragraph_tokens = count_tokens(paragraph)
            
            # If adding this paragraph would exceed the limit, save current chunk and start new one
            if current_token_count + paragraph_tokens > MAX_TOKENS_PER_CHUNK and current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_token_count = 0
            
            current_chunk.append(paragraph)
            current_token_count += paragraph_tokens
    
    # Add the last chunk if it exists
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    # Verify all chunks are within token limit
    verified_chunks = []
    for chunk in chunks:
        token_count = count_tokens(chunk)
        if token_count > MAX_TOKENS_PER_CHUNK:
            logger.warning(f"Chunk exceeds token limit ({token_count} tokens), splitting further...")
            # Split the chunk into smaller parts
            words = chunk.split()
            current_part = []
            current_part_tokens = 0
            
            for word in words:
                word_tokens = count_tokens(word)
                if current_part_tokens + word_tokens > MAX_TOKENS_PER_CHUNK:
                    verified_chunks.append(" ".join(current_part))
                    current_part = [word]
                    current_part_tokens = word_tokens
                else:
                    current_part.append(word)
                    current_part_tokens += word_tokens
            
            if current_part:
                verified_chunks.append(" ".join(current_part))
        else:
            verified_chunks.append(chunk)
    
    return verified_chunks

def preprocess_text(text: str) -> str:
    """Clean and normalize text."""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters but keep basic punctuation
    text = re.sub(r'[^\w\s.,!?-]', '', text)
    return text.strip()

def process_chunk_batch(chunks: List[str], batch_size: int = 32) -> List[np.ndarray]:
    """Process chunks in batches for better performance."""
    embeddings = []
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        # Verify token count for each chunk in batch
        for chunk in batch:
            token_count = count_tokens(chunk)
            if token_count > MAX_TOKENS_PER_CHUNK:
                logger.warning(f"Chunk in batch exceeds token limit ({token_count} tokens), skipping...")
                continue
        batch_embeddings = model.encode(batch, show_progress_bar=False)
        embeddings.extend(batch_embeddings)
    return embeddings

def generate_and_store_embeddings(text: str) -> Optional[str]:
    """Generate embeddings for text and store them."""
    file_id = str(uuid.uuid4())
    
    try:
        logger.info(f"Starting embedding generation for file {file_id}")
        
        # Preprocess text
        text = preprocess_text(text)
        
        # Split text into chunks
        chunks = split_into_chunks(text)
        
        if not chunks:
            logger.warning("No valid chunks created from input text")
            return None
        
        logger.info(f"Created {len(chunks)} chunks, generating embeddings...")
        
        # Process chunks in batches
        embeddings = process_chunk_batch(chunks)
        
        # Save chunks and embeddings
        data = {
            'chunks': chunks,
            'embeddings': [emb.tolist() for emb in embeddings],
            'file_id': file_id
        }
        
        # Save to file
        file_path = EMBEDDINGS_FOLDER / f"{file_id}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        
        logger.info(f"Successfully stored embeddings for file {file_id}")
        return file_id
        
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        return None

def search_across_indices(query: str, file_ids: List[str], top_k: int = 5) -> List[Dict]:
    """Search for query across stored embeddings."""
    results = []
    
    # Generate query embedding
    query_embedding = get_cached_embedding(query)
    
    # Search through each file
    for file_id in file_ids:
        try:
            # Load file data
            file_path = EMBEDDINGS_FOLDER / f"{file_id}.json"
            if not file_path.exists():
                continue
                
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Calculate cosine similarity
            embeddings = np.array(data['embeddings'])
            similarities = np.dot(embeddings, query_embedding) / (
                np.linalg.norm(embeddings, axis=1) * np.linalg.norm(query_embedding)
            )
            
            # Get top k results
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            
            for idx in top_indices:
                results.append({
                    "file_id": file_id,
                    "chunk": data['chunks'][idx],
                    "score": float(similarities[idx])
                })
                
        except Exception as e:
            logger.error(f"Error searching file {file_id}: {e}")
    
    # Sort and return top results
    return sorted(results, key=lambda x: x["score"], reverse=True)[:top_k]

def delete_collection(file_id: str) -> bool:
    """Delete embeddings for a specific file_id."""
    try:
        file_path = EMBEDDINGS_FOLDER / f"{file_id}.json"
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Successfully deleted embeddings for file {file_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error deleting file {file_id}: {e}")
        return False 