// ── MangaVault Arcade ──

window.startQueueGame = function() {
  const s = document.getElementById("queueGameStartScreen");
  const a = document.getElementById("queueGameActive");
  if (s) s.style.display = "none";
  if (a) a.style.display = "block";
  startQueueNinja();
};

window.startQueueNinja = function() {
  const arena = document.getElementById("ninjaArena");
  const input = document.getElementById("ninjaInput");
  const scoreEl = document.getElementById("ninjaScore");
  const livesEl = document.getElementById("ninjaLives");
  const gameNinja = document.getElementById("gameNinja");
  const gameRunner = document.getElementById("gameRunner");
  if (!arena || !input) return;
  
  if (gameNinja) gameNinja.style.display = "block";
  if (gameRunner) gameRunner.style.display = "none";
  
  const btnN = document.getElementById("btnNinja");
  const btnR = document.getElementById("btnRunner");
  if (btnN) { btnN.style.background = "linear-gradient(135deg, #8a2be2, #6a1b9a)"; btnN.style.color = "#fff"; }
  if (btnR) { btnR.style.background = "rgba(255,255,255,0.05)"; btnR.style.color = "#aaa"; }
  
  if (window._queueNinjaState) {
    clearInterval(window._queueNinjaState.spawn);
    clearInterval(window._queueNinjaState.fall);
  }
  
  arena.style.background = "url('/assets/typing-bg.png') no-repeat center center";
  arena.style.backgroundSize = "cover";
  arena.innerHTML = "";
  if (scoreEl) scoreEl.textContent = "Score: 0";
  if (livesEl) livesEl.textContent = "❤️❤️❤️";
  input.value = "";
  setTimeout(() => input.focus(), 100);
  
  const state = { words: [], score: 0, lives: 3, spawn: null, fall: null };
  const words = ["KAPOW","NANI","SHONEN","PANEL","INK","BOSS","SLASH","SUGOI","MANGA","STORY","HERO"];
  window._queueNinjaState = state;
  
  state.spawn = setInterval(() => {
    const w = words[Math.floor(Math.random() * words.length)];
    const el = document.createElement("div");
    el.className = "ninja-word"; el.textContent = w;
    el.style.left = (Math.random() * 60 + 20) + "%";
    el.style.top = "-40px"; el.style.padding = "8px 16px";
    el.style.background = "#fff"; el.style.color = "#000";
    el.style.borderRadius = "20px";
    el.style.fontFamily = "Comic Sans MS, cursive, sans-serif";
    el.style.fontWeight = "bold"; el.style.fontSize = "16px";
    el.style.boxShadow = "4px 4px 0px rgba(138,43,226,0.8)";
    el.style.border = "3px solid #000";
    el.dataset.word = w; el.dataset.top = -40;
    arena.appendChild(el); state.words.push(el);
  }, 1600);
  
  state.fall = setInterval(() => {
    for (let i = state.words.length - 1; i >= 0; i--) {
      const el = state.words[i];
      let top = parseFloat(el.dataset.top) + 1.5;
      el.dataset.top = top; el.style.top = top + "px";
      if (top > 180) {
        el.remove(); state.words.splice(i, 1); state.lives--;
        if (livesEl) livesEl.textContent = "❤️".repeat(Math.max(0, state.lives)) + "🖤".repeat(Math.max(0, 3 - state.lives));
        if (state.lives <= 0) {
          clearInterval(state.spawn); clearInterval(state.fall);
          arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);border-radius:12px;"><h3 style="color:#f87171;">Game Over!</h3><p>Score: ${state.score}</p><button onclick="startQueueNinja()" style="background:#8a2be2;border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;">Retry</button></div>`;
        }
      }
    }
  }, 50);
  
  input.oninput = (e) => {
    const val = (e.target.value || "").toUpperCase().trim();
    if (!val) return;
    const idx = state.words.findIndex(el => el.dataset.word === val);
    if (idx !== -1) {
      const targetWord = state.words[idx];
      const arenaRect = arena.getBoundingClientRect();
      const wordRect = targetWord.getBoundingClientRect();
      const targetX = wordRect.left - arenaRect.left + (wordRect.width / 2);
      const targetY = wordRect.top - arenaRect.top + (wordRect.height / 2);
      const shuriken = document.createElement("img");
      shuriken.src = "/assets/shuriken.png";
      shuriken.style.cssText = `position:absolute;width:60px;height:60px;left:${targetX-30}px;top:${targetY-30}px;z-index:99999;pointer-events:none;animation:spin 0.3s linear infinite;`;
      arena.appendChild(shuriken);
      targetWord.style.transition = "transform 0.15s, opacity 0.15s";
      targetWord.style.transform = "scale(1.5)"; targetWord.style.opacity = "0";
      setTimeout(() => targetWord.remove(), 150);
      setTimeout(() => shuriken.remove(), 300);
      state.words.splice(idx, 1); state.score += 10;
      if (scoreEl) scoreEl.textContent = "Score: " + state.score;
      e.target.value = "";
    }
  };
};

