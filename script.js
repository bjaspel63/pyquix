let cards = [];
let filteredCards = []; // To hold filtered cards by category
let currentIndex = 0;
let viewedCount = 0;
let hasShuffled = false;

let bookmarkedIds = new Set(); // Store bookmarked card IDs

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

// Elements
const flashcard = document.getElementById("flashcard");
const bookmarkBtn = document.createElement("button");
bookmarkBtn.id = "bookmark-btn";
bookmarkBtn.title = "Bookmark this card";
bookmarkBtn.innerHTML = "♡"; // empty star
flashcard.appendChild(bookmarkBtn);

const showBookmarksBtn = document.getElementById('show-bookmarks-btn');
const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
const bookmarksContainer = document.getElementById('bookmarks-container');
const bookmarkedCardsList = document.getElementById('bookmarked-cards-list');
const controlsDiv = document.querySelector('.controls');
const progressCounter = document.getElementById('progress-counter');

// Animate card change with slide left/right animations
function animateCardChange(direction, newIndex) {
  const animOutClass = direction === 'left' ? 'flashcard-anim-out-left' : 'flashcard-anim-out-right';
  const animInClass = direction === 'left' ? 'flashcard-anim-in-left' : 'flashcard-anim-in-right';

  flashcard.classList.add(animOutClass);

  flashcard.addEventListener('animationend', function handleOut() {
    flashcard.removeEventListener('animationend', handleOut);

    currentIndex = newIndex;
    showCard(currentIndex);

    flashcard.classList.remove(animOutClass);
    flashcard.classList.add(animInClass);

    flashcard.addEventListener('animationend', function handleIn() {
      flashcard.removeEventListener('animationend', handleIn);
      flashcard.classList.remove(animInClass);
    }, { once: true });
  }, { once: true });
}

// --- LocalStorage Helpers ---

function saveProgress() {
  localStorage.setItem("pyquix-progress", JSON.stringify({
    viewedCount,
    currentIndex,
    selectedCategory: categorySelect.value,
    bookmarkedIds: Array.from(bookmarkedIds),
  }));
}

