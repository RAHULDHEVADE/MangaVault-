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

// ── TYPING NINJA ──
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
  arena.innerHTML = "";
  if (scoreEl) scoreEl.textContent = "Score: 0";
  if (livesEl) livesEl.textContent = "Lives: 3";
  input.value = ""; setTimeout(() => input.focus(), 100);
  ninja.interval = setInterval(() => {
    if (!ninja.active) return;
    const w = ninjaWords[Math.floor(Math.random() * ninjaWords.length)];
    const el = document.createElement("div");
    el.className = "ninja-word"; el.textContent = w;
    el.style.left = (Math.random() * 60 + 20) + "%";
    el.dataset.word = w; el.dataset.top = -30;
    arena.appendChild(el); ninja.words.push(el);
  }, 1600);
  ninja.fallInterval = setInterval(() => {
    if (!ninja.active) return;
    for (let i = ninja.words.length - 1; i >= 0; i--) {
      const el = ninja.words[i];
      let top = parseFloat(el.dataset.top) + 2;
      el.dataset.top = top; el.style.top = top + "px";
      if (top > 180) {
        el.remove(); ninja.words.splice(i, 1);
        ninja.lives--;
        if (livesEl) livesEl.textContent = "Lives: " + ninja.lives;
        if (ninja.lives <= 0) {
          stopNinja();
          if (arena) arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);border-radius:12px;"><h3 style="color:#f87171;margin:0 0 8px 0;">Game Over!</h3><p>Score: ${ninja.score}</p><button onclick="startNinja()" style="background:#8a2be2;border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;">Retry</button></div>`;
        }
      }
    }
  }, 50);
  input.oninput = (e) => {
    const val = (e.target.value || "").toUpperCase().trim();
    if (!val) return;
    const idx = ninja.words.findIndex(el => el.dataset.word === val);
    if (idx !== -1) {
      ninja.words[idx].remove(); ninja.words.splice(idx, 1);
      ninja.score += 10;
      if (scoreEl) scoreEl.textContent = "Score: " + ninja.score;
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

// ── DODGE DEADLINE (Pixel Engine) ──
let runner = { score: 0, active: false, y: 0, velocity: 0, isJumping: false, isSliding: false,
  obstacles: [], spawnTimer: 0, speed: 4, level: 1, startTime: 0 };

function startRunner() {
  if (runner.active) return;
  runner.active = true; runner.score = 0; runner.y = 0; runner.velocity = 0;
  runner.isJumping = false; runner.isSliding = false;
  runner.obstacles = []; runner.spawnTimer = 0; runner.speed = 4; runner.level = 1;
  runner.startTime = Date.now();
  
  const arena = document.getElementById("runnerArena");
  const scoreEl = document.getElementById("runnerScore");
  if (!arena) return;
  if (scoreEl) scoreEl.textContent = "Score: 0";

  // Create the player (70x70) and a background that fills the arena
  arena.innerHTML = `
    <div id="bg1" style="position:absolute;top:0;left:0;width:100%;height:100%;background:url('/assets/runner-bg.png') repeat-x;background-size:auto 100%;"></div>
    <div id="bg2" style="position:absolute;top:0;left:100%;width:100%;height:100%;background:url('/assets/runner-bg.png') repeat-x;background-size:auto 100%;"></div>
    <div id="player" style="position:absolute;bottom:20px;left:40px;width:70px;height:70px;background:url('/assets/ninja-sprite.png') no-repeat;background-size:400% 100%;background-position:0% 0%;z-index:10; border: 2px dashed #00ff00;"></div>
  `;

  const player = document.getElementById("player");
  const bg1 = document.getElementById("bg1");
  const bg2 = document.getElementById("bg2");
  let bgX1 = 0, bgX2 = 0;

  // Click = Jump
  arena.onclick = () => {
    if (!runner.isJumping && !runner.isSliding) {
      runner.isJumping = true;
      runner.velocity = -15;
      player.style.backgroundPosition = "33.3% 0%";
    }
  };

  // Keyboard Controls
  window._runnerKeyHandler = (e) => {
    if (!runner.active) return;
    if (e.key === "ArrowDown") {
      if (!runner.isJumping && !runner.isSliding) {
        runner.isSliding = true;
        player.style.backgroundPosition = "100% 0%";
        player.style.height = "40px";
        setTimeout(() => {
          runner.isSliding = false;
          player.style.backgroundPosition = "0% 0%";
          player.style.height = "70px";
        }, 800);
      }
    }
    if (e.key === "ArrowUp" || e.key === " ") {
      if (!runner.isJumping && !runner.isSliding) {
        runner.isJumping = true;
        runner.velocity = -15;
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
      runner.velocity += 1;
      if (runner.y >= 0) {
        runner.y = 0; runner.isJumping = false; runner.velocity = 0;
        player.style.backgroundPosition = "66.6% 0%";
        setTimeout(() => { if (!runner.isJumping && !runner.isSliding) player.style.backgroundPosition = "0% 0%"; }, 100);
      }
    }
    player.style.transform = `translateY(${runner.y}px)`;

    // 2. Scroll Backgrounds
    bgX1 -= runner.speed * 0.5;
    bgX2 -= runner.speed * 0.5;
    if (bgX1 <= -arena.clientWidth) bgX1 = arena.clientWidth;
    if (bgX2 <= -arena.clientWidth) bgX2 = arena.clientWidth;
    bg1.style.transform = `translateX(${bgX1}px)`;
    bg2.style.transform = `translateX(${bgX2}px)`;

    // 3. Level Progression
    if (runner.score > 300 && runner.level < 3) {
      runner.level = 3;
      bg1.style.backgroundImage = "url('/assets/runner-bg-3.png')";
      bg2.style.backgroundImage = "url('/assets/runner-bg-3.png')";
      runner.speed += 4;
    } else if (runner.score > 100 && runner.level < 2) {
      runner.level = 2;
      bg1.style.backgroundImage = "url('/assets/runner-bg-2.png')";
      bg2.style.backgroundImage = "url('/assets/runner-bg-2.png')";
      runner.speed += 3;
    }

    // 4. Spawn Obstacles (Pixel based)
    runner.spawnTimer += 50;
    // Spawn time gets shorter as score increases
    let spawnThreshold = 2000; // 2s gap at start
    if (runner.score > 200) spawnThreshold = 1200;
    else if (runner.score > 100) spawnThreshold = 1600;
    if (runner.spawnTimer > spawnThreshold) {
      runner.spawnTimer = 0;
      const isFlying = Math.random() > 0.7;
      const ob = document.createElement("div");
      ob.style.position = "absolute";
      ob.style.width = isFlying ? "60px" : "50px";
      ob.style.height = isFlying ? "60px" : "50px";
      ob.style.backgroundSize = "100% 100%";
      ob.style.backgroundRepeat = "no-repeat";
      ob.style.left = arena.clientWidth + "px"; // Spawn just off-screen right
      ob.style.zIndex = "5";
      ob.style.border = "2px dashed #ff0000"; // Debug border
      
      if (isFlying) {
        ob.style.bottom = "100px";
        ob.style.backgroundImage = "url('/assets/runner-obstacle-fly.png')";
      } else {
        ob.style.bottom = "20px";
        if (runner.level === 1) {
          ob.style.backgroundImage = "url('/assets/runner-obstacle.png')";
        } else if (runner.level === 2) {
          ob.style.backgroundImage = "url('/assets/runner-obstacle-2.png')";
        } else {
          ob.style.backgroundImage = "url('/assets/runner-obstacle-3.png')";
        }
      }
      
      arena.appendChild(ob);
      runner.obstacles.push({ el: ob, x: arena.clientWidth, width: isFlying ? 60 : 50, isFlying: isFlying });
    }

    // 5. Move Obstacles (Pixels) & Collisions
    for (let i = runner.obstacles.length - 1; i >= 0; i--) {
      const ob = runner.obstacles[i];
      ob.x -= runner.speed;
      ob.el.style.left = ob.x + "px";

      // AABB Collision (Axis-Aligned Bounding Box)
      // Player Box: x=40, y=20 + jump, width=70, height=70 (or 40 sliding)
      const pLeft = 40;
      const pRight = pLeft + 70;
      const pBottom = 20 + runner.y;
      const pTop = pBottom + (runner.isSliding ? 40 : 70);

      // Obstacle Box
      const oLeft = ob.x;
      const oRight = ob.x + ob.width;
      const oBottom = ob.isFlying ? 100 : 20;
      const oTop = oBottom + (ob.isFlying ? 60 : 50);

      // Check overlap
      const overlapX = pRight > oLeft && pLeft < oRight;
      const overlapY = pTop > oBottom && pBottom < oTop;

      if (overlapX && overlapY) {
        stopRunner();
        arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);border-radius:12px;z-index:20;"><h3 style="color:#f87171;font-size:24px;margin:0 0 8px 0;">Game Over!</h3><p style="font-size:18px;">Score: ${Math.floor(runner.score)}</p><button onclick="startRunner()" style="background:#8a2be2;border:none;color:white;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px;">Play Again</button></div>`;
        return;
      }
      
      if (ob.x < -100) {
        ob.el.remove();
        runner.obstacles.splice(i, 1);
        runner.score += 10;
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
