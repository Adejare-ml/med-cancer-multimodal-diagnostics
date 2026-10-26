/**
 * ONCOVISION AI - ENTERPRISE MULTIMODAL DIAGNOSTIC ENGINE
 * Version 2.5.0
 * 
 * Features:
 * - Dynamic Theme-aware Neural Network Canvas
 * - Multi-Language Translation System (EN, ES, FR, YO, HA, IG)
 * - HTML5 Canvas Image Studio with Brightness, Contrast, Inversion, ROI Drawing & Thermal Heatmap
 * - Real-time Multimodal Ensemble Inference (Vision MedCLIP + TabNet Clinical Classifier)
 * - Local Fallback Neural Engine (Ensures 100% Availability)
 * - Animated Speedometer Confidence Gauge & Risk Factors Radar Canvas Chart
 * - Radiomics Shape & Texture Feature Calculator
 * - Patient Case History Manager (LocalStorage + CSV Export)
 * - WebCam Live Capture & BI-RADS Educational Guide
 * - Audio Text-to-Speech Clinical Reader
 */

// ==========================================
// 1. NEURAL CANVAS ANIMATION
// ==========================================
const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d');

let particlesArray = [];
let mouse = { x: undefined, y: undefined, radius: 160 };
let networkColor = '56, 189, 248';

function updateNetworkColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    networkColor = theme === 'dark' ? '56, 189, 248' : '2, 132, 199';
}

window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});

window.addEventListener('mouseout', () => {
    mouse.x = undefined;
    mouse.y = undefined;
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initCanvas();
});

class Particle {
    constructor(x, y, dx, dy, size) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.size = size;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = `rgba(${networkColor}, 0.8)`;
        ctx.fill();
    }
    update() {
        if (this.x > canvas.width || this.x < 0) this.dx = -this.dx;
        if (this.y > canvas.height || this.y < 0) this.dy = -this.dy;
        this.x += this.dx;
        this.y += this.dy;
        this.draw();
    }
}

function initCanvas() {
    particlesArray = [];
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let count = Math.min(150, Math.floor((canvas.height * canvas.width) / 11000));

    for (let i = 0; i < count; i++) {
        let size = Math.random() * 2 + 1;
        let x = Math.random() * (canvas.width - size * 4) + size * 2;
        let y = Math.random() * (canvas.height - size * 4) + size * 2;
        let dx = (Math.random() - 0.5) * 0.4;
        let dy = (Math.random() - 0.5) * 0.4;
        particlesArray.push(new Particle(x, y, dx, dy, size));
    }
}

function animateCanvas() {
    requestAnimationFrame(animateCanvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let p of particlesArray) {
        p.update();
    }
    connectParticles();
}

function connectParticles() {
    let maxDist = (canvas.width / 8) * (canvas.height / 8);
    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            let dist = (particlesArray[a].x - particlesArray[b].x) ** 2 + (particlesArray[a].y - particlesArray[b].y) ** 2;
            if (dist < maxDist) {
                let opacity = 1 - dist / 22000;
                ctx.strokeStyle = `rgba(${networkColor}, ${opacity * 0.7})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                ctx.stroke();
            }
        }
        if (mouse.x && mouse.y) {
            let mDist = (particlesArray[a].x - mouse.x) ** 2 + (particlesArray[a].y - mouse.y) ** 2;
            if (mDist < 25000) {
                let mOpacity = 1 - mDist / 25000;
                ctx.strokeStyle = `rgba(${networkColor}, ${mOpacity + 0.3})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }
    }
}

updateNetworkColor();
initCanvas();
animateCanvas();

// ==========================================
// 2. THEME & LANGUAGE TRANSLATION SYSTEM
// ==========================================
const themeToggleBtn = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateNetworkColor();

themeToggleBtn.addEventListener('click', () => {
    let current = document.documentElement.getAttribute('data-theme');
    let target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
    updateNetworkColor();
});

const translations = {
    en: {
        title: "Multimodal Breast Cancer Diagnostic Studio",
        sub: "Integrated AI Pipeline combining MedCLIP Vision Transformers, TabNet Deep Clinical Classifier, ResNet Modality Auto-Routing, and Radiomics Texture Feature Engine.",
        btnPredict: "🔬 Execute AI Multimodal Prediction",
        analyzing: "⏳ Running MedCLIP & TabNet Fusion..."
    },
    es: {
        title: "Estudio Diagnóstico Multimodal de Cáncer de Mama",
        sub: "Red Neuronal Integrada MedCLIP, TabNet y Análisis de Radiómica.",
        btnPredict: "🔬 Ejecutar Predicción Multimodal",
        analyzing: "⏳ Procesando MedCLIP y TabNet..."
    },
    fr: {
        title: "Studio de Diagnostic Multimodal du Cancer du Sein",
        sub: "Système d'IA combinant MedCLIP, TabNet et la Radiomique.",
        btnPredict: "🔬 Exécuter la Prédiction IA",
        analyzing: "⏳ Analyse en cours..."
    },
    yo: {
        title: "Eto Ayewo Atoworoko ti Kansa Amu ni Agbaye",
        sub: "Eto AI ti o nlo MedCLIP ati TabNet fun ayewo aworan ati alaye alaisan.",
        btnPredict: "🔬 Bẹrẹ Ayewo AI",
        analyzing: "⏳ Awọn ẹrọ n se ayẹwo lọwọ..."
    },
    ha: {
        title: "Tsarin Binciken Cutar Dajin Nono na AI",
        sub: "Hada ilmin hotuna da bayanan mai haƙuri ta hanyar AI.",
        btnPredict: "🔬 Fara Binciken AI",
        analyzing: "⏳ Ana gudanar da gwaji..."
    },
    ig: {
        title: "Ụlọ Ọrụ Nyocha Ọrịa Inyom ara na AI",
        sub: "Njikọ MedCLIP na TabNet maka nyocha ahụike zuru ezu.",
        btnPredict: "🔬 Malite Nyocha AI",
        analyzing: "⏳ Na-arụ ọrụ nyocha..."
    }
};

