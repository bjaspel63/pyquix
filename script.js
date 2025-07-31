let cards = [];
let filteredCards = []; // To hold filtered cards by category
let currentIndex = 0;
let viewedCount = 0;
let hasShuffled = false;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('ServiceWorker registration successful:', reg);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed:', err);
      });
  });
}

// Load sounds
const flipSound = new Audio('flip-sound.mp3'); 
const achievementSound = new Audio('achievement-sound.mp3'); 

// --- LocalStorage Helpers ---
function saveProgress() {
  localStorage.setItem("pyquix-progress", JSON.stringify({
    viewedCount,
    currentIndex,
    selectedCategory: categorySelect.value
  }));
}

function loadProgress() {
  const saved = localStorage.getItem("pyquix-progress");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      viewedCount = data.viewedCount || 0;
      currentIndex = data.currentIndex || 0;
      return data.selectedCategory || "all";
    } catch (e) {
      console.error("Error parsing saved progress:", e);
    }
  }
  return "all";
}

function showAchievement(message) {
  const achElem = document.getElementById("achievement");
  achElem.textContent = message;
  achievementSound.play();
  setTimeout(() => {
    if (achElem.textContent === message) {
      achElem.textContent = "";
    }
  }, 3000);
}

function checkAchievements() {
  if (viewedCount === 5) {
    showAchievement("👍 5 cards reviewed!");
  } else if (viewedCount === 10) {
    showAchievement("🔥 10 cards reviewed!");
  } else if (viewedCount === 25) {
    showAchievement("🚀 25 cards reviewed!");
  } else if (viewedCount === 50) {
    showAchievement("🌟 Halfway there: 50 cards!");
  } else if (viewedCount === 75) {
    showAchievement("🎯 75 cards reviewed!");
  } else if (viewedCount === 100) {
    showAchievement("🏆 You reviewed 100 cards! Great job!");
  }
}

// Render difficulty stars based on difficulty string
function renderDifficultyStars(difficulty) {
  const starContainer = document.getElementById("difficulty-stars");
  if (!starContainer) return;

  let starsCount = 0;
  if (difficulty === 1) starsCount = 1;
  else if (difficulty === 2) starsCount = 3;
  else if (difficulty === 3) starsCount = 5;

  const filledStars = "★".repeat(starsCount);
  const emptyStars = "☆".repeat(5 - starsCount);
  starContainer.textContent = filledStars + emptyStars;
}

// Show the card at the given index
function showCard(index) {
  if (!filteredCards.length) return;
  const card = filteredCards[index];
  document.getElementById("card-question").innerHTML = card.q;
  document.getElementById("card-answer").innerHTML = card.a;
  document.getElementById("card-category").innerText = card.cat || "General";
  document.getElementById("flashcard").classList.remove("flipped");

  renderDifficultyStars(card.difficulty);

  viewedCount++;
  if (viewedCount > filteredCards.length || viewedCount > 100) {
    viewedCount = 1;
  }

  document.getElementById("progress-counter").innerText = 
    `Card ${viewedCount} of ${filteredCards.length}`;

  checkAchievements();
  saveProgress(); // 🔹 save after each card shown
}

// Flip logic with sound and bounce animation
const flashcard = document.getElementById("flashcard");
flashcard.addEventListener("click", () => {
  flipSound.play();
  flashcard.classList.toggle("flipped");
  
  flashcard.classList.add("flashcard-bounce");
  flashcard.addEventListener("animationend", () => {
    flashcard.classList.remove("flashcard-bounce");
  }, { once: true });
});

// Navigation buttons and click animation
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const shuffleBtn = document.getElementById("shuffle");

[nextBtn, prevBtn, shuffleBtn].forEach(button => {
  button.addEventListener("click", () => {
    button.classList.add("click-animate");
    button.addEventListener("animationend", () => {
      button.classList.remove("click-animate");
    }, { once: true });
  });
});

nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % filteredCards.length;
  showCard(currentIndex);
});

prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + filteredCards.length) % filteredCards.length;
  showCard(currentIndex);
});

shuffleBtn.addEventListener("click", () => {
  currentIndex = Math.floor(Math.random() * filteredCards.length);
  showCard(currentIndex);

  if (!hasShuffled) {
    hasShuffled = true;
    showAchievement("🎉 First shuffle!");
  }
});

// Category selection
const categorySelect = document.getElementById("category-select");
if (categorySelect) {
  categorySelect.addEventListener("change", () => {
    filterCardsByCategory(categorySelect.value);
    saveProgress(); // 🔹 save when category changes
  });
}

function filterCardsByCategory(category) {
  if (category === "all") {
    filteredCards = cards.slice(0, 100);
  } else {
    filteredCards = cards.filter(c => c.cat === category).slice(0, 100);
  }
  currentIndex = 0;
  viewedCount = 0;
  hasShuffled = false;
  showCard(currentIndex);
  saveProgress();
}

// Load JSON flashcards once and setup
fetch("python_flashcards.json")
  .then(r => r.json())
  .then(data => {
    cards = data;

    const savedCategory = loadProgress();
    if (savedCategory !== "all") {
      filteredCards = cards.filter(c => c.cat === savedCategory).slice(0, 100);
    } else {
      filteredCards = cards.slice(0, 100);
    }

    if (categorySelect) {
      const categories = [...new Set(cards.map(card => card.cat).filter(Boolean))];
      categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
      });
      categorySelect.value = savedCategory; // 🔹 restore category
    }

    if (currentIndex >= filteredCards.length) {
      currentIndex = 0;
    }

    showCard(currentIndex);
  })
  .catch(err => {
    console.error("Error loading flashcards:", err);
    document.getElementById("card-question").innerText = "⚠ Could not load flashcards";
  });


// --- Swipe support for mobile ---

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const swipeThreshold = 50; // Minimum px to qualify as swipe

flashcard.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, {passive: true});

flashcard.addEventListener("touchend", e => {
  touchEndX = e.changedTouches[0].clientX;
  touchEndY = e.changedTouches[0].clientY;

  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;

  // Ignore vertical swipes more than horizontal
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
    if (diffX > 0) {
      // Swipe right → previous card
      currentIndex = (currentIndex - 1 + filteredCards.length) % filteredCards.length;
      showCard(currentIndex);
    } else {
      // Swipe left → next card
      currentIndex = (currentIndex + 1) % filteredCards.length;
      showCard(currentIndex);
    }
  }
}, {passive: true});

// --- Keyboard navigation ---

document.addEventListener("keydown", (e) => {
  const tag = e.target.tagName.toLowerCase();
  // Prevent interfering with inputs or selects
  if (tag === "input" || tag === "textarea" || tag === "select") return;

  switch (e.key) {
    case "ArrowRight":
      e.preventDefault();
      currentIndex = (currentIndex + 1) % filteredCards.length;
      showCard(currentIndex);
      break;
    case "ArrowLeft":
      e.preventDefault();
      currentIndex = (currentIndex - 1 + filteredCards.length) % filteredCards.length;
      showCard(currentIndex);
      break;
    case " ":
    case "Enter":
      e.preventDefault();
      flipSound.play();
      flashcard.classList.toggle("flipped");
      flashcard.classList.add("flashcard-bounce");
      flashcard.addEventListener("animationend", () => {
        flashcard.classList.remove("flashcard-bounce");
      }, { once: true });
      break;
  }
});
