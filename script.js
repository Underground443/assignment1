const languagePacks = {
    "English": [
        { front: "你好", back: "Hello" }, { front: "謝謝", back: "Thank you" }, { front: "再見", back: "Goodbye" },
        { front: "是", back: "Yes" }, { front: "不是", back: "No" }, { front: "蘋果", back: "Apple" },
        { front: "水", back: "Water" }, { front: "朋友", back: "Friend" }, { front: "愛", back: "Love" }, { front: "家", back: "Home" }
    ],
    "Japanese": [
        { front: "你好", back: "こんにちは" }, { front: "謝謝", back: "ありがとう" }, { front: "再見", back: "さようなら" },
        { front: "是", back: "はい" }, { front: "不是", back: "いいえ" }, { front: "蘋果", back: "りんご" },
        { front: "水", back: "みず" }, { front: "朋友", back: "ともだち" }, { front: "愛", back: "あい" }, { front: "家", back: "いえ" }
    ],
    "Korean": [
        { front: "你好", back: "안녕하세요" }, { front: "謝謝", back: "감사합니다" }, { front: "再見", back: "안녕히 가세요" },
        { front: "是", back: "네" }, { front: "不是", back: "아니요" }, { front: "蘋果", back: "사과" },
        { front: "水", back: "물" }, { front: "朋友", back: "친구" }, { front: "愛", back: "사랑" }, { front: "家", back: "집" }
    ]
};

const achievements = {
    firstCorrect: { title: "First Step!", description: "Answer your first card correctly.", condition: (state) => state.correctAnswerCount === 1 },
    fiveCorrect: { title: "On a Roll!", description: "Answer 5 questions correctly.", condition: (state) => state.correctAnswerCount === 5 },
    tenCorrect: { title: "Hot Streak!", description: "Answer 10 questions correctly.", condition: (state) => state.correctAnswerCount === 10 }
};

let flashcards = [];
let currentCardIndex = 0;
let isFlipped = false;
let mode = 'learn';
let score = 0;
let totalAsked = 0;
let correctAnswerCount = 0; // For achievements
let timer;
let timeLeft = 30;

// --- DOM Elements ---
const introScreen = document.getElementById('intro-screen');
const getStartedButton = document.getElementById('get-started-button');
const languageSelectionContainer = document.getElementById('language-selection-container');
const languageCheckboxesContainer = document.getElementById('language-checkboxes');
const startLearningButton = document.getElementById('start-learning-button');
const mainContainer = document.querySelector('.container');
const backToMenuButton = document.getElementById('back-to-menu-button');
const achievementToast = document.getElementById('achievement-toast');
const achievementTitle = document.getElementById('achievement-title');
const achievementDesc = document.getElementById('achievement-desc');

const flashcard = document.getElementById('flashcard');
const flashcardFront = document.getElementById('flashcard-front');
const flashcardBack = document.getElementById('flashcard-back');
const flipButton = document.getElementById('flip-button');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const testModeButton = document.getElementById('test-mode-button');
const multipleChoiceButton = document.getElementById('multiple-choice-button');

const testContainer = document.getElementById('test-container');
const testDirection = document.getElementById('test-direction');
const timerDisplay = document.getElementById('timer');
const answerInput = document.getElementById('answer-input');
const submitAnswerButton = document.getElementById('submit-answer-button');
const multipleChoiceOptions = document.getElementById('multiple-choice-options');
const exitTestModeButton = document.getElementById('exit-test-mode-button');
const result = document.getElementById('result');

// --- View & UI ---
function showIntroScreen() {
    introScreen.style.display = 'flex';
    languageSelectionContainer.style.display = 'none';
    mainContainer.style.display = 'none';
    if (mode !== 'learn') { exitTestModes(); }
}

function showLanguageSelection() {
    introScreen.style.display = 'none';
    languageSelectionContainer.style.display = 'block';
    mainContainer.style.display = 'none';
    if (mode !== 'learn') { exitTestModes(); }
}

function showMainContainer() {
    introScreen.style.display = 'none';
    languageSelectionContainer.style.display = 'none';
    mainContainer.style.display = 'block';
}

function showAchievementNotification(achievement) {
    achievementTitle.textContent = achievement.title;
    achievementDesc.textContent = achievement.description;
    achievementToast.classList.remove('hidden');
    achievementToast.classList.add('show');
    setTimeout(() => {
        achievementToast.classList.remove('show');
        setTimeout(() => { achievementToast.classList.add('hidden'); }, 500);
    }, 4000);
}


