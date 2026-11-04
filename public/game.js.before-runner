// =====================================================
// MANGAVAULT — TYPING NINJA
// Real spinning projectile + bubble impact
// =====================================================

const arcadeNinjaState = {
    active: false,
    words: [],
    projectiles: new Set(),
    score: 0,
    lives: 3,
    spawnTimer: null,
    fallTimer: null
};

const arcadeWordList = [
    "KAPOW", "NANI", "SHONEN", "PANEL",
    "INK", "BOSS", "SLASH", "SUGOI",
    "MANGA", "STORY", "HERO", "NINJA",
    "SENPAI", "KATANA", "CHIBI", "BANKAI",
    "SENSEI", "KAWAII", "OTAKU", "SHADOW"
];

// -----------------------------------------------------
// STYLES
// -----------------------------------------------------

function installNinjaStyles() {
    if (document.getElementById("arcadeNinjaStyles")) return;

    const style = document.createElement("style");
    style.id = "arcadeNinjaStyles";

    style.textContent = `
        @keyframes ninjaWordPop {
            0% { transform:scale(1); opacity:1; }
            100% { transform:scale(1.6); opacity:0; }
        }

        @keyframes ninjaImpactBurst {
            0% { transform:scale(.2); opacity:1; }
            100% { transform:scale(2.2); opacity:0; }
        }

        .ninja-word-pop {
            animation:ninjaWordPop .18s ease-out forwards;
            pointer-events:none;
        }

        .ninja-impact {
            position:absolute;
            width:48px;
            height:48px;
            border:3px solid #d8a2ff;
            border-radius:50%;
            box-shadow:0 0 18px #b44cff, inset 0 0 12px #b44cff;
            pointer-events:none;
            z-index:1000;
            animation:ninjaImpactBurst .25s ease-out forwards;
        }

        .ninja-game-over {
            position:absolute;
            inset:0;
            z-index:10000;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            gap:14px;
            background:rgba(8,3,20,.94);
            color:white;
            text-align:center;
            border-radius:12px;
            padding:20px;
            box-sizing:border-box;
        }

        .ninja-game-over h2 {
            color:#d8a2ff;
            font-size:30px;
            margin:0;
        }

        .ninja-retry {
            background:#8425dc;
            color:white;
            border:1px solid #c58aff;
            padding:12px 30px;
            border-radius:10px;
            font-weight:bold;
            font-size:16px;
            cursor:pointer;
        }

        .ninja-heart-display {
            font-size:20px;
            margin-left:12px;
        }
    `;

    document.head.appendChild(style);
}

// -----------------------------------------------------
// ARENA
// -----------------------------------------------------

function setupArcadeNinja() {
    const arena = document.getElementById("arcadeNinjaArena");
    const input = document.getElementById("arcadeNinjaInput");
    const score = document.getElementById("arcadeNinjaScore");

    if (!arena || !input || !score) {
        console.error("Typing Ninja: Required elements missing");
        return null;
    }

    installNinjaStyles();

    arena.style.position = "relative";
    arena.style.overflow = "hidden";
    arena.style.background =
        "url('/assets/typing-bg.png') no-repeat center center";
    arena.style.backgroundSize = "cover";

    let lives = document.getElementById("arcadeNinjaLives");

    if (!lives) {
        lives = document.createElement("span");
        lives.id = "arcadeNinjaLives";
        lives.className = "ninja-heart-display";
        score.insertAdjacentElement("afterend", lives);
    }

    return { arena, input, score, lives };
}

// -----------------------------------------------------
// HUD
// -----------------------------------------------------

function updateNinjaLives() {
    const lives = document.getElementById("arcadeNinjaLives");
    if (!lives) return;

    lives.textContent =
        "❤️".repeat(arcadeNinjaState.lives) +
        "🖤".repeat(3 - arcadeNinjaState.lives);
}

function updateNinjaScore() {
    const score = document.getElementById("arcadeNinjaScore");
    if (score) {
        score.textContent = "Score: " + arcadeNinjaState.score;
    }
}

