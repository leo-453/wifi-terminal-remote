



// ---------------------------------------------------------
// CONFIGURAZIONE BROKER MQTT (WebSocket) - DEFAULT
// ---------------------------------------------------------
const DEFAULT_MQTT = {
    broker: "e46684488ad3440aa9f0b18d79db6b87.s1.eu.hivemq.cloud",
    port: 8884,
    user: "leo453",
    pass: "bsfg805NG"
};

// Parametri MQTT impostati dalla UI remota
let mqttBroker = null;
let mqttPort   = null;
let mqttUser   = null;
let mqttPass   = null;

let client = null;
let mqttReady = false;

let deviceID = null;
let deviceName = null;

const announce_topic = "wifi_terminal/announce";
let discoveredDevices = [];   // <— AGGIUNGERE QUI

let topic_pub = null;   // ESP → UI
let topic_sub = null;   // UI → ESP
let old_topic_pub = null;

// ---------------------------------------------------------
// CLIENT ID REMOTO
// ---------------------------------------------------------
let remoteClientID = localStorage.getItem("remoteClientID");
if (!remoteClientID) {
    remoteClientID = "REMOTE_" + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem("remoteClientID", remoteClientID);
}

// ---------------------------------------------------------
// STATO UI
// ---------------------------------------------------------
function setStatus(txt) {
    document.getElementById("status").innerText = txt;
}

// ---------------------------------------------------------
// CONNESSIONE AL BROKER MQTT (UI REMOTA)
// ---------------------------------------------------------


function connectMQTT() {

    if (!mqttBroker || !mqttPort) {
        console.error("Parametri MQTT mancanti");
        setStatus("parametri mancanti");
        return;
    }

    console.log("Connessione al broker MQTT...");

    const url = `wss://${mqttBroker}:${mqttPort}/mqtt`;

    client = mqtt.connect(url, {
        username: mqttUser,
        password: mqttPass,
        reconnectPeriod: 2000,
        connectTimeout: 5000,
        keepalive: 30,

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

        client.publish(
            `wifi_terminal/${remoteClientID}/status`,
            "REMOTE_CONNECTED",
            { qos: 1, retain: false }
        );

        client.subscribe("wifi_terminal/announce");
        console.log("Sottoscritto a: wifi_terminal/announce");
        client.subscribe("wifi_terminal/bus");
        console.log("Sottoscritto a: wifi_terminal/bus");


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

    client.on('error', () => {
        mqttReady = false;
        setStatus("errore");
    });

    client.on('message', (topic, payload) => {
        onMessageArrived(topic, payload.toString());
    });
}






//===============================================================================


//===
// ---------------------------------------------------------
// GESTIONE MESSAGGI IN ARRIVO
// ---------------------------------------------------------
function onMessageArrived(topic, payload) {

    // ============================
    // BUS DI MESSAGGI FRA SCHEDE
    // ============================
    if (topic === "wifi_terminal/bus") {

        // Formato: SRC>DST:CMD
        const sep1 = payload.indexOf('>');
        const sep2 = payload.indexOf(':');

        if (sep1 > 0 && sep2 > sep1) {
            const src = payload.substring(0, sep1);
            const dst = payload.substring(sep1 + 1, sep2);
            const cmd = payload.substring(sep2 + 1);

            // Log remoto
            if (typeof addMessage === "function") {
                addMessage(`[BUS] ${payload}`);
            }

            // Se il messaggio è destinato a questo dispositivo selezionato
            if (deviceID && dst === deviceID) {
                console.log("BUS → Comando per il dispositivo selezionato:", cmd);
            }

            // Se è broadcast
            if (dst === "*") {
                console.log("BUS → Broadcast:", cmd);
            }
        }

        return;
    }

    // ============================
    // MESSAGGI DAL DISPOSITIVO SELEZIONATO
    // ============================
    if (topic === topic_pub) {

        // Dati per il plotter
        if (payload.startsWith("/")) {
            handlePlotterData(payload);
            return;
        }

        console.log("RX:", payload);

        if (typeof addMessage === "function") {
            addMessage(payload);
        }

        return;
    }

    // ============================
    // ANNOUNCE DEI DISPOSITIVI
    // ============================
    if (topic === announce_topic && payload.startsWith("HELLO:")) {

        const parts = payload.split(":");
        const id = parts[1];
        const name = parts[2] || "(senza nome)";

        if (!discoveredDevices.some(d => d.id === id)) {
            discoveredDevices.push({ id, name });
            aggiornaListaDispositivi();
        }

        console.log("Dispositivo rilevato:", name, id);
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

    topic_pub = `wifi_terminal/${deviceID}/rx`;  // UI RICEVE
    topic_sub = `wifi_terminal/${deviceID}/tx`;  // UI TRASMETTE A ESP

    if (!mqttReady) {
        console.warn("MQTT non pronto, rimando subscribe...");
        return;
    }

    if (old_topic_pub) {
        client.unsubscribe(old_topic_pub);
    }

    client.subscribe(topic_pub);
    old_topic_pub = topic_pub;

    console.log("Dispositivo selezionato:", deviceName, deviceID);

    document.getElementById("selectedDevice").innerText =
        `${deviceName} (${deviceID})`;

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

    //let text = cmd;   // formato semplice e stabile

    console.log("TX →", topic_sub, ":", cmd); // trasmette verso ESP TX → wifi_terminal/B2E45/rx : lg
    client.publish(topic_sub, cmd);

    document.getElementById("msg").value = "";
    document.getElementById("msg").focus();
}


// ---------------------------------------------------------
// PING PERIODICO (necessario per la FSM dell’ESP)
// ---------------------------------------------------------
setInterval(() => {
    if (mqttReady && deviceID) {
        const controlTopic = `wifi_terminal/${deviceID}/control`;
        client.publish(controlTopic, "PING");
        console.log("PING →", controlTopic);
    }
}, 10000);   // ogni 10 secondi




window.addEventListener("beforeunload", () => {
    if (mqttReady) {
        client.publish(
            `wifi_terminal/${remoteClientID}/status`,
            "REMOTE_DISCONNECTED",
            { qos: 1, retain: false }
        );
    }
});


function sendBus(dst, cmd) {
    if (!mqttReady) return;

    const msg = `${remoteClientID}>${dst}:${cmd}`;
    client.publish("wifi_terminal/bus", msg);

    if (typeof addMessage === "function") {
        addMessage(`[BUS-SENT] ${msg}`);
    }
}


window.selezionaDispositivo = selezionaDispositivo;
window.publishMessage = publishMessage;
