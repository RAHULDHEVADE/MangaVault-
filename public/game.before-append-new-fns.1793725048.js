// ── MangaVault Arcade Games ──
window.activeGame = null;
window.gameIntervals = { ninja: null, runner: null };

window.switchGame = function(game) {
  if (window.activeGame === "ninja") stopNinja();
  if (window.activeGame === "runner") stopRunner();
  document.getElementById("btnNinja").classList.remove("active");
  document.getElementById("btnRunner").classList.remove("active");
  document.getElementById("gameNinja").style.display = "none";
  document.getElementById("gameRunner").style.display = "none";
  if (game === "ninja") {
    document.getElementById("btnNinja").classList.add("active");
    document.getElementById("gameNinja").style.display = "block";
    startNinja();
  } else {
    document.getElementById("btnRunner").classList.add("active");
    document.getElementById("gameRunner").style.display = "block";
    startRunner();
  }
  window.activeGame = game;
};

window.stopArcade = function() {
  if (window.activeGame === "ninja") stopNinja();
  if (window.activeGame === "runner") stopRunner();
  window.activeGame = null;
};

// ══════════════════════════════════════════
// TYPING NINJA
// ══════════════════════════════════════════
let ninja = { words: [], score: 0, lives: 3, interval: null, fallInterval: null, active: false };
const ninjaWords = ["KAPOW","NANI","SHONEN","PANEL","INK","BOSS","SLASH","SUGOI","MANGA","STORY","HERO"];

function startNinja() {
  if (ninja.active) return;
  ninja.active = true; ninja.score = 0; ninja.lives = 3; ninja.words = [];
  const arena = document.getElementById("ninjaArena");
  const scoreEl = document.getElementById("ninjaScore");
  const livesEl = document.getElementById("ninjaLives");
  const input = document.getElementById("ninjaInput");
  if (!arena || !input) return;

  arena.style.background = "url('/assets/typing-bg.png') no-repeat center center";
  arena.style.backgroundSize = "cover";
  arena.style.position = "relative";
  arena.style.overflow = "hidden";
  arena.innerHTML = "";

  if (scoreEl) scoreEl.textContent = "Score: 0";
  if (livesEl) livesEl.textContent = "❤️❤️❤️";
  input.value = ""; setTimeout(() => input.focus(), 100);

  ninja.interval = setInterval(() => {
    if (!ninja.active) return;
    const w = ninjaWords[Math.floor(Math.random() * ninjaWords.length)];
    const el = document.createElement("div");
    el.className = "ninja-word";
    el.textContent = w;
    el.style.left = (Math.random() * 60 + 20) + "%";
    el.style.top = "-40px";
    el.style.padding = "8px 16px";
    el.style.background = "#fff"; el.style.color = "#000";
    el.style.borderRadius = "20px";
    el.style.fontFamily = "Comic Sans MS, cursive, sans-serif";
    el.style.fontWeight = "bold"; el.style.fontSize = "16px";
    el.style.boxShadow = "4px 4px 0px rgba(138,43,226,0.8)";
    el.style.border = "3px solid #000";
    el.dataset.word = w; el.dataset.top = -40;
    arena.appendChild(el); ninja.words.push(el);
  }, 1600);

  ninja.fallInterval = setInterval(() => {
    if (!ninja.active) return;
    for (let i = ninja.words.length - 1; i >= 0; i--) {
      const el = ninja.words[i];
      let top = parseFloat(el.dataset.top) + 1.5;
      el.dataset.top = top; el.style.top = top + "px";
      if (top > 180) {
        el.style.transition = "transform 0.15s, opacity 0.15s";
        el.style.transform = "scale(1.5)"; el.style.opacity = "0";
        el.style.background = "#f87171"; el.style.color = "#fff";
        setTimeout(() => el.remove(), 150);
        ninja.words.splice(i, 1); ninja.lives--;
        if (livesEl) livesEl.textContent = "❤️".repeat(Math.max(0, ninja.lives)) + "🖤".repeat(Math.max(0, 3 - ninja.lives));
        if (ninja.lives <= 0) {
          stopNinja();
          if (arena) arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);border-radius:12px;"><h3 style="color:#f87171;margin:0 0 8px 0;font-size:24px;">Game Over!</h3><p style="font-size:18px;">Score: ${ninja.score}</p><button onclick="startNinja()" style="background:#8a2be2;border:none;color:white;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:16px;">Retry</button></div>`;
        }
      }
    }
  }, 50);

  input.oninput = (e) => {
    const val = (e.target.value || "").toUpperCase().trim();
    if (!val) return;
    const idx = ninja.words.findIndex(el => el.dataset.word === val);
    if (idx !== -1) {
      const targetWord = ninja.words[idx];
      const arenaRect = arena.getBoundingClientRect();
      const wordRect = targetWord.getBoundingClientRect();
      const targetX = wordRect.left - arenaRect.left + (wordRect.width / 2);
      const targetY = wordRect.top - arenaRect.top + (wordRect.height / 2);
      const wrap = document.createElement("div");
      wrap.style.position = "absolute"; wrap.style.width = "40px"; wrap.style.height = "40px";
      wrap.style.left = "50%"; wrap.style.bottom = "-40px"; wrap.style.transform = "translateX(-50%)";
      wrap.style.transition = "all 0.15s ease-out"; wrap.style.zIndex = "20";
      const inner = document.createElement("div");
      inner.style.width = "100%"; inner.style.height = "100%";
      inner.style.background = "url('/assets/shuriken.png') no-repeat center center";
      inner.style.backgroundSize = "contain"; inner.style.animation = "spin 0.3s linear infinite";
      wrap.appendChild(inner); arena.appendChild(wrap);
      setTimeout(() => { wrap.style.left = targetX + "px"; wrap.style.bottom = targetY + "px"; }, 10);
      setTimeout(() => {
        targetWord.style.transition = "transform 0.1s, opacity 0.1s";
        targetWord.style.transform = "scale(1.5)"; targetWord.style.opacity = "0";
        setTimeout(() => targetWord.remove(), 100);
        wrap.remove(); ninja.words.splice(idx, 1); ninja.score += 10;
        if (scoreEl) scoreEl.textContent = "Score: " + ninja.score;
      }, 150);
      e.target.value = "";
    }
  };
}

