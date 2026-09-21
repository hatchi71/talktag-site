(() => {
  const isHome = location.pathname === '/' || /\/index\.html$/.test(location.pathname);

  if (isHome) {
    const home = document.querySelector('#home .stage');
    if (home && !home.classList.contains('mission-home')) {
      home.classList.add('mission-home');
      home.innerHTML = `
        <section class="mission-copy">
          <div class="mission-kicker">SMALL STEPS · BIGGER YOU</div>
          <h1>Build your<br>language,<br><em>piece by piece.</em></h1>
          <p class="mission-lead">언어를 익히는 것은 조그마한 조각을<br>차근차근 쌓아가는 것과 같아요.</p>
          <p class="mission-body">톡택에서는 초보부터 중급까지 외국어 학습자가<br>기초부터 탄탄한 언어 <b>LOGIC</b>을 만들도록<br>안내하고 도와드립니다.</p>
          <div class="mission-rule"></div>
          <div class="mission-foot">A BRIGHTER YOU THROUGH A RICHER TOMORROW</div>
        </section>
        <section class="logic-stack" aria-label="Language grows step by step">
          <div class="stack-flag">A More<br>Confident You</div>
          <div class="stack-block fluent"><span>✦</span><b>Fluent<br>Expression</b></div>
          <div class="stack-block natural"><span>•••</span><b>Natural<br>Communication</b></div>
          <div class="stack-block logic"><span>✚</span><b>Stronger<br>Language Logic</b></div>
          <div class="stack-block chunks"><span>▣</span><b>Useful Chunks<br>&amp; Patterns</b></div>
          <div class="stack-block daily"><span>♧</span><b>Small<br>Daily Practice</b></div>
          <div class="stack-note">Small Pieces<br>Big Progress! ↗</div>
        </section>
        <section class="home-news">
          <a class="feature-card snow" href="snowballing-studio.html">
            <small>새 소식 · 스노우볼링 스튜디오</small>
            <h3>듣고 따라 말하며<br>영어를 내 것으로 만들어요.</h3>
            <p>작은 표현부터 차근차근 반복하고 연결하며 실제로 말할 수 있는 영어를 만들어 갑니다.</p>
            <strong>스노우볼링 스튜디오 둘러보기 →</strong>
          </a>
          <a class="feature-card readable" href="toeic-part5.html">
            <small>새 소식 · 토익 모의고사 웹앱</small>
            <h3>실전처럼 풀고,<br>바로 확인하세요.</h3>
            <p>토익 실전 연습문제를 웹에서 풀고 정답과 해설을 확인하며 시험 감각을 키울 수 있습니다.</p>
            <strong>토익 모의고사 시작하기 →</strong>
          </a>
        </section>`;

      const style = document.createElement('style');
      style.textContent = `
        #home .mission-home{min-width:0;min-height:820px;position:relative;padding:52px 46px 40px;overflow:auto}
        #home+.ai-panel,.view#home .ai-panel{display:none!important}
        .mission-copy{width:min(52%,650px);position:relative;z-index:2}
        .mission-kicker{font-size:12px;font-weight:900;letter-spacing:.22em;color:#8aa0c4;margin-bottom:18px}
        .mission-copy h1{font-size:clamp(48px,5.6vw,78px);line-height:.96;letter-spacing:-.065em;color:#082b68;margin:0 0 28px}
        .mission-copy h1 em{font-style:normal;color:#ff6412}
        .mission-lead{font-size:clamp(18px,1.7vw,25px);line-height:1.45;font-weight:850;color:#0c3475;margin:0 0 16px;letter-spacing:-.035em}
        .mission-body{font-size:clamp(14px,1.2vw,18px);line-height:1.65;color:#526d91;margin:0}.mission-body b{color:#173d79}
        .mission-rule{width:42px;height:3px;background:#1768e9;margin:24px 0 14px;border-radius:99px}
        .mission-foot{font-size:10px;font-weight:850;letter-spacing:.2em;color:#9bacc7}
        .logic-stack{position:absolute;right:7%;top:62px;width:330px;height:500px;z-index:1}
        .stack-block{position:absolute;right:0;width:245px;height:84px;border-radius:22px;box-shadow:0 15px 28px rgba(34,67,110,.12);display:flex;align-items:center;gap:18px;padding:0 28px;color:#143d78;border:1px solid rgba(255,255,255,.7)}
        .stack-block span{font-size:24px;font-weight:900}.stack-block b{font-size:15px;line-height:1.12}.fluent{top:48px;right:32px;background:#fff2dc}.natural{top:126px;right:14px;background:#dbeaff}.logic{top:204px;right:27px;background:#d8f3df}.chunks{top:282px;right:7px;background:#ffdcd5}.daily{top:360px;right:35px;background:#dedcff}
        .stack-flag{position:absolute;right:-5px;top:0;background:#ff6a10;color:#fff;padding:10px 18px;border-radius:5px 18px 18px 5px;font-size:14px;font-weight:850;line-height:1.05;transform:rotate(3deg);box-shadow:0 8px 18px rgba(255,106,16,.2)}
        .stack-note{position:absolute;left:-2px;top:325px;color:#5676aa;font:700 14px/1.3 cursive;transform:rotate(-8deg)}
        .home-news{position:absolute;left:46px;right:46px;top:590px;display:grid;grid-template-columns:1fr 1fr;gap:20px;padding-bottom:42px}
        .feature-card{display:block;text-decoration:none;border-radius:24px;padding:24px 28px;min-height:190px;box-shadow:0 16px 36px rgba(24,52,85,.09);transition:transform .18s ease,box-shadow .18s ease}.feature-card:hover{transform:translateY(-4px);box-shadow:0 20px 42px rgba(24,52,85,.14)}
        .feature-card.snow{background:linear-gradient(145deg,#fff8bf,#fff2a4)}.feature-card.readable{background:linear-gradient(145deg,#fff,#f1f6ff);border:1px solid #e1e9f5}
        .feature-card small{font-size:14px;font-weight:950;letter-spacing:.08em;color:#526f9e}.feature-card h3{font-size:30px;line-height:1.04;letter-spacing:-.045em;color:#082b68;margin:12px 0;font-weight:950}.feature-card p{font-size:13px;line-height:1.45;color:#617797;margin:0 0 14px}.feature-card strong{font-size:11px;color:#1768e9;letter-spacing:.04em}
        @media(max-width:820px){
          #home .mission-home{min-height:1180px;padding:28px 20px 34px;overflow:hidden}
          .mission-copy{width:100%}.mission-kicker{font-size:9px;margin-bottom:12px}.mission-copy h1{font-size:47px;line-height:.96;margin-bottom:20px}
          .mission-lead{font-size:17px;line-height:1.48;margin-bottom:12px}.mission-body{font-size:13px;line-height:1.62}.mission-foot{font-size:7px;letter-spacing:.16em}.mission-rule{margin:18px 0 10px}
          .logic-stack{position:relative;right:auto;top:auto;width:100%;height:330px;margin-top:18px;transform:scale(.82);transform-origin:top center}
          .stack-block{width:225px;height:68px;border-radius:18px;padding:0 22px}.stack-block b{font-size:13px}.stack-block span{font-size:20px}.fluent{top:38px;right:42px}.natural{top:101px;right:27px}.logic{top:164px;right:39px}.chunks{top:227px;right:22px}.daily{top:290px;right:45px}.stack-flag{right:13px;top:0;font-size:11px;padding:8px 13px}.stack-note{left:5px;top:218px;font-size:12px}
          .home-news{position:relative;left:auto;right:auto;top:auto;display:grid;grid-template-columns:1fr;gap:14px;margin-top:-20px;padding-bottom:40px}.feature-card{min-height:0;padding:20px 21px;border-radius:20px}.feature-card h3{font-size:27px;font-weight:950}.feature-card small{font-size:13px;font-weight:950}.feature-card p{font-size:12px}
        }
      `;
      document.head.appendChild(style);
      const panel = document.querySelector('#home .ai-panel');
      if (panel) panel.remove();
    }
    return;
  }

  if (document.querySelector('.talktag-global-home')) return;
  const style = document.createElement('style');
  style.textContent = `
    .talktag-global-home{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:9000;width:70px;height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;border:1px solid rgba(191,208,229,.88);border-radius:22px;background:rgba(255,255,255,.94);box-shadow:0 14px 34px rgba(24,52,85,.18);color:#1768e9;text-decoration:none;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
    .talktag-global-home:hover{transform:translateY(-3px);border-color:#9dbce5;box-shadow:0 18px 40px rgba(24,52,85,.24)}.talktag-global-home:focus-visible{outline:3px solid rgba(23,104,233,.3);outline-offset:3px}.talktag-global-home img{width:47px;height:39px;display:block;object-fit:contain}.talktag-global-home span{font:900 8px/1 Inter,"Noto Sans KR",system-ui,sans-serif;letter-spacing:.13em}body.broadcast .talktag-global-home,body.exam-active .talktag-global-home{bottom:calc(92px + env(safe-area-inset-bottom))}
    @media(max-width:820px){.talktag-global-home{right:max(14px,env(safe-area-inset-right));bottom:calc(88px + env(safe-area-inset-bottom));width:60px;height:60px;border-radius:19px}.talktag-global-home img{width:41px;height:33px}.talktag-global-home span{font-size:7px}body.broadcast .talktag-global-home,body.exam-active .talktag-global-home{bottom:calc(90px + env(safe-area-inset-bottom))}}@media print{.talktag-global-home{display:none!important}}
  `;
  const globalHome = document.createElement('a');
  globalHome.className = 'talktag-global-home';
  globalHome.href = '/';
  globalHome.setAttribute('aria-label', 'TalkTag 홈으로 이동');
  globalHome.title = 'TalkTag 홈';
  globalHome.innerHTML = '<img src="/talktag-logo.png" alt=""><span>HOME</span>';
  document.head.appendChild(style);
  document.body.appendChild(globalHome);
})();