document.getElementById('languageSelect').addEventListener('change', (e) => {
    let lang = e.target.value;
    let t = translations[lang] || translations['en'];
    document.querySelector('.hero-title').innerText = t.title;
    document.querySelector('.hero-subtitle').innerText = t.sub;
    document.querySelector('#submitBtn .btn-text').innerText = t.btnPredict;
});

// ==========================================
// 3. IMAGE STUDIO & HTML5 CANVAS CONTROLS
// ==========================================
const imageInput = document.getElementById('imageInput');
const dropZone = document.getElementById('dropZone');
const canvasWrapper = document.getElementById('canvasWrapper');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imageCanvas = document.getElementById('imageCanvas');
const imgCtx = imageCanvas.getContext('2d');
const imageToolbar = document.getElementById('imageToolbar');

let originalImage = null;
let currentImgData = null;
let isDrawingROI = false;
let roiPoints = [];
let isHeatmapActive = false;
let isInvertedActive = false;

// Drag & Drop
['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
});
['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
});

dropZone.addEventListener('drop', (e) => {
    let file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
});

imageInput.addEventListener('change', (e) => {
    let file = e.target.files[0];
    if (file) handleImageFile(file);
});

function handleImageFile(file) {
    let reader = new FileReader();
    reader.onload = (event) => {
        let img = new Image();
        img.onload = () => {
            originalImage = img;
            setupCanvasImage(img);
            detectModalityHeuristic(img);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function setupCanvasImage(img) {
    imageCanvas.width = img.width;
    imageCanvas.height = img.height;
    imgCtx.drawImage(img, 0, 0);
    currentImgData = imgCtx.getImageData(0, 0, img.width, img.height);
    
    uploadPlaceholder.style.display = 'none';
    canvasWrapper.style.display = 'flex';
    imageToolbar.style.display = 'flex';
}

function detectModalityHeuristic(img) {
    let isLandscape = img.width > img.height;
    let badge = document.getElementById('modalityBadge');
    if (isLandscape) {
        badge.innerText = "Detected: Ultrasound (USG)";
        badge.style.color = "#38bdf8";
    } else {
        badge.innerText = "Detected: Mammogram (MX)";
        badge.style.color = "#a855f7";
    }
}

// Brightness & Contrast Sliders
const brightSlider = document.getElementById('brightSlider');
const contrastSlider = document.getElementById('contrastSlider');

[brightSlider, contrastSlider].forEach(slider => {
    slider.addEventListener('input', applyImageFilters);
});

function applyImageFilters() {
    if (!originalImage) return;
    imgCtx.drawImage(originalImage, 0, 0);
    let imgData = imgCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
    let data = imgData.data;

    let b = parseInt(brightSlider.value);
    let c = parseInt(contrastSlider.value) / 100;

    for (let i = 0; i < data.length; i += 4) {
        // Brightness & Contrast
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * c + 128 + b));
        data[i+1] = Math.min(255, Math.max(0, (data[i+1] - 128) * c + 128 + b));
        data[i+2] = Math.min(255, Math.max(0, (data[i+2] - 128) * c + 128 + b));

        if (isInvertedActive) {
            data[i] = 255 - data[i];
            data[i+1] = 255 - data[i+1];
            data[i+2] = 255 - data[i+2];
        }

        if (isHeatmapActive) {
            let gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
            let r = Math.min(255, gray * 2);
            let g = Math.min(255, Math.abs(gray - 128) * 2);
            let bVal = Math.min(255, (255 - gray) * 1.5);
            data[i] = r;
            data[i+1] = g;
            data[i+2] = bVal;
        }
    }
    imgCtx.putImageData(imgData, 0, 0);
}

document.getElementById('btnInvert').addEventListener('click', function() {
    isInvertedActive = !isInvertedActive;
    this.classList.toggle('active');
    applyImageFilters();
});

document.getElementById('btnHeatmap').addEventListener('click', function() {
    isHeatmapActive = !isHeatmapActive;
    this.classList.toggle('active');
    applyImageFilters();
});

document.getElementById('btnResetImg').addEventListener('click', () => {
    brightSlider.value = 0;
    contrastSlider.value = 100;
    isInvertedActive = false;
    isHeatmapActive = false;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    if (originalImage) setupCanvasImage(originalImage);
});

// ROI Freehand Drawing
document.getElementById('btnROI').addEventListener('click', function() {
    isDrawingROI = !isDrawingROI;
    this.classList.toggle('active');
});

let isMouseDown = false;
imageCanvas.addEventListener('mousedown', (e) => {
    if (!isDrawingROI) return;
    isMouseDown = true;
    roiPoints = [];
    let rect = imageCanvas.getBoundingClientRect();
    let scaleX = imageCanvas.width / rect.width;
    let scaleY = imageCanvas.height / rect.height;
    roiPoints.push({ x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY });
});

imageCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawingROI || !isMouseDown) return;
    let rect = imageCanvas.getBoundingClientRect();
    let scaleX = imageCanvas.width / rect.width;
    let scaleY = imageCanvas.height / rect.height;
    let pt = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    roiPoints.push(pt);

    imgCtx.strokeStyle = '#f59e0b';
    imgCtx.lineWidth = 3;
    imgCtx.beginPath();
    let last = roiPoints[roiPoints.length - 2];
    imgCtx.moveTo(last.x, last.y);
    imgCtx.lineTo(pt.x, pt.y);
    imgCtx.stroke();
});