// --- Initialization ---
function initializeLanguageSelection() {
    languageCheckboxesContainer.innerHTML = '';
    for (const language in languagePacks) {
        const container = document.createElement('div');
        container.className = 'checkbox-container';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `lang-${language}`;
        checkbox.value = language;
        checkbox.name = 'language';
        
        const label = document.createElement('label');
        label.htmlFor = `lang-${language}`;
        label.textContent = language;
        
        container.appendChild(checkbox);
        container.appendChild(label);
        languageCheckboxesContainer.appendChild(container);
    }
}

function loadSelectedLanguages() {
    const selectedCheckboxes = document.querySelectorAll('#language-checkboxes input[name="language"]:checked');
    if (selectedCheckboxes.length === 0) {
        alert("Please select at least one language to learn!");
        return;
    }

    let combinedFlashcards = [];
    selectedCheckboxes.forEach(checkbox => {
        const lang = checkbox.value;
        combinedFlashcards = combinedFlashcards.concat(languagePacks[lang]);
    });
    
    flashcards = combinedFlashcards;
    currentCardIndex = 0;
    isFlipped = false;
    
    // Update direction text based on selection
    const selectedLangs = Array.from(selectedCheckboxes).map(cb => cb.value).join(', ');
    const zhEnOption = testDirection.querySelector('option[value="zh-en"]');
    if (zhEnOption) { zhEnOption.textContent = `Chinese to ${selectedLangs}`; }
    const enZhOption = testDirection.querySelector('option[value="en-zh"]');
    if (enZhOption) { enZhOption.textContent = `${selectedLangs} to Chinese`; }
    
    if (mode !== 'learn') { exitTestModes(); }
    updateCardContent();
    showMainContainer();
}

// --- Progress, Achievements & Game Logic ---
function checkAchievements() {
    const state = { correctAnswerCount };
    for (const key in achievements) {
        if (!userAchievements.has(key) && achievements[key].condition(state)) {
            userAchievements.add(key);
            showAchievementNotification(achievements[key]);
        }
    }
}

function updateCardContent() {
    if (flashcards.length === 0) return;
    const currentCard = flashcards[currentCardIndex];
    const direction = testDirection.value;
    isFlipped = false;
    flashcard.classList.remove('flipped');
    
    answerInput.style.backgroundColor = ''; // Reset typing test visual feedback

    if (mode === 'learn') {
        flashcardFront.textContent = currentCard.front;
        flashcardBack.textContent = currentCard.back;
    } else {
        nextButton.disabled = true; // Disable next button for new question
        // Explicitly clear content before setting new content
        flashcardFront.textContent = '';
        flashcardBack.textContent = '';
        
        flashcardFront.textContent = direction === 'zh-en' ? currentCard.front : currentCard.back;
        flashcardBack.textContent = direction === 'zh-en' ? currentCard.back : currentCard.front;
        if (mode === 'multiple-choice') { generateChoices(); }
        answerInput.value = '';
        result.textContent = `Score: ${score}/${totalAsked}`;
        resetTimer();
        startTimer();
    }
}

function generateChoices() {
    const direction = testDirection.value;
    const correctCard = flashcards[currentCardIndex];
    const correctAnswer = direction === 'zh-en' ? correctCard.back : correctCard.front;
    const choices = new Set([correctAnswer]);
    while (choices.size < 4 && choices.size < flashcards.length) {
        const randomCard = flashcards[Math.floor(Math.random() * flashcards.length)];
        const randomAnswer = direction === 'zh-en' ? randomCard.back : randomCard.front;
        choices.add(randomAnswer);
    }
    const shuffledChoices = Array.from(choices).sort(() => Math.random() - 0.5);
    multipleChoiceOptions.innerHTML = '';
    shuffledChoices.forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice;
        button.addEventListener('click', () => checkMultipleChoiceAnswer(choice, correctAnswer));
        multipleChoiceOptions.appendChild(button);
    });
}

function checkMultipleChoiceAnswer(selectedAnswer, correctAnswer) {
    stopTimer();
    totalAsked++;
    const buttons = multipleChoiceOptions.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);
    
    const selectedButton = Array.from(buttons).find(btn => btn.textContent === selectedAnswer);

    if (selectedAnswer === correctAnswer) {
        score++;
        correctAnswerCount++;
        if (selectedButton) selectedButton.classList.add('correct');
        result.textContent = `Correct! Score: ${score}/${totalAsked}`;
        result.style.color = 'green';
        checkAchievements();
    } else {
        if (selectedButton) selectedButton.classList.add('incorrect');
        const correctButton = Array.from(buttons).find(btn => button.textContent === correctAnswer);
        if (correctButton) correctButton.classList.add('correct');
        result.textContent = `Incorrect. Score: ${score}/${totalAsked}`;
        result.style.color = 'red';
        flashcard.classList.add('flipped');
    }
    nextButton.disabled = false; // Enable next button
}

