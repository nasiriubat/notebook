import os
from typing import List, Dict, Optional
from app import app

# Import the appropriate modules based on RAG_TYPE
rag_type = app.config["RAG_TYPE"].lower()

# RAG Improvements:
# The ChromaDB implementation provides several enhancements for better RAG performance:
# 1. Semantic chunking: Splits text at natural boundaries like paragraphs and sentences
# 2. Embedding caching: Reduces API calls for repeated embeddings
# 3. Query preprocessing: Removes unnecessary terms to focus on important content
# 4. Better chunk merging: Combines adjacent chunks for more context
# 5. Smarter text cleaning: Preserves important formatting while removing noise
# 6. Similarity thresholds: Only returns high-quality matches

# Import the respective modules
if rag_type == 'faiss':
    from app.utils.faiss_utils import (
        generate_and_store_embeddings as faiss_generate_and_store_embeddings,
        search_across_indices as faiss_search_across_indices
    )
    # FAISS doesn't have a direct delete function, so we'll need to handle it ourselves
    from pathlib import Path
    EMBEDDINGS_FOLDER = Path("dataembedding")
elif rag_type == 'vector':
    from app.utils.chroma_embed import (
        generate_and_store_embeddings as chroma_generate_and_store_embeddings,
        search_across_indices as chroma_search_across_indices,
        delete_collection
    )
elif rag_type == 'simple':
    from app.utils.simple_vector_store import (
        generate_and_store_embeddings as simple_generate_and_store_embeddings,
        search_across_indices as simple_search_across_indices,
        delete_collection
    )
else:
    raise ValueError(f"Invalid RAG_TYPE: {rag_type}. Must be 'faiss', 'vector', or 'simple'")

def generate_and_store_embeddings(text: str) -> Optional[str]:
    """Wrapper for generating and storing embeddings."""
    if rag_type == 'faiss':
        return faiss_generate_and_store_embeddings(text)
    elif rag_type == 'vector':
        return chroma_generate_and_store_embeddings(text)
    else:  # simple
        return simple_generate_and_store_embeddings(text)

def search_across_indices(query: str, file_ids: List[str], top_k: int = 5) -> List[Dict]:
    """Wrapper for searching across indices."""
    if rag_type == 'faiss':
        return faiss_search_across_indices(query, file_ids, top_k)
    elif rag_type == 'vector':
        return chroma_search_across_indices(query, file_ids, top_k)
    else:  # simple
        return simple_search_across_indices(query, file_ids, top_k)

def delete_embeddings(file_id: str) -> bool:
    """Delete embeddings for a specific file_id."""
    if rag_type == 'faiss':
        # For FAISS, manually delete the files
        try:
            # Delete index file
            index_file = EMBEDDINGS_FOLDER / f"{file_id}_index.faiss"
            if index_file.exists():
                index_file.unlink()
            
            # Delete chunks file
            chunks_file = EMBEDDINGS_FOLDER / f"{file_id}_chunks.npy"
            if chunks_file.exists():
                chunks_file.unlink()
            
            # Delete embeddings file
            embeddings_file = EMBEDDINGS_FOLDER / f"{file_id}_embeddings.npy"
            if embeddings_file.exists():
                embeddings_file.unlink()
            
            return True
        except Exception as e:
            print(f"Error deleting FAISS files for {file_id}: {e}")
            return False
    else:  # vector or simple
        return delete_collection(file_id) 