// -----------------------------------------------------
// SPAWN WORD
// -----------------------------------------------------

function spawnArcadeWord() {
    const state = arcadeNinjaState;
    if (!state.active) return;

    const arena = document.getElementById("arcadeNinjaArena");
    if (!arena) return;

    const word =
        arcadeWordList[
            Math.floor(Math.random() * arcadeWordList.length)
        ];

    const element = document.createElement("div");

    element.textContent = word;
    element.dataset.word = word;
    element.dataset.top = "0";
    element.dataset.targeted = "false";

    element.style.cssText = `
        position:absolute;
        top:0;
        left:0;
        padding:8px 16px;
        background:white;
        color:#111;
        border:2px solid #171020;
        border-radius:12px;
        font-family:"Comic Sans MS",cursive;
        font-size:17px;
        font-weight:bold;
        letter-spacing:1px;
        white-space:nowrap;
        box-shadow:4px 4px 0 #8b35d5,
                   0 0 14px rgba(190,100,255,.5);
        z-index:10;
    `;

    arena.appendChild(element);

    const maxLeft = Math.max(
        0,
        arena.clientWidth - element.offsetWidth - 8
    );

    element.style.left =
        Math.round(Math.random() * maxLeft) + "px";

    state.words.push(element);
}

// -----------------------------------------------------
// PURPLE IMPACT EFFECT
// -----------------------------------------------------

function createNinjaImpact(x, y) {
    const arena = document.getElementById("arcadeNinjaArena");
    if (!arena) return;

    const impact = document.createElement("div");
    impact.className = "ninja-impact";

    impact.style.left = (x - 24) + "px";
    impact.style.top = (y - 24) + "px";

    arena.appendChild(impact);

    setTimeout(() => impact.remove(), 280);
}

// -----------------------------------------------------
// REAL SHURIKEN PROJECTILE
// Starts bottom-centre and flies to the bubble.
// Position updated directly on every animation frame.
// -----------------------------------------------------

function launchArcadeShuriken(targetElement, wordIndex) {
    const state = arcadeNinjaState;
    const arena = document.getElementById("arcadeNinjaArena");

    if (!state.active || !arena || !targetElement) return;
    if (targetElement.dataset.targeted === "true") return;

    targetElement.dataset.targeted = "true";

    const SIZE = 42;
    const OFFSET = SIZE / 2;

    const startX = arena.clientWidth / 2;
    const startY = arena.clientHeight - 32;

    const endX = targetElement.offsetLeft + targetElement.offsetWidth / 2;
    const endY = targetElement.offsetTop + targetElement.offsetHeight / 2;

    const shuriken = document.createElement("img");
    shuriken.src = "/assets/shuriken.png";
    shuriken.alt = "";

    shuriken.style.cssText = `
        position:absolute;
        width:${SIZE}px;
        height:${SIZE}px;
        left:${startX - OFFSET}px;
        top:${startY - OFFSET}px;
        z-index:99999;
        pointer-events:none;
        object-fit:contain;
        filter:drop-shadow(0 0 6px #b44cff);
        will-change:left,top,transform;
    `;

    arena.appendChild(shuriken);

    const projectile = {
        element: shuriken,
        raf: null,
        target: targetElement
    };

    state.projectiles.add(projectile);

    const duration = 280;
    const startTime = performance.now();
    const totalRotation = 1080;

    function animateProjectile(now) {
        if (!state.active) {
            shuriken.remove();
            state.projectiles.delete(projectile);
            return;
        }

        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);

        const currentX = startX + (endX - startX) * eased;
        const currentY = startY + (endY - startY) * eased;

        shuriken.style.left = (currentX - OFFSET) + "px";
        shuriken.style.top = (currentY - OFFSET) + "px";
        shuriken.style.transform = `rotate(${totalRotation * progress}deg)`;

        if (progress < 1) {
            projectile.raf = requestAnimationFrame(animateProjectile);
            return;
        }

        shuriken.remove();
        state.projectiles.delete(projectile);

        if (!state.active) return;

        createNinjaImpact(endX, endY);

        const index = state.words.indexOf(targetElement);
        if (index !== -1) state.words.splice(index, 1);

        targetElement.classList.add("ninja-word-pop");

        state.score += 10;
        updateNinjaScore();

        setTimeout(() => targetElement.remove(), 200);
    }

    projectile.raf = requestAnimationFrame(animateProjectile);
}

