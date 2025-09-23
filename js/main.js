// ===== MENU NAVIGATION =====
document.querySelectorAll('[data-page]').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});

function switchPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
}