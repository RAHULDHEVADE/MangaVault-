// ── MangaVault Arcade Games (Simple & Robust) ──
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
// TYPING NINJA (Working, untouched)
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
  arena.innerHTML = "";
  if (scoreEl) scoreEl.textContent = "Score: 0";
  if (livesEl) livesEl.textContent = "❤️❤️❤️";
  input.value = ""; setTimeout(() => input.focus(), 100);

  ninja.interval = setInterval(() => {
    if (!ninja.active) return;
    const w = ninjaWords[Math.floor(Math.random() * ninjaWords.length)];
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
    arena.appendChild(el); ninja.words.push(el);
  }, 1600);

  ninja.fallInterval = setInterval(() => {
    if (!ninja.active) return;
    for (let i = ninja.words.length - 1; i >= 0; i--) {
      const el = ninja.words[i];
      let top = parseFloat(el.dataset.top) + 1.5;
      el.dataset.top = top; el.style.top = top + "px";
      if (top > 180) {
        el.remove(); ninja.words.splice(i, 1); ninja.lives--;
        if (livesEl) livesEl.textContent = "❤️".repeat(Math.max(0, ninja.lives)) + "🖤".repeat(Math.max(0, 3 - ninja.lives));
        if (ninja.lives <= 0) {
          stopNinja();
          if (arena) arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);border-radius:12px;"><h3 style="color:#f87171;">Game Over!</h3><p>Score: ${ninja.score}</p><button onclick="startNinja()" style="background:#8a2be2;border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;">Retry</button></div>`;
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
      const aRect = arena.getBoundingClientRect();
      const wRect = targetWord.getBoundingClientRect();
      const tx = wRect.left - aRect.left + (wRect.width / 2);
      const ty = wRect.top - aRect.top + (wRect.height / 2);
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:absolute;width:40px;height:40px;left:50%;bottom:-40px;transform:translateX(-50%);transition:all 0.15s ease-out;z-index:20;";
      const inner = document.createElement("div");
      inner.style.cssText = "width:100%;height:100%;background:url('/assets/shuriken.png') no-repeat center center;background-size:contain;animation:spin 0.3s linear infinite;";
      wrap.appendChild(inner); arena.appendChild(wrap);
      setTimeout(() => { wrap.style.left = tx + "px"; wrap.style.bottom = ty + "px"; }, 10);
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
// DODGE DEADLINE (CSS Transition Jump = No floating)
// ══════════════════════════════════════════
let runner = { score: 0, active: false, obstacles: [], spawnTimer: 0, speed: 4, level: 1, bgX: 0, startTime: 0 };

function startRunner() {
  if (runner.active) return;
  runner.active = true;
  runner.score = 0; runner.obstacles = []; runner.spawnTimer = 0;
  runner.speed = 4; runner.level = 1; runner.bgX = 0; runner.startTime = Date.now();

  const arena = document.getElementById("runnerArena");
  const scoreEl = document.getElementById("runnerScore");
  if (!arena) return;
  if (scoreEl) scoreEl.textContent = "Score: 0";

  arena.innerHTML = `
    <div id="bg" style="position:absolute;top:0;left:0;width:100%;height:100%;background:url('/assets/runner-bg.png') repeat-x;background-size:auto 100%;background-position-x:0px;"></div>
    <div id="player" style="position:absolute;bottom:30px;left:40px;width:80px;height:80px;background:url('/assets/ninja-sprite.png') no-repeat;background-size:400% auto;background-position:0% 100%;z-index:10; transition: transform 0.3s ease-in-out;"></div>
  `;

  const player = document.getElementById("player");
  const bg = document.getElementById("bg");
  let isJumping = false;

  // CSS Transition Jump
  arena.onclick = () => {
    if (!isJumping) {
      isJumping = true;
      player.style.transform = "translateY(-100px)"; // Jump up
      player.style.backgroundPosition = "33.3% 0%";
      
      setTimeout(() => {
        player.style.transform = "translateY(0px)"; // Fall down
        player.style.backgroundPosition = "0% 0%";
        setTimeout(() => { isJumping = false; }, 300); // Wait for fall
      }, 300);
    }
  };

  window.gameIntervals.runner = setInterval(() => {
    if (!runner.active) return;

    // Scroll background
    runner.bgX -= runner.speed * 1.5;
    bg.style.backgroundPositionX = runner.bgX + "px";

    // Levels
    if (runner.score > 300 && runner.level < 3) {
      runner.level = 3; bg.style.backgroundImage = "url('/assets/runner-bg-3.png')"; runner.speed += 2;
    } else if (runner.score > 100 && runner.level < 2) {
      runner.level = 2; bg.style.backgroundImage = "url('/assets/runner-bg-2.png')"; runner.speed += 2;
    }

    // Spawn
    runner.spawnTimer += 30;
    let threshold = 3500;
    if (runner.score > 100) threshold = 2800;
    
    if (runner.spawnTimer > threshold) {
      runner.spawnTimer = 0;
      const ob = document.createElement("div");
      ob.style.cssText = "position:absolute;width:70px;height:70px;background-size:100% 100%;left:" + arena.clientWidth + "px;bottom:30px;z-index:5;";
      if (runner.level === 1) ob.style.backgroundImage = "url('/assets/runner-obstacle.png')";
      else if (runner.level === 2) ob.style.backgroundImage = "url('/assets/runner-obstacle-2.png')";
      else ob.style.backgroundImage = "url('/assets/runner-obstacle-3.png')";
      arena.appendChild(ob);
      runner.obstacles.push({ el: ob, x: arena.clientWidth });
    }

    // Move & Collide
    for (let i = runner.obstacles.length - 1; i >= 0; i--) {
      const ob = runner.obstacles[i];
      ob.x -= runner.speed * 1.5; 
      ob.el.style.left = ob.x + "px";
      
      // Simple hitbox (if jumping, you pass)
      if (ob.x < 100 && ob.x > 20 && !isJumping) {
        clearInterval(window.gameIntervals.runner);
        arena.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);border-radius:12px;z-index:20;"><h3 style="color:#f87171;font-size:24px;margin:0 0 8px 0;">Game Over!</h3><p style="font-size:18px;">Score: ${Math.floor(runner.score)}</p><button onclick="startRunner()" style="background:#8a2be2;border:none;color:white;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px;">Play Again</button></div>`;
        return;
      }
      if (ob.x < -100) {
        ob.el.remove(); runner.obstacles.splice(i, 1);
        runner.score += 10;
        if (scoreEl) scoreEl.textContent = "Score: " + Math.floor(runner.score);
      }
    }
  }, 30);
}

function stopRunner() {
  runner.active = false;
  clearInterval(window.gameIntervals.runner);
  runner.obstacles.forEach(o => { try { o.el.remove(); } catch(e) {} });
  runner.obstacles = [];
}
