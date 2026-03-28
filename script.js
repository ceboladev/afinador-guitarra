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

async function startTuner() {
    try {
        // 1. Inicializa o contexto de áudio (Necessário clique do usuário)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 2. Garante que o áudio não esteja suspenso (comum em celulares)
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        // 3. Pede permissão do microfone
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false
            } 
        });

        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048; 
        buffer = new Float32Array(analyser.fftSize);
        source.connect(analyser);

        // Muda o texto do botão para indicar que está ouvindo
        startBtn.innerText = "OUVINDO...";
        startBtn.style.background = "#333";
        startBtn.disabled = true;

        update();
    } catch (err) {
        console.error("Erro:", err);
        alert("Erro ao acessar microfone. Verifique se o site está em HTTPS!");
    }
}

function update() {
    analyser.getFloatTimeDomainData(buffer);
    const frequency = autoCorrelate(buffer, audioCtx.sampleRate);

    if (frequency !== -1 && frequency < 1000) {
        const note = getNote(frequency);
        
        // Move o ponteiro: note.detune vai de -50 a 50
        // Multiplicamos por 1.2 para o ponteiro percorrer mais o arco
        const rotation = note.detune * 1.2; 
        
        // IMPORTANTE: Mantemos o translateX(-50%) para ele não sair do centro
        pointer.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        
        noteNameEl.innerText = note.name;
        freqEl.innerText = frequency.toFixed(1) + " Hz";

        // Cor de feedback (Verde se estiver afinado)
        if (Math.abs(note.detune) < 5) {
            noteNameEl.style.color = "#2ecc71"; // Verde
            pointer.style.background = "#2ecc71";
        } else {
            noteNameEl.style.color = "white";
            pointer.style.background = "#FF6B00"; // Laranja Cifra
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
    if (Math.sqrt(rms / SIZE) < 0.01) return -1;

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