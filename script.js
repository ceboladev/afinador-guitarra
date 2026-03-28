const noteNameEl = document.getElementById('note-name');
const freqEl = document.getElementById('frequency');
const pointer = document.getElementById('pointer');
const startBtn = document.getElementById('start-btn');
const strings = document.querySelectorAll('.string');

let audioCtx;
let analyser;
let buffer;

// Tabela de frequências das notas (Escala Cromática)
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getNote(frequency) {
    // Cálculo matemático para converter frequência em nota musical
    const noteNum = 12 * (Math.log2(frequency / 440)) + 69;
    const noteIndex = Math.round(noteNum) % 12;
    const detune = (noteNum - Math.round(noteNum)) * 100; // Quão longe do centro está (em cents)
    return {
        name: noteStrings[noteIndex],
        detune: detune
    };
}

// Aumente o fftSize para 4096 para ter mais precisão no grave do violão (E2)
async function startTuner() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        // Configurações críticas para Músicos: Desliga filtros de voz
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false,
                latency: 0
            } 
        });

        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 4096; // Dobramos o tamanho para pegar notas baixas
        buffer = new Float32Array(analyser.fftSize);
        source.connect(analyser);

        startBtn.innerText = "OUVINDO...";
        update();
    } catch (err) {
        alert("Erro: " + err);
    }
}

function update() {
    analyser.getFloatTimeDomainData(buffer);
    
    // O autoCorrelate precisa do buffer e do sampleRate
    const frequency = autoCorrelate(buffer, audioCtx.sampleRate);

    // DEBUG: Se nada estiver acontecendo, vamos forçar o console a nos dizer
    // Abra o F12 no navegador para ver se os números aparecem lá
    console.log("Frequência detectada:", frequency);

    if (frequency !== -1 && frequency > 20 && frequency < 2000) {
        const note = getNote(frequency);
        const rotation = note.detune * 1.5; 

        pointer.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        noteNameEl.innerText = note.name;
        freqEl.innerText = frequency.toFixed(1) + " Hz";

        if (Math.abs(note.detune) < 5) {
            noteNameEl.style.color = "#2ecc71";
            pointer.style.background = "#2ecc71";
        } else {
            noteNameEl.style.color = "white";
            pointer.style.background = "#FF6B00";
        }
    }
    requestAnimationFrame(update);
}

// Algoritmo de Autocorrelação (detecta o tom real)
function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        val = buf[i];
        rms += val * val;
    }
    if (Math.sqrt(rms / SIZE) < 0.001) return -1;

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
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    return sampleRate / maxpos;
}

// Evento de clique no botão
startBtn.addEventListener('click', () => {
    startTuner();
});