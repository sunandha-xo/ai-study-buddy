const API_URL = 'http://localhost:8000';
let documentsUploaded = false;
let currentQuiz = null;
let userAnswers = {};

// Tab switching
function openTab(event, tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let content of tabContents) {
        content.classList.remove('active');
    }
    
    const tabs = document.getElementsByClassName('tab');
    for (let tab of tabs) {
        tab.classList.remove('active');
    }
    
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
    
    if (tabName === 'progress') {
        loadProgress();
    }
}

// Formatting functions
function formatAnswer(text) {
    let formatted = text;
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    const paragraphs = formatted.split('\n\n');
    formatted = paragraphs.map(para => {
        para = para.trim();
        if (!para) return '';
        
        if (/^\d+\./.test(para)) {
            return `<p style="margin-left: 20px; margin-bottom: 15px;">${para}</p>`;
        }
        
        if (/^[-•]/.test(para)) {
            return `<p style="margin-left: 20px; margin-bottom: 10px;">${para}</p>`;
        }
        
        return `<p style="margin-bottom: 15px;">${para}</p>`;
    }).join('');
    
    return formatted;
}

function parseQuiz(quizText) {
    const questions = [];
    const questionBlocks = quizText.split(/Q\d+:/);
    
    questionBlocks.forEach((block, index) => {
        if (index === 0 || !block.trim()) return;
        
        const lines = block.trim().split('\n').filter(line => line.trim());
        if (lines.length === 0) return;
        
        const question = {
            number: index,
            text: lines[0].trim(),
            options: [],
            correctAnswer: '',
            explanation: ''
        };
        
        let foundCorrect = false;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.match(/^[A-D]\)/)) {
                question.options.push({
                    letter: line.charAt(0),
                    text: line.substring(2).trim()
                });
            } else if (line.toLowerCase().includes('correct answer:')) {
                question.correctAnswer = line.match(/[A-D]/)?.[0] || '';
                foundCorrect = true;
            } else if (line.toLowerCase().includes('explanation:')) {
                question.explanation = line.substring(line.toLowerCase().indexOf('explanation:') + 12).trim();
            } else if (foundCorrect && question.explanation === '') {
                question.explanation += ' ' + line;
            }
        }
        
        if (question.options.length > 0) {
            questions.push(question);
        }
    });
    
    return questions;
}

function renderQuiz(questions) {
    userAnswers = {};
    
    const html = questions.map(q => `
        <div class="quiz-question" id="question-${q.number}">
            <div style="font-weight: 600; color: #667eea; margin-bottom: 15px; font-size: 16px;">
                Question ${q.number}: ${q.text}
            </div>
            <div>
                ${q.options.map(opt => `
                    <div class="quiz-option" onclick="selectAnswer(${q.number}, '${opt.letter}')">
                        <input type="radio" name="q${q.number}" value="${opt.letter}" id="q${q.number}${opt.letter}">
                        <label for="q${q.number}${opt.letter}">
                            <strong>${opt.letter})</strong> ${opt.text}
                        </label>
                    </div>
                `).join('')}
            </div>
            <div id="feedback-${q.number}" class="quiz-feedback"></div>
        </div>
    `).join('');
    
    return html + `
        <button onclick="submitQuiz()" style="margin-top: 20px; width: 100%;">
            Submit Quiz
        </button>
        <div id="quizScore" style="margin-top: 20px;"></div>
    `;
}

function selectAnswer(questionNum, answer) {
    userAnswers[questionNum] = answer;
}

