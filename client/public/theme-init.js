(() => {
  try {
    const consent = JSON.parse(localStorage.getItem('erasepaper.cookie-consent.v1') || 'null');
    const functionalAllowed =
      consent?.version === 1 &&
      Number(consent.expiresAt) > Date.now() &&
      consent?.preferences?.functional === true;
    const saved = functionalAllowed ? localStorage.getItem('erasepaper.theme.v1') : null;
    const mode = ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
    const dark =
      mode === 'dark' || (mode === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = dark ? '#0b1426' : '#6554d9';
  } catch {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
  }
})();