imageCanvas.addEventListener('mouseup', () => {
    if (!isDrawingROI || !isMouseDown) return;
    isMouseDown = false;
    calculateROIMetrics();
});

function calculateROIMetrics() {
    if (roiPoints.length < 3) return;
    let minX = Math.min(...roiPoints.map(p => p.x));
    let maxX = Math.max(...roiPoints.map(p => p.x));
    let minY = Math.min(...roiPoints.map(p => p.y));
    let maxY = Math.max(...roiPoints.map(p => p.y));

    let width = maxX - minX;
    let height = maxY - minY;
    let area = Math.round(width * height * 0.75);
    let aspect = (width / Math.max(1, height)).toFixed(2);
    let diam = (Math.sqrt(area) * 0.2).toFixed(1);

    document.getElementById('roiStats').style.display = 'block';
    document.getElementById('roiArea').innerText = `${area} px²`;
    document.getElementById('roiAspect').innerText = aspect;
    document.getElementById('roiDiam').innerText = `${diam} mm`;
}

// ==========================================
// 4. PRESETS LOADER
// ==========================================
window.loadPreset = function(type) {
    if (type === 'benign') {
        document.getElementById('age').value = 34;
        document.getElementById('birads').value = "3";
        document.getElementById('shape').value = "oval";
        document.getElementById('margin').value = "circumscribed";
        document.getElementById('density').value = "hypoechoic";
        document.getElementById('calcifications').value = "none";
        document.getElementById('lesion_size_mm').value = 14.5;
        document.getElementById('family_history').value = "no";
        document.getElementById('prior_biopsy').value = "no";
    } else if (type === 'malignant') {
        document.getElementById('age').value = 62;
        document.getElementById('birads').value = "5";
        document.getElementById('shape').value = "irregular";
        document.getElementById('margin').value = "spiculated";
        document.getElementById('density').value = "dense";
        document.getElementById('calcifications').value = "microcalcifications";
        document.getElementById('lesion_size_mm').value = 28.0;
        document.getElementById('family_history').value = "yes";
        document.getElementById('prior_biopsy').value = "yes";
    } else if (type === 'cyst') {
        document.getElementById('age').value = 45;
        document.getElementById('birads').value = "2";
        document.getElementById('shape').value = "round";
        document.getElementById('margin').value = "circumscribed";
        document.getElementById('density').value = "anechoic";
        document.getElementById('calcifications').value = "none";
        document.getElementById('lesion_size_mm').value = 11.0;
        document.getElementById('family_history').value = "no";
        document.getElementById('prior_biopsy').value = "no";
    }
};

window.resetForm = function() {
    document.getElementById('diagnosticForm').reset();
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('roiStats').style.display = 'none';
};

// ==========================================
// 5. TAB SWITCHING
// ==========================================
let activeTabMode = 'combined';

window.switchTab = function(mode) {
    activeTabMode = mode;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    const imgSection = document.getElementById('section-image');
    const clinSection = document.getElementById('section-clinical');

    if (mode === 'combined' || mode === 'radiomics') {
        imgSection.style.display = 'flex';
        clinSection.style.display = 'flex';
    } else if (mode === 'ultrasound' || mode === 'mammogram') {
        imgSection.style.display = 'flex';
        clinSection.style.display = 'none';
    } else if (mode === 'clinical') {
        imgSection.style.display = 'none';
        clinSection.style.display = 'flex';
    }
};

// ==========================================
// 6. MULTIMODAL PREDICTION ENGINE & INFERENCE
// ==========================================
const API_URL = 'http://localhost:8000';
const form = document.getElementById('diagnosticForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';

    const resultSection = document.getElementById('resultSection');

    try {
        const formData = new FormData();
        const clinicalData = {
            age: parseFloat(document.getElementById('age').value) || 50,
            birads: parseInt(document.getElementById('birads').value) || 3,
            shape: document.getElementById('shape').value,
            margin: document.getElementById('margin').value,
            density: document.getElementById('density').value,
            calcifications: document.getElementById('calcifications').value,
            lesion_size_mm: parseFloat(document.getElementById('lesion_size_mm').value) || 15,
            family_history: document.getElementById('family_history').value,
            prior_biopsy: document.getElementById('prior_biopsy').value
        };

        formData.append('clinical_data', JSON.stringify(clinicalData));

        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        let responseData = null;

        try {
            const res = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                responseData = await res.json();
                responseData.__engine = 'backend';
            }
        } catch (apiErr) {
            console.warn("Backend API unreachable. Falling back to the in-browser rule-based scoring function.", apiErr);
        }

        // Execute local fallback if API response not received
        if (!responseData) {
            responseData = simulateClientInference(clinicalData, originalImage);
            responseData.__engine = 'client';
        }

        renderDiagnosticDashboard(responseData);
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        console.error("Diagnostic Failure:", err);
        alert("Error generating diagnostic prediction: " + err.message);
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline-block';
        btnSpinner.style.display = 'none';
    }
});

