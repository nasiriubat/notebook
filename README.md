# GPT Lab Notebook


A powerful AI-powered notebook application that allows you to interact with your documents, text, and web sources through natural language conversations.

## 🌟 Features

### 📚 Document Management
- Create and manage multiple notebooks
- Upload various file types (PDF, TXT, JPG, JPEG, PNG)
- Support for web links and YouTube videos
- Drag and drop file upload interface
- File size limit of 10MB per upload

### 💬 Interactive Chat
- Natural language conversations with your sources
- Real-time AI responses
- Support for multiple languages (English and Finnish)
- Message history management
- Copy, regenerate, and add responses as new sources

### 🔍 Source Management
- Multiple source types:
  - File uploads
  - Text input
  - Web links
  - YouTube links
- Source organization and categorization
- Edit source titles
- Copy source content
- Delete sources

### 🌐 User Interface
- Responsive design for all devices
- Dark/Light mode support
- Mobile-friendly interface
- Intuitive navigation
- Real-time character count for text inputs

### 🔒 Security
- User authentication
- Secure password management
- Protected API endpoints
- Session management

## 🛠️ Tech Stack

### Frontend
- React.js
- Bootstrap 5
- React Icons
- Axios for API calls

### Backend
- Python
- FastAPI
- SQLAlchemy
- JWT Authentication

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- PostgreSQL

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory:
   ```
   REACT_APP_API_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm start
   ```

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```bash
     .\venv\Scripts\activate
     ```
   - Unix/MacOS:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create a `.env` file in the backend directory:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/gpt_lab
   JWT_SECRET=your_jwt_secret
   ```

6. Run database migrations:
   ```bash
   alembic upgrade head
   ```

7. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

## 💻 Usage

1. Register a new account or login to your existing account
2. Create a new notebook
3. Add sources to your notebook:
   - Upload files
   - Enter text
   - Add web links
   - Add YouTube links
4. Select sources to chat with
5. Start a conversation with your sources
6. Use the chat interface to:
   - Ask questions
   - Get AI-generated responses
   - Copy responses
   - Add responses as new sources
   - Regenerate responses

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/change-password` - Change password

### Notebooks
- `GET /api/notebooks` - Get all notebooks
- `POST /api/notebooks` - Create new notebook
- `PUT /api/notebooks/{id}` - Update notebook
- `DELETE /api/notebooks/{id}` - Delete notebook

### Sources
- `GET /api/sources` - Get all sources
- `POST /api/sources` - Upload new source
- `PUT /api/sources/{id}` - Update source
- `DELETE /api/sources/{id}` - Delete source

### Chat
- `POST /api/chat` - Send chat message
- `GET /api/chat/{notebook_id}` - Get chat history
- `DELETE /api/chat/{notebook_id}` - Clear chat history

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT models
- React.js community
- FastAPI framework
- Bootstrap team

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Vector Database Options

The application supports three different vector storage options for the RAG (Retrieval Augmented Generation) system:

### FAISS (Default)

FAISS is an efficient similarity search library developed by Facebook AI Research. It's fast and efficient for in-memory vector searches.

### ChromaDB

ChromaDB is a vector database that provides more advanced features like metadata filtering, persistence, and cloud deployment options.

Our ChromaDB implementation includes several advanced RAG features:

- **Semantic Chunking**: Intelligently splits documents at natural boundaries like paragraphs and sentences
- **Embedding Caching**: Reduces API costs by caching embeddings for reuse
- **Smart Query Processing**: Removes unnecessary words from queries to focus on key terms
- **Chunk Merging**: Combines adjacent chunks in search results for better context
- **Enhanced Text Cleaning**: Preserves important formatting while removing noise
- **Quality Thresholds**: Only returns high-quality matches above a similarity threshold

### Simple Vector Store

A lightweight alternative using sentence-transformers and numpy for vector similarity search. This option:
- Requires no compilation or complex dependencies
- Uses the efficient all-MiniLM-L6-v2 model for embeddings
- Provides good performance for smaller datasets
- Stores embeddings in simple JSON files
- Includes basic text preprocessing and chunking

### Switching Between Vector Stores

You can easily switch between FAISS, ChromaDB, and the Simple Vector Store by changing the `RAG_TYPE` environment variable in your backend `.env` file:

```
# For FAISS
RAG_TYPE=faiss

# For ChromaDB (with advanced RAG features)
RAG_TYPE=vector

# For Simple Vector Store (no compilation required)
RAG_TYPE=simple
```

The application will automatically use the specified vector store for all embedding storage and search operations. This allows you to:

1. Start with the Simple Vector Store for easy setup and testing
2. Switch to FAISS for better performance with larger datasets
3. Use ChromaDB for more complex scenarios or production environments
4. Test different systems to compare performance and results

Note: When switching between vector stores, previously stored embeddings won't be transferred automatically. You'll need to recreate your sources in the new system.
