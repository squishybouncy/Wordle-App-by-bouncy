document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('nav.menu');
  if (!nav) return;

  nav.innerHTML = `
    <div class="menu-left">
      <a class="menu-btn" href="../index.html">Home</a>

      <div class="menu-dropdown">
        <button class="menu-btn">Plays ▾</button>
        <div class="dropdown-content">
          <a href="../warmle/warmle.html">Warmle</a>
        </div>
      </div>

      <div class="menu-dropdown">
        <button class="menu-btn">Tools ▾</button>
        <div class="dropdown-content">
          <a href="../guesser/guesser.html">Words Guesser</a>
        </div>
      </div>
    </div>
  `;
});