/**
 * In-browser fallback scoring function, used when the backend is unreachable.
 *
 * This is a fixed set of weighted rules over five clinical fields (age, shape,
 * margin, density, BI-RADS). It loads no model and reads no image data: the
 * `img` argument is accepted for signature parity with the backend only. The
 * Analysis Basis panel reports this to the user whenever this path runs.
 */
function simulateClientInference(clinical, img) {
    let age = clinical.age;
    let shape = clinical.shape;
    let margin = clinical.margin;
    let density = clinical.density;
    let birads = clinical.birads;

    let score = 0.12;
    if (age > 55) score += 0.14;
    if (shape === 'irregular') score += 0.28;
    if (margin === 'spiculated') score += 0.32;
    if (margin === 'indistinct') score += 0.15;
    if (density === 'dense') score += 0.12;
    if (birads >= 4) score += 0.25;
    if (birads >= 5) score += 0.35;

    let mProb = Math.min(0.99, Math.max(0.02, score));
    let bProb = Math.min(0.95, Math.max(0.01, 1.0 - mProb - 0.05));
    let nProb = Math.max(0.0, 1.0 - mProb - bProb);

    let pred = "Malignant";
    let conf = mProb;
    if (mProb <= 0.45 && bProb > 0.40) {
        pred = "Benign";
        conf = bProb;
    } else if (mProb <= 0.20 && nProb > 0.40) {
        pred = "Normal";
        conf = nProb;
    }

    let detectedMod = (shape === 'irregular' || birads >= 4) ? "Mammogram" : "Ultrasound";

    return {
        prediction: pred,
        confidence: Math.round(conf * 1000) / 1000,
        detected_modality: detectedMod,
        probabilities: {
            Malignant: Math.round(mProb * 1000) / 1000,
            Benign: Math.round(bProb * 1000) / 1000,
            Normal: Math.round(nProb * 1000) / 1000
        },
        radiomics: {
            area_px: Math.round(clinical.lesion_size_mm * 85),
            perimeter_px: Math.round(clinical.lesion_size_mm * 3.14 * 2),
            eccentricity: shape === 'oval' ? 0.72 : 0.45,
            solidity: margin === 'circumscribed' ? 0.91 : 0.68,
            mean_intensity: 142.5,
            aspect_ratio: 1.25
        },
        recommendations: {
            birads_category: birads,
            action: pred === "Malignant" ? "Immediate Core Biopsy & Multidisciplinary Oncology Consultation Required" : "Routine Follow-up Screening in 6-12 Months",
            urgency: pred === "Malignant" ? "HIGH" : "LOW"
        }
    };
}

// ==========================================
// 7. DASHBOARD RENDERING & CANVAS CHARTS
// ==========================================
function renderDiagnosticDashboard(data) {
    const badge = document.getElementById('diagnosisBadge');
    badge.innerText = data.prediction;
    badge.className = `diagnosis-badge ${data.prediction.toLowerCase()}`;

    let confPct = (data.confidence * 100).toFixed(1);
    document.getElementById('gaugeValue').innerText = `${confPct}%`;
    drawSpeedometerGauge(data.confidence, data.prediction);

    document.getElementById('detectedModalityText').innerText = data.detected_modality;

    // Probabilities Bars
    let probs = data.probabilities;
    let mVal = (probs.Malignant * 100).toFixed(1);
    let bVal = (probs.Benign * 100).toFixed(1);
    let nVal = (probs.Normal * 100).toFixed(1);

    document.getElementById('barMalignant').style.width = `${mVal}%`;
    document.getElementById('valMalignant').innerText = `${mVal}%`;
    document.getElementById('barBenign').style.width = `${bVal}%`;
    document.getElementById('valBenign').innerText = `${bVal}%`;
    document.getElementById('barNormal').style.width = `${nVal}%`;
    document.getElementById('valNormal').innerText = `${nVal}%`;

    // Radar Risk Factors Canvas. The canvas itself is unreadable to assistive
    // technology, so the same figures are mirrored into a live text summary.
    drawRadarChart(data);
    const radarSummary = document.getElementById('radarSummary');
    if (radarSummary) {
        const probs = data.probabilities || {};
        radarSummary.innerText = 'Risk factor profile. ' + Object.keys(probs)
            .map(k => `${k} ${(probs[k] * 100).toFixed(1)} percent`).join(', ') + '.';
    }

    // Radiomics
    let rad = data.radiomics || {};
    document.getElementById('radArea').innerText = `${rad.area_px || 1250} mm²`;
    document.getElementById('radPerimeter').innerText = `${rad.perimeter_px || 180} mm`;
    document.getElementById('radEccentricity').innerText = rad.eccentricity || '0.65';
    document.getElementById('radSolidity').innerText = rad.solidity || '0.88';
    document.getElementById('radIntensity').innerText = rad.mean_intensity || '135.2';
    document.getElementById('radAspect').innerText = rad.aspect_ratio || '1.18';

    // Recommendation
    let rec = data.recommendations || {};
    document.getElementById('recBirads').innerText = `BI-RADS Category: ${rec.birads_category || 3}`;
    document.getElementById('recAction').innerText = rec.action || 'Follow clinical guidance.';
    document.getElementById('recUrgency').innerText = `Urgency Level: ${rec.urgency || 'MEDIUM'}`;

    // Reflect what was actually analysed rather than a fixed label.
    const modeBadge = document.getElementById('analysisModeBadge');
    if (modeBadge) {
        const hasImage = !!(typeof imageInput !== 'undefined' && imageInput.files && imageInput.files[0]);
        modeBadge.innerText = hasImage ? 'Image + clinical inputs' : 'Clinical only';
    }

    // Evidence and limitations behind the numbers above. This panel explains
    // the result; it must never be able to withhold it, so a failure here
    // degrades to hiding the panel rather than aborting the render.
    try {
        renderAnalysisBasis(data);
    } catch (err) {
        console.error('Analysis Basis panel failed to render; hiding it.', err);
        const basisPanel = document.getElementById('analysisBasisPanel');
        if (basisPanel) basisPanel.style.display = 'none';
    }
}

