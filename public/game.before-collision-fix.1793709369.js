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

// ── DODGE DEADLINE ──
let runner = { score: 0, active: false, y: 0, velocity: 0, isJumping: false, isSliding: false,
  obstacles: [], spawnTimer: 0, speed: 6, bgX1: 0, bgX2: 100, level: 1 };

function startRunner() {
  if (runner.active) return;
  runner.active = true; runner.score = 0; runner.y = 0; runner.velocity = 0;
  runner.isJumping = false; runner.isSliding = false;
  runner.obstacles = []; runner.spawnTimer = 0; runner.speed = 6; runner.level = 1;
  const arena = document.getElementById("runnerArena");
  const scoreEl = document.getElementById("runnerScore");
  if (!arena) return;
  if (scoreEl) scoreEl.textContent = "Score: 0";

  arena.innerHTML = `
    <div id="bg1" style="position:absolute;top:0;left:0;width:100%;height:100%;background:url('/assets/runner-bg.png') repeat-x;background-size:auto 100%;"></div>
    <div id="bg2" style="position:absolute;top:0;left:100%;width:100%;height:100%;background:url('/assets/runner-bg.png') repeat-x;background-size:auto 100%;"></div>
    <div id="player" style="position:absolute;bottom:20px;left:40px;width:60px;height:60px;background:url('/assets/ninja-sprite.png') no-repeat;background-size:400% 100%;background-position:0% 0%;z-index:10;"></div>
  `;

  const player = document.getElementById("player");
  const bg1 = document.getElementById("bg1");
  const bg2 = document.getElementById("bg2");

  window._runnerKeyHandler = (e) => {
    if (!runner.active) return;
    if (e.key === "ArrowDown" || e.key === "Down") {
      if (!runner.isJumping && !runner.isSliding) {
        runner.isSliding = true;
        player.style.backgroundPosition = "100% 0%"; // Frame 4 (Slide)
        player.style.height = "35px";
        setTimeout(() => {
          runner.isSliding = false;
          player.style.backgroundPosition = "0% 0%"; // Back to Run
          player.style.height = "60px";
        }, 800);
      }
      return;
    }
    if ((e.key === "ArrowUp" || e.key === " " || e.key === "Up") && !runner.isJumping && !runner.isSliding) {
      runner.isJumping = true;
      runner.velocity = -15;
      player.style.backgroundPosition = "33.3% 0%"; // Frame 2 (Jump)
    }
  };
  window.addEventListener("keydown", window._runnerKeyHandler);

  arena.onclick = () => {
    if (!runner.isJumping && !runner.isSliding) {
      runner.isJumping = true;
      runner.velocity = -15;
      player.style.backgroundPosition = "33.3% 0%";
    }
  };

  window.gameIntervals.runner = setInterval(() => {
    if (!runner.active) return;

    // 1. Physics
    if (runner.isJumping) {
      runner.y += runner.velocity;
      runner.velocity += 1;
      if (runner.y >= 0) {
        runner.y = 0; runner.isJumping = false; runner.velocity = 0;
        player.style.backgroundPosition = "66.6% 0%"; // Frame 3 (Land)
        setTimeout(() => { if (!runner.isJumping && !runner.isSliding) player.style.backgroundPosition = "0% 0%"; }, 100);
      }
    }
    player.style.transform = `translateY(${runner.y}px)`;

    // 2. Scroll Backgrounds
    runner.bgX1 -= runner.speed * 0.2;
    runner.bgX2 -= runner.speed * 0.2;
    if (runner.bgX1 <= -100) runner.bgX1 = 100;
    if (runner.bgX2 <= -100) runner.bgX2 = 100;
    bg1.style.left = runner.bgX1 + "%";
    bg2.style.left = runner.bgX2 + "%";

    // 3. Level Progression
    if (runner.score > 300 && runner.level < 3) {
      runner.level = 3;
      bg1.style.backgroundImage = "url('/assets/runner-bg-3.png')";
      bg2.style.backgroundImage = "url('/assets/runner-bg-3.png')";
      runner.speed += 2;
    } else if (runner.score > 100 && runner.level < 2) {
      runner.level = 2;
      bg1.style.backgroundImage = "url('/assets/runner-bg-2.png')";
      bg2.style.backgroundImage = "url('/assets/runner-bg-2.png')";
      runner.speed += 2;
    }

    // 4. Spawn Obstacles
    runner.spawnTimer += 50;
    if (runner.spawnTimer > Math.max(600, 1500 - runner.speed * 50)) {
      runner.spawnTimer = 0;
      const isFlying = Math.random() > 0.7;
      const ob = document.createElement("div");
      ob.style.position = "absolute";
      ob.style.left = "100%";
      ob.style.width = isFlying ? "50px" : "40px";
      ob.style.height = isFlying ? "40px" : "40px";
      ob.style.backgroundSize = "contain";
      ob.style.backgroundRepeat = "no-repeat";
      
      if (isFlying) {
        ob.style.bottom = "100px";
        ob.style.backgroundImage = "url('/assets/runner-obstacle-fly.png')";
      } else {
        ob.style.bottom = "20px";
        if (runner.level === 1) {
          ob.style.backgroundImage = "url('/assets/runner-obstacle.png')";
        } else if (runner.level === 2) {
          const hazard = Math.random() > 0.5 ? "runner-obstacle.png" : "runner-obstacle-2.png";
          ob.style.backgroundImage = `url('/assets/${hazard}')`;
        } else {
          const pool = ["runner-obstacle-2.png", "runner-obstacle-3.png", "runner-obstacle.png"];
          const hazard = pool[Math.floor(Math.random() * pool.length)];
          ob.style.backgroundImage = `url('/assets/${hazard}')`;
        }
      }
      
      arena.appendChild(ob);
      runner.obstacles.push({ el: ob, x: 100, isFlying: isFlying });
    }

    // 5. Move Obstacles & Collisions
    for (let i = runner.obstacles.length - 1; i >= 0; i--) {
      const ob = runner.obstacles[i];
      ob.x -= runner.speed * 0.2;
      ob.el.style.left = ob.x + "%";

      const pRect = player.getBoundingClientRect();
      const oRect = ob.el.getBoundingClientRect();

      if (pRect.right > oRect.left + 10 && pRect.left < oRect.right - 10 &&
          pRect.bottom > oRect.top + 10 && pRect.top < oRect.bottom - 10) {
        stopRunner();
        arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);border-radius:12px;z-index:20;"><h3 style="color:#f87171;font-size:24px;margin:0 0 8px 0;">Game Over!</h3><p style="font-size:18px;">Score: ${Math.floor(runner.score)}</p><button onclick="startRunner()" style="background:#8a2be2;border:none;color:white;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px;">Play Again</button></div>`;
        return;
      }
      
      if (ob.x < -10) {
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
