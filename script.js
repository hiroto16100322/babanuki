const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

let playerHand = [];
let enemyHand = [];
let gameOver = false;
let lockBoard = false;
let highlightedDrawIndex = -1;

const statusEl = document.getElementById("status");
const playerCardsEl = document.getElementById("playerCards");
const enemyCardsEl = document.getElementById("enemyCards");
const restartButton = document.getElementById("restartButton");

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, label: `${suit}${rank}` });
    }
  }
  deck.push({ suit: "🃏", rank: "JOKER", label: "🃏" });
  return deck;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function removePairs(hand) {
  const counts = {};
  for (const card of hand) {
    if (card.rank === "JOKER") continue;
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  }

  const result = [...hand];
  const removedPairs = [];

  for (const rank in counts) {
    let pairCount = Math.floor(counts[rank] / 2);
    while (pairCount > 0) {
      const pair = [];
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].rank === rank && pair.length < 2) {
          pair.push(result[i]);
          result.splice(i, 1);
        }
      }
      removedPairs.push(pair);
      pairCount--;
    }
  }

  return { newHand: result, removedPairs };
}

function describePairs(removedPairs) {
  if (removedPairs.length === 0) return "";
  return removedPairs.map(pair => pair.map(card => card.label).join(" と ")).join(" / ");
}

function showTequilaLoseEffect() {
  document.getElementById("tequilaOverlay").classList.remove("hidden");
}

function hideTequilaLoseEffect() {
  document.getElementById("tequilaOverlay").classList.add("hidden");
}

function restartFromTequila() {
  window.location.reload();
}

function renderPlayerCards() {
  playerCardsEl.innerHTML = "";

  const spread = 42;
  const rotateStep = 8;
  const center = (playerHand.length - 1) / 2;

  playerHand.forEach((card, index) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";

    if (card.suit === "♥" || card.suit === "♦") {
      cardEl.classList.add("red");
    }

    if (index === highlightedDrawIndex) {
      cardEl.classList.add("highlight-draw");
    }

    cardEl.textContent = card.label;

    const offset = (index - center) * spread;
    const angle = (index - center) * rotateStep;
    const lift = -Math.abs(index - center) * 2;

    cardEl.style.transform =
      `translateX(${offset}px) translateY(${lift}px) rotate(${angle}deg)`;

    playerCardsEl.appendChild(cardEl);
  });
}

function renderEnemyCards() {
  enemyCardsEl.innerHTML = "";

  enemyHand.forEach((_, index) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card back";
    cardEl.textContent = "🂠";

    if (!lockBoard && !gameOver) {
      cardEl.addEventListener("click", () => playerDraw(index, cardEl));
    }

    enemyCardsEl.appendChild(cardEl);
  });
}

function render() {
  renderPlayerCards();
  renderEnemyCards();
}

function checkWinner() {
  if (gameOver) return true;

  if (playerHand.length === 0) {
    statusEl.textContent = "🎉 あなたの勝ち！";
    gameOver = true;
    lockBoard = true;
    return true;
  }

  if (enemyHand.length === 0) {
    statusEl.textContent = "😢 あなたの負け…";
    gameOver = true;
    lockBoard = true;
    showTequilaLoseEffect();
    return true;
  }

  return false;
}

function getHandTargetPosition() {
  const rect = playerCardsEl.getBoundingClientRect();
  return {
    left: rect.left + rect.width / 2 - 36,
    top: rect.top + rect.height / 2 - 52
  };
}

function animateDrawToHand(clickedElement, callback) {
  const startRect = clickedElement.getBoundingClientRect();
  const target = getHandTargetPosition();

  const flyCard = document.createElement("div");
  flyCard.className = "fly-card";
  flyCard.textContent = "🂠";
  flyCard.style.left = `${startRect.left}px`;
  flyCard.style.top = `${startRect.top}px`;
  flyCard.style.transform = "scale(1) rotate(0deg)";
  document.body.appendChild(flyCard);

  requestAnimationFrame(() => {
    flyCard.style.left = `${target.left}px`;
    flyCard.style.top = `${target.top}px`;
    flyCard.style.transform = "scale(1.08) rotate(-10deg)";
  });

  setTimeout(() => {
    flyCard.remove();
    callback();
  }, 580);
}

function playerDraw(index, clickedElement) {
  if (gameOver || lockBoard) return;
  if (index < 0 || index >= enemyHand.length) return;

  lockBoard = true;
  const drawn = enemyHand[index];
  statusEl.textContent = "カードを引いています...";

  animateDrawToHand(clickedElement, () => {
    enemyHand.splice(index, 1);
    playerHand.push(drawn);
    highlightedDrawIndex = playerHand.length - 1;
    render();

    statusEl.textContent = `あなたは ${drawn.label} を引きました`;

    setTimeout(() => {
      highlightedDrawIndex = -1;

      const result = removePairs(playerHand);
      playerHand = result.newHand;
      render();

      if (result.removedPairs.length > 0) {
        statusEl.textContent = `あなたはペアを捨てました: ${describePairs(result.removedPairs)}`;
      } else {
        statusEl.textContent = `あなたは ${drawn.label} を引きました。ペアはできませんでした。`;
      }

      if (checkWinner()) return;
      setTimeout(enemyTurn, 900);
    }, 800);
  });
}

function enemyTurn() {
  if (gameOver) return;
  if (playerHand.length === 0) return;

  const index = Math.floor(Math.random() * playerHand.length);
  const drawn = playerHand.splice(index, 1)[0];
  enemyHand.push(drawn);
  render();

  statusEl.textContent = "🤖 コンピューターがあなたのカードを1枚引きました";

  setTimeout(() => {
    const result = removePairs(enemyHand);
    enemyHand = result.newHand;
    render();

    if (result.removedPairs.length > 0) {
      statusEl.textContent = "🤖 コンピューターはペアを捨てました。あなたのターンです。";
    } else {
      statusEl.textContent = "🤖 コンピューターはペアを作れませんでした。あなたのターンです。";
    }

    if (checkWinner()) return;

    lockBoard = false;
    render();
  }, 800);
}

function initGame() {
  gameOver = false;
  lockBoard = false;
  highlightedDrawIndex = -1;
  hideTequilaLoseEffect();

  do {
    const deck = createDeck();
    shuffle(deck);

    playerHand = [];
    enemyHand = [];

    deck.forEach((card, index) => {
      if (index % 2 === 0) {
        playerHand.push(card);
      } else {
        enemyHand.push(card);
      }
    });

    playerHand = removePairs(playerHand).newHand;
    enemyHand = removePairs(enemyHand).newHand;
  } while (playerHand.length === 0 || enemyHand.length === 0);

  statusEl.textContent = "あなたのターンです。コンピューターの青いカードをクリックしてください。";
  render();
}

restartButton.addEventListener("click", initGame);

window.restartFromTequila = restartFromTequila;

initGame();