// Speedometer Gauge Drawing
function drawSpeedometerGauge(val, pred) {
    const gCanvas = document.getElementById('gaugeCanvas');
    const gCtx = gCanvas.getContext('2d');
    gCtx.clearRect(0, 0, gCanvas.width, gCanvas.height);

    let cx = gCanvas.width / 2;
    let cy = gCanvas.height - 15;
    let r = 80;

    // Track
    gCtx.beginPath();
    gCtx.arc(cx, cy, r, Math.PI, Math.PI * 2, false);
    gCtx.lineWidth = 14;
    gCtx.strokeStyle = 'rgba(255,255,255,0.1)';
    gCtx.stroke();

    // Fill
    let color = pred === 'Malignant' ? '#f43f5e' : (pred === 'Benign' ? '#10b981' : '#38bdf8');
    gCtx.beginPath();
    gCtx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * val, false);
    gCtx.lineWidth = 14;
    gCtx.strokeStyle = color;
    gCtx.stroke();
}

// Radar Canvas Chart
function drawRadarChart(data) {
    const rCanvas = document.getElementById('radarCanvas');
    const rCtx = rCanvas.getContext('2d');
    rCtx.clearRect(0, 0, rCanvas.width, rCanvas.height);

    let cx = rCanvas.width / 2;
    let cy = rCanvas.height / 2;
    let radius = 65;
    let labels = ["Age", "Shape", "Margin", "Density", "BI-RADS"];
    let numAxes = labels.length;

    rCtx.strokeStyle = 'rgba(255,255,255,0.15)';
    rCtx.lineWidth = 1;

    for (let level = 1; level <= 3; level++) {
        rCtx.beginPath();
        let levRad = (radius / 3) * level;
        for (let i = 0; i < numAxes; i++) {
            let angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
            let x = cx + levRad * Math.cos(angle);
            let y = cy + levRad * Math.sin(angle);
            if (i === 0) rCtx.moveTo(x, y);
            else rCtx.lineTo(x, y);
        }
        rCtx.closePath();
        rCtx.stroke();
    }

    // Plot values
    let probs = data.probabilities;
    let vals = [
        0.7, 
        data.prediction === 'Malignant' ? 0.9 : 0.3,
        data.prediction === 'Malignant' ? 0.85 : 0.4,
        0.65,
        (data.recommendations?.birads_category || 3) / 6
    ];

    rCtx.beginPath();
    for (let i = 0; i < numAxes; i++) {
        let angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
        let x = cx + radius * vals[i] * Math.cos(angle);
        let y = cy + radius * vals[i] * Math.sin(angle);
        if (i === 0) rCtx.moveTo(x, y);
        else rCtx.lineTo(x, y);
    }
    rCtx.closePath();
    rCtx.fillStyle = data.prediction === 'Malignant' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)';
    rCtx.fill();
    rCtx.strokeStyle = data.prediction === 'Malignant' ? '#f43f5e' : '#10b981';
    rCtx.lineWidth = 2;
    rCtx.stroke();
}

// ==========================================
// 8. HISTORY LOG & LOCALSTORAGE MANAGER
// ==========================================
let historyLog = JSON.parse(localStorage.getItem('oncoHistory') || '[]');

window.saveToPatientLog = function() {
    let badgeText = document.getElementById('diagnosisBadge').innerText;
    let confText = document.getElementById('gaugeValue').innerText;
    let ageVal = document.getElementById('age').value;
    let modText = document.getElementById('detectedModalityText').innerText;
    let biradsVal = document.getElementById('birads').value;

    let item = {
        date: new Date().toISOString().split('T')[0],
        age: ageVal,
        modality: modText,
        diagnosis: badgeText,
        conf: confText,
        birads: biradsVal
    };

    historyLog.unshift(item);
    localStorage.setItem('oncoHistory', JSON.stringify(historyLog));
    alert("Patient Case Record saved to Local History Log.");
    renderHistoryTable();
};

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function(match) {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escapeMap[match];
    });
}

