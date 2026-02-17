from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from pinecone import Pinecone
from groq import Groq
import PyPDF2
from io import BytesIO
from datetime import datetime
from typing import List
# Load environment variables
load_dotenv()
# Initialize FastAPI
app = FastAPI()
# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = os.getenv("PINECONE_INDEX_NAME")
index = pc.Index(index_name)
# Initialize Groq
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
# In-memory storage for progress tracking
progress_data = {
    "questions_asked": 0,
    "documents_uploaded": 0,
    "quizzes_taken": 0,
    "total_study_time": 0,
    "topics_covered": set(),
    "uploaded_files": []
}
# Request models
class QuestionRequest(BaseModel):
    question: str
class QuizRequest(BaseModel):
    num_questions: int = 5
    difficulty: str = "medium"
# Helper functions
def extract_text_from_pdf(file_bytes):
    """Extract text from PDF file"""
    pdf_reader = PyPDF2.PdfReader(BytesIO(file_bytes))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text
def chunk_text(text, chunk_size=500, overlap=50):
    """Split text into chunks with overlap"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
    return chunks
def get_embeddings_from_pinecone(texts):
    """Use Pinecone's inference API to generate embeddings"""
    embeddings = pc.inference.embed(
        model="llama-text-embed-v2",
        inputs=texts,
        parameters={"input_type": "passage"}
    )
    return [e['values'] for e in embeddings]
# Routes
@app.get("/")
async def root():
    return {"message": "AI Study Buddy API is running with all features!"}
