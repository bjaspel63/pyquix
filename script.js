let cards = [];
let filteredCards = []; // To hold filtered cards by category
let currentIndex = 0;
let viewedCount = 0;
let hasShuffled = false;

let bookmarkedIds = new Set(); // Store bookmarked card IDs

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('ServiceWorker registration successful:', reg))
      .catch(err => console.log('ServiceWorker registration failed:', err));
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
bookmarkBtn.innerHTML = "♡";
flashcard.appendChild(bookmarkBtn);

const showBookmarksBtn = document.getElementById('show-bookmarks-btn');
const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
const bookmarksContainer = document.getElementById('bookmarks-container');
const bookmarkedCardsList = document.getElementById('bookmarked-cards-list');
const controlsDiv = document.querySelector('.controls');
const progressCounter = document.getElementById('progress-counter');

// Animate card change
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
    if (achElem.textContent === message) achElem.textContent = "";
  }, 3000);
}

function checkAchievements() {
  if (viewedCount === 5) showAchievement("👍 5 cards reviewed!");
  else if (viewedCount === 10) showAchievement("🔥 10 cards reviewed!");
  else if (viewedCount === 25) showAchievement("🚀 25 cards reviewed!");
  else if (viewedCount === 50) showAchievement("🌟 Halfway there: 50 cards!");
  else if (viewedCount === 75) showAchievement("🎯 75 cards reviewed!");
  else if (viewedCount === 100) showAchievement("🏆 You reviewed 100 cards!");
}

// Difficulty stars
function renderDifficultyStars(difficulty) {
  const starContainer = document.getElementById("difficulty-stars");
  if (!starContainer) return;
  let starsCount = difficulty === 1 ? 1 : difficulty === 2 ? 3 : difficulty === 3 ? 5 : 0;
  const filledStars = "★".repeat(starsCount);
  const emptyStars = "☆".repeat(5 - starsCount);
  starContainer.textContent = filledStars + emptyStars;
}

// Update bookmark button
function updateBookmarkButton() {
  const card = filteredCards[currentIndex];
  if (!card) return;
  if (bookmarkedIds.has(card.id)) {
    bookmarkBtn.classList.add("bookmarked");
    bookmarkBtn.innerHTML = "♥";
  } else {
    bookmarkBtn.classList.remove("bookmarked");
    bookmarkBtn.innerHTML = "♡";
  }
}

// Show card
function showCard(index) {
  if (!filteredCards.length) return;
  const card = filteredCards[index];
  document.getElementById("card-question").innerHTML = card.q;
  document.getElementById("card-answer").innerHTML = card.a;
  document.getElementById("card-category").innerText = card.cat || "General";
  flashcard.classList.remove("flipped");

  renderDifficultyStars(card.difficulty);
  viewedCount++;
  if (viewedCount > filteredCards.length || viewedCount > 100) viewedCount = 1;

  progressCounter.innerText = `Card ${viewedCount} of ${filteredCards.length}`;
  updateBookmarkButton();
  checkAchievements();
  saveProgress();
}

// Flip logic
flashcard.addEventListener("click", (e) => {
  if (e.target === bookmarkBtn) return;
  flipSound.play();
  flashcard.classList.toggle("flipped");
  flashcard.classList.add("flashcard-bounce");
  flashcard.addEventListener("animationend", () => flashcard.classList.remove("flashcard-bounce"), { once: true });
});

// Bookmark toggle
bookmarkBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const card = filteredCards[currentIndex];
  if (!card) return;
  if (bookmarkedIds.has(card.id)) {
    bookmarkedIds.delete(card.id);
    showAchievement("🔖 Removed bookmark");
    if (filterBookmarksCheckbox.checked) {
      filteredCards.splice(currentIndex, 1);
      if (filteredCards.length === 0) {
        document.getElementById("card-question").innerText = "No bookmarked cards found.";
        document.getElementById("card-answer").innerText = "";
        progressCounter.innerText = "Card 0 of 0";
        renderDifficultyStars(0);
        updateBookmarkButton();
        saveProgress();
        return;
      } else {
        if (currentIndex >= filteredCards.length) currentIndex = filteredCards.length - 1;
        viewedCount = currentIndex + 1;
        showCard(currentIndex);
      }
    }
  } else {
    bookmarkedIds.add(card.id);
    showAchievement("🔖 Added bookmark");
  }
  updateBookmarkButton();
  saveProgress();
});

// Navigation
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const shuffleBtn = document.getElementById("shuffle");

[nextBtn, prevBtn, shuffleBtn].forEach(button => {
  button.addEventListener("click", () => {
    button.classList.add("click-animate");
    button.addEventListener("animationend", () => button.classList.remove("click-animate"), { once: true });
  });
});

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

