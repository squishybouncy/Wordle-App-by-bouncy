const boardEl    = document.getElementById('board');
const lenSelect  = document.getElementById('lenSelect');
const retryBtn   = document.getElementById('retryBtn');
const resultEl   = document.getElementById('result');
const keyboardEl = document.getElementById('keyboard');

let answer = '';
let wordLen = 5;
let currentRow = [];
let rows = [];
let maxRows = 6;
let dictionary = [];

// Populate length selector (reuse from guesser idea)
for (let i=3;i<=8;i++){
  const opt=document.createElement('option');
  opt.value=i; opt.textContent=i;
  if(i===5) opt.selected=true;
  lenSelect.appendChild(opt);
}

// Utilities
function alphabetDistance(a,b){
  return Math.abs(a.charCodeAt(0)-b.charCodeAt(0));
}
function colorForDistance(d){
  if(d===0) return 'green';
  if(d===1) return 'red';
  if(d<=3)  return 'light-red';
  if(d<=6)  return 'gray';
  if(d<=10) return 'light-blue';
  return 'blue';
}
function randomWord(){
  const list = dictionary.filter(w=>w.length===wordLen);
  return list[Math.floor(Math.random()*list.length)].toUpperCase();
}

// Load dictionary for current length
async function loadDict(){
  const file = `../dictionaries/${wordLen}-letter-words.json`;
  const res = await fetch(file);
  dictionary = await res.json();
}

// Draw board
function drawBoard(){
  boardEl.innerHTML='';
  rows=[];
  for(let r=0;r<maxRows;r++){
    const row=[];
    const rowEl=document.createElement('div');
    for(let c=0;c<wordLen;c++){
      const t=document.createElement('div');
      t.className='tile';
      row.push(t);
      rowEl.appendChild(t);
    }
    rows.push(row);
    boardEl.appendChild(rowEl);
  }
}

// Draw keyboard
function drawKeyboard(){
  const layout=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
  keyboardEl.innerHTML='';
  layout.forEach((rowLetters,ri)=>{
    const rowEl=document.createElement('div');
    rowEl.className='keyboard-row';
    if(ri===2){
      const enter=document.createElement('div');
      enter.textContent='Enter';
      enter.className='key wide';
      enter.onclick=handleEnter;
      rowEl.appendChild(enter);
    }
    for(const ch of rowLetters){
      const key=document.createElement('div');
      key.textContent=ch;
      key.className='key';
      key.onclick=()=>handleKey(ch);
      rowEl.appendChild(key);
    }
    if(ri===2){
      const back=document.createElement('div');
      back.textContent='⌫';
      back.className='key wide';
      back.onclick=handleBack;
      rowEl.appendChild(back);
    }
    keyboardEl.appendChild(rowEl);
  });
}

// Game reset
async function reset(){
  wordLen = parseInt(lenSelect.value);
  await loadDict();
  answer = randomWord();
  currentRow=[];
  resultEl.textContent='';
  drawBoard();
}
lenSelect.onchange = reset;
retryBtn.onclick   = reset;

// Input handlers
function handleKey(ch){
  if(currentRow.length<wordLen){
    currentRow.push(ch);
    updateTiles();
  }
}
function handleBack(){
  currentRow.pop();
  updateTiles();
}
function updateTiles(){
  const row = rows.find(r => r.some(t => t.textContent==='')) || rows[rows.length-1];
  if(!row) return;
  for(let i=0;i<wordLen;i++){
    row[i].textContent=currentRow[i]||'';
  }
}
function handleEnter(){
  if(currentRow.length!==wordLen) return;
  const guess=currentRow.join('');
  if(!dictionary.includes(guess.toLowerCase())){
    alert('Not in word list');
    return;
  }
  // Score colors
  const row=rows.find(r => r.some(t => t.textContent!==''));
  row.forEach((tile,i)=>{
    const d = alphabetDistance(guess[i], answer[i]);
    tile.className='tile '+colorForDistance(d);
  });
  if(guess===answer){
    resultEl.textContent=`Solved in ${rows.indexOf(row)+1} attempts!`;
    return;
  }
  if(rows.indexOf(row)===maxRows-1){
    resultEl.textContent=`Out of attempts! Answer: ${answer}`;
    return;
  }
  currentRow=[];
}

// Keyboard input support
window.addEventListener('keydown',e=>{
  if(/^[a-z]$/i.test(e.key)) handleKey(e.key.toUpperCase());
  else if(e.key==='Backspace') handleBack();
  else if(e.key==='Enter') handleEnter();
});

// Init
reset();
drawKeyboard();
