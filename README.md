# 🎓 AI Study Buddy

An AI-powered study assistant that helps students learn more effectively using Retrieval-Augmented Generation (RAG). Upload your study materials and get instant answers, quizzes, flashcards, and summaries!

![AI Study Buddy](https://img.shields.io/badge/AI-Study%20Buddy-blue)
![Python](https://img.shields.io/badge/python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green.svg)
![React](https://img.shields.io/badge/React-18.2-61dafb.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## ✨ Features

- 📄 **Document Upload** - Upload PDFs and text files to create your knowledge base
- 💬 **Smart Q&A** - Ask questions and get instant, context-aware answers from your materials
- 📝 **Quiz Generation** - Auto-generate multiple-choice quizzes with customizable difficulty
- 🎴 **Flashcard Creation** - Generate flashcards for effective memorization
- 📊 **Smart Summaries** - Get comprehensive summaries of your study materials
- 🧒 **ELI5 Explanations** - Complex concepts explained in simple terms
- 🗂️ **Outline Generation** - Automatic hierarchical outlines of your documents
- 📈 **Progress Tracking** - Monitor your study progress and activity

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Pinecone** - Vector database for semantic search
- **Groq** - Ultra-fast LLM inference (Llama 3.3 70B)
- **PyMuPDF** - PDF text extraction

### Frontend
- **React.js** - UI framework
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

### AI/ML
- **RAG Architecture** - Retrieval-Augmented Generation
- **Llama Text Embeddings** - Semantic search
- **Llama 3.3 70B** - Answer generation

---

## 📋 Prerequisites

- Python 3.10 or higher
- Node.js 16 or higher
- Pinecone account ([Sign up](https://www.pinecone.io/))
- Groq API key ([Get one](https://console.groq.com/))

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/sunandha-xo/ai-study-buddy.git
cd ai-study-buddy
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Edit `.env` with your API keys:

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name
GROQ_API_KEY=your_groq_api_key
```

### 3. Frontend Setup

```bash
# Navigate to frontend
cd ../frontend

# Install dependencies
npm install
```

### 4. Set Up Pinecone Index

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create a new index:
   - **Name**: `study-buddy` (or your choice)
   - **Dimensions**: `1024`
   - **Metric**: `cosine`
   - **Cloud**: `AWS` or `GCP`
   - **Region**: Choose nearest to you

---

## 🏃 Running the Application

### Start Backend

```bash
cd backend
python main.py
```

Backend will run on `http://localhost:8000`

### Start Frontend

In a new terminal:

```bash
cd frontend
npm start
```

Frontend will run on `http://localhost:3000`

---

## 📖 Usage

### 1. Upload Documents

- Click **"Upload"** tab
- Select PDF or TXT files
- Wait for processing (5-30 seconds depending on file size)

### 2. Ask Questions

- Go to **"Q&A"** tab
- Type your question
- Get instant answers from your uploaded materials

### 3. Generate Quizzes

- Navigate to **"Quiz"** tab
- Select number of questions and difficulty
- Practice with auto-generated quizzes

### 4. Create Flashcards

- Go to **"Cards"** tab
- Generate flashcards from your documents
- Review key concepts

### 5. Get Summaries

- Click **"Summary"** tab
- View comprehensive summaries of your materials

---

## 📁 Project Structure

```
ai-study-buddy/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── .env.example         # Environment variables template
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   └── App.js          # Main app component
│   ├── public/
│   └── package.json        # Node dependencies
├── .gitignore
└── README.md
```

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upload` | POST | Upload and process documents |
| `/ask` | POST | Ask questions about documents |
| `/generate-quiz` | POST | Generate practice quizzes |
| `/generate-flashcards` | GET | Create flashcards |
| `/generate-summary` | GET | Get document summaries |
| `/explain-eli5` | POST | Get simple explanations |
| `/generate-outline` | GET | Create document outlines |
| `/progress` | GET | View study progress |

### Example API Call

```bash
# Upload a document
curl -X POST "http://localhost:8000/upload" \
  -F "file=@textbook.pdf"

# Ask a question
curl -X POST "http://localhost:8000/ask" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is machine learning?"}'
```

---

## 🎯 How It Works

### RAG Pipeline

```
1. Document Upload → Text Extraction → Chunking
                                         ↓
2. Chunk Embeddings ← Pinecone Inference API
                                         ↓
3. Store Vectors → Pinecone Vector DB
                                         ↓
4. User Question → Question Embedding
                                         ↓
5. Semantic Search → Retrieve Relevant Chunks
                                         ↓
6. Context + Question → Groq LLM → Answer
```

### Key Components

**Embeddings**: Convert text to 1024-dimensional vectors using `llama-text-embed-v2`

**Vector Search**: Find semantically similar content using cosine similarity

**LLM Generation**: Generate natural language responses using Llama 3.3 70B

---

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check Python version
python --version  # Should be 3.10+

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### API key errors

- Verify keys in `.env` file
- Check Pinecone index name matches
- Ensure API keys are active

### Upload fails

- Check file size (max 50MB recommended)
- Ensure PDF is text-based, not scanned
- Try uploading smaller files first

### Slow processing

- Large files (10+ pages) take 30-60 seconds
- This is normal for embedding generation
- Check console logs for progress

---

## 🚧 Known Limitations

- Maximum file size: 50MB (configurable)
- PDF processing works best with text-based PDFs
- Scanned documents need OCR (not yet implemented)
- Memory usage increases with large documents

---

## 🗺️ Roadmap

### Upcoming Features

- [ ] Support for DOCX, PPTX files
- [ ] OCR for scanned documents
- [ ] Multi-document search
- [ ] User authentication
- [ ] Study analytics dashboard
- [ ] Mobile app
- [ ] Spaced repetition system
- [ ] Collaborative study groups

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Pinecone](https://www.pinecone.io/) - Vector database
- [Groq](https://groq.com/) - Fast LLM inference
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [React](https://react.dev/) - Frontend framework

---

## ⭐ Star This Repo!

If you find this project helpful, please give it a star! ⭐

---

<div align="center">

**Built with ❤️ for students everywhere**

[Report Bug](https://github.com/sunandha-xo/ai-study-buddy/issues) • [Request Feature](https://github.com/sunandha-xo/ai-study-buddy/issues)

</div>