@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document"""
    try:
        # Read file
        contents = await file.read()
        
        # Extract text
        if file.filename.endswith('.pdf'):
            text = extract_text_from_pdf(contents)
        elif file.filename.endswith('.txt'):
            text = contents.decode('utf-8')
        else:
            raise HTTPException(status_code=400, detail="Only PDF and TXT files supported")
        
        # Chunk text
        chunks = chunk_text(text)
        
        # Generate embeddings using Pinecone's inference API
        embeddings = get_embeddings_from_pinecone(chunks)
        
        # Store in Pinecone
        vectors = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            vectors.append({
                "id": f"{file.filename}_{i}",
                "values": embedding,
                "metadata": {
                    "text": chunk,
                    "filename": file.filename,
                    "chunk_index": i
                }
            })
        
        # Upsert to Pinecone
        index.upsert(vectors=vectors)
        
        # Update progress
        progress_data["documents_uploaded"] += 1
        progress_data["uploaded_files"].append({
            "filename": file.filename,
            "upload_time": datetime.now().isoformat(),
            "chunks": len(chunks)
        })
        
        return {
            "message": "Document uploaded successfully",
            "filename": file.filename,
            "chunks": len(chunks)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/ask")
async def ask_question(request: QuestionRequest):
    """Ask a question about uploaded documents"""
    try:
        # Generate embedding for question
        question_embedding = get_embeddings_from_pinecone([request.question])[0]
        
        # Query Pinecone
        results = index.query(
            vector=question_embedding,
            top_k=3,
            include_metadata=True
        )
        
        # Extract relevant text chunks
        context = "\n\n".join([match['metadata']['text'] for match in results['matches']])
        
        # Generate answer using Groq
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": f"""Based on the following context from the study materials, answer this question:
Context:
{context}
Question: {request.question}
Please provide a clear, concise answer based only on the information in the context."""
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=1000,
        )
        
        answer = chat_completion.choices[0].message.content
        
        # Update progress
        progress_data["questions_asked"] += 1
        
        return {
            "question": request.question,
            "answer": answer,
            "sources": [match['metadata']['filename'] for match in results['matches']]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
    """Generate a quiz from uploaded documents"""
    try:
        # Query Pinecone to get random chunks
        dummy_embedding = [0.1] * 1024
        results = index.query(
            vector=dummy_embedding,
            top_k=10,
            include_metadata=True
        )
        
        # Extract text from results
        context = "\n\n".join([match['metadata']['text'] for match in results['matches'][:5]])
        
        # Generate quiz using Groq
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": f"""Based on the following study material, create {request.num_questions} multiple-choice questions.
Study Material:
{context}
Format each question EXACTLY like this:
Q1: [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct Answer: [A/B/C/D]
Explanation: [Brief explanation]
Make the questions {request.difficulty} difficulty level."""
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2000,
        )
        
        quiz_text = chat_completion.choices[0].message.content
        
        # Update progress
        progress_data["quizzes_taken"] += 1
        
        return {
            "quiz": quiz_text,
            "num_questions": request.num_questions,
            "difficulty": request.difficulty
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/generate-summary")
async def generate_summary():
    """Generate a summary of uploaded documents"""
    try:
        # Query Pinecone to get document chunks
        dummy_embedding = [0.1] * 1024
        results = index.query(
            vector=dummy_embedding,
            top_k=15,
            include_metadata=True
        )
        
        if not results['matches']:
            raise HTTPException(status_code=400, detail="No documents uploaded yet")
        
        # Extract text from results
        context = "\n\n".join([match['metadata']['text'] for match in results['matches'][:10]])
        
        # Generate summary using Groq
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": f"""Create a comprehensive summary of the following study material. Include:
1. Main topics covered
2. Key concepts and definitions
3. Important points to remember
Study Material:
{context}
Format the summary with clear headings and bullet points."""
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=1500,
        )
        
        summary = chat_completion.choices[0].message.content
        
        return {
            "summary": summary,
            "sources": list(set([match['metadata']['filename'] for match in results['matches']]))
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/progress")
async def get_progress():
    """Get study progress statistics"""
    return {
        "questions_asked": progress_data["questions_asked"],
        "documents_uploaded": progress_data["documents_uploaded"],
        "quizzes_taken": progress_data["quizzes_taken"],
        "uploaded_files": progress_data["uploaded_files"]
    }
@app.get("/generate-flashcards")
async def generate_flashcards():
    """Generate flashcards from uploaded documents"""
    try:
        # Query Pinecone to get document chunks
        dummy_embedding = [0.1] * 1024
        results = index.query(
            vector=dummy_embedding,
            top_k=10,
            include_metadata=True
        )
        
        if not results['matches']:
            raise HTTPException(status_code=400, detail="No documents uploaded yet")
        
        # Extract text from results
        context = "\n\n".join([match['metadata']['text'] for match in results['matches'][:8]])
        
        # Generate flashcards using Groq
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": f"""Based on the following study material, create 10 flashcards for memorization.
Study Material:
{context}
Format EXACTLY like this for each flashcard:
FRONT: [Question or term]
BACK: [Answer or definition]
---
Make the flashcards focus on key concepts, definitions, and important facts."""
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2000,
        )
        
        flashcards_text = chat_completion.choices[0].message.content
        
        return {
            "flashcards": flashcards_text,
            "total": 10
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/explain-eli5")
async def explain_eli5(request: QuestionRequest):
    """Explain a concept in simple terms (ELI5 - Explain Like I'm 5)"""
    try:
        # Generate embedding for question
        question_embedding = get_embeddings_from_pinecone([request.question])[0]
        
        # Query Pinecone
        results = index.query(
            vector=question_embedding,
            top_k=3,
            include_metadata=True
        )
        
        # Extract relevant text chunks
        context = "\n\n".join([match['metadata']['text'] for match in results['matches']])
        
        # Generate ELI5 explanation using Groq
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": f"""Based on the following context, explain this concept as if you're talking to a 5-year-old child. Use simple words, analogies, and examples that a child would understand.
Context:
{context}
Concept to explain: {request.question}
Rules:
1. Use very simple language
2. Include a fun analogy or comparison
3. Keep it short and engaging
4. Avoid technical jargon"""
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=500,
        )
        
        explanation = chat_completion.choices[0].message.content
        
        return {
            "question": request.question,
            "explanation": explanation,
            "sources": [match['metadata']['filename'] for match in results['matches']]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/generate-outline")
async def generate_outline():
    """Generate a smart outline of the document"""
    try:
        # Query Pinecone to get document chunks
        dummy_embedding = [0.1] * 1024
        results = index.query(
            vector=dummy_embedding,
            top_k=15,
            include_metadata=True
        )
        
        if not results['matches']:
            raise HTTPException(status_code=400, detail="No documents uploaded yet")
        
        # Extract text from results
        context = "\n\n".join([match['metadata']['text'] for match in results['matches'][:12]])
        
        # Generate outline using Groq
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": f"""Create a hierarchical outline of the following study material. Organize it with main topics, subtopics, and key points.
Study Material:
{context}
Format the outline like this:
I. Main Topic
   A. Subtopic
      1. Key point
      2. Key point
   B. Subtopic
II. Main Topic
   A. Subtopic
Make it clear, organized, and easy to scan."""
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=1500,
        )
        
        outline = chat_completion.choices[0].message.content
        
        return {
            "outline": outline,
            "sources": list(set([match['metadata']['filename'] for match in results['matches']]))
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

