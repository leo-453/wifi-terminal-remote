console.log("MQTT Remote Terminal loaded");

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
  });

  // -----------------------------
  // INIZIALIZZA PLOTTER
  // -----------------------------
  plotter = new SimplePlotter("plotterCanvas");

  const btnPlotter = document.getElementById("btnPlotter");
  if (btnPlotter) {
    btnPlotter.addEventListener("click", () => {
      plotterVisible = !plotterVisible;

      const panel = document.getElementById("plotterPanel");
      if (panel) {
        panel.style.display = plotterVisible ? "block" : "none";
      }

      if (plotterVisible) plotter.start();
      else plotter.stop();
    });
  }
});



    start() {
        if (!this.running) {
            this.running = true;
            this.loop();
        }
    }

    stop() {
        this.running = false;
    }

    addData(csvLine) {
        const parts = csvLine.split(",").map(v => parseFloat(v));
        if (parts.length < 2) return;

        this.data.push(parts.slice(1));
        if (this.data.length > this.maxPoints) this.data.shift();
    }

    loop() {
        if (!this.running) return;
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (this.data.length < 2) return;

        const seriesCount = this.data[0].length;
        const colors = ["#d00", "#06c", "#0a0", "#c60", "#909"];

        for (let s = 0; s < seriesCount; s++) {
            ctx.strokeStyle = colors[s % colors.length];
            ctx.beginPath();

            for (let i = 0; i < this.data.length; i++) {
                const x = (i / (this.data.length - 1)) * w;
                const y = h - (this.data[i][s] * h);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.stroke();
        }
    }
}






// -----------------------------
// ESPORTA FUNZIONI GLOBALI
// -----------------------------
window.addMessage = addMessage;
window.clearMessageLog = clearMessageLog;
window.sendMessage = sendMessage;