// -----------------------------------------------------
// INPUT
// -----------------------------------------------------

function setupNinjaInput(input) {
    input.disabled = false;

    input.oninput = function () {
        const state = arcadeNinjaState;

        if (!state.active) return;

        const value = input.value.toUpperCase().trim();
        if (!value) return;

        const target = state.words.find(element =>
            element.dataset.word === value &&
            element.dataset.targeted !== "true"
        );

        if (target) {
            const index = state.words.indexOf(target);

            launchArcadeShuriken(target, index);

            input.value = "";
        }
    };
}

// -----------------------------------------------------
// FALLING WORDS
// -----------------------------------------------------

function fallArcadeWords() {
    const state = arcadeNinjaState;

    if (!state.active) return;

    const arena = document.getElementById("arcadeNinjaArena");
    if (!arena) return;

    for (let i = state.words.length - 1; i >= 0; i--) {
        const element = state.words[i];

        // Freeze a bubble while its shuriken is travelling.
        if (element.dataset.targeted === "true") continue;

        const top = Number(element.dataset.top) + 2;

        element.dataset.top = String(top);
        element.style.top = top + "px";

        if (top + element.offsetHeight >= arena.clientHeight) {
            element.remove();
            state.words.splice(i, 1);
            loseNinjaLife();
        }
    }
}

// -----------------------------------------------------
// HEARTS
// -----------------------------------------------------

function loseNinjaLife() {
    const state = arcadeNinjaState;

    if (!state.active) return;

    state.lives = Math.max(0, state.lives - 1);
    updateNinjaLives();

    if (state.lives === 0) {
        endArcadeNinja();
    }
}

// -----------------------------------------------------
// CLEAN UP PROJECTILES
// -----------------------------------------------------

function clearNinjaProjectiles() {
    const state = arcadeNinjaState;

    for (const projectile of state.projectiles) {
        if (projectile.raf !== null) {
            cancelAnimationFrame(projectile.raf);
        }

        projectile.element.remove();
    }

    state.projectiles.clear();
}

// -----------------------------------------------------
// GAME OVER
// -----------------------------------------------------

function endArcadeNinja() {
    const state = arcadeNinjaState;

    if (!state.active) return;

    state.active = false;

    clearInterval(state.spawnTimer);
    clearInterval(state.fallTimer);

    state.spawnTimer = null;
    state.fallTimer = null;

    clearNinjaProjectiles();

    state.words.forEach(word => word.remove());
    state.words = [];

    const arena = document.getElementById("arcadeNinjaArena");
    const input = document.getElementById("arcadeNinjaInput");

    if (input) {
        input.disabled = true;
        input.value = "";
    }

    if (!arena) return;

    const overlay = document.createElement("div");
    overlay.className = "ninja-game-over";

    overlay.innerHTML = `
        <div style="font-size:48px;">💀</div>
        <h2>GAME OVER</h2>
        <div style="font-size:20px;">🖤🖤🖤</div>
        <p>Final Score: <strong>${state.score}</strong></p>
        <button class="ninja-retry" type="button">↻ Retry</button>
    `;

    arena.appendChild(overlay);

    overlay.querySelector(".ninja-retry").addEventListener(
        "click",
        startArcadeNinja
    );
}

// -----------------------------------------------------
// START / RETRY
// -----------------------------------------------------

