console.log("MQTT Remote Terminal loaded");


// ===============================
// PLOTTER REMOTO MQTT - VARIABILI
// ===============================
let plotterRunning = true;
let plotterBuf = [];          // buffer per ogni curva
let plotterMax = Number(localStorage.getItem("plotterMax")) || 4095;
let plotterRecording = false;
let plotterCSV = [];
let plotterLastValues = [];



// -----------------------------
// BUFFER MESSAGGI + STORICO
// -----------------------------
let messageBuffer = [];
const MAX_MESSAGES = 20;

// Aggiunge un messaggio al buffer
function addMessage(msg) {

 const entry = msg; // nessun timestamp
  messageBuffer.push(entry);

  if (messageBuffer.length > MAX_MESSAGES) {
    messageBuffer.shift();
  }

  updateMessageArea();
}

// Aggiorna la UI dello storico
function updateMessageArea() {
  const logDiv = document.getElementById("messageLog");
  if (!logDiv) return;

  logDiv.textContent = messageBuffer.join("\n");
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Pulsante "Elimina Storico"
function clearMessageLog() {
  if (!confirm("Vuoi davvero eliminare lo storico dei messaggi?")) return;

  messageBuffer = [];
  updateMessageArea();
}

// -----------------------------
// LOG DISATTIVATO (non serve più)
// -----------------------------
function log(msg) {
  // finestra log rimossa
}

// -----------------------------
// INVIO MESSAGGI
// -----------------------------
function sendMessage() {
  const msg = document.getElementById("msg").value;

  if (!msg) return;

  // Il topic corretto è quello definito in mqtt.js
  if (window.topic_sub && window.client && window.client.connected) {
    client.publish(topic_sub, msg);
  }

  document.getElementById("msg").value = "";
  document.getElementById("msg").focus();
}

class SimplePlotter {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.running = false;
        this.data = [];
        this.maxPoints = 500;
    }

let plotter = null;
let plotterVisible = false;



// Invio con tasto Invio
window.addEventListener("load", () => {
  // Gestione invio messaggi
  const input = document.getElementById("msg");
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      sendMessage();
    }


// Inizializza input FS
const fsInput = document.getElementById("plotterMaxInput");
if (fsInput) fsInput.value = plotterMax;

// Pulsante RUN/STOP
document.getElementById("plotterRunStop").onclick = () => {
    plotterRunning = !plotterRunning;
    document.getElementById("plotterRunStop").textContent =
        plotterRunning ? "STOP" : "RUN";
};

// Pulsante FS
document.getElementById("plotterFS").onclick = () => {
    const fsCtrl = document.getElementById("plotterFSControl");
    fsCtrl.style.display =
        (fsCtrl.style.display === "none" || fsCtrl.style.display === "")
            ? "inline-block"
            : "none";
};

// Pulsante SET FS
document.getElementById("plotterSetMax").onclick = () => {
    const v = Number(document.getElementById("plotterMaxInput").value);
    if (v > 0) {
        plotterMax = v;
        localStorage.setItem("plotterMax", v);

        // Svuota buffer
        plotterBuf = plotterBuf.map(() => []);

        drawPlotter();
    }
};

// Pulsante RECORD
document.getElementById("plotterRecord").onclick = () => {
    plotterRecording = !plotterRecording;

    const btn = document.getElementById("plotterRecord");

    if (plotterRecording) {
        btn.style.background = "#600";
        btn.textContent = "REC...";
        plotterCSV = [];
    } else {
        btn.style.background = "#333";
        btn.textContent = "Record";

        if (plotterCSV.length > 0) {
            const csvContent = "data:text/csv;charset=utf-8," + plotterCSV.join("\n");
            const a = document.createElement("a");
            a.href = encodeURI(csvContent);
            a.download = "plot.csv";
            a.click();
        }
    }
};

});

  

// ========================================
// HANDLE PLOTTER DATA (MQTT → Plotter)
// ========================================
function handlePlotterData(line) {
    if (!plotterRunning) return;

    // Rimuove eventuale slash iniziale (compatibilità)
    if (line.startsWith("/")) line = line.substring(1);

    const parts = line.split("/");

    // Primo elemento = timestamp
    const timestamp = Number(parts[0]);

    // Tutto il resto = valori
    const values = parts.slice(1).map(Number);

    plotterLastValues = values;

    // Inizializza buffer se necessario
    if (!Array.isArray(plotterBuf[0])) {
        plotterBuf = values.map(() => []);
    }

    // Aggiorna buffer
    for (let i = 0; i < values.length; i++) {
        plotterBuf[i].push(values[i]);
        if (plotterBuf[i].length > 300) plotterBuf[i].shift();
    }

    // CSV
    if (plotterRecording) {
        plotterCSV.push(timestamp + "," + values.join(","));
    }

    updatePlotterValues(values);
    drawPlotter();
}



function updatePlotterValues(values) {
    const colors = ["red", "cyan", "yellow", "lime"];
    let html = "";

    values.forEach((v, i) => {
        html += `<span style="color:${colors[i]}; margin-right:12px;">${v}</span>`;
    });

    document.getElementById("plotterValues").innerHTML = html;
}


// ========================================
// DRAW PLOTTER (identico alla UI WiFi)
// ========================================
function drawPlotter() {
    const canvas = document.getElementById("plotterCanvas");
    const ctx = canvas.getContext("2d");

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // --- GRIGLIA ---
    ctx.strokeStyle = "#808080";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);

    const stepX = 50;
    const stepY = 50;

    for (let x = 0; x < W; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }

    for (let y = 0; y < H; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    ctx.setLineDash([]);

    // --- ASSI ---
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;

    // Asse X
    ctx.beginPath();
    ctx.moveTo(0, H - 1);
    ctx.lineTo(W, H - 1);
    ctx.stroke();

    // Asse Y
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(1, H);
    ctx.stroke();

    // --- SCRITTA FS ---
    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    ctx.fillText("FS: " + plotterMax, 10, 20);

    // --- CURVE ---
    const colors = ["red", "cyan", "yellow", "lime"];

    plotterBuf.forEach((curve, idx) => {
        ctx.strokeStyle = colors[idx % colors.length];
        ctx.lineWidth = 2;

        ctx.beginPath();

        curve.forEach((realValue, i) => {
            const norm = realValue / plotterMax * 100;

            const x = (i / 300) * W;
            const y = H - (norm / 100) * H;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();
    });
}


// -----------------------------
// ESPORTA FUNZIONI GLOBALI
// -----------------------------
window.addMessage = addMessage;
window.clearMessageLog = clearMessageLog;
window.sendMessage = sendMessage;
