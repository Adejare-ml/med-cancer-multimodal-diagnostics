// ==========================================
// 1. NEURAL CANVAS ANIMATION
// ==========================================
const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d');

let particlesArray;
let mouse = { x: null, y: null, radius: 150 };

// Dynamic colors based on theme
let networkColor = '56, 189, 248'; // Default Dark Mode (Cyan)

function updateNetworkColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    networkColor = theme === 'dark' ? '56, 189, 248' : '2, 132, 199'; // Cyan for dark, Deep Blue for light
}

window.addEventListener('mousemove', function(event) {
    mouse.x = event.x;
    mouse.y = event.y;
});

window.addEventListener('mouseout', function() {
    mouse.x = undefined;
    mouse.y = undefined;
});

window.addEventListener('resize', function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initCanvas();
});

class Particle {
    constructor(x, y, directionX, directionY, size) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = `rgba(${networkColor}, 0.8)`;
        ctx.fill();
    }
    update() {
        if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
        if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;

        // Move particle
        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
    }
}

function initCanvas() {
    particlesArray = [];
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let numberOfParticles = (canvas.height * canvas.width) / 12000; // Density
    
    // Cap particles to prevent lag
    if(numberOfParticles > 150) numberOfParticles = 150;

    for (let i = 0; i < numberOfParticles; i++) {
        let size = (Math.random() * 2) + 1;
        let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
        let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
        let directionX = (Math.random() * 0.4) - 0.2; // Slow movement
        let directionY = (Math.random() * 0.4) - 0.2;
        
        particlesArray.push(new Particle(x, y, directionX, directionY, size));
    }
}

function animateCanvas() {
    requestAnimationFrame(animateCanvas);
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
    }
    connectParticles();
}