function submitQuiz() {
    if (!currentQuiz) return;
    
    let correct = 0;
    let total = currentQuiz.length;
    
    currentQuiz.forEach(q => {
        const userAnswer = userAnswers[q.number];
        const feedbackDiv = document.getElementById(`feedback-${q.number}`);
        const questionDiv = document.getElementById(`question-${q.number}`);
        
        if (userAnswer === q.correctAnswer) {
            correct++;
            feedbackDiv.innerHTML = `
                <div style="background: #d4edda; color: #155724; padding: 12px; border-radius: 8px; margin-top: 10px;">
                    ✅ Correct! ${q.explanation}
                </div>
            `;
            questionDiv.style.borderLeft = '4px solid #28a745';
        } else {
            feedbackDiv.innerHTML = `
                <div style="background: #f8d7da; color: #721c24; padding: 12px; border-radius: 8px; margin-top: 10px;">
                    ❌ Incorrect. The correct answer is <strong>${q.correctAnswer}</strong>. ${q.explanation}
                </div>
            `;
            questionDiv.style.borderLeft = '4px solid #dc3545';
        }
        
        const options = questionDiv.querySelectorAll('input[type="radio"]');
        options.forEach(opt => opt.disabled = true);
    });
    
    const score = Math.round((correct / total) * 100);
    const scoreDiv = document.getElementById('quizScore');
    scoreDiv.innerHTML = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; text-align: center;">
            <div style="font-size: 48px; font-weight: bold; margin-bottom: 10px;">${score}%</div>
            <div style="font-size: 18px;">You got ${correct} out of ${total} correct!</div>
        </div>
    `;
    
    scoreDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Upload function
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadLoading = document.getElementById('uploadLoading');
    const questionInput = document.getElementById('questionInput');
    const askBtn = document.getElementById('askBtn');
    
    if (!fileInput.files[0]) {
        uploadStatus.className = 'status error';
        uploadStatus.textContent = '❌ Please select a file first!';
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    uploadBtn.disabled = true;
    uploadLoading.style.display = 'block';
    uploadStatus.style.display = 'none';
    
    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            uploadStatus.className = 'status success';
            uploadStatus.textContent = `✅ ${data.message} (${data.chunks} chunks created)`;
            
            documentsUploaded = true;
questionInput.disabled = false;
askBtn.disabled = false;
document.getElementById('eli5Btn').disabled = false;  // ADD THIS LINE
            
            const chatContainer = document.getElementById('chatContainer');
            chatContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <p><strong>${data.filename}</strong> uploaded successfully!</p>
                    <p>Go to Q&A tab to ask questions!</p>
                </div>
            `;
        } else {
            uploadStatus.className = 'status error';
            uploadStatus.textContent = `❌ Error: ${data.detail}`;
        }
    } catch (error) {
        uploadStatus.className = 'status error';
        uploadStatus.textContent = `❌ Error: ${error.message}`;
    } finally {
        uploadBtn.disabled = false;
        uploadLoading.style.display = 'none';
    }
}

// Q&A function
async function askQuestion() {
    const questionInput = document.getElementById('questionInput');
    const askBtn = document.getElementById('askBtn');
    const chatContainer = document.getElementById('chatContainer');
    const askLoading = document.getElementById('askLoading');
    
    const question = questionInput.value.trim();
    
    if (!question) {
        alert('Please enter a question!');
        return;
    }
    
    if (chatContainer.querySelector('.empty-state')) {
        chatContainer.innerHTML = '';
    }
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'message question';
    questionDiv.innerHTML = `<div class="question-text">Q: ${question}</div>`;
    chatContainer.appendChild(questionDiv);
    
    questionInput.value = '';
    askBtn.disabled = true;
    questionInput.disabled = true;
    askLoading.style.display = 'block';
    
    try {
        const response = await fetch(`${API_URL}/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'message answer';
            const formattedAnswer = formatAnswer(data.answer);
            
            // Store the plain text answer for speech
            lastAnswer = data.answer;
            
            answerDiv.innerHTML = `
                <span class="answer-label">Answer:</span>
                <div class="answer-content">${formattedAnswer}</div>
                <div class="sources">
                    <strong>📚 Sources:</strong> ${data.sources.join(', ')}
                </div>
            `;
            chatContainer.appendChild(answerDiv);
            
            // Enable speak button AFTER we have an answer
            document.getElementById('speakBtn').disabled = false;
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message answer';
            errorDiv.style.background = '#ffebee';
            errorDiv.style.borderLeft = '4px solid #dc3545';
            errorDiv.innerHTML = `<span class="answer-label">Error:</span><div class="answer-content">${data.detail}</div>`;
            chatContainer.appendChild(errorDiv);
        }
        
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
        
    } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message answer';
        errorDiv.style.background = '#ffebee';
        errorDiv.style.borderLeft = '4px solid #dc3545';
        errorDiv.innerHTML = `<span class="answer-label">Error:</span><div class="answer-content">${error.message}</div>`;
        chatContainer.appendChild(errorDiv);
    } finally {
        askBtn.disabled = false;
        questionInput.disabled = false;
        askLoading.style.display = 'none';
        questionInput.focus();
    }
}

// Quiz function
async function generateQuiz() {
    const numQuestions = document.getElementById('numQuestions').value;
    const difficulty = document.getElementById('difficulty').value;
    const quizBtn = document.getElementById('quizBtn');
    const quizLoading = document.getElementById('quizLoading');
    const quizResult = document.getElementById('quizResult');
    
    if (!documentsUploaded) {
        alert('Please upload a document first!');
        return;
    }
    
    quizBtn.disabled = true;
    quizLoading.style.display = 'block';
    quizResult.innerHTML = '';
    
    try {
        const response = await fetch(`${API_URL}/generate-quiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                num_questions: parseInt(numQuestions),
                difficulty: difficulty
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentQuiz = parseQuiz(data.quiz);
            
            quizResult.innerHTML = `
                <div class="quiz-container">
                    <h3 style="color: #667eea; margin-bottom: 20px;">
                        📋 Your ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Quiz (${currentQuiz.length} Questions)
                    </h3>
                    ${renderQuiz(currentQuiz)}
                </div>
            `;
        } else {
            quizResult.innerHTML = `
                <div class="status error" style="display: block;">
                    ❌ Error: ${data.detail}
                </div>
            `;
        }
    } catch (error) {
        quizResult.innerHTML = `
            <div class="status error" style="display: block;">
                ❌ Error: ${error.message}
            </div>
        `;
    } finally {
        quizBtn.disabled = false;
        quizLoading.style.display = 'none';
    }
}

