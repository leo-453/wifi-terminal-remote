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
        keepalive: 30
    });

    client.on('connect', () => {
        mqttReady = true;
        console.log("MQTT connesso");
        setStatus("connesso");

        client.subscribe(announce_topic);
        console.log("Sottoscritto a:", announce_topic);
    });

    client.on('reconnect', () => {
        mqttReady = false;
        console.warn("MQTT: riconnessione...");
        setStatus("riconnessione...");
    });

    client.on('close', () => {
        mqttReady = false;
        console.warn("MQTT: connessione chiusa");
        setStatus("disconnesso");
    });

    client.on('error', (err) => {
        mqttReady = false;
        console.error("MQTT errore:", err);
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
    // DATI PER IL PLOTTER
    // -----------------------------
   if (topic === topic_pub) {
    if (payload.startsWith("/")) {
        handlePlotterData(payload);
        return;
    }
 // Altrimenti → va nella finestra Output
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

        // Risposta automatica: PING
        if (mqttReady) {
            const controlTopic = `wifi_terminal/${id}/control`;
            client.publish(controlTopic, "PING");
            console.log("PING inviato a", controlTopic);
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

    // Disiscrizione dal vecchio topic
    if (old_topic_pub) {
        client.unsubscribe(old_topic_pub);
    }

    topic_pub = `wifi_terminal/${deviceID}/rx`;
    topic_sub = `wifi_terminal/${deviceID}/tx`;

    client.subscribe(topic_pub);
    old_topic_pub = topic_pub;

    console.log("Dispositivo selezionato:", deviceName, deviceID);

    document.getElementById("selectedDevice").innerText =
        `${deviceName} (${deviceID})`;

    // -----------------------------
    // RESET PLOTTER AL CAMBIO DEVICE
    // -----------------------------
    if (typeof plotterBuf !== "undefined") {
        plotterBuf = [];
        drawPlotter();
    }
}



// ---------------------------------------------------------
// INVIO MESSAGGIO AL DISPOSITIVO
// ---------------------------------------------------------
function publishMessage() {
    let text = document.getElementById("msg").value;

    if (!text) {
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

window.selezionaDispositivo = selezionaDispositivo;
window.publishMessage = publishMessage;