function stopNinja() {
  ninja.active = false;
  clearInterval(ninja.interval); clearInterval(ninja.fallInterval);
  const a = document.getElementById("ninjaArena");
  if (a) a.innerHTML = "";
}

// ══════════════════════════════════════════
// DODGE DEADLINE (Relative Physics)
// ══════════════════════════════════════════
let runner = { score: 0, active: false, y: 0, velocity: 0, isJumping: false,
  obstacles: [], spawnTimer: 0, speed: 4, level: 1, bgX: 0, startTime: 0 };

function startRunner() {
  if (runner.active) return;
  runner.active = true;
  runner.score = 0; runner.y = 0; runner.velocity = 0; runner.isJumping = false;
  runner.obstacles = []; runner.spawnTimer = 0;
  runner.speed = 4; runner.level = 1; runner.bgX = 0; runner.startTime = Date.now();
  
  const arena = document.getElementById("runnerArena");
  const scoreEl = document.getElementById("runnerScore");
  if (!arena) return;
  if (scoreEl) scoreEl.textContent = "Score: 0";

  // ── RELATIVE PHYSICS: Read arena height and compute everything ──
  const arenaH = arena.clientHeight;
  const playerBottom = Math.round(arenaH * 0.18);
  const playerHeight = Math.round(arenaH * 0.43);
  const playerWidth = Math.round(arenaH * 0.364);
  const obBottom = Math.round(arenaH * 0.13);
  const obSize = Math.round(arenaH * 0.32);
  const jumpVelocity = -Math.round(arenaH * 0.065);
  const gravity = arenaH * 0.004;
  const flyBottom = Math.round(arenaH * 0.27);
  
  runner.arenaH = arenaH;
  runner.playerBottom = playerBottom;
  runner.playerHeight = playerHeight;
  runner.playerWidth = playerWidth;
  runner.obBottom = obBottom;
  runner.obSize = obSize;
  runner.jumpVelocity = jumpVelocity;
  runner.gravity = gravity;
  runner.flyBottom = flyBottom;

  arena.innerHTML = `
    <div id="bg" style="position:absolute;top:0;left:0;width:100%;height:100%;background:url('/assets/runner-bg.png') repeat-x;background-size:auto 100%;background-position-x:0px;"></div>
    <div id="player" style="position:absolute;bottom:${playerBottom}px;left:40px;width:${playerWidth}px;height:${playerHeight}px;background:url('/assets/ninja-sprite.png') no-repeat;background-size:400% auto;background-position:0% 100%;z-index:10;"></div>
  `;

  const player = document.getElementById("player");
  const bg = document.getElementById("bg");

  arena.onclick = () => {
    if (!runner.isJumping) {
      runner.isJumping = true;
      runner.velocity = runner.jumpVelocity;
      player.style.backgroundPosition = "33.3% 0%";
    }
  };

  window._runnerKeyHandler = (e) => {
    if (!runner.active) return;
    if (e.key === "ArrowUp" || e.key === " " || e.key === "ArrowDown") {
      if (!runner.isJumping) {
        runner.isJumping = true;
        runner.velocity = runner.jumpVelocity;
        player.style.backgroundPosition = "33.3% 0%";
      }
    }
  };
  window.addEventListener("keydown", window._runnerKeyHandler);

  window.gameIntervals.runner = setInterval(() => {
    if (!runner.active) return;

    // 1. Physics
    if (runner.isJumping) {
      runner.y += runner.velocity;
      runner.velocity += runner.gravity;
      if (runner.y >= 0) {
        runner.y = 0; runner.isJumping = false; runner.velocity = 0;
        player.style.backgroundPosition = "66.6% 0%";
        setTimeout(() => { if (!runner.isJumping) player.style.backgroundPosition = "0% 0%"; }, 100);
      }
    } else {
      runner.y = 0;
      runner.velocity = 0;
    }
    player.style.transform = `translateY(${runner.y}px)`;

    // 2. Scroll Background
    runner.bgX -= runner.speed * 0.5;
    bg.style.backgroundPositionX = runner.bgX + "px";

    // 3. Levels
    if (runner.score > 300 && runner.level < 3) {
      runner.level = 3;
      bg.style.backgroundImage = "url('/assets/runner-bg-3.png')";
    } else if (runner.score > 100 && runner.level < 2) {
      runner.level = 2;
      bg.style.backgroundImage = "url('/assets/runner-bg-2.png')";
    }

    // 4. Spawn Obstacles
    runner.spawnTimer += 30;
    let threshold = 3500;
    if (runner.score > 200) threshold = 2200;
    else if (runner.score > 100) threshold = 2800;

    if (runner.spawnTimer > threshold) {
      runner.spawnTimer = 0;
      const canFly = runner.score >= 100;
      const isFlying = canFly && (Math.random() > 0.7);
      const ob = document.createElement("div");
      ob.style.position = "absolute";
      ob.style.width = runner.obSize + "px";
      ob.style.height = runner.obSize + "px";
      ob.style.backgroundSize = "100% 100%"; ob.style.backgroundRepeat = "no-repeat";
      ob.style.left = arena.clientWidth + "px"; ob.style.zIndex = "5";

      if (isFlying) {
        ob.style.bottom = runner.flyBottom + "px";
        ob.style.backgroundImage = "url('/assets/runner-obstacle-fly.png')";
      } else {
        ob.style.bottom = runner.obBottom + "px";
        if (runner.level === 1) ob.style.backgroundImage = "url('/assets/runner-obstacle.png')";
        else if (runner.level === 2) ob.style.backgroundImage = "url('/assets/runner-obstacle-2.png')";
        else ob.style.backgroundImage = "url('/assets/runner-obstacle-3.png')";
      }
      arena.appendChild(ob);
      runner.obstacles.push({ el: ob, x: arena.clientWidth, isFlying });
    }

    // 5. Collision
    for (let i = runner.obstacles.length - 1; i >= 0; i--) {
      const ob = runner.obstacles[i];
      ob.x -= runner.speed;
      ob.el.style.left = ob.x + "px";

      const SHRINK = Math.round(runner.playerHeight * 0.19);
      const pLeft = 40 + SHRINK;
      const pRight = 40 + runner.playerWidth - SHRINK;
      const pBottom = runner.playerBottom + runner.y + SHRINK;
      const pTop = (runner.playerBottom + runner.y) + runner.playerHeight - SHRINK;

      const oLeft = ob.x + SHRINK;
      const oRight = ob.x + runner.obSize - SHRINK;
      const oBottom = (ob.isFlying ? runner.flyBottom : runner.obBottom) + SHRINK;
      const oTop = (ob.isFlying ? runner.flyBottom : runner.obBottom) + runner.obSize - SHRINK;

      const overlapX = pRight > oLeft && pLeft < oRight;
      const overlapY = pTop > oBottom && pBottom < oTop;
      const gameAge = Date.now() - runner.startTime;

      if (overlapX && overlapY && gameAge > 500) {
        stopRunner();
        arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);border-radius:12px;z-index:20;"><h3 style="color:#f87171;font-size:24px;margin:0 0 8px 0;">Game Over!</h3><p style="font-size:18px;">Score: ${Math.floor(runner.score)}</p><button onclick="startRunner()" style="background:#8a2be2;border:none;color:white;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px;">Play Again</button></div>`;
        return;
      }

      if (ob.x < -100) {
        ob.el.remove();
        runner.obstacles.splice(i, 1);
        runner.score += 10;
        // Speed increases faster after 300
        if (runner.score > 300) {
          runner.speed += 0.1;
        } else {
          runner.speed += 0.05;
        }
        if (scoreEl) scoreEl.textContent = "Score: " + Math.floor(runner.score);
      }
    }
  }, 30);
}