function flipCard() { if (mode === 'learn') { flashcard.classList.toggle('flipped'); isFlipped = !isFlipped; } }

function nextRandomCard() {
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * flashcards.length);
    } while (newIndex === currentCardIndex); // Avoid immediate repetition
    currentCardIndex = newIndex;
    updateCardContent();
}

function previousCard() { currentCardIndex = (currentCardIndex - 1 + flashcards.length) % flashcards.length; updateCardContent(); }

function toggleTestMode(isTypingTest) {
    if (mode === 'learn') {
        mode = isTypingTest ? 'test' : 'multiple-choice';
        document.body.classList.add('test-mode-active');
        ['flip-button', 'prev-button'].forEach(id => document.getElementById(id).style.display = 'none');
        nextButton.style.display = 'inline-block'; // Show next button
        nextButton.disabled = true; // Disable until answer is given
        testContainer.style.display = 'block';
        flashcard.removeEventListener('click', flipCard);
        answerInput.style.display = isTypingTest ? 'inline-block' : 'none';
        submitAnswerButton.style.display = isTypingTest ? 'inline-block' : 'none';
        multipleChoiceOptions.style.display = isTypingTest ? 'none' : 'flex';
        // Reset stats
        score = 0;
        totalAsked = 0;
        correctAnswerCount = 0;
        userAchievements.clear();
        updateCardContent();
    } else { exitTestModes(); }
}

function exitTestModes() {
    mode = 'learn';
    document.body.classList.remove('test-mode-active');
    ['flip-button', 'prev-button', 'next-button'].forEach(id => document.getElementById(id).style.display = 'inline-block');
    testContainer.style.display = 'none';
    flashcard.addEventListener('click', flipCard);
    stopTimer();
    result.textContent = '';
    updateCardContent();
}

function checkAnswer() {
    stopTimer();
    totalAsked++;
    const userAnswer = answerInput.value.trim().toLowerCase();
    const direction = testDirection.value;
    const correctAnswer = (direction === 'zh-en' ? flashcards[currentCardIndex].back : flashcards[currentCardIndex].front).toLowerCase();
    
    if (userAnswer === correctAnswer) {
        score++;
        correctAnswerCount++;
        answerInput.style.backgroundColor = '#2ecc71'; // Green feedback
        result.textContent = `Correct! Score: ${score}/${totalAsked}`;
        result.style.color = 'green';
        checkAchievements();
    } else {
        answerInput.style.backgroundColor = '#e74c3c'; // Red feedback
        result.textContent = `Incorrect. The answer is "${correctAnswer}". Score: ${score}/${totalAsked}`;
        result.style.color = 'red';
        flashcard.classList.add('flipped');
    }
    nextButton.disabled = false; // Enable next button
}

function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = `00:${timeLeft < 10 ? '0' : ''}${timeLeft}`;
        if (timeLeft <= 0) {
            if (mode === 'test') { checkAnswer(); }
            else if (mode === 'multiple-choice') {
                const correctAnswer = (testDirection.value === 'zh-en' ? flashcards[currentCardIndex].back : flashcards[currentCardIndex].front);
                checkMultipleChoiceAnswer("", correctAnswer);
            }
        }
    }, 1000);
}

function stopTimer() { clearInterval(timer); }
function resetTimer() { stopTimer(); timeLeft = 30; timerDisplay.textContent = `00:30`; }

// --- Event Listeners ---
flipButton.addEventListener('click', flipCard);
prevButton.addEventListener('click', previousCard);
nextButton.addEventListener('click', nextRandomCard);
testModeButton.addEventListener('click', () => toggleTestMode(true));
multipleChoiceButton.addEventListener('click', () => toggleTestMode(false));
submitAnswerButton.addEventListener('click', checkAnswer);
testDirection.addEventListener('change', updateCardContent);
backToMenuButton.addEventListener('click', showLanguageSelection);
exitTestModeButton.addEventListener('click', exitTestModes);
startLearningButton.addEventListener('click', loadSelectedLanguages);
getStartedButton.addEventListener('click', showLanguageSelection);


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    initializeLanguageSelection();
    showIntroScreen();
});