// Summary function
async function generateSummary() {
    const summaryBtn = document.getElementById('summaryBtn');
    const summaryLoading = document.getElementById('summaryLoading');
    const summaryResult = document.getElementById('summaryResult');
    
    if (!documentsUploaded) {
        alert('Please upload a document first!');
        return;
    }
    
    summaryBtn.disabled = true;
    summaryLoading.style.display = 'block';
    summaryResult.innerHTML = '';
    
    try {
        const response = await fetch(`${API_URL}/generate-summary`);
        const data = await response.json();
        
        if (response.ok) {
            const formattedSummary = formatAnswer(data.summary);
            summaryResult.innerHTML = `
                <div class="summary-container">
                    <h3 style="color: #667eea; margin-top: 0;">📄 Document Summary</h3>
                    <div style="line-height: 1.9;">${formattedSummary}</div>
                    <div class="sources" style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e0e0e0;">
                        <strong>📚 Sources:</strong> ${data.sources.join(', ')}
                    </div>
                </div>
            `;
        } else {
            summaryResult.innerHTML = `
                <div class="status error" style="display: block;">
                    ❌ Error: ${data.detail}
                </div>
            `;
        }
    } catch (error) {
        summaryResult.innerHTML = `
            <div class="status error" style="display: block;">
                ❌ Error: ${error.message}
            </div>
        `;
    } finally {
        summaryBtn.disabled = false;
        summaryLoading.style.display = 'none';
    }
}

// Progress function
async function loadProgress() {
    try {
        const response = await fetch(`${API_URL}/progress`);
        const data = await response.json();
        
        document.getElementById('statQuestions').textContent = data.questions_asked;
        document.getElementById('statDocs').textContent = data.documents_uploaded;
        document.getElementById('statQuizzes').textContent = data.quizzes_taken;
        
        const fileList = document.getElementById('fileList');
        if (data.uploaded_files.length > 0) {
            fileList.innerHTML = data.uploaded_files.map(file => `
                <div class="file-item">
                    <strong>📄 ${file.filename}</strong>
                    <div style="font-size: 13px; color: #666; margin-top: 5px;">
                        Uploaded: ${new Date(file.upload_time).toLocaleString()} | 
                        ${file.chunks} chunks
                    </div>
                </div>
            `).join('');
        } else {
            fileList.innerHTML = '<p style="color: #999; text-align: center;">No documents uploaded yet</p>';
        }
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// Automation functions
function setupReminders() {
    const email = document.getElementById('emailInput').value;
    const time = document.getElementById('reminderTime').value;
    const status = document.getElementById('automationStatus');
    
    if (!email) {
        status.className = 'status error';
        status.textContent = '❌ Please enter your email!';
        return;
    }
    
    status.className = 'status success';
    status.textContent = `✅ Great! To complete setup, go to relay.app and create a workflow that sends daily emails to ${email} at ${time}. Check the Relay.app documentation for detailed steps!`;
}

function setupQuizSchedule() {
    const day = document.getElementById('quizDay').value;
    const status = document.getElementById('automationStatus');
    
    status.className = 'status success';
    status.textContent = `✅ Perfect! To set up weekly quizzes on ${day}, visit relay.app and create a scheduled workflow. You can use our API endpoint: ${API_URL}/generate-quiz`;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const questionInput = document.getElementById('questionInput');
    if (questionInput) {
        questionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !this.disabled) {
                askQuestion();
            }
        });
    }
});
// Global variable to store last answer for text-to-speech
let lastAnswer = '';