function stopRunner() {
  runner.active = false;
  clearInterval(window.gameIntervals.runner);
  if (window._runnerKeyHandler) window.removeEventListener("keydown", window._runnerKeyHandler);
  runner.obstacles.forEach(o => { try { o.el.remove(); } catch(e) {} });
  runner.obstacles = [];
}

// ══════════════════════════════════════════
// ARCADE TAB (prefixed IDs to avoid conflict with queue game)
// ══════════════════════════════════════════
window.switchArcadeGame = function(game) {
  console.log("[ARCADE] switchArcadeGame called with:", game);
  const btnN = document.getElementById("arcadeBtnNinja");
  const btnR = document.getElementById("arcadeBtnRunner");
  const gN = document.getElementById("arcadeGameNinja");
  const gR = document.getElementById("arcadeGameRunner");
  if (btnN) btnN.classList.remove("active");
  if (btnR) btnR.classList.remove("active");
  if (gN) gN.style.display = "none";
  if (gR) gR.style.display = "none";
  if (game === "ninja") {
    if (btnN) btnN.classList.add("active");
    if (gN) gN.style.display = "block";
    startArcadeNinja();
  } else {
    if (btnR) btnR.classList.add("active");
    if (gR) gR.style.display = "block";
    startArcadeRunner();
  }
};

