const colsSelect = document.getElementById('colsSelect');
const rowsSelect = document.getElementById('rowsSelect');
const board = document.getElementById('board');
const answerInput = document.getElementById('answerInput');
const findBtn = document.getElementById('findGuessesBtn');

let tiles = [];

// Fill dropdowns
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
      tile.dataset.color = 'gray';     // default gray
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
  tile.classList.remove('yellow','green');
  if (next !== 'gray') tile.classList.add(next);
}

// ======= Programmatic Letter Input =======
function inputLetter(row, col, letter) {
  if (tiles[row] && tiles[row][col]) {
    tiles[row][col].textContent = letter.toUpperCase();
    tiles[row][col].dataset.letter = letter.toUpperCase();
  }
}

// ======= Load Word List =======
async function loadWordsList(filename) {
  const response = await fetch(`dictionaries/${filename}`);
  if (!response.ok) throw new Error("Failed to load word list");
  const text = await response.text();
  const words = [];
  text.split(/\r?\n/).forEach(line => {
    const w = line.trim().toUpperCase();
    if (w.length && /^[A-Z]+$/.test(w)) words.push(w);
  });
  return words;
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

  // Collect grid pattern (colors)
  let stringResult = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = tiles[r][c].dataset.color;
      if (color === 'gray') stringResult += '0';
      else if (color === 'yellow') stringResult += '1';
      else stringResult += '2';
    }
  }
  const resultPatterns = [];
  for (let i = 0; i < stringResult.length; i += cols) {
    resultPatterns.push(stringResult.slice(i, i + cols));
  }

  // Load matching word list
  const filename = `${cols}_letters_words.txt`;
  let availableWords;
  try {
    availableWords = await loadWordsList(filename);
  } catch (err) {
    alert(`Missing dictionary file: ${filename}`);
    return;
  }

  // Precompute word->pattern map
  const wordResults = {};
  for (const w of availableWords) {
    wordResults[w] = computeResult(w, answer);
  }

  // Find first matching word for each row pattern
  const rowGuesses = resultPatterns.map(pattern =>
    Object.entries(wordResults).find(([w, r]) => r === pattern)?.[0] || '-'.repeat(cols)
  );

  // Output guesses to tiles
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles[r][c].textContent = rowGuesses[r][c];
      tiles[r][c].dataset.letter = rowGuesses[r][c];
    }
  }
});