// Flashcards
async function generateFlashcards() {
    const flashcardsBtn = document.getElementById('flashcardsBtn');
    const flashcardsLoading = document.getElementById('flashcardsLoading');
    const flashcardsContainer = document.getElementById('flashcardsContainer');
    
    if (!documentsUploaded) {
        alert('Please upload a document first!');
        return;
    }
    
    flashcardsBtn.disabled = true;
    flashcardsLoading.style.display = 'block';
    flashcardsContainer.innerHTML = '';
    
    try {
        const response = await fetch(`${API_URL}/generate-flashcards`);
        const data = await response.json();
        
        if (response.ok) {
            const flashcardsText = data.flashcards;
            const cards = flashcardsText.split('---').filter(card => card.trim());
            
            let html = '<div class="flashcard-deck">';
            html += `<div class="flashcard-counter">Total Flashcards: ${cards.length}</div>`;
            
            cards.forEach((card, index) => {
                const parts = card.split('BACK:');
                const front = parts[0].replace('FRONT:', '').trim();
                const back = parts[1] ? parts[1].trim() : '';
                
                html += `
                    <div class="flashcard" id="card-${index}" onclick="flipCard(${index})">
                        <div class="flashcard-content">
                            <div class="flashcard-label">FRONT</div>
                            <div id="card-content-${index}">${front}</div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            // Store flashcards data
            window.flashcardsData = cards.map(card => {
                const parts = card.split('BACK:');
                return {
                    front: parts[0].replace('FRONT:', '').trim(),
                    back: parts[1] ? parts[1].trim() : ''
                };
            });
            
            flashcardsContainer.innerHTML = html;
        } else {
            flashcardsContainer.innerHTML = `
                <div class="status error" style="display: block;">
                    ❌ Error: ${data.detail}
                </div>
            `;
        }
    } catch (error) {
        flashcardsContainer.innerHTML = `
            <div class="status error" style="display: block;">
                ❌ Error: ${error.message}
            </div>
        `;
    } finally {
        flashcardsBtn.disabled = false;
        flashcardsLoading.style.display = 'none';
    }
}

function flipCard(index) {
    const card = document.getElementById(`card-${index}`);
    const content = document.getElementById(`card-content-${index}`);
    const cardData = window.flashcardsData[index];
    
    if (card.classList.contains('flipped')) {
        // Show front
        card.classList.remove('flipped');
        content.innerHTML = `<div class="flashcard-label">FRONT</div>${cardData.front}`;
    } else {
        // Show back
        card.classList.add('flipped');
        content.innerHTML = `<div class="flashcard-label">BACK</div>${cardData.back}`;
    }
}

// ELI5 Mode
async function askELI5() {
    const questionInput = document.getElementById('questionInput');
    const eli5Btn = document.getElementById('eli5Btn');
    const chatContainer = document.getElementById('chatContainer');
    const askLoading = document.getElementById('askLoading');
    
    const question = questionInput.value.trim();
    
    if (!question) {
        alert('Please enter a question!');
        return;
    }
    
    if (chatContainer.querySelector('.empty-state')) {
        chatContainer.innerHTML = '';
    }
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'message question';
    questionDiv.innerHTML = `<div class="question-text">🧒 ELI5: ${question}</div>`;
    chatContainer.appendChild(questionDiv);
    
    questionInput.value = '';
    eli5Btn.disabled = true;
    questionInput.disabled = true;
    askLoading.style.display = 'block';
    
    try {
        const response = await fetch(`${API_URL}/explain-eli5`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'message answer';
            answerDiv.style.background = 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)';
            answerDiv.style.borderLeft = '4px solid #ff6b6b';
            
            const formattedAnswer = formatAnswer(data.explanation);
            lastAnswer = data.explanation; // Store for text-to-speech
            
            answerDiv.innerHTML = `
                <span class="answer-label" style="color: #ff6b6b;">🧒 Simple Explanation:</span>
                <div class="answer-content">${formattedAnswer}</div>
                <div class="sources">
                    <strong>📚 Sources:</strong> ${data.sources.join(', ')}
                </div>
            `;
            chatContainer.appendChild(answerDiv);
            
            // Enable speak button
            document.getElementById('speakBtn').disabled = false;
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message answer';
            errorDiv.style.background = '#ffebee';
            errorDiv.style.borderLeft = '4px solid #dc3545';
            errorDiv.innerHTML = `<span class="answer-label">Error:</span><div class="answer-content">${data.detail}</div>`;
            chatContainer.appendChild(errorDiv);
        }
        
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
        
    } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message answer';
        errorDiv.style.background = '#ffebee';
        errorDiv.style.borderLeft = '4px solid #dc3545';
        errorDiv.innerHTML = `<span class="answer-label">Error:</span><div class="answer-content">${error.message}</div>`;
        chatContainer.appendChild(errorDiv);
    } finally {
        eli5Btn.disabled = false;
        questionInput.disabled = false;
        askLoading.style.display = 'none';
        questionInput.focus();
    }
}

// Text-to-Speech (Voice Mode)
function speakLastAnswer() {
    if (!lastAnswer) {
        alert('No answer to speak! Ask a question first.');
        return;
    }
    
    // Check if browser supports speech synthesis
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        // Create speech
        const utterance = new SpeechSynthesisUtterance(lastAnswer);
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Speak
        window.speechSynthesis.speak(utterance);
        
        // Visual feedback
        const speakBtn = document.getElementById('speakBtn');
        speakBtn.textContent = '🔊 Speaking...';
        speakBtn.disabled = true;
        
        utterance.onend = function() {
            speakBtn.textContent = '🔊 Speak';
            speakBtn.disabled = false;
        };
    } else {
        alert('Sorry, your browser does not support text-to-speech!');
    }
}

// Update askQuestion to store answer and enable speak button
const originalAskQuestion = askQuestion;
askQuestion = async function() {
    await originalAskQuestion();
    // The lastAnswer will be set in the updated version below
};

// Outline Generator
async function generateOutline(type = 'mindmap') {
    const outlineBtn = document.getElementById('outlineBtn');
    const outlineLoading = document.getElementById('outlineLoading');
    const outlineResult = document.getElementById('outlineResult');
    
    if (!documentsUploaded) {
        alert('Please upload a document first!');
        return;
    }
    
    outlineBtn.disabled = true;
    outlineLoading.style.display = 'block';
    outlineResult.innerHTML = '';
    
    try {
        const response = await fetch(`${API_URL}/generate-outline`);
        const data = await response.json();
        
        if (response.ok) {
            try {
                // Convert outline to Mermaid diagram
                const mermaidCode = convertOutlineToMermaid(data.outline, type);
                
                // Create a unique ID for this diagram
                const diagramId = `mermaid-${Date.now()}`;
                
                outlineResult.innerHTML = `
                    <div class="outline-container">
                        <h3>>> Document ${type === 'mindmap' ? 'Mind Map' : 'Flowchart'} <<<</h3>
                        <div class="mermaid-container" style="background: white; padding: 20px; border-radius: 8px; overflow-x: auto;">
                            <div class="mermaid" id="${diagramId}">
${mermaidCode}
                            </div>
                        </div>
                        <div class="sources" style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #16213e;">
                            <strong>Sources:</strong> ${data.sources.join(', ')}
                        </div>
                    </div>
                `;
                
                // Initialize Mermaid for this specific diagram
                setTimeout(() => {
                    mermaid.init(undefined, `#${diagramId}`);
                }, 100);
                
            } catch (mermaidError) {
                console.error('Mermaid rendering error:', mermaidError);
                // Fallback to text outline
                outlineResult.innerHTML = `
                    <div class="outline-container">
                        <h3>>> Document Outline (Text View) <<<</h3>
                        <pre style="white-space: pre-wrap; font-family: 'Press Start 2P', monospace; font-size: 9px; line-height: 1.8; color: #00d9ff;">${data.outline}</pre>
                        <div class="sources" style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #16213e;">
                            <strong>Sources:</strong> ${data.sources.join(', ')}
                        </div>
                    </div>
                `;
            }
        } else {
            outlineResult.innerHTML = `
                <div class="status error" style="display: block;">
                    ❌ ERROR: ${data.detail}
                </div>
            `;
        }
    } catch (error) {
        outlineResult.innerHTML = `
            <div class="status error" style="display: block;">
                ❌ ERROR: ${error.message}
            </div>
        `;
    } finally {
        outlineBtn.disabled = false;
        outlineLoading.style.display = 'none';
    }
}

