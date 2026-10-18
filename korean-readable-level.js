(() => {
  const level = new URLSearchParams(location.search).get('level');
  if (!/^(A1|A2|B1|B2|C1|C2)$/.test(level || '')) {
    location.replace('K-korean-readable.html?edition=levels-20261018');
    return;
  }
  document.title = `${level} Korean Readable · TalkTag`;
  document.getElementById('kr-readable-level-title').textContent = `${level} Readables`;
})();
