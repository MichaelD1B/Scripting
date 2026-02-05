// express server voor scripting opdracht
const express = require("express");
const path = require("path");
const app = express();

app.use("/src", express.static(path.join(__dirname, "src")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// status object
let status = {
  batteryPercentage: 100,
  activeSensors: ["Temperature", "Camera"],
  foundResources: [],
  x: 200,
  y: 200,
  direction: 0,
  level: 1,
  mapSize: 400,
  resourceNodes: [],
  hazardZones: [],
  timerStarted: false,
  timeRemaining: 0,
  baseTime: 60,
  inHazard: false,
  gameOverReason: null,
};

// genereer resource nodes voor level
function generateLevel(level, mapSize) {
  const resourceTypes = [
    "Iron",
    "Copper",
    "Silver",
    "Gold",
    "Platinum",
    "Titanium",
    "Diamond",
  ];
  const numResources = 3 + level;
  const nodes = [];

  for (let i = 0; i < numResources; i++) {
    nodes.push({
      x: Math.floor(Math.random() * (mapSize - 80)) + 40,
      y: Math.floor(Math.random() * (mapSize - 80)) + 40,
      type: resourceTypes[
        Math.floor(Math.random() * Math.min(resourceTypes.length, 3 + level))
      ],
      discovered: false,
    });
  }

  return nodes;
}

// genereer hazard zones (zichtbaar met temperature)
function generateHazards(level, mapSize) {
  const numHazards = 2 + Math.floor(level / 2);
  const hazards = [];

  for (let i = 0; i < numHazards; i++) {
    hazards.push({
      x: Math.floor(Math.random() * (mapSize - 100)) + 50,
      y: Math.floor(Math.random() * (mapSize - 100)) + 50,
      radius: 40 + Math.random() * 20,
      damage: 2 + level,
    });
  }

  return hazards;
}

// check of speler in hazard zone zit
function checkHazards() {
  let totalDamage = 0;
  status.hazardZones.forEach((hazard) => {
    const distance = Math.sqrt(
      Math.pow(status.x - hazard.x, 2) + Math.pow(status.y - hazard.y, 2)
    );
    if (distance < hazard.radius) {
      totalDamage += hazard.damage;
      status.inHazard = true;
    }
  });

  if (totalDamage > 0) {
    status.batteryPercentage = Math.max(0, status.batteryPercentage - totalDamage);

    if (status.batteryPercentage <= 0) {
      status.gameOverReason = "battery";
      resetGame();
    }
  } else {
    status.inHazard = false;
  }
}

// reset naar level 1
function resetGame() {
  const reason = status.gameOverReason;
  status.level = 1;
  status.mapSize = 400;
  status.batteryPercentage = 100;
  status.foundResources = [];
  status.resourceNodes = generateLevel(status.level, status.mapSize);
  status.hazardZones = generateHazards(status.level, status.mapSize);
  status.x = 200;
  status.y = 200;
  status.timerStarted = false;
  status.timeRemaining = 0;
  status.inHazard = false;
  status.gameOverReason = reason;
}

status.resourceNodes = generateLevel(status.level, status.mapSize);
status.hazardZones = generateHazards(status.level, status.mapSize);

// hazard damage elke seconde
setInterval(() => {
  if (status.timerStarted && status.batteryPercentage > 0) {
    checkHazards();
  }
}, 1000);

app.get("/status", (req, res) => {
  res.json(status);
});

app.post("/action", (req, res) => {
  const { actionType, sensor, sensors, moveDirection } = req.body;

  if (actionType === "toggleSensor") {
    const list = sensor ? [sensor] : Array.isArray(sensors) ? sensors : [];
    list.forEach((s) => {
      const idx = status.activeSensors.indexOf(s);
      if (idx >= 0) status.activeSensors.splice(idx, 1);
      else status.activeSensors.push(s);
    });
  } else if (actionType === "move") {
    if (status.batteryPercentage <= 0) {
      return res.status(400).json({ error: "battery empty, use sleep to recharge" });
    }

    // timer starten
    if (!status.timerStarted && moveDirection) {
      status.timerStarted = true;
      status.timeRemaining = status.baseTime + (status.level - 1) * 5;
    }

    if (moveDirection) {
      const speed = 30;

      if (moveDirection === "forward") {
        status.direction = 0;
        status.y -= speed;
      } else if (moveDirection === "backward") {
        status.direction = 180;
        status.y += speed;
      } else if (moveDirection === "left") {
        status.direction = 270;
        status.x -= speed;
      } else if (moveDirection === "right") {
        status.direction = 90;
        status.x += speed;
      }

      status.x = Math.max(20, Math.min(status.mapSize - 20, status.x));
      status.y = Math.max(20, Math.min(status.mapSize - 20, status.y));

      let drain = 2 + status.activeSensors.length;
      status.batteryPercentage = Math.max(0, status.batteryPercentage - drain);

      if (status.batteryPercentage <= 0) {
        status.gameOverReason = "battery";
        resetGame();
        return res.json(status);
      }

      // resources vinden
      status.resourceNodes.forEach((node) => {
        if (!node.discovered) {
          const distance = Math.sqrt(
            Math.pow(status.x - node.x, 2) + Math.pow(status.y - node.y, 2)
          );
          if (distance < 50 && status.activeSensors.includes("Camera")) {
            node.discovered = true;
            status.foundResources.push(node.type);
          }
        }
      });

      // level omhoog als alles gevonden
      const allDiscovered = status.resourceNodes.every(
        (node) => node.discovered
      );
      if (allDiscovered && status.resourceNodes.length > 0) {
        status.level++;
        status.mapSize = Math.min(800, 400 + (status.level - 1) * 50);
        status.foundResources = [];
        status.resourceNodes = generateLevel(status.level, status.mapSize);
        status.hazardZones = generateHazards(status.level, status.mapSize);
        status.x = status.mapSize / 2;
        status.y = status.mapSize / 2;
        status.batteryPercentage = 100;
        status.timerStarted = false;
        status.timeRemaining = 0;
        status.inHazard = false;
        status.gameOverReason = null;
      }
    }
  } else if (actionType === "sleep") {
    status.batteryPercentage = Math.min(100, status.batteryPercentage + 15);
  } else {
    return res.status(400).json({ error: "unknown action type" });
  }

  res.json(status);
});

app.post("/tick", (req, res) => {
  if (status.timerStarted && status.timeRemaining > 0) {
    status.timeRemaining--;

    if (status.timeRemaining <= 0) {
      status.gameOverReason = "time";
      resetGame();
    }
  }
  res.json(status);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server draait op poort ${PORT}`);
});