function connectParticles() {
    let opacityValue = 1;
    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                         + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
            
            if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                opacityValue = 1 - (distance / 20000);
                ctx.strokeStyle = `rgba(${networkColor}, ${opacityValue})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                ctx.stroke();
            }
        }
        
        // Connect to mouse
        if (mouse.x && mouse.y) {
            let mouseDistance = ((particlesArray[a].x - mouse.x) * (particlesArray[a].x - mouse.x))
                              + ((particlesArray[a].y - mouse.y) * (particlesArray[a].y - mouse.y));
            if (mouseDistance < 25000) {
                let mouseOpacity = 1 - (mouseDistance / 25000);
                ctx.strokeStyle = `rgba(${networkColor}, ${mouseOpacity + 0.2})`; // Glow slightly brighter near mouse
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }
    }
}

// Start Canvas
updateNetworkColor();
initCanvas();
animateCanvas();

// ==========================================
// 2. THEME TOGGLE LOGIC
// ==========================================
const themeToggleBtn = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'dark';

document.documentElement.setAttribute('data-theme', currentTheme);
updateNetworkColor(); // Set initial canvas color

themeToggleBtn.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    let newTheme = theme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateNetworkColor(); // Update canvas color dynamically
});


// ==========================================
// 3. API & LOGIC INTEGRATION
// ==========================================
const API_URL = 'https://adejareworkstudio-breast-cancer-predictor.hf.space'; 
const SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyQRMOoogW408vv2wiNSg4kaoeLg3bsk9oNiUiaN1Os4lDAd7_XXUheiurqyVQY7dWAFQ/exec";

let currentMode = 'combined';
let currentImageBase64 = ""; 

// Tab Switching
window.switchTab = function(mode) {
    currentMode = mode;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const target = event.currentTarget || event.target;
    if(target) target.classList.add('active');

    const imgSection = document.getElementById('section-image');
    const clinSection = document.getElementById('section-clinical');

    if (mode === 'combined') {
        imgSection.style.display = 'block';
        clinSection.style.display = 'block';
    } else if (mode === 'clinical') {
        imgSection.style.display = 'none';
        clinSection.style.display = 'block';
    } else if (mode === 'image') {
        imgSection.style.display = 'block';
        clinSection.style.display = 'none';
    }
    
    const resDiv = document.getElementById('result');
    if (resDiv) resDiv.style.display = 'none';
}

// Image Preview
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');

if (imageInput) {
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentImageBase64 = e.target.result; 
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            }
            reader.readAsDataURL(file);
        }
    });
}

// Google Sheets Sync
async function syncDataToSheets(predictionResult) {
    const payload = {
        age: document.getElementById('age')?.value || "N/A",
        shape: document.getElementById('shape')?.value || "N/A",
        margin: document.getElementById('margin')?.value || "N/A",
        tissue: document.getElementById('tissue')?.value || "N/A",
        halo: document.getElementById('halo')?.value || "N/A",
        prediction: predictionResult,
        image: (currentMode !== 'clinical') ? currentImageBase64 : "No image uploaded" 
    };

    try {
        await fetch(SHEETS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', 
            body: JSON.stringify(payload)
        });
        console.log("Data successfully synced to Google Sheet tabs.");
    } catch (error) {
        console.error("Sheet sync failed:", error);
    }
}

// Form Submission
const form = document.getElementById('diagnosticForm');

if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = document.getElementById('submitBtn');
        const resultDiv = document.getElementById('result');
        
        btn.disabled = true;
        btn.innerText = "Analyzing... (Please Wait)";
        resultDiv.style.display = 'none';

        try {
            const payload = new FormData();
            
            // Append Image
            if (currentMode !== 'clinical') {
                const imgFile = document.getElementById('imageInput').files[0];
                if (imgFile) payload.append('image', imgFile);
                else if (currentMode === 'image') throw new Error("Please select an image file.");
            }
            
            // Append Clinical Data
            if (currentMode !== 'image') {
                const ageInput = document.getElementById('age');
                const clinicalData = {
                    'age': (ageInput && ageInput.value) ? ageInput.value : 50,
                    'shape': document.getElementById('shape')?.value || 'unknown',
                    'margin': document.getElementById('margin')?.value || 'unknown',
                    'tissue': document.getElementById('tissue')?.value || 'unknown',
                    'halo': document.getElementById('halo')?.value || 'unknown'
                };
                payload.append('clinical_data', JSON.stringify(clinicalData));
            }

            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                body: payload
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Server Error: ${response.status} - ${errText}`);
            }
            
            const data = await response.json();
            
            let finalPred = "Unknown";
            let finalConf = 0.0;
            let displayMode = "Unknown Mode";

            if (data.final_diagnosis) {
                finalPred = data.final_diagnosis.prediction;
                finalConf = data.final_diagnosis.confidence;
                displayMode = data.final_diagnosis.mode;
            } else if (data.prediction) {
                finalPred = data.prediction;
                finalConf = data.confidence;
                displayMode = data.mode || "Single-Modality";
            }

            const confPercent = (finalConf * 100).toFixed(1);

            let isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
            let statusColor = finalPred.toLowerCase() === "malignant" 
                ? (isLightMode ? "#dc2626" : "#ef4444") 
                : (isLightMode ? "#059669" : "#10b981");

            resultDiv.innerHTML = `
                <h3 style="color:${statusColor}; margin-top:0; font-size: 1.8rem;">Diagnosis: ${finalPred}</h3>
                <p style="font-size: 1.1rem; margin: 10px 0;">Confidence: <strong style="color:var(--text-main);">${confPercent}%</strong></p>
                <p style="font-size: 0.85em; color: var(--text-muted); margin-bottom: 10px;">Analysis Mode: ${displayMode}</p>
                <div class="confidence-bar">
                    <div class="fill" style="width: ${confPercent}%; background: ${statusColor}; box-shadow: 0 0 15px ${statusColor};"></div>
                </div>
            `;
            resultDiv.style.display = 'block';

            await syncDataToSheets(finalPred);

        } catch (error) {
            console.error("Prediction Error:", error);
            resultDiv.innerHTML = `<strong style="color: #ef4444;">Error:</strong> <span style="color:var(--text-main);">${error.message}</span>`;
            resultDiv.style.border = "1px solid #ef4444";
            resultDiv.style.background = "rgba(239, 68, 68, 0.1)";
            resultDiv.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.innerText = "Generate Prediction";
        }
    });
}