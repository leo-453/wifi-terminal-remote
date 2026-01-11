console.log("MQTT Remote Terminal loaded");

let client = null;

// Inserisci qui i dati della tua istanza HiveMQ 
  Cloud const MQTT_HOST = "wss://e46684488ad3440aa9f0b18d79db6b87.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USER = "leo453"; 
const MQTT_PASS = "<bsfg805NG>";



function log(msg) {
  const box = document.getElementById("log");
  box.innerHTML += msg + "<br>";
  box.scrollTop = box.scrollHeight;
}

function connectMQTT() {
  log("Connecting to HiveMQ Cloud...");
  
client = mqtt.connect(MQTT_HOST, { 
  username: MQTT_USER, 
  password: MQTT_PASS, 
  reconnectPeriod: 2000, // opzionale, ma utile 
  });
  
  client = mqtt.connect("wss://test.mosquitto.org:8081");

  client.on("connect", () => {
    document.getElementById("status").textContent = "Connected";
    document.getElementById("status").style.color = "green";
    log("Connected to HiveMQ Cloud");
  });

  client.on("message", (topic, message) => {
    log("[RECV] " + topic + ": " + message.toString());
  });

  client.on("error", (err) => {
    log("Error: " + err);
  });
}

function sendMessage() {
  const topic = document.getElementById("topic").value;
  const msg = document.getElementById("message").value;

  if (client && client.connected) {
    client.publish(topic, msg);
    log("[SEND] " + topic + ": " + msg);
  } else {
    log("Not connected");
  }
}

window.onload = connectMQTT;
