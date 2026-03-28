const noteNameEl = document.getElementById('note-name');
const freqEl = document.getElementById('frequency');
const pointer = document.getElementById('pointer');
const startBtn = document.getElementById('start-btn');

let audioCtx;
let analyser;
let buffer;
let rotationHistory = [];
const SMOOTHING_AMOUNT = 5;

// Notas que o afinador vai reconhecer
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getNote(frequency) {
    const noteNum = 12 * (Math.log2(frequency / 440)) + 69;
    const noteIndex = Math.round(noteNum) % 12;
    const detune = (noteNum - Math.round(noteNum)) * 100;
    return { name: noteStrings[noteIndex], detune: detune };
}

async function startTuner() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false } 
        });

        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 4096; 
        buffer = new Float32Array(analyser.fftSize);
        source.connect(analyser);

        startBtn.innerText = "OUVINDO...";
        update();
    } catch (err) {
        alert("Erro no microfone: " + err);
    }
}

function update() {
    analyser.getFloatTimeDomainData(buffer);
    const frequency = autoCorrelate(buffer, audioCtx.sampleRate);

    if (frequency !== -1 && frequency < 1000) {
        const note = getNote(frequency);
        
        // 1. ESTABILIZAÇÃO DO PONTEIRO
        const targetRotation = note.detune * 1.5;
        rotationHistory.push(targetRotation);
        if (rotationHistory.length > SMOOTHING_AMOUNT) rotationHistory.shift();
        const averageRotation = rotationHistory.reduce((a, b) => a + b) / rotationHistory.length;

        // Move o ponteiro
        pointer.style.transform = `translateX(-50%) rotate(${averageRotation}deg)`;
        noteNameEl.innerText = note.name;
        freqEl.innerText = frequency.toFixed(1) + " Hz";

        // 2. LÓGICA DAS CORDAS (COM TRY/CATCH PARA NÃO TRAVAR O RESTO)
        try {
            // Limpa todas
            document.querySelectorAll('.string').forEach(s => s.classList.remove('active'));
            
            // Procura a corda pelo data-note (Ex: nota "E" acende data-note="E")
            const activeString = document.querySelector(`.string[data-note="${note.name}"]`);
            if (activeString) {
                activeString.classList.add('active');
            }
        } catch (e) { console.log("Erro visual nas cordas ignorado"); }

        // Cor do ponteiro
        if (Math.abs(averageRotation) < 5) {
            noteNameEl.style.color = "#2ecc71";
            pointer.style.background = "#2ecc71";
        } else {
            noteNameEl.style.color = "white";
            pointer.style.background = "#FF6B00";
        }
    }
    requestAnimationFrame(update);
}

function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    if (Math.sqrt(rms / SIZE) < 0.005) return -1; // Sensibilidade ajustada

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;
    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++)
        for (let j = 0; j < SIZE - i; j++)
            c[i] = c[i] + buf[j] * buf[j + i];

    let d = 0; while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }
    return sampleRate / maxpos;
}

startBtn.addEventListener('click', startTuner);