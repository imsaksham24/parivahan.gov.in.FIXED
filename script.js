const accessibilityButton = document.querySelector('#accessibility-trigger');
const accessibilityMenu = document.querySelector('#accessibility-menu');
const closeAccessibility = document.querySelector('#close-accessibility');
const toast = document.querySelector('#toast');
let toastTimer;

function toggleAccessibility(open) {
  accessibilityMenu.hidden = !open;
  accessibilityButton.setAttribute('aria-expanded', String(open));
  if (open) accessibilityMenu.querySelector('button').focus();
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

accessibilityButton.addEventListener('click', () => toggleAccessibility(accessibilityMenu.hidden));
closeAccessibility.addEventListener('click', () => { toggleAccessibility(false); accessibilityButton.focus(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !accessibilityMenu.hidden) toggleAccessibility(false); });

document.querySelectorAll('[data-text-size]').forEach((button) => {
  button.addEventListener('click', () => {
    document.documentElement.style.setProperty('--font-scale', button.dataset.textSize === 'small' ? '.9' : button.dataset.textSize === 'large' ? '1.15' : '1');
    document.querySelectorAll('[data-text-size]').forEach((item) => item.classList.toggle('selected', item === button));
  });
});
document.querySelector('#contrast-toggle').addEventListener('change', (event) => document.body.classList.toggle('high-contrast', event.target.checked));
document.querySelector('#reading-toggle').addEventListener('change', (event) => document.body.classList.toggle('easy-reading', event.target.checked));
document.querySelector('#language-select').addEventListener('change', (event) => showToast(`${event.target.value} selected. Full translations are planned for this prototype.`));

document.querySelectorAll('[role="tab"]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[role="tab"]').forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
    document.querySelectorAll('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
  });
});
document.querySelectorAll('[data-service]').forEach((button) => button.addEventListener('click', () => showToast(`${button.dataset.service} selected — service journey will open here.`)));
document.querySelector('.service-search').addEventListener('submit', (event) => { event.preventDefault(); const value = document.querySelector('#service-search-input').value.trim(); showToast(value ? `Showing mock results for “${value}”.` : 'Type a service to search.'); });
