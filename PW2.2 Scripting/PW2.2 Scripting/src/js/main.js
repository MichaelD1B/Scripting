document.addEventListener("DOMContentLoaded", () => {
  const statusDisplay = document.getElementById("statusDisplay");

  function renderStatus(s) {    
    // sensor buttons updaten
    document.querySelectorAll('.sensor-btn').forEach(btn => {
      const sensor = btn.dataset.sensor;
      if (s.activeSensors && s.activeSensors.includes(sensor)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    if (typeof drawGame === 'function') {
      drawGame(s);
    }
  }

  function fetchStatus() {
    fetch("/status")
      .then((r) => r.json())
      .then(renderStatus)
      .catch(() => {
        statusDisplay.textContent = "Error loading status";
      });
  }

  // movement buttons
  document.querySelectorAll('.move-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const direction = btn.dataset.direction;
      fetch("/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          actionType: "move",
          moveDirection: direction
        })
      })
      .then((r) => {
        if (!r.ok) {
          return r.json().then(err => {
            alert(err.error || "Action failed");
            throw new Error(err.error);
          });
        }
        return r.json();
      })
      .then(renderStatus)
      .catch((err) => console.error("move error:", err));
    });
  });

  // sensor buttons
  document.querySelectorAll('.sensor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sensor = btn.dataset.sensor;
      fetch("/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          actionType: "toggleSensor",
          sensor: sensor
        })
      })
      .then((r) => r.json())
      .then(renderStatus)
      .catch((err) => console.error("sensor error:", err));
    });
  });

  // sleep button
  document.getElementById('sleepBtn').addEventListener('click', () => {
    fetch("/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        actionType: "sleep"
      })
    })
    .then((r) => r.json())
    .then(renderStatus)
    .catch((err) => console.error("sleep error:", err));
  });

  // toetsenbord (WASD + pijltjes)
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    let direction = null;
    
    if (key === 'w' || key === 'arrowup') direction = 'forward';
    else if (key === 's' || key === 'arrowdown') direction = 'backward';
    else if (key === 'a' || key === 'arrowleft') direction = 'left';
    else if (key === 'd' || key === 'arrowright') direction = 'right';
    else if (key === ' ') {
      e.preventDefault();
      document.getElementById('sleepBtn').click();
      return;
    }
    
    if (direction) {
      e.preventDefault();
      fetch("/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          actionType: "move",
          moveDirection: direction
        })
      })
      .then((r) => {
        if (!r.ok) {
          return r.json().then(err => {
            alert(err.error || "Action failed");
            throw new Error(err.error);
          });
        }
        return r.json();
      })
      .then(renderStatus)
      .catch((err) => console.error("move error:", err));
    }
  });

  // timer tick
  setInterval(() => {
    fetch("/tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    })
      .then((r) => r.json())
      .then(renderStatus)
      .catch(() => {});
  }, 1000);

  fetchStatus();
});

console.log("main loaded");
