import os
import pytesseract
import requests
from openai import OpenAI
import docx
import fitz  # PyMuPDF
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
from PIL import Image
from urllib.parse import urlparse
from app import app

# Set OpenAI API Key (if using AI-based text processing)
client = OpenAI(api_key=app.config["OPENAI_API_KEY"])


# get embedding from openai text-ada model
def get_embedding(text):
    # return text
    response = client.embeddings.create(input=text, model="text-embedding-3-small")
    return response.data[0].embedding


# Function to extract text from PDF
def extract_text_from_pdf(pdf_path):
    try:
        text = ""
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text += page.get_text("text") + "\n"
        return text.strip()
    except Exception as e:
        return f"Error extracting text from PDF: {e}"


# Function to extract text from TXT file
def extract_text_from_txt(txt_path):
    try:
        with open(txt_path, "r", encoding="utf-8") as file:
            return file.read().strip()
    except Exception as e:
        return f"Error reading TXT file: {e}"


# Function to extract text from DOCX file
def extract_text_from_docx(docx_path):
    try:
        doc = docx.Document(docx_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text.strip()
    except Exception as e:
        return f"Error extracting text from DOCX file: {e}"


# Function to extract text from an image (OCR)
def extract_text_from_image(image_path):
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        return text.strip() if text else "No text found in image."
    except Exception as e:
        return f"Error extracting text from image: {e}"


# Function to extract text from a web page
def extract_text_from_webpage(url):
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            text = " ".join([p.text for p in soup.find_all("p")])
            return text.strip() if text else "No text content found."
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
        return text.strip() if text else "No subtitles available."
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
        text = input_value

    # return and array with two key text and embedding
    return {"text": text, "embedding": get_embedding(text),"file_extension":file_extension}
