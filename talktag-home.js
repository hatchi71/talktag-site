(() => {
  if (document.querySelector('.talktag-global-home')) return;

  const style = document.createElement('style');
  style.textContent = `
    .talktag-global-home {
      position: fixed;
      right: max(18px, env(safe-area-inset-right));
      bottom: max(18px, env(safe-area-inset-bottom));
      z-index: 9000;
      width: 70px;
      height: 70px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      border: 1px solid rgba(191, 208, 229, .88);
      border-radius: 22px;
      background: rgba(255, 255, 255, .94);
      box-shadow: 0 14px 34px rgba(24, 52, 85, .18);
      color: #1768e9;
      text-decoration: none;
      -webkit-backdrop-filter: blur(18px);
      backdrop-filter: blur(18px);
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .talktag-global-home:hover {
      transform: translateY(-3px);
      border-color: #9dbce5;
      box-shadow: 0 18px 40px rgba(24, 52, 85, .24);
    }
    .talktag-global-home:focus-visible {
      outline: 3px solid rgba(23, 104, 233, .3);
      outline-offset: 3px;
    }
    .talktag-global-home img {
      width: 47px;
      height: 39px;
      display: block;
      object-fit: contain;
    }
    .talktag-global-home span {
      font: 900 8px/1 Inter, "Noto Sans KR", system-ui, sans-serif;
      letter-spacing: .13em;
    }
    body.broadcast .talktag-global-home,
    body.exam-active .talktag-global-home {
      bottom: calc(92px + env(safe-area-inset-bottom));
    }
    @media (max-width: 820px) {
      .talktag-global-home {
        right: max(14px, env(safe-area-inset-right));
        bottom: calc(88px + env(safe-area-inset-bottom));
        width: 60px;
        height: 60px;
        border-radius: 19px;
      }
      .talktag-global-home img { width: 41px; height: 33px; }
      .talktag-global-home span { font-size: 7px; }
      body.broadcast .talktag-global-home,
      body.exam-active .talktag-global-home { bottom: calc(90px + env(safe-area-inset-bottom)); }
    }
    @media print { .talktag-global-home { display: none !important; } }
  `;

  const home = document.createElement('a');
  home.className = 'talktag-global-home';
  home.href = '/';
  home.setAttribute('aria-label', 'TalkTag 홈으로 이동');
  home.title = 'TalkTag 홈';
  home.innerHTML = '<img src="/talktag-logo.png" alt=""><span>HOME</span>';

  document.head.appendChild(style);
  document.body.appendChild(home);
})();