window.startQueueRunner = function() {
  const arena = document.getElementById("runnerArena");
  const scoreEl = document.getElementById("runnerScore");
  const gameNinja = document.getElementById("gameNinja");
  const gameRunner = document.getElementById("gameRunner");
  if (!arena) return;
  
  if (gameNinja) gameNinja.style.display = "none";
  if (gameRunner) gameRunner.style.display = "block";
  
  const btnN = document.getElementById("btnNinja");
  const btnR = document.getElementById("btnRunner");
  if (btnR) { btnR.style.background = "linear-gradient(135deg, #8a2be2, #6a1b9a)"; btnR.style.color = "#fff"; }
  if (btnN) { btnN.style.background = "rgba(255,255,255,0.05)"; btnN.style.color = "#aaa"; }
  
  if (window._queueRunnerInterval) clearInterval(window._queueRunnerInterval);
  
  const arenaH = arena.clientHeight || 220;
  const playerBottom = Math.round(arenaH * 0.18);
  const playerHeight = Math.round(arenaH * 0.43);
  const playerWidth = Math.round(arenaH * 0.364);
  const obBottom = Math.round(arenaH * 0.13);
  const obSize = Math.round(arenaH * 0.32);
  const jumpVel = -Math.round(arenaH * 0.065);
  const gravity = arenaH * 0.004;
  
  arena.innerHTML = `
    <div id="queueBg" style="position:absolute;top:0;left:0;width:100%;height:100%;background:url('/assets/runner-bg.png') repeat-x;background-size:auto 100%;"></div>
    <div id="queuePlayer" style="position:absolute;bottom:${playerBottom}px;left:40px;width:${playerWidth}px;height:${playerHeight}px;background:url('/assets/ninja-sprite.png') no-repeat;background-size:400% auto;background-position:0% 100%;z-index:10;"></div>
  `;
  const player = document.getElementById("queuePlayer");
  const bg = document.getElementById("queueBg");
  if (scoreEl) scoreEl.textContent = "Score: 0";
  
  let y = 0, velocity = 0, isJumping = false;
  let obstacles = [], score = 0, spawnTimer = 0, speed = 4, bgX = 0;
  
  window.jumpRunner = function() {
    if (!isJumping) { isJumping = true; velocity = jumpVel; }
  };
  arena.onclick = () => { if (!isJumping) { isJumping = true; velocity = jumpVel; } };
  
  window._queueRunnerInterval = setInterval(() => {
    if (isJumping) {
      y += velocity; velocity += gravity;
      if (y >= 0) { y = 0; isJumping = false; velocity = 0; }
    }
    player.style.transform = `translateY(${y}px)`;
    bgX -= speed * 0.5;
    bg.style.backgroundPositionX = bgX + "px";
    
    spawnTimer += 30;
    if (spawnTimer > 3000) {
      spawnTimer = 0;
      const ob = document.createElement("div");
      ob.style.cssText = `position:absolute;width:${obSize}px;height:${obSize}px;background:url('/assets/runner-obstacle.png') no-repeat;background-size:100% 100%;left:${arena.clientWidth}px;bottom:${obBottom}px;z-index:5;`;
      arena.appendChild(ob);
      obstacles.push({ el: ob, x: arena.clientWidth });
    }
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      ob.x -= speed; ob.el.style.left = ob.x + "px";
      const pL = 40 + 20, pR = 40 + playerWidth - 20;
      const pB = playerBottom + y + 20, pT = playerBottom + y + playerHeight - 20;
      const oL = ob.x + 20, oR = ob.x + obSize - 20;
      const oB = obBottom + 20, oT = obBottom + obSize - 20;
      if (pR > oL && pL < oR && pT > oB && pB < oT) {
        clearInterval(window._queueRunnerInterval);
        arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);border-radius:12px;z-index:20;"><h3 style="color:#f87171;">Game Over!</h3><p>Score: ${score}</p><button onclick="startQueueRunner()" style="background:#8a2be2;border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;">Play Again</button></div>`;
        return;
      }
      if (ob.x < -100) { ob.el.remove(); obstacles.splice(i, 1); score += 10; speed += 0.05; if (scoreEl) scoreEl.textContent = "Score: " + score; }
    }
  }, 30);
};

