// --- CONFIGURATION & VARIABLES ---
let video = document.getElementById('camera-preview');
let display = document.getElementById('display');
let isCameraOn = false;

// --- 1. SETTINGS & API KEY LOGIC ---
function openSettings() { 
    document.getElementById('settingsModal').style.display = 'block'; 
    const savedKey = localStorage.getItem('user_gemini_key');
    if(savedKey) document.getElementById('apiKeyInput').value = savedKey;
}

function closeSettings() { 
    document.getElementById('settingsModal').style.display = 'none'; 
}

function saveKey() {
    let key = document.getElementById('apiKeyInput').value.trim();
    if(key) {
        localStorage.setItem('user_gemini_key', key);
        alert("Success! Key save ho gayi hai.");
        closeSettings();
    } else {
        alert("Kripya ek valid API Key daalein.");
    }
}

// --- 2. CAMERA & PHOTO (OCR) LOGIC ---
async function handleCamera() {
    if (!isCameraOn) {
        try {
            // Mobile users ke liye back camera (environment) prefer karein
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            video.srcObject = stream;
            video.style.display = 'block';
            isCameraOn = true;
            addMessage("System", "Camera ON! Photo lene ke liye dobara 📷 dabayein.");
        } catch (err) { 
            alert("Camera Access Denied! Settings mein jaakar allow karein."); 
        }
    } else {
        takePhoto();
    }
}

async function takePhoto() {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Camera band karein taaki battery bache
    const stream = video.srcObject;
    if(stream) stream.getTracks().forEach(track => track.stop());
    video.style.display = 'none';
    isCameraOn = false;

    addMessage("Guru", "Reading your notebook... 📖");

    try {
        // Tesseract Library se photo ko text mein badlein
        const result = await Tesseract.recognize(canvas, 'eng+hin');
        let text = result.data.text.trim();
        if(text) {
            addMessage("You (Photo)", text);
            askAI(text);
        } else {
            addMessage("Guru", "Maaf kijiye, photo saaf nahi hai. Kripya dobara kheenchiye.");
        }
    } catch (e) { 
        addMessage("Guru", "OCR Error: Text padhne mein samasya hui."); 
    }
}

// --- 3. VOICE (MICROPHONE) LOGIC ---
function startVoice() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRec) { 
        alert("Aapka browser voice support nahi karta. Chrome use karein."); 
        return; 
    }
    
    const rec = new SpeechRec();
    rec.lang = 'hi-IN'; // Hindi aur English dono support karega
    
    rec.onstart = () => { 
        addMessage("System", "Suniye... 👂 Boliye!"); 
    };

    rec.onresult = (e) => {
        let transcript = e.results[0][0].transcript;
        document.getElementById('userInput').value = transcript;
        askAI(transcript);
    };

    rec.onerror = (err) => { 
        console.error(err);
        alert("Mic Error: Permission check karein."); 
    };

    rec.start();
}

// --- 4. MAIN AI BRAIN (GEMINI API) ---
async function askAI(query) {
    const USER_KEY = localStorage.getItem('user_gemini_key');
    
    if(!USER_KEY) {
        addMessage("Guru", "⚠️ Pehle Settings (⚙️) mein apni Gemini API Key daalein!");
        openSettings();
        return;
    }

    let input = document.getElementById('userInput');
    let text = query || input.value.trim();
    if(!text) return;

    if(!query) addMessage("You", text);
    input.value = "";

    // Loading indicator
    let loading = document.createElement('p');
    loading.id = "temp-load";
    loading.innerHTML = "<i style='color:cyan'>Gyan Magic is thinking... ✨</i>";
    display.appendChild(loading);

    // System Prompt for Student Teacher behavior
    const prompt = `You are Gyan Magic AI, a personal study tutor.
    - If the student asks in Hindi or about Hindi grammar, answer in Hindi.
    - For Math, Science, or English, answer in English with simple steps.
    - Keep it educational and encouraging.
    Question: ${text}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${USER_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        if(document.getElementById('temp-load')) document.getElementById('temp-load').remove();

        if (data.candidates && data.candidates[0].content) {
            let reply = data.candidates[0].content.parts[0].text.replace(/\*\*/g, ""); // Remove bold stars
            
            // Language Detection for Voice
            let isHindi = /[\u0900-\u097F]/.test(reply);
            
            addMessage("Guru", reply);
            speak(reply, isHindi ? 'hi-IN' : 'en-US');
        } else {
            addMessage("Guru", "API Error: Kripya apni API key check karein.");
        }
    } catch (err) {
        if(document.getElementById('temp-load')) document.getElementById('temp-load').remove();
        addMessage("Guru", "Network Error: Check internet or API Key.");
    }
}

// --- 5. HELPER FUNCTIONS ---
function addMessage(sender, msg) {
    let div = document.createElement('div');
    div.style.margin = "10px";
    div.style.padding = "15px";
    div.style.borderRadius = "15px";
    div.style.background = sender === "You" || sender === "You (Photo)" ? "rgba(255,255,255,0.1)" : "rgba(0, 210, 255, 0.1)";
    div.style.textAlign = sender.startsWith("You") ? "right" : "left";
    div.innerHTML = `<b>${sender}:</b> ${msg}`;
    display.appendChild(div);
    display.scrollTop = display.scrollHeight;
}

function speak(text, lang) {
    window.speechSynthesis.cancel(); // Purani awaz band karein
    let msg = new SpeechSynthesisUtterance(text);
    msg.lang = lang;
    window.speechSynthesis.speak(msg);
}