// Filter bookmarks
const filterBookmarksCheckbox = document.getElementById("filter-bookmarks");
filterBookmarksCheckbox.addEventListener("change", () => {
  if (filterBookmarksCheckbox.checked) {
    const selectedCategory = categorySelect.value;
    let cardsToFilter = selectedCategory !== "all" ? cards.filter(c => c.cat === selectedCategory) : cards;
    filteredCards = cardsToFilter.filter(c => bookmarkedIds.has(c.id)).slice(0, 100);
  } else {
    filterCardsByCategory(categorySelect.value);
    return;
  }
  currentIndex = 0; viewedCount = 0; hasShuffled = false;
  if (filteredCards.length === 0) {
    document.getElementById("card-question").innerText = "No bookmarked cards found.";
    document.getElementById("card-answer").innerText = "";
    progressCounter.innerText = "Card 0 of 0";
    renderDifficultyStars(0);
    updateBookmarkButton();
    saveProgress();
  } else showCard(currentIndex);
});

// Category
const categorySelect = document.getElementById("category-select");
if (categorySelect) {
  categorySelect.addEventListener("change", () => {
    filterCardsByCategory(categorySelect.value);
    saveProgress();
  });
}
function filterCardsByCategory(category) {
  filteredCards = category === "all" ? cards.slice(0, 100) : cards.filter(c => c.cat === category).slice(0, 100);
  currentIndex = 0; viewedCount = 0; hasShuffled = false;
  showCard(currentIndex);
  saveProgress();
}

// Load JSON
fetch("python_flashcards.json")
  .then(r => r.json())
  .then(data => {
    cards = data;
    cards.forEach((card, idx) => { if (!card.id) card.id = `card-${idx}`; });
    const savedCategory = loadProgress();
    filteredCards = savedCategory !== "all" ? cards.filter(c => c.cat === savedCategory).slice(0, 100) : cards.slice(0, 100);
    if (categorySelect) {
      const categories = [...new Set(cards.map(card => card.cat).filter(Boolean))];
      categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat; option.textContent = cat;
        categorySelect.appendChild(option);
      });
      categorySelect.value = savedCategory;
    }
    if (currentIndex >= filteredCards.length) currentIndex = 0;
    showCard(currentIndex);
  })
  .catch(err => {
    console.error("Error loading flashcards:", err);
    document.getElementById("card-question").innerText = "⚠ Could not load flashcards";
  });

// --- Swipe support ---
let touchStartX = 0, touchStartY = 0;
flashcard.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, {passive: true});
flashcard.addEventListener("touchend", e => {
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
    if (diffX > 0) {
      const newIndex = (currentIndex - 1 + filteredCards.length) % filteredCards.length;
      animateCardChange('right', newIndex);
    } else {
      const newIndex = (currentIndex + 1) % filteredCards.length;
      animateCardChange('left', newIndex);
    }
  }
}, {passive: true});

// --- Keyboard navigation ---
document.addEventListener("keydown", (e) => {
  const tag = e.target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  switch (e.key) {
    case "ArrowRight":
      e.preventDefault();
      animateCardChange('left', (currentIndex + 1) % filteredCards.length);
      break;
    case "ArrowLeft":
      e.preventDefault();
      animateCardChange('right', (currentIndex - 1 + filteredCards.length) % filteredCards.length);
      break;
    case " ":
    case "Enter":
      e.preventDefault();
      flipSound.play();
      flashcard.classList.toggle("flipped");
      flashcard.classList.add("flashcard-bounce");
      flashcard.addEventListener("animationend", () => flashcard.classList.remove("flashcard-bounce"), { once: true });
      break;
  }
});

// --- Bookmarked Cards List ---
function getBookmarkedCards() { return cards.filter(card => bookmarkedIds.has(card.id)); }
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
    cardDiv.innerHTML = `<strong>Q:</strong> ${card.q}<br><em>Category:</em> ${card.cat || "General"}`;
    cardDiv.addEventListener('click', () => {
      bookmarksContainer.style.display = 'none';
      showBookmarksBtn.style.display = 'block';
      controlsDiv.style.display = 'flex';
      progressCounter.style.display = 'block';
      let indexInFiltered = filteredCards.findIndex(c => c.id === card.id);
      if (indexInFiltered === -1) {
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


// --- Share Progress ---
const shareBtn = document.createElement("button");
shareBtn.id = "share-btn";
shareBtn.textContent = "📤 Share Progress";
controlsDiv.appendChild(shareBtn);

shareBtn.addEventListener("click", async () => {
  const totalCards = cards.length;
  const reviewed = viewedCount;
  const bookmarked = bookmarkedIds.size;
  const message = `📚 I reviewed ${reviewed} Python flashcards out of ${totalCards} and bookmarked ${bookmarked}! 🚀 #PyQuix`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "My Flashcard Progress",
        text: message,
        url: window.location.href
      });
      showAchievement("✅ Progress shared!");
    } catch (err) {
      console.log("Share canceled or failed:", err);
    }
  } else {
    navigator.clipboard.writeText(message).then(() => {
      showAchievement("📋 Progress copied!");
      alert("Copied to clipboard:\n\n" + message);
    });
  }
});
