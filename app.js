// --- Global Elements ---
const video = document.getElementById('camera-preview');
const display = document.getElementById('display');
const userInput = document.getElementById('userInput');
let isCameraOn = false;

// --- Settings Control ---
function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
    const savedKey = localStorage.getItem('user_gemini_key');
    if(savedKey) document.getElementById('apiKeyInput').value = savedKey;
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function saveKey() {
    const key = document.getElementById('apiKeyInput').value.trim();
    if(key) {
        localStorage.setItem('user_gemini_key', key);
        alert("Key Saved! Ab aap sawal puch sakte hain.");
        closeSettings();
    }
}

// --- Camera & Mic Fix (HTTPS is Required) ---
async function handleCamera() {
    if (!isCameraOn) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            video.srcObject = stream;
            video.style.display = 'block';
            isCameraOn = true;
            // Scroll to top to see camera clearly on Tablet
            display.scrollTop = 0;
        } catch (err) {
            alert("Camera Error: Please use HTTPS or check permissions.");
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

    const stream = video.srcObject;
    if(stream) stream.getTracks().forEach(t => t.stop());
    video.style.display = 'none';
    isCameraOn = false;

    addMessage("Guru", "Reading your notes... 📖");

    try {
        const result = await Tesseract.recognize(canvas, 'eng+hin');
        if(result.data.text.trim()) {
            askAI(result.data.text.trim());
        }
    } catch (e) {
        addMessage("Guru", "Photo saaf nahi hai, try again.");
    }
}

function startVoice() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRec) return alert("Browser voice support nahi karta.");
    
    const rec = new SpeechRec();
    rec.lang = 'hi-IN';
    rec.onstart = () => addMessage("System", "Boliye, main sun raha hoon... 👂");
    rec.onresult = (e) => askAI(e.results[0][0].transcript);
    rec.start();
}

// --- Main AI Brain ---
async function askAI(query) {
    const key = localStorage.getItem('user_gemini_key');
    if(!key) return openSettings();

    const text = query || userInput.value.trim();
    if(!text) return;

    addMessage("You", text);
    userInput.value = "";

    const loader = document.createElement('p');
    loader.id = "loader";
    loader.style.color = "cyan";
    loader.innerHTML = "✨ Guru is thinking...";
    display.appendChild(loader);
    display.scrollTop = display.scrollHeight;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Explain simply: " + text }] }]
            })
        });

        const data = await res.json();
        document.getElementById('loader').remove();

        if(data.candidates) {
            let reply = data.candidates[0].content.parts[0].text.replace(/\*\*/g, "");
            addMessage("Guru", reply);
            
            // Auto Voice Response
            const msg = new SpeechSynthesisUtterance(reply);
            msg.lang = /[\u0900-\u097F]/.test(reply) ? 'hi-IN' : 'en-US';
            window.speechSynthesis.speak(msg);
        }
    } catch (e) {
        if(document.getElementById('loader')) document.getElementById('loader').remove();
        addMessage("Guru", "Network error! Check Key or Internet.");
    }
}

function addMessage(sender, msg) {
    const div = document.createElement('div');
    div.style.padding = "12px";
    div.style.margin = "8px 0";
    div.style.borderRadius = "12px";
    div.style.background = sender === "Guru" ? "rgba(0,210,255,0.15)" : "rgba(255,255,255,0.1)";
    div.innerHTML = `<b>${sender}:</b> ${msg}`;
    display.appendChild(div);
    display.scrollTop = display.scrollHeight;
}
