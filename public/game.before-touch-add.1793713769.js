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

// ══════════════════════════════════════════
// DODGE DEADLINE
// ══════════════════════════════════════════
let runner = { score: 0, active: false, y: 0, velocity: 0, isJumping: false, isSliding: false,
  obstacles: [], spawnTimer: 0, speed: 4, level: 1, bgX: 0, startTime: 0 };

function startRunner() {
  if (runner.active) return;
  runner.active = true;
  runner.score = 0; runner.y = 0; runner.velocity = 0;
  runner.isJumping = false; runner.isSliding = false;
  runner.obstacles = []; runner.spawnTimer = 0;
  runner.speed = 4; runner.level = 1; runner.bgX = 0; runner.startTime = Date.now();
  
  const arena = document.getElementById("runnerArena");
  if (arena) arena.style.touchAction = "none"; // Prevent page scroll on swipe
  const scoreEl = document.getElementById("runnerScore");
  if (!arena) return;
  if (scoreEl) scoreEl.textContent = "Score: 0";

  arena.innerHTML = `
    <div id="bg" style="position:absolute;top:0;left:0;width:100%;height:100%;background:url('/assets/runner-bg.png') repeat-x;background-size:auto 100%;background-position-x:0px;"></div>
    <div id="player" style="position:absolute;bottom:30px;left:40px;width:70px;height:80px;background:url('/assets/ninja-sprite.png') no-repeat;background-size:400% 100%;background-position:0% 0%;z-index:10;"></div>
  `;

  const player = document.getElementById("player");
  const bg = document.getElementById("bg");

  // Click = Jump
  arena.onclick = () => {
    if (!runner.isJumping && !runner.isSliding) {
      runner.isJumping = true;
      runner.velocity = -16;
      player.style.backgroundPosition = "33.3% 0%";
    }
  };

  // Keyboard
  window._runnerKeyHandler = (e) => {
    if (!runner.active) return;
    if (e.key === "ArrowDown" || e.key === "Down") {
      if (!runner.isJumping && !runner.isSliding) {
        runner.isSliding = true;
        player.style.backgroundPosition = "100% 0%";
        player.style.height = "40px";
        setTimeout(() => {
          runner.isSliding = false;
          player.style.backgroundPosition = "0% 0%";
          player.style.height = "80px";
        }, 800);
      }
    }
    if (e.key === "ArrowUp" || e.key === " ") {
      if (!runner.isJumping && !runner.isSliding) {
        runner.isJumping = true;
        runner.velocity = -16;
        player.style.backgroundPosition = "33.3% 0%";
      }
    }
  };
  window.addEventListener("keydown", window._runnerKeyHandler);

  // Game Loop
  window.gameIntervals.runner = setInterval(() => {
    if (!runner.active) return;

    // 1. Physics (jump)
    if (runner.isJumping) {
      runner.y += runner.velocity;
      runner.velocity += 0.9;
      if (runner.y >= 0) {
        runner.y = 0; runner.isJumping = false; runner.velocity = 0;
        player.style.backgroundPosition = "66.6% 0%";
        setTimeout(() => { if (!runner.isJumping && !runner.isSliding) player.style.backgroundPosition = "0% 0%"; }, 100);
      }
    }
    player.style.transform = `translateY(${runner.y}px)`;

    // 2. Scroll Background (single repeating div)
    runner.bgX -= runner.speed * 0.5;
    bg.style.backgroundPositionX = runner.bgX + "px";

    // 3. Level progression
    if (runner.score > 300 && runner.level < 3) {
      runner.level = 3;
      bg.style.backgroundImage = "url('/assets/runner-bg-3.png')";
      runner.speed += 3;
    } else if (runner.score > 100 && runner.level < 2) {
      runner.level = 2;
      bg.style.backgroundImage = "url('/assets/runner-bg-2.png')";
      runner.speed += 3;
    }

    // 4. Spawn obstacles
    runner.spawnTimer += 30;
    let threshold = 3500; // 3.5 seconds between obstacles
    if (runner.score > 200) threshold = 2200;
    else if (runner.score > 100) threshold = 2800;

    if (runner.spawnTimer > threshold) {
      runner.spawnTimer = 0;
      const canFly = runner.score >= 100;
      const isFlying = canFly && (Math.random() > 0.65);
      const ob = document.createElement("div");
      ob.style.position = "absolute";
      ob.style.width = "70px";
      ob.style.height = "70px";
      ob.style.backgroundSize = "100% 100%";
      ob.style.backgroundRepeat = "no-repeat";
      ob.style.left = arena.clientWidth + "px";
      ob.style.zIndex = "5";

      if (isFlying) {
        ob.style.bottom = "90px";
        ob.style.backgroundImage = "url('/assets/runner-obstacle-fly.png')";
      } else {
        ob.style.bottom = "30px";
        if (runner.level === 1) ob.style.backgroundImage = "url('/assets/runner-obstacle.png')";
        else if (runner.level === 2) ob.style.backgroundImage = "url('/assets/runner-obstacle-2.png')";
        else ob.style.backgroundImage = "url('/assets/runner-obstacle-3.png')";
      }

      arena.appendChild(ob);
      runner.obstacles.push({ el: ob, x: arena.clientWidth, isFlying });
    }

    // 5. Move obstacles & collision
    for (let i = runner.obstacles.length - 1; i >= 0; i--) {
      const ob = runner.obstacles[i];
      ob.x -= runner.speed;
      ob.el.style.left = ob.x + "px";

      // Forgiving hitbox: shrink by 15px on each side
      const SHRINK = 18;
      const pLeft = 40 + SHRINK;
      const pRight = 40 + 70 - SHRINK;
      const pBottom = 30 + runner.y + SHRINK;
      const pTop = (20 + runner.y) + (runner.isSliding ? 40 : 70) - SHRINK;

      const oLeft = ob.x + SHRINK;
      const oRight = ob.x + 70 - SHRINK;
      const oBottom = (ob.isFlying ? 90 : 20) + SHRINK;
      const oTop = (ob.isFlying ? 90 : 20) + 70 - SHRINK;

      const overlapX = pRight > oLeft && pLeft < oRight;
      const overlapY = pTop > oBottom && pBottom < oTop;

      // No collision in the first 500ms (safety)
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