function startArcadeNinja() {
    const state = arcadeNinjaState;

    if (state.active) return;

    const elements = setupArcadeNinja();
    if (!elements) return;

    const { arena, input, score } = elements;

    clearInterval(state.spawnTimer);
    clearInterval(state.fallTimer);
    clearNinjaProjectiles();

    state.words.forEach(word => word.remove());
    state.words = [];

    const oldOverlay = arena.querySelector(".ninja-game-over");
    if (oldOverlay) oldOverlay.remove();

    state.score = 0;
    state.lives = 3;
    state.active = true;

    score.textContent = "Score: 0";

    updateNinjaLives();
    setupNinjaInput(input);

    spawnArcadeWord();

    state.spawnTimer = setInterval(spawnArcadeWord, 1600);
    state.fallTimer = setInterval(fallArcadeWords, 50);

    input.value = "";

    setTimeout(() => {
        if (state.active) input.focus();
    }, 150);

    console.log("Typing Ninja started!");
}

// -----------------------------------------------------
// STOP / NAVIGATION
// -----------------------------------------------------

function stopArcadeNinja() {
    const state = arcadeNinjaState;

    state.active = false;

    clearInterval(state.spawnTimer);
    clearInterval(state.fallTimer);

    state.spawnTimer = null;
    state.fallTimer = null;

    clearNinjaProjectiles();

    state.words.forEach(word => word.remove());
    state.words = [];

    const input = document.getElementById("arcadeNinjaInput");

    if (input) {
        input.value = "";
        input.disabled = false;
    }
}

// -----------------------------------------------------
// NAVIGATION
// -----------------------------------------------------

function handleArcadeNavigation() {
    const arcade = document.getElementById("arcade");
    if (!arcade) return;

    if (window.location.hash === "#arcade") {
        arcade.style.display = "flex";
        startArcadeNinja();
    } else {
        stopArcadeNinja();
        arcade.style.display = "none";
    }
}

window.startArcadeNinja = startArcadeNinja;
window.stopArcadeNinja = stopArcadeNinja;

window.addEventListener("hashchange", handleArcadeNavigation);

document.addEventListener("DOMContentLoaded", handleArcadeNavigation);

handleArcadeNavigation();


// =====================================================
// MANGAVAULT — QUEUE TYPING NINJA
// Independent instance. Does not share Arcade Ninja state.
// =====================================================

const queueNinjaState = {
    active: false,
    words: [],
    projectiles: new Set(),
    score: 0,
    lives: 3,
    spawnTimer: null,
    fallTimer: null
};

function setupQueueNinja() {
    const arena = document.getElementById("queueNinjaArena");
    const input = document.getElementById("queueNinjaInput");
    const score = document.getElementById("queueNinjaScore");
    const lives = document.getElementById("queueNinjaLives");

    if (!arena || !input || !score || !lives) {
        console.error("Queue Ninja: Required elements missing");
        return null;
    }

    arena.style.position = "relative";
    arena.style.overflow = "hidden";

    return { arena, input, score, lives };
}

function updateQueueNinjaHUD() {
    const score = document.getElementById("queueNinjaScore");
    const lives = document.getElementById("queueNinjaLives");

    if (score) score.textContent = "Score: " + queueNinjaState.score;
    if (lives) {
        lives.textContent =
            "❤️".repeat(queueNinjaState.lives) +
            "🖤".repeat(3 - queueNinjaState.lives);
    }
}

function spawnQueueNinjaWord() {
    const state = queueNinjaState;
    if (!state.active) return;

    const arena = document.getElementById("queueNinjaArena");
    if (!arena) return;

    const word = arcadeWordList[
        Math.floor(Math.random() * arcadeWordList.length)
    ];

    const element = document.createElement("div");
    element.textContent = word;
    element.dataset.word = word;
    element.dataset.top = "0";
    element.dataset.targeted = "false";

    element.style.cssText = `
        position:absolute;top:0;left:0;padding:8px 14px;
        background:white;color:#111;border:2px solid #171020;
        border-radius:12px;font-family:"Comic Sans MS",cursive;
        font-size:16px;font-weight:bold;letter-spacing:1px;
        white-space:nowrap;box-shadow:4px 4px 0 #8b35d5,
        0 0 14px rgba(190,100,255,.5);z-index:10;
    `;

    arena.appendChild(element);

    const maxLeft = Math.max(0, arena.clientWidth - element.offsetWidth - 8);
    element.style.left = Math.round(Math.random() * maxLeft) + "px";
    state.words.push(element);
}

