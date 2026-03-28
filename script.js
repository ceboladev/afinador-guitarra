const noteNameEl = document.getElementById('note-name');
const freqEl = document.getElementById('frequency');
const pointer = document.getElementById('pointer');
const startBtn = document.getElementById('start-btn');

let audioCtx;
let analyser;
let buffer;

// Mapeamento de notas e frequências
const notes = [
    { name: "C", freq: 16.35 }, { name: "C#", freq: 17.32 }, { name: "D", freq: 18.35 },
    { name: "D#", freq: 19.45 }, { name: "E", freq: 20.60 }, { name: "F", freq: 21.83 },
    { name: "F#", freq: 23.12 }, { name: "G", freq: 24.50 }, { name: "G#", freq: 25.96 },
    { name: "A", freq: 27.50 }, { name: "A#", freq: 29.14 }, { name: "B", freq: 30.87 }
];

function getNote(frequency) {
    const lnote = 12 * (Math.log2(frequency / 440)) + 69;
    const cents = Math.floor(lnote);
    const detune = Math.floor((lnote - cents) * 100);
    const noteIndex = cents % 12;
    return { name: notes[noteIndex].name, detune: detune };
}

async function startTuner() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtx.createMediaStreamSource(stream);
    
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    buffer = new Float32Array(analyser.fftSize);
    source.connect(analyser);
    
    update();
}

function update() {
    analyser.getFloatTimeDomainData(buffer);
    const frequency = autoCorrelate(buffer, audioCtx.sampleRate);

    if (frequency !== -1) {
        const note = getNote(frequency);
        noteNameEl.innerText = note.name;
        freqEl.innerText = frequency.toFixed(2);
        
        // Move o ponteiro: detune varia de -50 a 50
        const rotation = note.detune; 
        pointer.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
    }
    
    requestAnimationFrame(update);
}

// Algoritmo simples de Autocorrelação para detectar o pitch
function autoCorrelate(buffer, sampleRate) {
    let SIZE = buffer.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        rms += buffer[i] * buffer[i];
    }
    if (Math.sqrt(rms / SIZE) < 0.05) return -1; // Silêncio

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
        if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
        if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    let buf = buffer.slice(r1, r2);
    SIZE = buf.length;

    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE - i; j++) {
            c[i] = c[i] + buf[j] * buf[j + i];
        }
    }

    let d = 0; while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    return sampleRate / maxpos;
}

startBtn.onclick = () => {
    startTuner();
    startBtn.style.display = 'none';
};