function loadProgress() {
  const saved = localStorage.getItem("pyquix-progress");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      viewedCount = data.viewedCount || 0;
      currentIndex = data.currentIndex || 0;
      bookmarkedIds = new Set(data.bookmarkedIds || []);
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

// Update bookmark button UI depending on current card
function updateBookmarkButton() {
  const card = filteredCards[currentIndex];
  if (!card) return;

  if (bookmarkedIds.has(card.id)) {
    bookmarkBtn.classList.add("bookmarked");
    bookmarkBtn.innerHTML = "♥"; // filled star
  } else {
    bookmarkBtn.classList.remove("bookmarked");
    bookmarkBtn.innerHTML = "♡"; // empty star
  }
}

// Show the card at the given index
function showCard(index) {
  if (!filteredCards.length) return;
  const card = filteredCards[index];
  document.getElementById("card-question").innerHTML = card.q;
  document.getElementById("card-answer").innerHTML = card.a;
  document.getElementById("card-category").innerText = card.cat || "General";
  flashcard.classList.remove("flipped");

  renderDifficultyStars(card.difficulty);

  viewedCount++;
  if (viewedCount > filteredCards.length || viewedCount > 100) {
    viewedCount = 1;
  }

  document.getElementById("progress-counter").innerText = 
    `Card ${viewedCount} of ${filteredCards.length}`;

  updateBookmarkButton();  // Update bookmark UI on card change

  checkAchievements();
  saveProgress(); // 🔹 save after each card shown
}

// Flip logic with sound and bounce animation
flashcard.addEventListener("click", (e) => {
  // Avoid toggling flip when clicking bookmark button
  if (e.target === bookmarkBtn) return;

  flipSound.play();
  flashcard.classList.toggle("flipped");
  
  flashcard.classList.add("flashcard-bounce");
  flashcard.addEventListener("animationend", () => {
    flashcard.classList.remove("flashcard-bounce");
  }, { once: true });
});

// --- UPDATED: Bookmark toggle with filteredBookmarks fix ---
bookmarkBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // prevent card flip

  const card = filteredCards[currentIndex];
  if (!card) return;

  if (bookmarkedIds.has(card.id)) {
    // Remove bookmark
    bookmarkedIds.delete(card.id);
    showAchievement("🔖 Removed bookmark");

    if (filterBookmarksCheckbox.checked) {
      // Remove current card from filteredCards
      filteredCards.splice(currentIndex, 1);

      if (filteredCards.length === 0) {
        // No bookmarked cards left
        document.getElementById("card-question").innerText = "No bookmarked cards found.";
        document.getElementById("card-answer").innerText = "";
        document.getElementById("progress-counter").innerText = "Card 0 of 0";
        renderDifficultyStars(0);
        updateBookmarkButton();
        saveProgress();
        return;
      } else {
        // Adjust currentIndex if it goes past the end
        if (currentIndex >= filteredCards.length) {
          currentIndex = filteredCards.length - 1;
        }
        viewedCount = currentIndex + 1; // sync viewedCount with currentIndex
        showCard(currentIndex);
      }
    }
  } else {
    // Add bookmark
    bookmarkedIds.add(card.id);
    showAchievement("🔖 Added bookmark");
  }

  updateBookmarkButton();
  saveProgress();
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

// UPDATED: Use animateCardChange on navigation buttons
nextBtn.addEventListener("click", () => {
  const newIndex = (currentIndex + 1) % filteredCards.length;
  animateCardChange('left', newIndex);
});

prevBtn.addEventListener("click", () => {
  const newIndex = (currentIndex - 1 + filteredCards.length) % filteredCards.length;
  animateCardChange('right', newIndex);
});

shuffleBtn.addEventListener("click", () => {
  currentIndex = Math.floor(Math.random() * filteredCards.length);
  showCard(currentIndex);

  if (!hasShuffled) {
    hasShuffled = true;
    showAchievement("🎉 First shuffle!");
  }
});

const filterBookmarksCheckbox = document.getElementById("filter-bookmarks");

filterBookmarksCheckbox.addEventListener("change", () => {
  if (filterBookmarksCheckbox.checked) {
    // Show only bookmarked cards filtered by current category
    const selectedCategory = categorySelect.value;
    let cardsToFilter = cards;

    if (selectedCategory !== "all") {
      cardsToFilter = cards.filter(c => c.cat === selectedCategory);
    }

    filteredCards = cardsToFilter.filter(c => bookmarkedIds.has(c.id)).slice(0, 100);

  } else {
    // Show all cards in current category
    filterCardsByCategory(categorySelect.value);
    return; // filterCardsByCategory calls showCard and saves progress
  }

  currentIndex = 0;
  viewedCount = 0;
  hasShuffled = false;

  if (filteredCards.length === 0) {
    document.getElementById("card-question").innerText = "No bookmarked cards found.";
    document.getElementById("card-answer").innerText = "";
    document.getElementById("progress-counter").innerText = "Card 0 of 0";
    renderDifficultyStars(0);
    updateBookmarkButton();
    saveProgress();
  } else {
    showCard(currentIndex);
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

    // Ensure each card has a unique 'id' property for bookmarking
    cards.forEach((card, idx) => {
      if (!card.id) card.id = `card-${idx}`;
    });

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
      // Swipe right → previous card with animation
      const newIndex = (currentIndex - 1 + filteredCards.length) % filteredCards.length;
      animateCardChange('right', newIndex);
    } else {
      // Swipe left → next card with animation
      const newIndex = (currentIndex + 1) % filteredCards.length;
      animateCardChange('left', newIndex);
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
      {
        const newIndex = (currentIndex + 1) % filteredCards.length;
        animateCardChange('left', newIndex);
      }
      break;
    case "ArrowLeft":
      e.preventDefault();
      {
        const newIndex = (currentIndex - 1 + filteredCards.length) % filteredCards.length;
        animateCardChange('right', newIndex);
      }
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

// --- Bookmarked Cards List Feature ---

function getBookmarkedCards() {
  return cards.filter(card => bookmarkedIds.has(card.id));
}

function renderBookmarkedCards() {
  const bookmarkedCards = getBookmarkedCards();
  bookmarkedCardsList.innerHTML = "";

  if (bookmarkedCards.length === 0) {
    bookmarkedCardsList.innerHTML = "<p>No bookmarked cards yet.</p>";
    return;
  }

  bookmarkedCards.forEach(card => {
    const cardDiv = document.createElement('div');
    cardDiv.style.cursor = "pointer";
    cardDiv.innerHTML = `
      <strong>Q:</strong> ${card.q}<br>
      <em>Category:</em> ${card.cat || "General"}
    `;

    cardDiv.addEventListener('click', () => {
      bookmarksContainer.style.display = 'none';
      showBookmarksBtn.style.display = 'block';

      controlsDiv.style.display = 'flex';
      progressCounter.style.display = 'block';

      // Find index in filteredCards if exists
      let indexInFiltered = filteredCards.findIndex(c => c.id === card.id);
      if (indexInFiltered === -1) {
        // If not in filteredCards, reset filter to "all"
        filterCardsByCategory("all");
        indexInFiltered = cards.findIndex(c => c.id === card.id);
      }

      currentIndex = indexInFiltered;
      showCard(currentIndex);
    });

    bookmarkedCardsList.appendChild(cardDiv);
  });
}

showBookmarksBtn.addEventListener('click', () => {
  renderBookmarkedCards();
  bookmarksContainer.style.display = 'block';
  showBookmarksBtn.style.display = 'none';

  controlsDiv.style.display = 'none';
  progressCounter.style.display = 'none';
});

closeBookmarksBtn.addEventListener('click', () => {
  bookmarksContainer.style.display = 'none';
  showBookmarksBtn.style.display = 'block';

  controlsDiv.style.display = 'flex';
  progressCounter.style.display = 'block';
});
