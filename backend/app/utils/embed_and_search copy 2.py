import os
# Set OpenMP environment variable to handle multiple runtime libraries
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import openai
import numpy as np
import uuid
from app import app, db
from pathlib import Path
from typing import List, Dict, Optional
from tqdm import tqdm
import tiktoken
import json
from sentence_transformers import SentenceTransformer
import faiss  # NEW: for fast similarity search
import re
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load OpenAI API key from .env file
openai.api_key = app.config["OPENAI_API_KEY"]

# Initialize storage paths
EMBEDDINGS_FOLDER = Path("dataembedding")
EMBEDDINGS_FOLDER.mkdir(parents=True, exist_ok=True)

# Initialize the sentence transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Initialize tiktoken
encoding = tiktoken.encoding_for_model("text-embedding-ada-002")
MAX_TOKENS = 500
OVERLAP = 100
MIN_SCORE_THRESHOLD = 0.3


def split_into_chunks(text: str, max_tokens: int = MAX_TOKENS, overlap: int = OVERLAP) -> List[str]:
    tokens = encoding.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        chunk = encoding.decode(tokens[start:end])
        chunks.append(chunk)
        start += max_tokens - overlap
    return chunks


def create_embedding(texts: List[str]) -> Optional[np.ndarray]:
    try:
        embeddings = model.encode(texts, convert_to_numpy=True, batch_size=32)
        return embeddings.astype(np.float32)
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        return None


def calculate_relevance_score(chunk: str, query: str, base_score: float) -> float:
    chunk_lower = chunk.lower()
    query_lower = query.lower()

    query_words = set(re.findall(r'\w+', query_lower))
    common_words = {'what', 'does', 'do', 'is', 'are', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
    query_words = query_words - common_words

    if not query_words:
        return base_score

    matches = sum(1 for word in query_words if word in chunk_lower)
    word_match_ratio = matches / len(query_words)
    exact_phrase_match = query_lower in chunk_lower
    phrase_bonus = 0.2 if exact_phrase_match else 0
    semantic_bonus = 0.1 if base_score > 0.5 else 0
    final_score = (0.4 * base_score) + (0.3 * word_match_ratio) + phrase_bonus + semantic_bonus

    return final_score


def generate_and_store_embeddings(text: str) -> Optional[str]:
    file_id = str(uuid.uuid4())
    chunks = split_into_chunks(text)

    if not chunks:
        logger.warning("No valid chunks created from input text")
        return None

    embeddings = create_embedding(chunks)
    if embeddings is None:
        logger.warning("No embeddings generated")
        return None

    try:
        embeddings_file = EMBEDDINGS_FOLDER / f"{file_id}.npz"
        np.savez_compressed(embeddings_file, embeddings=embeddings, chunks=chunks)
        logger.info(f"Saved embeddings and chunks for file_id: {file_id}")
        return file_id
    except Exception as e:
        logger.error(f"Error storing embeddings: {e}")
        return None


def load_embeddings_and_chunks(file_id: str) -> tuple[Optional[np.ndarray], Optional[List[str]]]:
    try:
        embeddings_file = EMBEDDINGS_FOLDER / f"{file_id}.npz"
        data = np.load(embeddings_file, allow_pickle=True)
        embeddings = data["embeddings"]
        chunks = data["chunks"].tolist()
        return embeddings, chunks
    except Exception as e:
        logger.error(f"Error loading data for file_id {file_id}: {e}")
        return None, None


def search_across_indices(query: str, file_ids: List[str], top_k: int = 5) -> List[Dict]:
    try:
        query_embedding = create_embedding([query])
        if query_embedding is None:
            return []

        all_results = []
        for file_id in file_ids:
            embeddings, chunks = load_embeddings_and_chunks(file_id)
            if embeddings is None or chunks is None:
                continue

            index = faiss.IndexFlatIP(embeddings.shape[1])
            faiss.normalize_L2(embeddings)
            index.add(embeddings)

            faiss.normalize_L2(query_embedding)
            D, I = index.search(query_embedding, top_k)

            for score, idx in zip(D[0], I[0]):
                base_score = float(score)
                chunk = chunks[idx]
                relevance_score = calculate_relevance_score(chunk, query, base_score)
                if relevance_score >= MIN_SCORE_THRESHOLD:
                    all_results.append({
                        "file_id": file_id,
                        "chunk": chunk,
                        "distance": 1 - base_score,
                        "score": relevance_score
                    })

        all_results.sort(key=lambda x: x["score"], reverse=True)
        return all_results[:top_k]
    except Exception as e:
        logger.error(f"Error in search: {e}")
        return []