window.startArcadeNinja = function() {
  const arena = document.getElementById("arcadeNinjaArena") || document.getElementById("ninjaArena");
  const input = document.getElementById("arcadeNinjaInput") || document.getElementById("ninjaInput");
  const scoreEl = document.getElementById("arcadeNinjaScore") || document.getElementById("ninjaScore");
  const livesEl = document.getElementById("arcadeNinjaLives") || document.getElementById("ninjaLives");
  if (!arena || !input) return;
  
  if (window._arcadeNinjaState) {
    clearInterval(window._arcadeNinjaState.spawn);
    clearInterval(window._arcadeNinjaState.fall);
  }
  
  arena.style.background = "url('/assets/typing-bg.png') no-repeat center center";
  arena.style.backgroundSize = "cover";
  arena.innerHTML = "";
  if (scoreEl) scoreEl.textContent = "Score: 0";
  if (livesEl) livesEl.textContent = "❤️❤️❤️";
  input.value = "";
  setTimeout(() => input.focus(), 100);
  
  const state = { words: [], score: 0, lives: 3, spawn: null, fall: null };
  const words = ["KAPOW","NANI","SHONEN","PANEL","INK","BOSS","SLASH","SUGOI","MANGA","STORY","HERO"];
  window._arcadeNinjaState = state;
  
  state.spawn = setInterval(() => {
    const w = words[Math.floor(Math.random() * words.length)];
    const el = document.createElement("div");
    el.className = "ninja-word"; el.textContent = w;
    el.style.left = (Math.random() * 60 + 20) + "%";
    el.style.top = "-40px"; el.style.padding = "8px 16px";
    el.style.background = "#fff"; el.style.color = "#000";
    el.style.borderRadius = "20px";
    el.style.fontFamily = "Comic Sans MS, cursive, sans-serif";
    el.style.fontWeight = "bold"; el.style.fontSize = "16px";
    el.style.boxShadow = "4px 4px 0px rgba(138,43,226,0.8)";
    el.style.border = "3px solid #000";
    el.dataset.word = w; el.dataset.top = -40;
    arena.appendChild(el); state.words.push(el);
  }, 1600);
  
  state.fall = setInterval(() => {
    for (let i = state.words.length - 1; i >= 0; i--) {
      const el = state.words[i];
      let top = parseFloat(el.dataset.top) + 1.5;
      el.dataset.top = top; el.style.top = top + "px";
      if (top > 260) {
        el.remove(); state.words.splice(i, 1); state.lives--;
        if (livesEl) livesEl.textContent = "❤️".repeat(Math.max(0, state.lives)) + "🖤".repeat(Math.max(0, 3 - state.lives));
        if (state.lives <= 0) {
          clearInterval(state.spawn); clearInterval(state.fall);
          arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);border-radius:12px;"><h3 style="color:#f87171;">Game Over!</h3><p>Score: ${state.score}</p><button onclick="startArcadeNinja()" style="background:#8a2be2;border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;">Retry</button></div>`;
        }
      }
    }
  }, 50);
  
  input.oninput = (e) => {
    const val = (e.target.value || "").toUpperCase().trim();
    if (!val) return;
    const idx = state.words.findIndex(el => el.dataset.word === val);
    if (idx !== -1) {
      const targetWord = state.words[idx];
      const arenaRect = arena.getBoundingClientRect();
      const wordRect = targetWord.getBoundingClientRect();
      const targetX = wordRect.left - arenaRect.left + (wordRect.width / 2);
      const targetY = wordRect.top - arenaRect.top + (wordRect.height / 2);
      const shuriken = document.createElement("img");
      shuriken.src = "/assets/shuriken.png";
      shuriken.style.cssText = `position:absolute;width:60px;height:60px;left:${targetX-30}px;top:${targetY-30}px;z-index:99999;pointer-events:none;animation:spin 0.3s linear infinite;`;
      arena.appendChild(shuriken);
      targetWord.style.transition = "transform 0.15s, opacity 0.15s";
      targetWord.style.transform = "scale(1.5)"; targetWord.style.opacity = "0";
      setTimeout(() => targetWord.remove(), 150);
      setTimeout(() => shuriken.remove(), 300);
      state.words.splice(idx, 1); state.score += 10;
      if (scoreEl) scoreEl.textContent = "Score: " + state.score;
      e.target.value = "";
    }
  };
};
