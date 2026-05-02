document.addEventListener('click', (event) => {
  const target = event.target.closest('.confirm-button');
  if (!target) return;

  const message = target.dataset.confirmMessage || '本当に実行しますか？';
  if (!window.confirm(message)) {
    event.preventDefault();
    event.stopPropagation();
  }
});