function createQueueNinjaImpact(x, y) {
    const arena = document.getElementById("queueNinjaArena");
    if (!arena) return;

    const impact = document.createElement("div");
    impact.className = "ninja-impact";
    impact.style.left = (x - 24) + "px";
    impact.style.top = (y - 24) + "px";
    arena.appendChild(impact);

    setTimeout(() => impact.remove(), 280);
}

function launchQueueNinjaShuriken(target) {
    const state = queueNinjaState;
    const arena = document.getElementById("queueNinjaArena");

    if (!state.active || !arena || !target) return;
    if (target.dataset.targeted === "true") return;

    target.dataset.targeted = "true";

    const size = 32;
    const offset = size / 2;
    const startX = arena.clientWidth / 2;
    const startY = arena.clientHeight - 26;
    const endX = target.offsetLeft + target.offsetWidth / 2;
    const endY = target.offsetTop + target.offsetHeight / 2;

    const shuriken = document.createElement("img");
    shuriken.src = "/assets/shuriken.png";
    shuriken.alt = "";
    shuriken.style.cssText = `
        position:absolute;width:${size}px;height:${size}px;
        left:${startX - offset}px;top:${startY - offset}px;
        z-index:9999;pointer-events:none;object-fit:contain;
        filter:drop-shadow(0 0 5px #b44cff);
    `;
    arena.appendChild(shuriken);

    const projectile = { element: shuriken, raf: null };
    state.projectiles.add(projectile);

    const started = performance.now();
    const duration = 280;

    function animate(now) {
        if (!state.active) {
            shuriken.remove();
            state.projectiles.delete(projectile);
            return;
        }

        const progress = Math.min((now - started) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);
        const x = startX + (endX - startX) * eased;
        const y = startY + (endY - startY) * eased;

        shuriken.style.left = (x - offset) + "px";
        shuriken.style.top = (y - offset) + "px";
        shuriken.style.transform = `rotate(${1080 * progress}deg)`;

        if (progress < 1) {
            projectile.raf = requestAnimationFrame(animate);
            return;
        }

        shuriken.remove();
        state.projectiles.delete(projectile);

        if (!state.active) return;

        createQueueNinjaImpact(endX, endY);

        const index = state.words.indexOf(target);
        if (index !== -1) state.words.splice(index, 1);

        target.classList.add("ninja-word-pop");
        state.score += 10;
        updateQueueNinjaHUD();

        setTimeout(() => target.remove(), 200);
    }

    projectile.raf = requestAnimationFrame(animate);
}

function fallQueueNinjaWords() {
    const state = queueNinjaState;
    if (!state.active) return;

    const arena = document.getElementById("queueNinjaArena");
    if (!arena) return;

    for (let i = state.words.length - 1; i >= 0; i--) {
        const word = state.words[i];
        if (word.dataset.targeted === "true") continue;

        const top = Number(word.dataset.top) + 2;
        word.dataset.top = String(top);
        word.style.top = top + "px";

        if (top + word.offsetHeight >= arena.clientHeight) {
            word.remove();
            state.words.splice(i, 1);
            state.lives = Math.max(0, state.lives - 1);
            updateQueueNinjaHUD();

            if (state.lives === 0) {
                endQueueNinja();
                return;
            }
        }
    }
}

function clearQueueNinjaProjectiles() {
    const state = queueNinjaState;

    for (const projectile of state.projectiles) {
        if (projectile.raf !== null) cancelAnimationFrame(projectile.raf);
        projectile.element.remove();
    }

    state.projectiles.clear();
}

