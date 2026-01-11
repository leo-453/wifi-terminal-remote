// ---------------------------------------------------------
// CONFIGURAZIONE BROKER MQTT (WebSocket)
// ---------------------------------------------------------
//const broker = "test.mosquitto.org";
//const port = 8081;

broker = "e46684488ad3440aa9f0b18d79db6b87.s1.eu.hivemq.cloud";
port = 8884;
useTLS = true;

username = "leo453";
password = "bsfg805NG";


const announce_topic = "wifi_terminal/announce";

let client = null;
let mqttReady = false;

let deviceID = null;
let deviceName = null;

let topic_pub = null;   // ESP → UI
let topic_sub = null;   // UI → ESP

let discoveredDevices = [];


// ---------------------------------------------------------
// CONNESSIONE AL BROKER MQTT
// ---------------------------------------------------------
function connectMQTT() {
    console.log("Connessione al broker MQTT...");

    client = mqtt.connect(`wss://${broker}:${port}`, {
        reconnectPeriod: 2000,   // tenta reconnect ogni 2s
        connectTimeout: 5000,    // timeout handshake
        keepalive: 30            // ping ogni 30s
    });

    // Evento: connessione stabilita
    client.on('connect', () => {
        mqttReady = true;
        console.log("MQTT connesso");
        document.getElementById("status").innerText = "connesso";

        client.subscribe(announce_topic);
        console.log("Sottoscritto a:", announce_topic);
    });

    // Evento: riconnessione in corso
    client.on('reconnect', () => {
        mqttReady = false;
        console.warn("MQTT: riconnessione...");
        document.getElementById("status").innerText = "riconnessione...";
    });

    // Evento: connessione chiusa
    client.on('close', () => {
        mqttReady = false;
        console.warn("MQTT: connessione chiusa");
        document.getElementById("status").innerText = "disconnesso";
    });

    // Evento: errore
    client.on('error', (err) => {
        mqttReady = false;
        console.error("MQTT errore:", err);
        document.getElementById("status").innerText = "errore";
    });

    // Evento: messaggio ricevuto
    client.on('message', (topic, payload) => {
        onMessageArrived(topic, payload.toString());
    });
}



// ---------------------------------------------------------
// GESTIONE MESSAGGI IN ARRIVO
// ---------------------------------------------------------
function onMessageArrived(topic, payload) {

    // Annuncio dispositivo
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

    // Messaggi dal dispositivo selezionato
    if (topic === topic_pub) {
        console.log("RX:", payload);
        document.getElementById("lastMessage").innerText = payload;
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

    topic_pub = `wifi_terminal/${deviceID}/rx`;
    topic_sub = `wifi_terminal/${deviceID}/tx`;

    client.subscribe(topic_pub);

    console.log("Dispositivo selezionato:", deviceName, deviceID);

    document.getElementById("selectedDevice").innerText =
        `${deviceName} (${deviceID})`;
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

    console.log("TX @", performance.now(), "→", topic_sub, ":", text);
    client.publish(topic_sub, text);
}



// ---------------------------------------------------------
// AVVIO AUTOMATICO
// ---------------------------------------------------------
window.addEventListener("load", connectMQTT);
window.selezionaDispositivo = selezionaDispositivo;
window.publishMessage = publishMessage;