window.jumpArcadeRunner = function() {
  if (window._arcadeRunnerState && !window._arcadeRunnerState.isJumping) {
    window._arcadeRunnerState.isJumping = true;
    window._arcadeRunnerState.velocity = window._arcadeRunnerState.jumpVelocity;
  }
};

// ── Arcade Typing Ninja ──
let arcadeNinjaState = { words: [], score: 0, lives: 3, spawnInterval: null, fallInterval: null, active: false };
function startArcadeNinja() {
  if (arcadeNinjaState.active) return;
  arcadeNinjaState.active = true;
  arcadeNinjaState.score = 0;
  arcadeNinjaState.lives = 3;
  arcadeNinjaState.words = [];
  const arena = document.getElementById("arcadeNinjaArena");
  const scoreEl = document.getElementById("arcadeNinjaScore");
  const livesEl = document.getElementById("arcadeNinjaLives");
  const input = document.getElementById("arcadeNinjaInput");
  if (!arena || !input) return;
  arena.style.background = "url('/assets/typing-bg.png') no-repeat center center";
  arena.style.backgroundSize = "cover";
  arena.style.position = "relative";
  arena.style.overflow = "hidden";
  arena.innerHTML = "";
  if (scoreEl) scoreEl.textContent = "Score: 0";
  if (livesEl) livesEl.textContent = "❤️❤️❤️";
  input.value = "";
  setTimeout(() => input.focus(), 100);

  const words = ["KAPOW","NANI","SHONEN","PANEL","INK","BOSS","SLASH","SUGOI","MANGA","STORY","HERO"];

  arcadeNinjaState.spawnInterval = setInterval(() => {
    if (!arcadeNinjaState.active) return;
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
    arena.appendChild(el);
    arcadeNinjaState.words.push(el);
  }, 1600);

  arcadeNinjaState.fallInterval = setInterval(() => {
    if (!arcadeNinjaState.active) return;
    for (let i = arcadeNinjaState.words.length - 1; i >= 0; i--) {
      const el = arcadeNinjaState.words[i];
      let top = parseFloat(el.dataset.top) + 1.5;
      el.dataset.top = top;
      el.style.top = top + "px";
      if (top > arena.clientHeight - 40) {
        el.style.transition = "transform 0.15s, opacity 0.15s";
        el.style.transform = "scale(1.5)";
        el.style.opacity = "0";
        el.style.background = "#f87171";
        setTimeout(() => el.remove(), 150);
        arcadeNinjaState.words.splice(i, 1);
        arcadeNinjaState.lives--;
        if (livesEl) livesEl.textContent = "❤️".repeat(Math.max(0, arcadeNinjaState.lives)) + "🖤".repeat(Math.max(0, 3 - arcadeNinjaState.lives));
        if (arcadeNinjaState.lives <= 0) {
          stopArcadeNinja();
          if (arena) arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);border-radius:12px;"><h3 style="color:#f87171;">Game Over!</h3><p>Score: ${arcadeNinjaState.score}</p><button onclick="startArcadeNinja()" style="background:#8a2be2;border:none;color:white;padding:10px 20px;border-radius:8px;cursor:pointer;">Retry</button></div>`;
        }
      }
    }
  }, 50);

  input.oninput = (e) => {
    const val = (e.target.value || "").toUpperCase().trim();
    if (!val) return;
    const idx = arcadeNinjaState.words.findIndex(el => el.dataset.word === val);
    if (idx !== -1) {
      const targetWord = arcadeNinjaState.words[idx];
      const arenaRect = arena.getBoundingClientRect();
      const wordRect = targetWord.getBoundingClientRect();
      const targetX = wordRect.left - arenaRect.left + (wordRect.width / 2);
      const targetY = wordRect.top - arenaRect.top + (wordRect.height / 2);
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:absolute;width:40px;height:40px;left:50%;bottom:-40px;transform:translateX(-50%);transition:all 0.15s ease-out;z-index:20;";
      const inner = document.createElement("div");
      inner.style.cssText = "width:100%;height:100%;background:url('/assets/shuriken.png') no-repeat center center;background-size:contain;animation:spin 0.3s linear infinite;";
      wrap.appendChild(inner);
      arena.appendChild(wrap);
      setTimeout(() => { wrap.style.left = targetX + "px"; wrap.style.bottom = targetY + "px"; }, 10);
      setTimeout(() => {
        targetWord.style.transition = "transform 0.1s, opacity 0.1s";
        targetWord.style.transform = "scale(1.5)";
        targetWord.style.opacity = "0";
        setTimeout(() => targetWord.remove(), 100);
        wrap.remove();
        arcadeNinjaState.words.splice(idx, 1);
        arcadeNinjaState.score += 10;
        if (scoreEl) scoreEl.textContent = "Score: " + arcadeNinjaState.score;
      }, 150);
      e.target.value = "";
    }
  };
}

