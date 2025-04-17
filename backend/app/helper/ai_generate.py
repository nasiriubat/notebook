from openai import OpenAI
from app import app
import requests
import json


def generate_summary(text, token_limit=False):
    """Generate a summary of the text using OpenAI."""
    prompt = f"Please provide a concise summary keeping immportant keywords {'within 7500 tokens' if token_limit else ''} of the following text:\n\n{text}"
    try:
        summary = openai_generate(prompt, False, summary=True)
        return summary
    except Exception as e:
        print(f"Error generating summary: {str(e)}")
        return text[:500] + "..."  # Fallback to first 500 characters if summary fails

def openai_generate(prompt, is_regenerate=False, summary=False):
    messages = [
        {
            "role": "system",
            "content": (
                "You are a summarizer that summarizes given text keeping important keywords."
                if summary
                else "You are a helpful assistant that answers questions based on the provided context. Start directly with the answer."
            ),
        },
        {"role": "user", "content": prompt},
    ]
    client = OpenAI(api_key=app.config["OPENAI_API_KEY"])
    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        temperature=(
            0.8 if is_regenerate else 0.7
        ),  # Slightly higher temperature for regeneration
        max_tokens=1000,
    )
    return response.choices[0].message.content


def ollama32_generate(prompt, is_regenerate=False):
    try:
        # Prepare the request payload
        payload = {
            "model": "llama3.2",  # Updated model name
            "prompt": prompt,
        }

        # Make a POST request to the Ollama server
        response = requests.post(
            "http://86.50.169.115:11434/api/generate",
            json=payload,
            timeout=20,
            stream=True,  # Enable streaming response
        )

        # Check if the response is successful
        if response.status_code == 200:
            full_response = ""
            buffer = ""

            # Stream and parse the response content
            for chunk in response.iter_lines():
                if chunk:
                    buffer += chunk.decode("utf-8")

                    try:
                        # Attempt to parse valid JSON
                        json_data = json.loads(buffer)
                        # Append the 'response' part to the full response
                        full_response += json_data.get("response", "")
                        # Clear the buffer after successful parsing
                        buffer = ""
                    except json.JSONDecodeError:
                        # If we can't parse the JSON yet, wait for the next chunk
                        continue

            return full_response if full_response else "No response received."
        else:
            return f"Error: Received status code {response.status_code} from the server. Response: {response.text}"
    except requests.exceptions.Timeout:
        return "The request timed out. The server is taking too long to respond."
    except requests.exceptions.RequestException as e:
        return f"An error occurred while generating the answer: {e}"
