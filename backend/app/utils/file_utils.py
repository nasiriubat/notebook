import os
import requests
from openai import OpenAI
import docx
import pdfplumber
import easyocr
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
from PIL import Image
from urllib.parse import urlparse
from app import app
import re

# Set OpenAI API Key (if using AI-based text processing)
client = OpenAI(api_key=app.config["OPENAI_API_KEY"])

# Initialize EasyOCR reader
reader = easyocr.Reader(['en'])

def normalize_text(text):
    """Normalize text by removing extra whitespace, normalizing line breaks, and cleaning up special characters."""
    if not text:
        return ""
    
    # Replace multiple spaces with a single space
    text = re.sub(r'\s+', ' ', text)
    
    # Normalize line breaks (convert different types of line breaks to \n)
    text = re.sub(r'\r\n|\r', '\n', text)
    
    # Remove multiple consecutive line breaks
    text = re.sub(r'\n\s*\n', '\n\n', text)
    
    # Clean up special characters but keep basic punctuation
    text = re.sub(r'[^\w\s.,!?-]', '', text)
    
    # Remove leading/trailing whitespace
    text = text.strip()
    
    return text

# get embedding from openai text-ada model
def get_embedding(text):
    # return text
    response = client.embeddings.create(input=text, model="text-embedding-3-small")
    return response.data[0].embedding


# Function to extract text from PDF
def extract_text_from_pdf(pdf_path):
    try:
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        return normalize_text(text)
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        return f"Error extracting text from PDF: {str(e)}"


# Function to extract text from TXT file
def extract_text_from_txt(txt_path):
    try:
        with open(txt_path, "r", encoding="utf-8") as file:
            text = file.read()
            return normalize_text(text)
    except Exception as e:
        return f"Error reading TXT file: {e}"


# Function to extract text from DOCX file
def extract_text_from_docx(docx_path):
    try:
        doc = docx.Document(docx_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        return normalize_text(text)
    except Exception as e:
        return f"Error extracting text from DOCX file: {e}"


# Function to extract text from an image (OCR)
def extract_text_from_image(image_path):
    try:
        # Read the image
        result = reader.readtext(image_path)
        # Extract text from the result
        text = "\n".join([item[1] for item in result])
        return normalize_text(text) if text else "No text found in image."
    except Exception as e:
        print(f"Error extracting text from image: {str(e)}")
        return f"Error extracting text from image: {str(e)}"


# Function to extract text from a web page
def extract_text_from_webpage(url):
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            text = " ".join([p.text for p in soup.find_all("p")])
            return normalize_text(text) if text else "No text content found."
        else:
            return f"Error fetching webpage: {response.status_code}"
    except Exception as e:
        return f"Error extracting text from webpage: {e}"


# Function to extract subtitles from a YouTube video
def extract_text_from_youtube(youtube_url):
    try:
        video_id = urlparse(youtube_url).query.split("v=")[-1]
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        text = "\n".join([entry["text"] for entry in transcript])
        return normalize_text(text) if text else "No subtitles available."
    except Exception as e:
        return f"Error extracting subtitles from YouTube: {e}"


# Function to process input based on type
def process_input(input_value):
    text = ""
    file_extension = "plainText"
    if os.path.isfile(input_value):
        file_extension = os.path.splitext(input_value)[1].lower()
        if file_extension == ".pdf":
            text = extract_text_from_pdf(input_value)
        elif file_extension == ".txt":
            text = extract_text_from_txt(input_value)
        elif file_extension == ".docx":
            text = extract_text_from_docx(input_value)
        elif file_extension in [".jpg", ".jpeg", ".png"]:
            text = extract_text_from_image(input_value)
        else:
            return "Unsupported file format."

    elif input_value.startswith("http"):  # If input is a URL
        if "youtube.com" in input_value or "youtu.be" in input_value:
            text = extract_text_from_youtube(input_value)
        else:
            text = extract_text_from_webpage(input_value)

    else:  # Plain text input
        text = normalize_text(input_value)

    # return and array with two key text and embedding
    return {"text": text, "embedding": get_embedding(text), "file_extension": file_extension}
