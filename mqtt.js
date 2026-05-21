// ---------------------------------------------------------
// CONFIGURAZIONE BROKER MQTT (WebSocket)
// ---------------------------------------------------------
broker = "e46684488ad3440aa9f0b18d79db6b87.s1.eu.hivemq.cloud";
port = 8884;
useTLS = true;

const mqtt_user = "leo453";
const mqtt_pass = "bsfg805NG";

const announce_topic = "wifi_terminal/announce";

let client = null;
let mqttReady = false;

let deviceID = null;
let deviceName = null;

let topic_pub = null;   // ESP → UI
let topic_sub = null;   // UI → ESP

let old_topic_pub = null;
let discoveredDevices = [];


// =====================================
// Generazione clientID remoto persistente
// =====================================
let remoteClientID = localStorage.getItem("remoteClientID");
if (!remoteClientID) {
    remoteClientID = "REMOTE_" + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem("remoteClientID", remoteClientID);
}


// ---------------------------------------------------------
// FUNZIONE STATO UI
// ---------------------------------------------------------
function setStatus(txt) {
    document.getElementById("status").innerText = txt;
}


// ---------------------------------------------------------
// CONNESSIONE AL BROKER MQTT
// ---------------------------------------------------------

function connectMQTT() {
    console.log("Connessione al broker MQTT...");

    client = mqtt.connect(`wss://${broker}:${port}/mqtt`, {
        username: mqtt_user,
        password: mqtt_pass,
        reconnectPeriod: 2000,
        connectTimeout: 5000,
        keepalive: 30,

        // LWT: se la UI remota si chiude male
        will: {
            topic: `wifi_terminal/${remoteClientID}/status`,
            payload: "REMOTE_DISCONNECTED",
            qos: 1,
            retain: false
        }
    });

    client.on('connect', () => {
        mqttReady = true;
        console.log("MQTT connesso");
        setStatus("connesso");

        // Annuncio presenza remota
        client.publish(
            `wifi_terminal/${remoteClientID}/status`,
            "REMOTE_CONNECTED",
            { qos: 1, retain: false }
        );

        client.subscribe(announce_topic);
        console.log("Sottoscritto a:", announce_topic);

        if (topic_pub) {
            client.subscribe(topic_pub);
            old_topic_pub = topic_pub;
        }
    });

    client.on('reconnect', () => {
        mqttReady = false;
        setStatus("riconnessione...");
    });

    client.on('close', () => {
        mqttReady = false;
        setStatus("disconnesso");
    });

    client.on('error', (err) => {
        mqttReady = false;
        setStatus("errore");
    });

    client.on('message', (topic, payload) => {
        onMessageArrived(topic, payload.toString());
    });
}


// ---------------------------------------------------------
// GESTIONE MESSAGGI IN ARRIVO
// ---------------------------------------------------------
function onMessageArrived(topic, payload) {

    // -----------------------------
    // MESSAGGI DAL DISPOSITIVO SELEZIONATO
    // -----------------------------
    if (topic === topic_pub) {

        // Se inizia con "/" → è per il Plotter
        if (payload.startsWith("/")) {
            handlePlotterData(payload);
            return;
        }

        // Altrimenti → Output
        console.log("RX:", payload);
        document.getElementById("lastMessage").innerText = payload;

        if (typeof addMessage === "function") {
            addMessage(payload);
        }

        return;
    }

    // -----------------------------
    // ANNUNCIO DISPOSITIVO
    // -----------------------------
    if (topic === announce_topic && payload.startsWith("HELLO:")) {

        const parts = payload.split(":");
        const id = parts[1];
        const name = parts[2] || "(senza nome)";

        if (!discoveredDevices.some(d => d.id === id)) {
            discoveredDevices.push({ id, name });
            aggiornaListaDispositivi();
        }

        console.log("Dispositivo rilevato:", name, id);

        if (mqttReady) {
            const controlTopic = `wifi_terminal/${id}/control`;
            //client.publish(controlTopic, "PING");
            //console.log("PING inviato a", controlTopic);
        }

        return;
    }
}



// ---------------------------------------------------------
// AGGIORNA LISTA DISPOSITIVI
// ---------------------------------------------------------
function aggiornaListaDispositivi() {
    const sel = document.getElementById("deviceList");
    sel.innerHTML = "";

    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "-- seleziona un dispositivo --";
    sel.appendChild(empty);

    discoveredDevices.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = `${d.name} (${d.id})`;
        sel.appendChild(opt);
    });
}



// ---------------------------------------------------------
// SELEZIONE DISPOSITIVO
// ---------------------------------------------------------
function selezionaDispositivo() {
    const sel = document.getElementById("deviceList");
    deviceID = sel.value;

    if (!deviceID) {
        console.warn("Nessun deviceID selezionato");
        document.getElementById("selectedDevice").innerText = "nessuno";
        return;
    }

    const fullLabel = sel.options[sel.selectedIndex].textContent;
    deviceName = fullLabel.split(" (")[0];

    topic_pub = `wifi_terminal/${deviceID}/tx`;
    topic_sub = `wifi_terminal/${deviceID}/rx`;

    // Se MQTT non è ancora connesso → aspetta
    if (!mqttReady) {
        console.warn("MQTT non pronto, rimando subscribe...");
        return;
    }

    // Disiscrizione dal vecchio topic
    if (old_topic_pub) {
        client.unsubscribe(old_topic_pub);
    }

    client.subscribe(topic_pub);
    old_topic_pub = topic_pub;

    console.log("Dispositivo selezionato:", deviceName, deviceID);

    document.getElementById("selectedDevice").innerText =
        `${deviceName} (${deviceID})`;

    // Reset plotter
    if (typeof plotterBuf !== "undefined") {
        plotterBuf = [];
        drawPlotter();
    }
}



// ---------------------------------------------------------
// INVIO MESSAGGIO AL DISPOSITIVO
// ---------------------------------------------------------
function publishMessage() {
    let cmd = document.getElementById("msg").value;

    if (!cmd) {
        alert("Inserisci un messaggio");
        return;
    }

    if (!deviceID || !topic_sub) {
        alert("Nessun dispositivo selezionato!");
        return;
    }

    if (!mqttReady) {
        console.warn("MQTT non pronto, messaggio non inviato");
        return;
    }

    let text = remoteClientID + ":" + cmd;   // <=== FORMATO CORRETTO

    console.log("TX →", topic_sub, ":", text);
    client.publish(topic_sub, text);

    document.getElementById("msg").value = "";
    document.getElementById("msg").focus();
}


// ---------------------------------------------------------
// AVVIO AUTOMATICO
// ---------------------------------------------------------
window.addEventListener("load", () => {

    connectMQTT();   // UNA sola volta

    const input = document.getElementById("msg");
    input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            publishMessage();
        }
    });
});

window.addEventListener("beforeunload", () => {
    if (mqttReady) {
        client.publish(
            `wifi_terminal/${remoteClientID}/status`,
            "REMOTE_DISCONNECTED",
            { qos: 1, retain: false }
        );
    }
});


window.selezionaDispositivo = selezionaDispositivo;
window.publishMessage = publishMessage;