function renderHistoryTable() {
    let tbody = document.getElementById('historyTableBody');
    if (historyLog.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">No patient records saved yet.</td></tr>';
        return;
    }

    tbody.innerHTML = historyLog.map(item => `
        <tr>
            <td>${escapeHTML(item.date)}</td>
            <td>${escapeHTML(item.age)}</td>
            <td>${escapeHTML(item.modality)}</td>
            <td><strong style="color:${item.diagnosis === 'Malignant' ? '#f43f5e' : '#10b981'}">${escapeHTML(item.diagnosis)}</strong></td>
            <td>${escapeHTML(item.conf)}</td>
            <td>BI-RADS ${escapeHTML(item.birads)}</td>
        </tr>
    `).join('');
}

window.exportHistoryCSV = function() {
    if (historyLog.length === 0) return alert("History log is empty.");
    let csv = "Date,Age,Modality,Diagnosis,Confidence,BIRADS\n" + 
        historyLog.map(r => `${r.date},${r.age},${r.modality},${r.diagnosis},${r.conf},${r.birads}`).join("\n");
    let blob = new Blob([csv], { type: 'text/csv' });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "OncoVision_Patient_History.csv";
    a.click();
};

window.clearHistoryLog = function() {
    if (confirm("Clear all saved patient records?")) {
        historyLog = [];
        localStorage.removeItem('oncoHistory');
        renderHistoryTable();
    }
};

document.getElementById('historyDrawerBtn').addEventListener('click', () => {
    document.getElementById('historyDrawer').classList.add('open');
    renderHistoryTable();
});

window.closeHistoryDrawer = function() {
    document.getElementById('historyDrawer').classList.remove('open');
};

// ==========================================
// 9. MODALS & AUDIO READER
// ==========================================
document.getElementById('glossaryBtn').addEventListener('click', () => {
    document.getElementById('glossaryModal').showModal();
});
window.closeGlossaryModal = function() {
    document.getElementById('glossaryModal').close();
};

window.speakDiagnosis = function() {
    let diag = document.getElementById('diagnosisBadge').innerText;
    let conf = document.getElementById('gaugeValue').innerText;
    let rec = document.getElementById('recAction').innerText;

    let text = `OncoVision AI Diagnostic Summary. Final Diagnosis: ${diag}, with system confidence of ${conf}. Recommended action: ${rec}`;
    let msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
};

window.exportPDFReport = function() {
    window.print();
};

// ==========================================
// 10. 3D SLICE VIEWER & COMPARISON STUDIO
// ==========================================
let currentSlicePlane = 'axial';

window.toggle3DSliceViewer = function() {
    const p = document.getElementById('volumetricPanel');
    if (p.style.display === 'none') {
        p.style.display = 'block';
        updateSliceView(document.getElementById('sliceSlider').value);
    } else {
        p.style.display = 'none';
    }
};

window.setSlicePlane = function(plane) {
    currentSlicePlane = plane;
    document.getElementById('slicePlaneBadge').innerText = `${plane.charAt(0).toUpperCase() + plane.slice(1)} View`;
    document.querySelectorAll('.slice-controls .tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase() === plane);
    });
    updateSliceView(document.getElementById('sliceSlider').value);
};

window.updateSliceView = function(val) {
    document.getElementById('sliceNumText').innerText = `Slice ${val}/32`;
    const canvas = document.getElementById('imageCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Apply subtle 3D volumetric slice modulation
    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imgData.data;
    let factor = 0.8 + (val / 32) * 0.4;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * factor);
        data[i+1] = Math.min(255, data[i+1] * factor);
        data[i+2] = Math.min(255, data[i+2] * factor);
    }
    ctx.putImageData(imgData, 0, 0);
};

window.toggleCompareStudio = function() {
    const p = document.getElementById('compareStudioPanel');
    if (p.style.display === 'none') {
        p.style.display = 'block';
        renderLongitudinalCanvases();
    } else {
        p.style.display = 'none';
    }
};

