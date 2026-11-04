// ==========================================
// MANGAVAULT ARCADE - TYPING NINJA STEP 1
// Basic falling words + typing + score
// ==========================================

const arcadeNinjaState = {
    active: false,
    words: [],
    score: 0,
    spawnTimer: null,
    fallTimer: null
};

const arcadeWordList = [
    "KAPOW", "NANI", "SHONEN", "PANEL",
    "INK", "BOSS", "SLASH", "SUGOI",
    "MANGA", "STORY", "HERO", "NINJA"
];

function startArcadeNinja() {
    const state = arcadeNinjaState;

    if (state.active) return;

    const arena = document.getElementById("arcadeNinjaArena");
    const input = document.getElementById("arcadeNinjaInput");
    const scoreEl = document.getElementById("arcadeNinjaScore");

    if (!arena || !input || !scoreEl) {
        console.error("Typing Ninja: Required elements missing");
        return;
    }

    state.active = true;
    state.words = [];
    state.score = 0;

    arena.innerHTML = "";
    arena.style.position = "relative";
    arena.style.overflow = "hidden";
    arena.style.background = "#0a0512";

    scoreEl.textContent = "Score: 0";
    input.value = "";

    input.oninput = function () {
        const value = input.value.toUpperCase().trim();

        if (!value) return;

        const index = state.words.findIndex(
            word => word.dataset.word === value
        );

        if (index === -1) return;

        state.words[index].remove();
        state.words.splice(index, 1);

        state.score += 10;
        scoreEl.textContent = "Score: " + state.score;

        input.value = "";
    };

    function spawnWord() {
        if (!state.active) return;

        const word = arcadeWordList[
            Math.floor(Math.random() * arcadeWordList.length)
        ];

        const element = document.createElement("div");

        element.textContent = word;
        element.dataset.word = word;
        element.dataset.top = "0";

        element.style.cssText = `
            position: absolute;
            top: 0px;
            left: ${Math.random() * Math.max(0, arena.clientWidth - 130)}px;
            padding: 9px 16px;
            background: white;
            color: black;
            border: 2px solid black;
            border-radius: 12px;
            font-family: Comic Sans MS, cursive;
            font-size: 17px;
            font-weight: bold;
            z-index: 5;
        `;

        arena.appendChild(element);
        state.words.push(element);
    }

    function fallWords() {
        if (!state.active) return;

        for (let i = state.words.length - 1; i >= 0; i--) {
            const element = state.words[i];

            let top = Number(element.dataset.top) + 2;

            element.dataset.top = String(top);
            element.style.top = top + "px";

            if (top > arena.clientHeight - 35) {
                element.remove();
                state.words.splice(i, 1);
            }
        }
    }

    spawnWord();

    state.spawnTimer = setInterval(spawnWord, 1600);
    state.fallTimer = setInterval(fallWords, 50);

    setTimeout(() => {
        if (state.active) input.focus();
    }, 100);

    console.log("Typing Ninja started");
}

function stopArcadeNinja() {
    const state = arcadeNinjaState;

    state.active = false;

    clearInterval(state.spawnTimer);
    clearInterval(state.fallTimer);

    state.spawnTimer = null;
    state.fallTimer = null;
    state.words = [];
}

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
