/* ========================
   Warmle – rewritten JS
   ======================== */
const board   = document.getElementById('board');
const keyboard= document.getElementById('keyboard');
const lenSel  = document.getElementById('lenSelect');
const retryBtn= document.getElementById('retryBtn');
const result  = document.getElementById('result');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let wordLength = 5;
let answer     = '';
let currentRow = 0;
let currentCol = 0;
let rows       = [];
let dict       = [];        // loaded from JSON

/* ---------- helpers ---------- */
function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function alphaDist(a,b){ return Math.abs(a.charCodeAt(0)-b.charCodeAt(0)); }

function colorFor(letter, idx){
  const correct = answer[idx];
  if(letter === correct) return 'green';
  const dist = Math.min(...[...answer].map(ch => alphaDist(letter,ch)));
  if(dist<=1) return 'red';
  if(dist<=3) return 'light-red';
  if(dist<=6) return 'gray';
  if(dist<=10) return 'light-blue';
  return 'blue';
}

/* ---------- board setup ---------- */
function buildBoard(){
  board.innerHTML='';
  rows=[];
  for(let r=0;r<6;r++){
    const row=[];
    const div=document.createElement('div');
    div.className='board-row';
    for(let c=0;c<wordLength;c++){
      const t=document.createElement('div');
      t.className='tile';
      div.appendChild(t);
      row.push(t);
    }
    board.appendChild(div);
    rows.push(row);
  }
  currentRow=0;
  currentCol=0;
}

function buildKeyboard(){
  keyboard.innerHTML='';
  const layout=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
  layout.forEach(line=>{
    const row=document.createElement('div');
    row.className='keyboard-row';
    line.split('').forEach(ch=>{
      const k=document.createElement('button');
      k.className='key';
      k.textContent=ch;
      k.addEventListener('click',()=>pressLetter(ch));
      row.appendChild(k);
    });
    keyboard.appendChild(row);
  });
  const bottom=document.createElement('div');
  bottom.className='keyboard-row';
  const enter=document.createElement('button');
  enter.className='key enter';
  enter.textContent='Enter';
  enter.addEventListener('click',submitWord);
  const del=document.createElement('button');
  del.className='key delete';
  del.textContent='⌫';
  del.addEventListener('click',deleteLetter);
  bottom.appendChild(enter);
  bottom.appendChild(del);
  keyboard.appendChild(bottom);
}

/* ---------- input handling ---------- */
function pressLetter(ch){
  if(currentCol < wordLength && currentRow < 6){
    rows[currentRow][currentCol].textContent = ch;
    currentCol++;
  }
}
function deleteLetter(){
  if(currentCol>0){
    currentCol--;
    rows[currentRow][currentCol].textContent='';
  }
}

function submitWord(){
  if(currentCol !== wordLength) return; // must fill row
  const guess = rows[currentRow].map(t=>t.textContent).join('');
  if(!dict.includes(guess.toLowerCase())){
    showMessage('Not in word list');
    return;
  }
  // color current row only
  for(let i=0;i<wordLength;i++){
    rows[currentRow][i].classList.add(colorFor(guess[i],i));
  }
  if(guess===answer){
    showMessage(`Solved in ${currentRow+1} attempt${currentRow? 's':''}!`);
    return;
  }
  currentRow++;
  currentCol=0;
  if(currentRow===6) showMessage(`Answer: ${answer}`);
}

function showMessage(msg){
  result.textContent = msg;
}

/* ---------- game setup ---------- */
function newGame(){
  fetch(`../dictionaries/${wordLength}-letter-words.json`)
    .then(r=>r.json())
    .then(data=>{
      dict = data;
      answer = randChoice(dict).toUpperCase();
      buildBoard();
      showMessage('');
    });
}

lenSel.addEventListener('change',()=>{
  wordLength = parseInt(lenSel.value,10);
  newGame();
});
retryBtn.addEventListener('click',newGame);

document.addEventListener('keydown',e=>{
  if(e.key==='Enter') submitWord();
  else if(e.key==='Backspace') deleteLetter();
  else{
    const ch=e.key.toUpperCase();
    if(LETTERS.includes(ch)) pressLetter(ch);
  }
});

/* ---------- init ---------- */
(function init(){
  for(let n=3;n<=8;n++){
    const o=document.createElement('option');
    o.value=n; o.textContent=n;
    if(n===wordLength) o.selected=true;
    lenSel.appendChild(o);
  }
  buildKeyboard();
  newGame();
})();