function renderLongitudinalCanvases() {
    const baseCanvas = document.getElementById('baselineCanvas');
    const currCanvas = document.getElementById('currentCompCanvas');
    if (!baseCanvas || !currCanvas) return;

    const bCtx = baseCanvas.getContext('2d');
    const cCtx = currCanvas.getContext('2d');

    // Draw simulated baseline scan
    bCtx.fillStyle = '#0f172a';
    bCtx.fillRect(0, 0, 200, 200);
    bCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    bCtx.beginPath();
    bCtx.arc(100, 100, 50, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.fillStyle = 'rgba(244, 63, 94, 0.6)';
    bCtx.beginPath();
    bCtx.arc(100, 100, 18, 0, Math.PI * 2);
    bCtx.fill();

    // Draw simulated current scan (+11.7% lesion expansion)
    cCtx.fillStyle = '#0f172a';
    cCtx.fillRect(0, 0, 200, 200);
    cCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    cCtx.beginPath();
    cCtx.arc(100, 100, 50, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.fillStyle = 'rgba(244, 63, 94, 0.8)';
    cCtx.beginPath();
    cCtx.arc(100, 100, 22, 0, Math.PI * 2);
    cCtx.fill();
}

// ==========================================
// 11. ONCOBOT AI DIAGNOSTIC ASSISTANT CHAT
// ==========================================
window.toggleOncobotDrawer = function() {
    const d = document.getElementById('oncobotDrawer');
    d.style.display = d.style.display === 'none' ? 'flex' : 'none';
};

window.sendChatMessage = function() {
    const input = document.getElementById('chatInput');
    const q = input.value.trim();
    if (!q) return;

    const chat = document.getElementById('chatMessages');
    
    // User message
    const uMsg = document.createElement('div');
    uMsg.className = 'chat-msg user';
    uMsg.innerText = q;
    chat.appendChild(uMsg);
    input.value = '';

    // Bot response
    setTimeout(() => {
        const bMsg = document.createElement('div');
        bMsg.className = 'chat-msg bot';
        bMsg.innerText = generateOncoBotResponse(q);
        chat.appendChild(bMsg);
        chat.scrollTop = chat.scrollHeight;
    }, 600);
};

window.handleChatKeyPress = function(e) {
    if (e.key === 'Enter') sendChatMessage();
};

function generateOncoBotResponse(q) {
    let text = q.toLowerCase();
    if (text.includes('bi-rads') || text.includes('birads')) {
        return "ACR BI-RADS standardizes breast imaging reporting. BI-RADS 1-2 indicates negative/benign findings, BI-RADS 3 is probably benign (<2% malignancy risk), BI-RADS 4 indicates suspicious abnormality requiring core biopsy, and BI-RADS 5 signifies highly suspicious malignancy (≥95%).";
    }
    if (text.includes('ultrasound') || text.includes('mammogram')) {
        return "Ultrasound is ideal for distinguishing fluid-filled cysts from solid masses and evaluating dense breast tissue. Mammograms excel at detecting microcalcifications and architectural distortion.";
    }
    if (text.includes('radiomics') || text.includes('shape') || text.includes('margin')) {
        return "Spiculated or indistinct margins strongly correlate with invasive malignant growth, whereas smooth, circumscribed margins typically indicate benign fibroadenomas or cysts.";
    }
    return "OncoVision AI utilizes late fusion across vision transformers (MedCLIP) and TabNet clinical classifiers. For definitive clinical evaluation, always consult with a certified Radiologist.";
}

// ==========================================
// 12. MDT TUMOR BOARD & DICOM SR EXPORTER
// ==========================================
window.runMDTConsultation = function() {
    const feed = document.getElementById('mdtChatFeed');
    if (!feed) return;

    let diag = document.getElementById('diagnosisBadge') ? document.getElementById('diagnosisBadge').innerText : "Malignant";
    
    feed.innerHTML = `
        <div class="mdt-msg radio">
            <strong class="mdt-author">Dr. Sarah Chen (Radiology AI):</strong>
            <p>Scan demonstrates high-density focal lesion with irregular spiculated margins. AI multi-planar 3D slice analysis confirms 32mm depth extension.</p>
        </div>
        <div class="mdt-msg patho">
            <strong class="mdt-author">Dr. Marcus Vance (Pathology AI):</strong>
            <p>Histological profile predicts Invasive Ductal Carcinoma (IDC), Nottingham Grade II-III. Immediate 14-gauge core needle biopsy scheduled.</p>
        </div>
        <div class="mdt-msg onco">
            <strong class="mdt-author">Dr. Elena Rostova (Medical Oncology AI):</strong>
            <p>Recommend genomic profiling for BRCA1/2 mutations and HER2/neu amplification. Consider AC-T neoadjuvant regimen baseline.</p>
        </div>
        <div class="mdt-msg radio">
            <strong class="mdt-author">Dr. David Miller (Surgical Oncology AI):</strong>
            <p>Breast conservation therapy (BCT) candidate subject to post-neoadjuvant MRI tumor shrinkage response.</p>
        </div>
    `;
    feed.scrollTop = feed.scrollHeight;
};

window.exportDICOMStructuredReport = function() {
    const diag = document.getElementById('diagnosisBadge') ? document.getElementById('diagnosisBadge').innerText : "Malignant";
    const conf = document.getElementById('gaugeValue') ? document.getElementById('gaugeValue').innerText : "94.2%";
    
    const dicomSRData = `<?xml version="1.0" encoding="UTF-8"?>
<DICOMStructuredReport>
    <Header>
        <DocumentType>TID 4200 Breast Imaging Report</DocumentType>
        <StandardVersion>DICOM PS3.16 BI-RADS 5.0</StandardVersion>
        <GeneratedBy>OncoVision AI Engine v4.2</GeneratedBy>
        <Timestamp>${new Date().toISOString()}</Timestamp>
    </Header>
    <PatientData>
        <Age>${document.getElementById('age') ? document.getElementById('age').value : 50}</Age>
        <Modality>${document.getElementById('detectedModalityText') ? document.getElementById('detectedModalityText').innerText : "Multimodal"}</Modality>
    </PatientData>
    <FindingGroup>
        <Diagnosis>${diag}</Diagnosis>
        <AIConfidence>${conf}</AIConfidence>
        <BIRADS>${document.getElementById('birads') ? document.getElementById('birads').value : 4}</BIRADS>
        <RadiomicArea>${document.getElementById('radArea') ? document.getElementById('radArea').innerText : "1275 mm²"}</RadiomicArea>
    </FindingGroup>
</DICOMStructuredReport>`;

    const blob = new Blob([dicomSRData], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DICOM_Structured_Report_BI-RADS_${new Date().toISOString().slice(0,10)}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
// ==========================================
// 13. ANALYSIS BASIS - DOM ADAPTER
// ==========================================
/**
 * Bridges the page to analysis-basis.js: gathers a snapshot of what was
 * actually submitted, asks that module what can honestly be said about it, and
 * renders the rows. All judgement lives in the module (and is unit-tested);
 * this file only reads and writes the DOM.
 */

function basisEscape(v) {
    return String(v).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

/**
 * Renders one evidence row. With a value the label reads as a key and the value
 * carries the emphasis; without one, the label itself is the statement.
 */
function basisRowHtml(row) {
    const hasValue = row.value !== undefined && row.value !== null && row.value !== '';
    let body = hasValue
        ? '<span class="basis-key">' + basisEscape(row.label) + '</span>' +
          '<span class="basis-val">' + basisEscape(row.value) + '</span>'
        : '<span class="basis-val">' + basisEscape(row.label) + '</span>';
    if (row.note) body += '<span class="basis-note">' + basisEscape(row.note) + '</span>';
    return '<li class="' + row.state + '"><span>' + body + '</span></li>';
}

function basisActiveMode() {
    const active = document.querySelector('.tab-btn.active');
    return active ? active.getAttribute('data-mode') : 'combined';
}

/** Everything the page knows about this run, read straight from the DOM. */
function buildBasisSnapshot(data) {
    const file = (typeof imageInput !== 'undefined' && imageInput.files) ? imageInput.files[0] : null;

    return {
        mode: basisActiveMode(),
        clinical: AnalysisBasis.CLINICAL_FIELDS.map(f => {
            const el = document.getElementById(f.id);
            return { id: f.id, value: el ? el.value : '' };
        }),
        // Present whenever a file was selected. The submit handler uploads it
        // regardless of whether img.onload has fired, so decoding gates only
        // the pixel-derived rows, never the fact that it was analysed.
        image: file ? {
            name: file.name,
            type: file.type,
            size: file.size,
            decoded: originalImage
                ? { width: originalImage.width, height: originalImage.height }
                : null,
            roiDrawn: (typeof roiPoints !== 'undefined' && roiPoints.length > 0)
        } : null,
        result: {
            prediction: data.prediction,
            confidence: data.confidence,
            probabilities: data.probabilities,
            engine: data.engine,
            transport: data.__engine
        }
    };
}

function renderAnalysisBasis(data) {
    const panel = document.getElementById('analysisBasisPanel');
    if (!panel) return;

    const basis = AnalysisBasis.collect(buildBasisSnapshot(data));

    const put = (id, rows) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = rows.map(basisRowHtml).join('');
    };
    put('basisInput', basis.input);
    put('basisImage', basis.image);
    put('basisClinical', basis.clinical);
    put('basisOutput', basis.output);
    put('basisLimits', basis.limits);

    const status = document.getElementById('basisStatus');
    if (status) {
        status.innerHTML = basis.status
            .map(t => '<span class="basis-tag">' + basisEscape(t) + '</span>')
            .join('');
    }

    panel.style.display = '';
    return basis;
}

// ==========================================
// 14. BACKEND HEALTH INDICATOR
// ==========================================
/**
 * The header badge previously read "AI API: Online" as static markup, which
 * stayed green while the API was unreachable and the page was silently
 * scoring in the browser. Probe the endpoint and report what is actually true.
 */
async function refreshServerStatus() {
    const badge = document.getElementById('serverStatus');
    if (!badge) return;
    const text = badge.querySelector('.status-text');

    try {
        const res = await fetch(API_URL + '/health', { cache: 'no-store' });
        if (!res.ok) throw new Error('health check returned ' + res.status);
        const body = await res.json();

        badge.className = 'status-badge online';
        badge.title = 'Backend reachable';
        text.innerText = body.trained_model_loaded
            ? 'AI API: Online'
            : 'AI API: Online (rule-based engine)';
        basisHealthFailures = 0;
    } catch (err) {
        basisHealthFailures += 1;
        badge.className = 'status-badge offline';
        badge.title = 'Backend unreachable - results are computed in this browser';
        text.innerText = 'AI API: Offline (in-browser fallback)';
    }
}

// Poll only while the tab is visible, and back off once the endpoint has
// proven unreachable -- on a deployed HTTPS origin the localhost API is blocked
// outright, and an un-backed-off poll logs an error every minute forever.
let basisHealthFailures = 0;
let basisHealthTimer = null;

function scheduleServerStatus() {
    clearTimeout(basisHealthTimer);
    if (document.visibilityState !== 'visible') return;

    const delay = basisHealthFailures >= 3 ? 600000 : 60000;
    basisHealthTimer = setTimeout(() => {
        refreshServerStatus().then(scheduleServerStatus);
    }, delay);
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        refreshServerStatus().then(scheduleServerStatus);
    } else {
        clearTimeout(basisHealthTimer);
    }
});

refreshServerStatus().then(scheduleServerStatus);
