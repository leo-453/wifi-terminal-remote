console.log("MQTT Remote Terminal loaded");


// ===============================
// PLOTTER REMOTO MQTT - VARIABILI
// ===============================
let plotterRunning = true;
let plotterBuf = [];
let plotterMax = Number(localStorage.getItem("plotterMax")) || 4095;
let plotterRecording = false;
let plotterCSV = [];
let plotterLastValues = [];


// ===============================
// BUFFER MESSAGGI + STORICO
// ===============================
let messageBuffer = [];
const MAX_MESSAGES = 20;

function addMessage(msg) {
  messageBuffer.push(msg);
  if (messageBuffer.length > MAX_MESSAGES) messageBuffer.shift();
  updateMessageArea();
}

function updateMessageArea() {
  const logDiv = document.getElementById("messageLog");
  if (!logDiv) return;
  logDiv.textContent = messageBuffer.join("\n");
  logDiv.scrollTop = logDiv.scrollHeight;
}

function clearMessageLog() {
  if (!confirm("Vuoi davvero eliminare lo storico dei messaggi?")) return;
  messageBuffer = [];
  updateMessageArea();
}

function sendMessage() {
  const msg = document.getElementById("msg").value;
  if (!msg) return;

  if (window.topic_sub && window.client && window.client.connected) {
    client.publish(topic_sub, msg);
  }

  document.getElementById("msg").value = "";
  document.getElementById("msg").focus();
}


// ===============================
// INIT UI
// ===============================
window.addEventListener("load", () => {

  // Invio con ENTER
  const input = document.getElementById("msg");
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      sendMessage();
    }
  });

  // Inizializza FS
  const fsInput = document.getElementById("plotterMaxInput");
  if (fsInput) fsInput.value = plotterMax;

  // RUN/STOP
  document.getElementById("plotterRunStop").onclick = () => {
    plotterRunning = !plotterRunning;
    document.getElementById("plotterRunStop").textContent =
      plotterRunning ? "STOP" : "RUN";
  };

  // FS toggle
  document.getElementById("plotterFS").onclick = () => {
    const fsCtrl = document.getElementById("plotterFSControl");
    fsCtrl.style.display =
      (fsCtrl.style.display === "none" || fsCtrl.style.display === "")
        ? "inline-block"
        : "none";
  };

  // SET FS
  document.getElementById("plotterSetMax").onclick = () => {
    const v = Number(document.getElementById("plotterMaxInput").value);
    if (v > 0) {
      plotterMax = v;
      localStorage.setItem("plotterMax", v);
      plotterBuf = plotterBuf.map(() => []);
      drawPlotter();
    }
     // Chiudi pannello FS
    document.getElementById("plotterFSControl").style.display = "none";
  };

document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
        const fsCtrl = document.getElementById("plotterFSControl");
        fsCtrl.style.display = "none";
    }
});

  
  // RECORD
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

// ===============================
// TOGGLE PLOTTER PANEL
// ===============================
document.getElementById("plotterToggle").onclick = () => {

    const panel = document.getElementById("plotterPanel");
    const btn   = document.getElementById("plotterToggle");
    const fsCtrl = document.getElementById("plotterFSControl");
    const recBtn = document.getElementById("plotterRecord");

    // Se è chiuso → apri
    if (panel.style.display === "none" || panel.style.display === "") {

        panel.style.display = "block";
        btn.textContent = "Plotter_off";

        // Chiudi pannello FS
        fsCtrl.style.display = "none";

    } else {

        // Se è aperto → chiudi
        panel.style.display = "none";
        btn.textContent = "Plotter";

        // Chiudi pannello FS
        fsCtrl.style.display = "none";

        // Se stiamo registrando → stop + salva CSV
        if (plotterRecording) {
            plotterRecording = false;
            recBtn.style.background = "#333";
            recBtn.textContent = "Record";

            if (plotterCSV.length > 0) {
                const csvContent = "data:text/csv;charset=utf-8," + plotterCSV.join("\n");
                const a = document.createElement("a");
                a.href = encodeURI(csvContent);
                a.download = "plot.csv";
                a.click();
            }

            plotterCSV = [];
        }
    }
};

// ===============================
// HANDLE PLOTTER DATA
// ===============================
function handlePlotterData(line) {
  if (!plotterRunning) return;

  if (line.startsWith("/")) line = line.substring(1);

  const parts = line.split("/");
  const timestamp = Number(parts[0]);
  const values = parts.slice(1).map(Number);

  plotterLastValues = values;

  if (!Array.isArray(plotterBuf[0])) {
    plotterBuf = values.map(() => []);
  }

  for (let i = 0; i < values.length; i++) {
    plotterBuf[i].push(values[i]);
    if (plotterBuf[i].length > 300) plotterBuf[i].shift();
  }

  if (plotterRecording) {
    plotterCSV.push(timestamp + "," + values.join(","));
  }

  updatePlotterValues(values);
  drawPlotter();
}


// ===============================
// VALORI INFERIORI
// ===============================
function updatePlotterValues(values) {
  const colors = ["red", "cyan", "yellow", "lime"];
  let html = "";

  values.forEach((v, i) => {
    html += `<span style="color:${colors[i]}; margin-right:12px;">${v}</span>`;
  });

  document.getElementById("plotterValues").innerHTML = html;
}


// ===============================
// DRAW PLOTTER
// ===============================

function drawPlotter() {

  const canvas = document.getElementById("plotterCanvas");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  // Sfondo nero
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Griglia
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

  // Assi
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, H - 1);
  ctx.lineTo(W, H - 1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(1, 0);
  ctx.lineTo(1, H);
  ctx.stroke();

  // FS
  ctx.fillStyle = "#fff";
  ctx.font = "14px monospace";
  ctx.fillText("FS: " + plotterMax, 10, 20);

  // Curve
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






// ===============================
// DRAG DEL PANNELLO PLOTTER
// ===============================
(function () {
    const box = document.getElementById("plotterPanel");
    let mx = 0, my = 0, dragging = false;

    box.addEventListener("mousedown", e => {
        dragging = true;
        mx = e.clientX;
        my = e.clientY;
    });

    document.addEventListener("mousemove", e => {
        if (!dragging) return;

        const dx = e.clientX - mx;
        const dy = e.clientY - my;

        mx = e.clientX;
        my = e.clientY;

        const rect = box.getBoundingClientRect();
        box.style.left = (rect.left + dx) + "px";
        box.style.top = (rect.top + dy) + "px";
    });

    document.addEventListener("mouseup", () => dragging = false);
})();

// ===============================
// EXPORT
// ===============================
window.addMessage = addMessage;
window.clearMessageLog = clearMessageLog;
window.sendMessage = sendMessage;