function stopArcadeNinja() {
  arcadeNinjaState.active = false;
  clearInterval(arcadeNinjaState.spawnInterval);
  clearInterval(arcadeNinjaState.fallInterval);
  const a = document.getElementById("arcadeNinjaArena");
  if (a) a.innerHTML = "";
}

// ── Arcade Dodge Deadline ──
let arcadeRunnerState = null;
let arcadeRunnerInterval = null;
function startArcadeRunner() {
  if (arcadeRunnerInterval) clearInterval(arcadeRunnerInterval);
  const arena = document.getElementById("arcadeRunnerArena");
  const scoreEl = document.getElementById("arcadeRunnerScore");
  if (!arena) return;

  const arenaH = arena.clientHeight;
  console.log("[ARCADE] arenaH =", arenaH, "clientWidth =", arena.clientWidth);
  if (arenaH < 10) {
    // arena is hidden, retry in 200ms
    console.log("[ARCADE] arena too small, retrying...");
    setTimeout(startArcadeRunner, 200);
    return;
  }

  const playerBottom = Math.round(arenaH * 0.18);
  const playerHeight = Math.round(arenaH * 0.43);
  const playerWidth = Math.round(arenaH * 0.364);
  const obBottom = Math.round(arenaH * 0.13);
  const obSize = Math.round(arenaH * 0.32);
  const jumpVelocity = -Math.round(arenaH * 0.068);
  const gravity = arenaH * 0.005;
  const flyBottom = Math.round(arenaH * 0.27);

  arena.innerHTML = `
    <div id="arcadeBg" style="position:absolute;top:0;left:0;width:100%;height:100%;background:url('/assets/runner-bg.png') repeat-x;background-size:auto 100%;background-position-x:0px;"></div>
    <div id="arcadePlayer" style="position:absolute;bottom:${playerBottom}px;left:40px;width:${playerWidth}px;height:${playerHeight}px;background:url('/assets/ninja-sprite.png') no-repeat;background-size:400% auto;background-position:0% 100%;z-index:10;"></div>
  `;

  const player = document.getElementById("arcadePlayer");
  const bg = document.getElementById("arcadeBg");
  if (scoreEl) scoreEl.textContent = "Score: 0";

  arcadeRunnerState = {
    score: 0, y: 0, velocity: 0, isJumping: false,
    obstacles: [], spawnTimer: 0, speed: 4, level: 1, bgX: 0, startTime: Date.now(),
    arenaH, playerBottom, playerHeight, playerWidth, obBottom, obSize,
    jumpVelocity, gravity, flyBottom
  };
  window._arcadeRunnerState = arcadeRunnerState;

  arcadeRunnerInterval = setInterval(() => {
    if (!arcadeRunnerState) return;
    if (arcadeRunnerState.isJumping) {
      arcadeRunnerState.y += arcadeRunnerState.velocity;
      arcadeRunnerState.velocity += arcadeRunnerState.gravity;
      if (arcadeRunnerState.y >= 0) {
        arcadeRunnerState.y = 0;
        arcadeRunnerState.isJumping = false;
        arcadeRunnerState.velocity = 0;
        player.style.backgroundPosition = "0% 0%";
      } else {
        player.style.backgroundPosition = "33.3% 0%";
      }
    } else {
      arcadeRunnerState.y = 0;
      arcadeRunnerState.velocity = 0;
      player.style.backgroundPosition = "0% 0%";
    }
    player.style.transform = `translateY(${arcadeRunnerState.y}px)`;

    arcadeRunnerState.bgX -= arcadeRunnerState.speed * 0.5;
    bg.style.backgroundPositionX = arcadeRunnerState.bgX + "px";

    if (arcadeRunnerState.score > 300 && arcadeRunnerState.level < 3) {
      arcadeRunnerState.level = 3;
      bg.style.backgroundImage = "url('/assets/runner-bg-3.png')";
    } else if (arcadeRunnerState.score > 100 && arcadeRunnerState.level < 2) {
      arcadeRunnerState.level = 2;
      bg.style.backgroundImage = "url('/assets/runner-bg-2.png')";
    }

    arcadeRunnerState.spawnTimer += 30;
    let threshold = 3500;
    if (arcadeRunnerState.score > 200) threshold = 2200;
    else if (arcadeRunnerState.score > 100) threshold = 2800;

    if (arcadeRunnerState.spawnTimer > threshold) {
      arcadeRunnerState.spawnTimer = 0;
      const canFly = arcadeRunnerState.score >= 100;
      const isFlying = canFly && (Math.random() > 0.7);
      const ob = document.createElement("div");
      ob.style.position = "absolute";
      ob.style.width = arcadeRunnerState.obSize + "px";
      ob.style.height = arcadeRunnerState.obSize + "px";
      ob.style.backgroundSize = "100% 100%";
      ob.style.left = arena.clientWidth + "px";
      ob.style.zIndex = "5";
      if (isFlying) {
        ob.style.bottom = arcadeRunnerState.flyBottom + "px";
        ob.style.backgroundImage = "url('/assets/runner-obstacle-fly.png')";
      } else {
        ob.style.bottom = arcadeRunnerState.obBottom + "px";
        if (arcadeRunnerState.level === 1) ob.style.backgroundImage = "url('/assets/runner-obstacle.png')";
        else if (arcadeRunnerState.level === 2) ob.style.backgroundImage = "url('/assets/runner-obstacle-2.png')";
        else ob.style.backgroundImage = "url('/assets/runner-obstacle-3.png')";
      }
      arena.appendChild(ob);
      arcadeRunnerState.obstacles.push({ el: ob, x: arena.clientWidth, isFlying });
    }

    for (let i = arcadeRunnerState.obstacles.length - 1; i >= 0; i--) {
      const ob = arcadeRunnerState.obstacles[i];
      ob.x -= arcadeRunnerState.speed;
      ob.el.style.left = ob.x + "px";

      const SHRINK = Math.round(arcadeRunnerState.playerHeight * 0.19);
      const pLeft = 40 + SHRINK;
      const pRight = 40 + arcadeRunnerState.playerWidth - SHRINK;
      const pBottom = arcadeRunnerState.playerBottom + arcadeRunnerState.y + SHRINK;
      const pTop = (arcadeRunnerState.playerBottom + arcadeRunnerState.y) + arcadeRunnerState.playerHeight - SHRINK;
      const oLeft = ob.x + SHRINK;
      const oRight = ob.x + arcadeRunnerState.obSize - SHRINK;
      const oBottom = (ob.isFlying ? arcadeRunnerState.flyBottom : arcadeRunnerState.obBottom) + SHRINK;
      const oTop = (ob.isFlying ? arcadeRunnerState.flyBottom : arcadeRunnerState.obBottom) + arcadeRunnerState.obSize - SHRINK;
      const overlapX = pRight > oLeft && pLeft < oRight;
      const overlapY = pTop > oBottom && pBottom < oTop;
      const gameAge = Date.now() - arcadeRunnerState.startTime;

      if (overlapX && overlapY && gameAge > 500) {
        clearInterval(arcadeRunnerInterval);
        arcadeRunnerState = null;
        arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);border-radius:12px;z-index:20;"><h3 style="color:#f87171;font-size:24px;margin:0 0 8px 0;">Game Over!</h3><button onclick="startArcadeRunner()" style="background:#8a2be2;border:none;color:white;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px;">Play Again</button></div>`;
        return;
      }

      if (ob.x < -100) {
        ob.el.remove();
        arcadeRunnerState.obstacles.splice(i, 1);
        arcadeRunnerState.score += 10;
        arcadeRunnerState.speed += (arcadeRunnerState.score > 300 ? 0.1 : 0.05);
        if (scoreEl) scoreEl.textContent = "Score: " + Math.floor(arcadeRunnerState.score);
      }
    }
  }, 30);
}
