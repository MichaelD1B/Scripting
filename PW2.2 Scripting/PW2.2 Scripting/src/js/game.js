const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let currentStatus = null;
let animating = false;
let levelUpAnimation = 0;
let gameOverAnimation = 0;
let gameOverReason = null;

function drawGame(status) {
  if (currentStatus && status.level > currentStatus.level && !status.gameOverReason) {
    levelUpAnimation = 60;
  }
  
  if (currentStatus && status.level < currentStatus.level) {
    gameOverAnimation = 90;
    gameOverReason = status.gameOverReason || 'time';
  }
  
  if (status.mapSize && (canvas.width !== status.mapSize || canvas.height !== status.mapSize)) {
    canvas.width = status.mapSize;
    canvas.height = status.mapSize;
  }
  
  currentStatus = status;
  if (!animating) {
    animating = true;
    requestAnimationFrame(animate);
  }
}

function animate() {
  if (!currentStatus) return;
  
  const s = currentStatus;
  
  // canvas leegmaken
  ctx.fillStyle = '#0a0e27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // grid
  ctx.strokeStyle = '#1a1f3a';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }
  
  // hazard zones (alleen met temperature sensor)
  if (s.hazardZones && Array.isArray(s.hazardZones) && s.activeSensors && s.activeSensors.includes("Temperature")) {
    s.hazardZones.forEach(hazard => {
      ctx.strokeStyle = 'rgba(255, 100, 0, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(255, 50, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ff6400';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠', hazard.x, hazard.y + 7);
      ctx.textAlign = 'left';
    });
  }
  
  // resources
  if (s.resourceNodes && Array.isArray(s.resourceNodes)) {
    s.resourceNodes.forEach(node => {
      if (node.discovered) {
        ctx.fillStyle = '#e94560';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(node.type, node.x - 15, node.y - 12);
      } else if (s.activeSensors && s.activeSensors.includes("Camera")) {
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  
  // sensor range
  if (s.activeSensors && s.activeSensors.length > 0) {
    ctx.strokeStyle = 'rgba(243, 156, 18, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x || 200, s.y || 200, 50, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // spaceship
  ctx.save();
  ctx.translate(s.x || 200, s.y || 200);
  ctx.rotate(((s.direction || 0) * Math.PI) / 180);
  
  const shipColor = (s.batteryPercentage || 0) > 0 ? '#16c79a' : '#666';
  ctx.fillStyle = shipColor;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(-10, 10);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.fill();
  
  ctx.strokeStyle = (s.batteryPercentage || 0) > 0 ? '#0f9d76' : '#444';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // engine
  if ((s.batteryPercentage || 0) > 0) {
    ctx.fillStyle = 'rgba(233, 69, 96, 0.6)';
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.lineTo(0, 18);
    ctx.lineTo(6, 10);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.restore();
  
  drawUI(s);
  
  // level up animatie
  if (levelUpAnimation > 0) {
    ctx.fillStyle = `rgba(22, 199, 154, ${levelUpAnimation / 60})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${s.level}`, canvas.width / 2, canvas.height / 2);
    ctx.font = '16px monospace';
    ctx.fillText(`Map: ${s.mapSize}x${s.mapSize}`, canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText(`Time: ${s.baseTime + (s.level - 1) * 20}s`, canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
    
    levelUpAnimation--;
    animating = false;
    requestAnimationFrame(animate);
    return;
  }
  
  // game over animatie
  if (gameOverAnimation > 0) {
    ctx.fillStyle = `rgba(233, 69, 96, ${Math.min(gameOverAnimation / 90, 0.8)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    
    if (gameOverReason === 'battery') {
      ctx.fillText('BATTERY DEAD!', canvas.width / 2, canvas.height / 2 - 20);
    } else {
      ctx.fillText('TIME UP!', canvas.width / 2, canvas.height / 2 - 20);
    }
    
    ctx.font = '20px monospace';
    ctx.fillText('Starting over...', canvas.width / 2, canvas.height / 2 + 20);
    ctx.textAlign = 'left';
    
    gameOverAnimation--;
    animating = false;
    requestAnimationFrame(animate);
    return;
  }
  
  animating = false;
}

function drawUI(s) {
  // batterij bar
  ctx.fillStyle = '#1a1f3a';
  ctx.fillRect(10, 10, 150, 25);
  
  const batteryWidth = ((s.batteryPercentage || 0) / 100) * 140;
  ctx.fillStyle = (s.batteryPercentage || 0) > 20 ? '#16c79a' : '#e94560';
  ctx.fillRect(15, 15, batteryWidth, 15);
  
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText(`Battery: ${s.batteryPercentage || 0}%`, 20, 27);
  
  if ((s.batteryPercentage || 0) <= 20 && (s.batteryPercentage || 0) > 0) {
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('LOW BATTERY!', canvas.width / 2 - 60, 20);
  }
  
  if ((s.batteryPercentage || 0) <= 0) {
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BATTERY EMPTY - SLEEP TO RECHARGE', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
  }
  
  // timer
  if (s.timerStarted && s.timeRemaining > 0) {
    ctx.fillStyle = '#1a1f3a';
    ctx.fillRect(canvas.width / 2 - 60, 10, 120, 25);
    
    const timeColor = s.timeRemaining > 10 ? '#fff' : '#e94560';
    ctx.fillStyle = timeColor;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Time: ${s.timeRemaining}s`, canvas.width / 2, 27);
    ctx.textAlign = 'left';
  }
  
  // level
  ctx.fillStyle = '#1a1f3a';
  ctx.fillRect(canvas.width - 100, 10, 90, 25);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`Level ${s.level || 1}`, canvas.width - 90, 27);
  
  // sensors
  ctx.fillStyle = '#1a1f3a';
  ctx.fillRect(10, 45, 150, 30);
  
  ctx.fillStyle = '#fff';
  ctx.font = '10px monospace';
  ctx.fillText('Sensors:', 15, 58);
  
  if (s.activeSensors && Array.isArray(s.activeSensors)) {
    s.activeSensors.forEach((sensor, i) => {
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.arc(25 + i * 30, 65, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.fillText(sensor.substring(0, 4), 18 + i * 30, 75);
    });
  }
  
  // resources
  const resources = s.foundResources || [];
  ctx.fillStyle = '#1a1f3a';
  ctx.fillRect(canvas.width - 160, 45, 150, 25 + Math.min(resources.length, 5) * 20);
  
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText('Resources:', canvas.width - 150, 62);
  
  resources.slice(0, 5).forEach((resource, i) => {
    ctx.fillStyle = '#e94560';
    ctx.fillRect(canvas.width - 150, 70 + i * 20, 12, 12);
    
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(resource, canvas.width - 130, 80 + i * 20);
  });
  
  // progress
  if (s.resourceNodes && Array.isArray(s.resourceNodes)) {
    const discovered = s.resourceNodes.filter(n => n.discovered).length;
    const total = s.resourceNodes.length;
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.fillText(`Mission: ${discovered}/${total} resources`, 10, canvas.height - 10);
  }
}