function convertOutlineToMermaid(outlineText, type) {
    const lines = outlineText.split('\n').filter(line => line.trim());
    
    if (type === 'mindmap') {
        // Create mind map with simpler structure
        let mermaid = 'mindmap\n  root((Study Material))\n';
        
        lines.forEach(line => {
            const trimmed = line.trim();
            
            // Main topics (I., II., III.)
            if (trimmed.match(/^[IVX]+\./)) {
                const topic = trimmed.replace(/^[IVX]+\.\s*/, '').trim();
                // Clean text: remove special chars, limit length
                const cleanTopic = topic.replace(/[^\w\s-]/g, '').substring(0, 25);
                if (cleanTopic) {
                    mermaid += `    ${cleanTopic}\n`;
                }
            }
            // Subtopics (A., B., C.)
            else if (trimmed.match(/^[A-Z]\.\s/)) {
                const subtopic = trimmed.replace(/^[A-Z]\.\s*/, '').trim();
                const cleanSubtopic = subtopic.replace(/[^\w\s-]/g, '').substring(0, 25);
                if (cleanSubtopic) {
                    mermaid += `      ${cleanSubtopic}\n`;
                }
            }
        });
        
        return mermaid;
    } else {
        // Create flowchart with better error handling
        let mermaid = 'graph TD\n';
        let nodeCounter = 0;
        let currentMainNode = null;
        
        mermaid += `  Start[Study Material]\n`;
        mermaid += `  style Start fill:#e94560,stroke:#fff,stroke-width:3px,color:#fff\n`;
        
        lines.forEach(line => {
            const trimmed = line.trim();
            
            // Main topics (I., II., III.)
            if (trimmed.match(/^[IVX]+\./)) {
                nodeCounter++;
                const nodeId = `N${nodeCounter}`;
                const topic = trimmed.replace(/^[IVX]+\.\s*/, '').trim();
                // Clean and escape text for Mermaid
                const cleanTopic = topic
                    .replace(/[^\w\s-]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 35);
                
                if (cleanTopic) {
                    mermaid += `  ${nodeId}["${cleanTopic}"]\n`;
                    mermaid += `  Start --> ${nodeId}\n`;
                    mermaid += `  style ${nodeId} fill:#533483,stroke:#00d9ff,stroke-width:2px,color:#fff\n`;
                    currentMainNode = nodeId;
                }
            }
            // Subtopics (A., B., C.)
            else if (trimmed.match(/^[A-Z]\.\s/) && currentMainNode) {
                nodeCounter++;
                const nodeId = `N${nodeCounter}`;
                const subtopic = trimmed.replace(/^[A-Z]\.\s*/, '').trim();
                const cleanSubtopic = subtopic
                    .replace(/[^\w\s-]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 35);
                
                if (cleanSubtopic) {
                    mermaid += `  ${nodeId}("${cleanSubtopic}")\n`;
                    mermaid += `  ${currentMainNode} --> ${nodeId}\n`;
                    mermaid += `  style ${nodeId} fill:#0f3460,stroke:#ffbe0b,stroke-width:2px,color:#00d9ff\n`;
                }
            }
        });
        
        return mermaid;
    }
}
// Initialize Mermaid on page load
document.addEventListener('DOMContentLoaded', function() {
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ 
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            }
        });
    }
});