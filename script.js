console.log("MQTT Remote Terminal loaded");

let client = null;

function log(msg) {
  const box = document.getElementById("log");
  box.innerHTML += msg + "<br>";
  box.scrollTop = box.scrollHeight;
}

function connectMQTT() {
  log("Connecting to MQTT broker...");

  client = mqtt.connect("wss://test.mosquitto.org:8081");

  client.on("connect", () => {
    document.getElementById("status").textContent = "Connected";
    document.getElementById("status").style.color = "green";
    log("Connected to broker");
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
