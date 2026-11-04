// --- MangaVault Arcade Games (Isolated Module) ---
window.activeGame = null;
window.gameIntervals = { ninja: null, runner: null };

window.switchGame = function(game) {
  if (window.activeGame === "ninja") stopNinja();
  if (window.activeGame === "runner") stopRunner();
  
  const btnNinja = document.getElementById("btnNinja");
  const btnRunner = document.getElementById("btnRunner");
  const gameNinja = document.getElementById("gameNinja");
  const gameRunner = document.getElementById("gameRunner");
  
  if (btnNinja) btnNinja.classList.remove("active");
  if (btnRunner) btnRunner.classList.remove("active");
  if (gameNinja) gameNinja.style.display = "none";
  if (gameRunner) gameRunner.style.display = "none";
  
  if (game === "ninja") {
    if (btnNinja) btnNinja.classList.add("active");
    if (gameNinja) gameNinja.style.display = "block";
    startNinja();
  } else {
    if (btnRunner) btnRunner.classList.add("active");
    if (gameRunner) gameRunner.style.display = "block";
    startRunner();
  }
  window.activeGame = game;
};

window.stopArcade = function() {
  if (window.activeGame === "ninja") stopNinja();
  if (window.activeGame === "runner") stopRunner();
  window.activeGame = null;
};

// --- Game 1: Typing Ninja ---
let ninja = { words: [], score: 0, lives: 3, interval: null, fallInterval: null, active: false };
const ninjaWords = ["KAPOW", "NANI", "SHONEN", "PANEL", "INK", "BOSS", "SLASH", "SUGOI", "MANGA", "STORY", "HERO", "RAGE", "QUOTE"];

function startNinja() {
  if (ninja.active) return;
  ninja.active = true;
  ninja.score = 0; ninja.lives = 3; ninja.words = [];
  
  const arena = document.getElementById("ninjaArena");
  const scoreEl = document.getElementById("ninjaScore");
  const livesEl = document.getElementById("ninjaLives");
  const input = document.getElementById("ninjaInput");
  
  if (!arena || !input) return;
  arena.innerHTML = "";
  if (scoreEl) scoreEl.textContent = "Score: 0";
  if (livesEl) livesEl.textContent = "Lives: 3";
  input.value = "";
  setTimeout(() => input.focus(), 100);

  ninja.interval = setInterval(() => {
    if (!ninja.active) return;
    const wordText = ninjaWords[Math.floor(Math.random() * ninjaWords.length)];
    const el = document.createElement("div");
    el.className = "ninja-word";
    el.textContent = wordText;
    el.style.left = (Math.random() * 60 + 20) + "%";
    el.dataset.word = wordText; 
    el.dataset.top = -30;
    arena.appendChild(el);
    ninja.words.push(el);
  }, 1600);

  ninja.fallInterval = setInterval(() => {
    if (!ninja.active) return;
    for (let i = ninja.words.length - 1; i >= 0; i--) {
      const el = ninja.words[i];
      let top = parseFloat(el.dataset.top) + 2;
      el.dataset.top = top;
      el.style.top = top + "px";
      if (top > 180) {
        el.remove(); 
        ninja.words.splice(i, 1);
        ninja.lives--;
        if (livesEl) livesEl.textContent = "Lives: " + ninja.lives;
        if (ninja.lives <= 0) {
          stopNinja();
          setTimeout(() => alert("Game Over! Score: " + ninja.score), 100);
        }
      }
    }
  }, 50);

  input.oninput = (e) => {
    const val = (e.target.value || "").toUpperCase().trim();
    if (!val) return;
    const idx = ninja.words.findIndex(el => el.dataset.word === val);
    if (idx !== -1) {
      ninja.words[idx].remove(); 
      ninja.words.splice(idx, 1);
      ninja.score += 10;
      if (scoreEl) scoreEl.textContent = "Score: " + ninja.score;
      e.target.value = "";
    }
  };
}

function stopNinja() {
  ninja.active = false;
  clearInterval(ninja.interval);
  clearInterval(ninja.fallInterval);
  const a = document.getElementById("ninjaArena");
  if (a) a.innerHTML = "";
}

// --- Game 2: Dodge Runner ---
let runner = { score: 0, obstacles: [], active: false, jumping: false, spawnTimer: 0, speed: 4 };

function startRunner() {
  if (runner.active) return;
  runner.active = true;
  runner.score = 0; 
  runner.obstacles = []; 
  runner.jumping = false; 
  runner.speed = 4; 
  runner.spawnTimer = 0;
  
  const arena = document.getElementById("runnerArena");
  const scoreEl = document.getElementById("runnerScore");
  if (!arena) return;
  
  if (scoreEl) scoreEl.textContent = "Score: 0";
  arena.innerHTML = '<div style="position:absolute;bottom:10px;left:10px;font-size:12px;color:#888;pointer-events:none;width:100%;text-align:center;">Tap to Jump</div><div class="runner-player" id="runnerPlayer"></div>';

  window.gameIntervals.runner = setInterval(() => {
    if (!runner.active) return;
    const player = document.getElementById("runnerPlayer");
    if (!player) return;
    
    if (runner.jumping) {
      player.style.bottom = "80px";
      setTimeout(() => { if (player) player.style.bottom = "20px"; runner.jumping = false; }, 350);
    }
    
    runner.spawnTimer += 50;
    if (runner.spawnTimer > Math.max(700, 2000 - runner.speed * 80)) {
      runner.spawnTimer = 0;
      const ob = document.createElement("div");
      ob.className = "runner-obstacle";
      arena.appendChild(ob);
      runner.obstacles.push({ el: ob, x: 100 });
    }
    
    for (let i = runner.obstacles.length - 1; i >= 0; i--) {
      const ob = runner.obstacles[i];
      ob.x -= runner.speed;
      ob.el.style.right = (100 - ob.x) + "%";
      
      if (ob.x < 25 && ob.x > 10 && !runner.jumping) {
        stopRunner();
        setTimeout(() => alert("Game Over! Score: " + Math.floor(runner.score)), 100);
        return;
      }
      
      if (ob.x < -10) {
        ob.el.remove();
        runner.obstacles.splice(i, 1);
        runner.score += 1;
        runner.speed += 0.05;
        if (scoreEl) scoreEl.textContent = "Score: " + Math.floor(runner.score);
      }
    }
  }, 50);
}

window.jumpRunner = function() {
  if (runner.active && !runner.jumping) runner.jumping = true;
};

function stopRunner() {
  runner.active = false;
  clearInterval(window.gameIntervals.runner);
  runner.obstacles.forEach(o => { try { o.el.remove(); } catch(e) {} });
  runner.obstacles = [];
}
