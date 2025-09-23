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
for (let r = 6; r <= 12; r++) {
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
    const response = await fetch(`dictionaries/${filename}`);
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

// ======= Find Guesses =======
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

  // Collect pattern grid
  let stringResult = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = tiles[r][c].dataset.color;
      stringResult += color === 'gray' ? '0' :
                      color === 'yellow' ? '1' : '2';
    }
  }
  const resultPatterns = [];
  for (let i = 0; i < stringResult.length; i += cols) {
    resultPatterns.push(stringResult.slice(i, i + cols));
  }

  // Load word list
  const filename = `${cols}-letter-words.json`;
  let availableWords = await loadWordsListJSON(filename);
  if (!availableWords.length) {
    alert(`Missing or empty dictionary file: ${filename}`);
    return;
  }

  // Precompute pattern buckets
  const patternBuckets = {};
  for (const w of availableWords) {
    const p = computeResult(w, answer);
    if (!patternBuckets[p]) patternBuckets[p] = [];
    patternBuckets[p].push(w);
  }

  // ==== Problem-2 Logic ====
  let incorrectLetters = new Set();
  let yellowLetters = []; // [{col, letter}]
  const rowGuesses = [];

  function randomNonRepeating(words, allowRepeatChance = 0) {
    const allowRepeat = Math.random() < allowRepeatChance;
    const pool = allowRepeat ? words : words.filter(w => new Set(w).size === w.length);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function violatesConditions(word, cols, pattern) {
    // Condition 1: contains incorrect letters
    for (const l of incorrectLetters) if (word.includes(l)) return true;
    // Condition 2: yellow letters cannot be in same column
    for (let i = 0; i < cols; i++) {
      if (pattern[i] === '1') {
        const letter = word[i];
        if (yellowLetters.some(y => y.col === i && y.letter === letter))
          return true;
      }
    }
    return false;
  }

  for (let r = 0; r < rows; r++) {
    const pattern = resultPatterns[r];
    const bucket = patternBuckets[pattern] || [];
    if (!bucket.length) {
      rowGuesses[r] = '-'.repeat(cols);
      continue;
    }

    let chosen;
    if (r === 0) {
      // First row: 5% chance of repeats
      chosen = randomNonRepeating(bucket, 0.05);
    } else {
      do {
        // 2.5% chance to skip all filters
        if (Math.random() < 0.025) {
          chosen = bucket[Math.floor(Math.random() * bucket.length)];
          break;
        }
        const pool = bucket.filter(w => new Set(w).size === w.length);
        if (!pool.length) break;
        chosen = pool[Math.floor(Math.random() * pool.length)];
      } while (violatesConditions(chosen, cols, pattern));
    }

    if (!chosen) chosen = '-'.repeat(cols);
    rowGuesses[r] = chosen;

    // Update knowledge
    for (let c = 0; c < cols; c++) {
      const color = pattern[c];
      const letter = chosen[c];
      if (color === '0') incorrectLetters.add(letter);
      if (color === '1') yellowLetters.push({ col: c, letter });
    }
  }

  // Output to tiles
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles[r][c].textContent = rowGuesses[r][c];
      tiles[r][c].dataset.letter = rowGuesses[r][c];
    }
  }
});