function endQueueNinja() {
    const state = queueNinjaState;
    if (!state.active) return;

    state.active = false;
    clearInterval(state.spawnTimer);
    clearInterval(state.fallTimer);
    state.spawnTimer = null;
    state.fallTimer = null;

    clearQueueNinjaProjectiles();
    state.words.forEach(word => word.remove());
    state.words = [];

    const arena = document.getElementById("queueNinjaArena");
    const input = document.getElementById("queueNinjaInput");

    if (input) {
        input.disabled = true;
        input.value = "";
    }
    if (!arena) return;

    const overlay = document.createElement("div");
    overlay.className = "ninja-game-over queue-ninja-game-over";
    overlay.style.cssText = `
        position:absolute;
        inset:0;
        z-index:10000;
        display:flex;
        flex-direction:column;
        justify-content:center;
        align-items:center;
        gap:7px;
        padding:8px;
        box-sizing:border-box;
        overflow:hidden;
        background:rgba(8,3,20,.94);
        color:white;
        text-align:center;
        border-radius:12px;
    `;

    overlay.innerHTML = `
        <div style="font-size:30px;line-height:1;">💀</div>
        <h2 style="font-size:23px;margin:0;color:#d8a2ff;">GAME OVER</h2>
        <p style="font-size:14px;margin:3px 0 5px;">
            Final Score: <strong>${state.score}</strong>
        </p>
        <button class="ninja-retry" type="button"
            style="padding:8px 22px;font-size:14px;">
            ↻ Retry
        </button>
    `;

    arena.appendChild(overlay);
    overlay.querySelector(".ninja-retry").addEventListener(
        "click", startQueueNinja
    );
}
function startQueueNinja() {
    const state = queueNinjaState;
    if (state.active) return;

    const elements = setupQueueNinja();
    if (!elements) return;

    const { arena, input, score } = elements;

    clearInterval(state.spawnTimer);
    clearInterval(state.fallTimer);
    clearQueueNinjaProjectiles();

    state.words.forEach(word => word.remove());
    state.words = [];

    const oldOverlay = arena.querySelector(".ninja-game-over");
    if (oldOverlay) oldOverlay.remove();

    state.score = 0;
    state.lives = 3;
    state.active = true;
    score.textContent = "Score: 0";
    input.disabled = false;
    input.value = "";
    updateQueueNinjaHUD();

    input.oninput = function () {
        if (!state.active) return;
        const value = input.value.toUpperCase().trim();
        if (!value) return;

        const target = state.words.find(word =>
            word.dataset.word === value &&
            word.dataset.targeted !== "true"
        );

        if (target) {
            launchQueueNinjaShuriken(target);
            input.value = "";
        }
    };

    spawnQueueNinjaWord();
    state.spawnTimer = setInterval(spawnQueueNinjaWord, 1600);
    state.fallTimer = setInterval(fallQueueNinjaWords, 50);
    setTimeout(() => {
        if (state.active) input.focus();
    }, 100);
}

function startQueueGame() {
    const startScreen = document.getElementById("queueGameStartScreen");
    const activeArea = document.getElementById("queueGameActive");

    if (!startScreen || !activeArea) return;

    startScreen.style.display = "none";
    activeArea.style.display = "block";
    startQueueNinja();
}

function stopQueueGame() {
    const state = queueNinjaState;
    state.active = false;

    clearInterval(state.spawnTimer);
    clearInterval(state.fallTimer);
    state.spawnTimer = null;
    state.fallTimer = null;

    clearQueueNinjaProjectiles();
    state.words.forEach(word => word.remove());
    state.words = [];

    const input = document.getElementById("queueNinjaInput");
    const activeArea = document.getElementById("queueGameActive");
    const startScreen = document.getElementById("queueGameStartScreen");

    if (input) {
        input.value = "";
        input.disabled = false;
    }
    if (activeArea) activeArea.style.display = "none";
    if (startScreen) startScreen.style.display = "block";
}

window.startQueueGame = startQueueGame;
window.startQueueNinja = startQueueNinja;
window.stopQueueGame = stopQueueGame;
