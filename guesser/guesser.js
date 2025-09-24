const colsSelect = document.getElementById('colsSelect');
const rowsSelect = document.getElementById('rowsSelect');
const board = document.getElementById('board');
const answerInput = document.getElementById('answerInput');
const findBtn = document.getElementById('findGuessesBtn');

let tiles = [];

// ======= Dropdowns =======
for (let c = 3; c <= 8; c++) {
  const opt = document.createElement('option');
  opt.value = c; opt.textContent = c;
  colsSelect.appendChild(opt);
}
for (let r = 3; r <= 8; r++) {
  const opt = document.createElement('option');
  opt.value = r; opt.textContent = r;
  rowsSelect.appendChild(opt);
}
colsSelect.value = 5;
rowsSelect.value = 6;

// ======= Build Board =======
function buildBoard() {
  const cols = parseInt(colsSelect.value);
  const rows = parseInt(rowsSelect.value);
  board.style.gridTemplateColumns = `repeat(${cols}, 50px)`;
  board.innerHTML = '';
  tiles = [];

  for (let r = 0; r < rows; r++) {
    let rowTiles = [];
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement('button');
      tile.classList.add('tile');
      tile.dataset.color = 'gray';
      tile.dataset.letter = '';
      tile.addEventListener('click', () => cycleColor(tile));
      board.appendChild(tile);
      rowTiles.push(tile);
    }
    tiles.push(rowTiles);
  }
}
buildBoard();
colsSelect.addEventListener('change', buildBoard);
rowsSelect.addEventListener('change', buildBoard);

// ======= Tile Color Cycle (Gray→Yellow→Green) =======
function cycleColor(tile) {
  const colors = ['gray', 'yellow', 'green'];
  let next = colors[(colors.indexOf(tile.dataset.color) + 1) % colors.length];
  tile.dataset.color = next;
  tile.classList.remove('yellow', 'green');
  if (next !== 'gray') tile.classList.add(next);
}

// ======= Letter Input =======
function inputLetter(row, col, letter) {
  if (tiles[row] && tiles[row][col]) {
    tiles[row][col].textContent = letter.toUpperCase();
    tiles[row][col].dataset.letter = letter.toUpperCase();
  }
}

// ======= Load Word List =======
async function loadWordsListJSON(filename) {
  try {
    const response = await fetch(`../dictionaries/${filename}`);
    if (!response.ok) throw new Error("Failed to load word list");
    const data = await response.json();
    return data
      .filter(w => typeof w === 'string' && /^[A-Z]+$/i.test(w))
      .map(w => w.toUpperCase());
  } catch (err) {
    console.error(err);
    return [];
  }
}

// ======= Compute Wordle Result =======
function computeResult(word, answer) {
  const res = Array(word.length).fill('0');
  const answerArr = answer.split('');
  // Greens
  for (let i = 0; i < word.length; i++) {
    if (word[i] === answerArr[i]) {
      res[i] = '2';
      answerArr[i] = '#';
    }
  }
  // Yellows
  for (let i = 0; i < word.length; i++) {
    if (res[i] !== '2' && answerArr.includes(word[i])) {
      res[i] = '1';
      answerArr[answerArr.indexOf(word[i])] = '#';
    }
  }
  return res.join('');
}

// ======= Find Guesses (Reverse Row Algorithm) =======
findBtn.addEventListener('click', async () => {
  const cols = parseInt(colsSelect.value);
  const rows = parseInt(rowsSelect.value);
  const answer = answerInput.value.trim().toUpperCase();

  if (!/^[A-Z]+$/.test(answer)) {
    alert("Answer must contain only English letters!");
    return;
  }
  if (answer.length !== cols) {
    alert(`Answer must be exactly ${cols} letters long!`);
    return;
  }

  // Collect grid pattern (colors) row-by-row
  const resultPatterns = [];
  for (let r = 0; r < rows; r++) {
    let rowPattern = "";
    for (let c = 0; c < cols; c++) {
      const color = tiles[r][c].dataset.color;
      if (color === 'gray') rowPattern += '0';
      else if (color === 'yellow') rowPattern += '1';
      else rowPattern += '2';
    }
    resultPatterns.push(rowPattern);
  }

  // Load dictionary JSON
  const filename = `${cols}-letter-words.json`;
  const availableWords = await loadWordsListJSON(filename);
  if (!availableWords.length) {
    alert(`Missing or empty dictionary file: ${filename}`);
    return;
  }

  // Precompute pattern -> [words] buckets
  const patternBuckets = {};
  for (const w of availableWords) {
    const p = computeResult(w, answer);
    if (!patternBuckets[p]) patternBuckets[p] = [];
    patternBuckets[p].push(w);
  }

  // Helper: random word from a bucket (optionally non-repeating only)
  function randomWord(bucket, nonRepeatOnly = false) {
    if (!bucket || !bucket.length) return null;
    let candidates = bucket;
    if (nonRepeatOnly) {
      candidates = bucket.filter(w => new Set(w).size === w.length);
      // fallback if none found
      if (!candidates.length) candidates = bucket;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // State for filtering
  const incorrectLetters = new Set();     // letters confirmed NOT in answer
  const yellowLetters = [];               // [{col, letter}] that can't be in same col
  const rowGuesses = Array(rows).fill('-'.repeat(cols));

  // Skip chance starts at 50% and halves each step up
  let skipChance = 0.5;

  // Work upwards: last row -> first row
  for (let r = rows - 1; r >= 0; r--) {
    const pattern = resultPatterns[r];
    const bucket = patternBuckets[pattern] || [];
    if (!bucket.length) {
      rowGuesses[r] = '-'.repeat(cols);
      skipChance /= 2;
      continue;
    }

    let chosen = null;
    const allowSkip = Math.random() < skipChance;
    skipChance /= 2;

    if (allowSkip) {
      // Skip conditions entirely
      chosen = randomWord(bucket, true);
    } else {
      // Enforce conditions
      for (let attempts = 0; attempts < 500 && !chosen; attempts++) {
        const candidate = randomWord(bucket, true);
        if (!candidate) break;

        // Condition 1: cannot contain incorrect letters
        if ([...incorrectLetters].some(ch => candidate.includes(ch))) continue;

        // Condition 2: yellow letters cannot appear in same column
        let violatesYellow = false;
        for (const { col, letter } of yellowLetters) {
          if (candidate[col] === letter) { violatesYellow = true; break; }
        }
        if (violatesYellow) continue;

        chosen = candidate;
      }
      // Fallback if nothing passes conditions
      if (!chosen) chosen = randomWord(bucket, true);
    }

    // Store the chosen guess
    rowGuesses[r] = chosen || '-'.repeat(cols);

    // Update incorrect/yellow sets for next (upper) row
    const guess = rowGuesses[r];
    for (let c = 0; c < cols; c++) {
      const color = tiles[r][c].dataset.color;
      if (color === 'gray') incorrectLetters.add(guess[c]);
      else if (color === 'yellow') yellowLetters.push({ col: c, letter: guess[c] });
    }
  }

  // Output guesses to tiles (top-to-bottom)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles[r][c].textContent = rowGuesses[r][c];
      tiles[r][c].dataset.letter = rowGuesses[r][c];
    }
  }
});