from openai import OpenAI
from app import app
from typing import List, Dict

# System prompts for different use cases
SYSTEM_PROMPTS = {
    "summarizer": "You are a summarizer that summarizes given text with important keywords.",
    "assistant": "You are a helpful assistant that answers questions based on the provided context. Start directly with the answer."
}

def openai_generate(prompt: str, is_regenerate: bool = False, summary: bool = False) -> str:
    """Generate text using OpenAI's GPT model."""
    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPTS["summarizer" if summary else "assistant"]
        },
        {"role": "user", "content": prompt},
    ]
    client = OpenAI(api_key=app.config["OPENAI_API_KEY"])
    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        temperature=0.8 if is_regenerate else 0.7,
        max_tokens=1000,
    )
    return response.choices[0].message.content

def get_conversation_with_chunks(query: str, chunks: List[Dict], language: str = "en") -> str:
    """Generate a response using relevant chunks of text."""
    context = "\n\n".join([f"Content from {chunk.get('source', 'Unknown')}:\n{chunk.get('text', '')}" 
                          for chunk in chunks])
    prompt = f"Context: {context}\n\nQuestion: {query}\n\nPlease respond in {language} language."
    return openai_generate(prompt)
