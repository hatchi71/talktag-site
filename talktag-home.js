(() => {
  const isJapaneseHome = /\/japanese\.html$/.test(location.pathname);
  const isHome = location.pathname === '/' || /\/index\.html$/.test(location.pathname) || isJapaneseHome;

  if (isHome) {
    const home = document.querySelector('#home .stage');
    if (home && !home.classList.contains('mission-home')) {
      home.classList.add('mission-home');
      if (isJapaneseHome) home.classList.add('mission-home-ja');
      const copy = isJapaneseHome ? {
        title: '日本語を、<br>ひとつずつ、<br><em>自分のものに。</em>',
        lead: '일본어를 익히는 것은 작은 조각을<br>하나씩 차근차근 쌓아가는 것과 같아요.',
        body: 'TalkTag는 한국인 일본어 학습자가<br>기초부터 탄탄한 일본어 <b>LOGIC</b>을 만들고<br>실제로 말할 수 있도록 도와드립니다.',
        figureLabel: '작은 일본어 학습을 쌓아 자신 있는 소통으로 이어가는 과정',
        imageAlt: '색색의 일본어 학습 블록을 쌓는 여성 학습자',
        goal: '더 자신 있는<br>나로',
        fluent: '유창한<br>일본어 표현',
        natural: '자연스러운<br>일본어 소통',
        logic: '탄탄한<br>일본어 로직',
        chunks: '쓸 수 있는 청크<br>&amp; 패턴',
        daily: '매일 작은<br>연습',
        snowLabel: '새 소식 · 일본어 스노우볼링',
        snowTitle: '듣고 따라 말하며<br>일본어를 내 것으로 만들어요.',
        snowBody: '작은 표현부터 차근차근 반복하고 연결하며 실제로 말할 수 있는 일본어를 만들어 갑니다.',
        snowAction: '스노우볼링 스튜디오 둘러보기 →',
        secondLabel: '새 소식 · 일본어 리더블',
        secondTitle: '읽고 떠올리며<br>대화로 연결해요.',
        secondBody: '짧은 일본어 글을 읽고 핵심 의미와 표현을 기억에서 꺼내 실제 대화로 이어갑니다.',
        secondAction: '리더블 라이브러리 둘러보기 →',
        secondHref: 'readable.html'
      } : {
        title: 'Build your<br>language,<br><em>piece by piece.</em>',
        lead: '언어를 익히는 것은 조그마한 조각을<br>차근차근 쌓아가는 것과 같아요.',
        body: '톡택에서는 초보부터 중급까지 외국어 학습자가<br>기초부터 탄탄한 언어 <b>LOGIC</b>을 만들도록<br>안내하고 도와드립니다.',
        figureLabel: 'Language grows step by step',
        imageAlt: '색색의 학습 블록을 쌓는 여성 학습자',
        goal: 'A More<br>Confident You',
        fluent: 'Fluent<br>Expression',
        natural: 'Natural<br>Communication',
        logic: 'Stronger<br>Language Logic',
        chunks: 'Useful Chunks<br>&amp; Patterns',
        daily: 'Small<br>Daily Practice',
        snowLabel: '새 소식 · 스노우볼링 스튜디오',
        snowTitle: '듣고 따라 말하며<br>영어를 내 것으로 만들어요.',
        snowBody: '작은 표현부터 차근차근 반복하고 연결하며 실제로 말할 수 있는 영어를 만들어 갑니다.',
        snowAction: '스노우볼링 스튜디오 둘러보기 →',
        secondLabel: '새 소식 · 토익 모의고사 웹앱',
        secondTitle: '실전처럼 풀고,<br>바로 확인하세요.',
        secondBody: '토익 실전 연습문제를 웹에서 풀고 정답과 해설을 확인하며 시험 감각을 키울 수 있습니다.',
        secondAction: '토익 모의고사 시작하기 →',
        secondHref: 'toeic/'
      };
      home.innerHTML = `
        <section class="mission-copy">
          <div class="mission-kicker">SMALL STEPS · BIGGER YOU</div>
          <h1>${copy.title}</h1>
          <p class="mission-lead">${copy.lead}</p>
          <p class="mission-body">${copy.body}</p>
          <div class="mission-rule"></div>
          <div class="mission-foot">A BRIGHTER YOU THROUGH A RICHER TOMORROW</div>
        </section>
        <figure class="character-visual" aria-label="${copy.figureLabel}">
          <img src="assets/talktag-woman-learning-blocks.png" alt="${copy.imageAlt}">
          <div class="block-labels" aria-label="TalkTag learning progression">
            <span class="block-label label-goal">${copy.goal}</span>
            <span class="block-label label-fluent">${copy.fluent}</span>
            <span class="block-label label-natural">${copy.natural}</span>
            <span class="block-label label-logic">${copy.logic}</span>
            <span class="block-label label-chunks">${copy.chunks}</span>
            <span class="block-label label-daily">${copy.daily}</span>
          </div>
        </figure>
        <section class="home-news">
          <a class="feature-card snow" href="snowballing-studio.html">
            <div class="news-label">${copy.snowLabel}</div>
            <h3>${copy.snowTitle}</h3>
            <p>${copy.snowBody}</p>
            <strong>${copy.snowAction}</strong>
          </a>
          <a class="feature-card readable" href="${copy.secondHref}">
            <div class="news-label">${copy.secondLabel}</div>
            <h3>${copy.secondTitle}</h3>
            <p>${copy.secondBody}</p>
            <strong>${copy.secondAction}</strong>
          </a>
        </section>`;

      const style = document.createElement('style');
      style.textContent = `
        #home .mission-home{min-width:0;min-height:900px;position:relative;padding:52px 46px 40px;overflow:auto}
        #home+.ai-panel,.view#home .ai-panel{display:none!important}
        .mission-copy{width:min(52%,650px);position:relative;z-index:2}
        .mission-kicker{font-size:12px;font-weight:900;letter-spacing:.22em;color:#8aa0c4;margin-bottom:18px}
        .mission-copy h1{font-size:clamp(48px,5.6vw,78px);line-height:.96;letter-spacing:-.065em;color:#082b68;margin:0 0 28px}
        .mission-copy h1 em{font-style:normal;color:#ff6412}
        .mission-lead{font-size:clamp(18px,1.7vw,25px);line-height:1.45;font-weight:850;color:#0c3475;margin:0 0 16px;letter-spacing:-.035em}
        .mission-body{font-size:clamp(14px,1.2vw,18px);line-height:1.65;color:#526d91;margin:0}.mission-body b{color:#173d79}
        .mission-rule{width:42px;height:3px;background:#1768e9;margin:24px 0 14px;border-radius:99px}
        .mission-foot{font-size:10px;font-weight:850;letter-spacing:.2em;color:#9bacc7}
        .character-visual{position:absolute;right:3.5%;top:18px;width:min(42%,470px);margin:0;z-index:1}
        .character-visual>img{display:block;width:100%;height:auto;filter:drop-shadow(0 20px 26px rgba(30,64,104,.14))}
        .block-labels{position:absolute;inset:0;z-index:2;pointer-events:none}.block-label{position:absolute;left:34.5%;width:28%;transform:translate(-50%,-50%);color:#143d78;text-align:center;font-size:clamp(8px,.9vw,12px);font-weight:950;line-height:1.05;letter-spacing:-.025em;text-shadow:0 1px 0 rgba(255,255,255,.3)}.label-goal{top:39%;color:#fff;text-shadow:0 1px 2px rgba(108,50,0,.32)}.label-fluent{top:49.3%}.label-natural{top:58.1%}.label-logic{top:67.2%}.label-chunks{top:76.3%}.label-daily{top:85.4%}
        .mission-home-ja .mission-copy h1{font-family:"Noto Sans JP","Noto Sans KR",Inter,system-ui,sans-serif;font-size:clamp(46px,5.1vw,72px);letter-spacing:-.055em}.mission-home-ja .mission-lead,.mission-home-ja .mission-body,.mission-home-ja .feature-card{font-family:"Noto Sans KR","Noto Sans JP",Inter,system-ui,sans-serif}.mission-home-ja .block-label{font-family:"Noto Sans KR","Noto Sans JP",Inter,system-ui,sans-serif;font-size:clamp(7px,.78vw,11px);line-height:1.16;letter-spacing:-.06em}
        .home-news{position:absolute;left:46px;right:46px;top:635px;display:grid;grid-template-columns:1fr 1fr;gap:20px;padding-bottom:42px}
        .feature-card{display:block;text-decoration:none;border-radius:24px;padding:24px 28px;min-height:190px;box-shadow:0 16px 36px rgba(24,52,85,.09);transition:transform .18s ease,box-shadow .18s ease}.feature-card:hover{transform:translateY(-4px);box-shadow:0 20px 42px rgba(24,52,85,.14)}
        .feature-card.snow{background:linear-gradient(145deg,#fff8bf,#fff2a4)}.feature-card.readable{background:linear-gradient(145deg,#fff,#f1f6ff);border:1px solid #e1e9f5}
        .feature-card small{font-size:14px;font-weight:950;letter-spacing:.08em;color:#526f9e}.feature-card .news-label{font-size:18.9px!important;font-weight:950!important;line-height:1.2;color:#e8792f!important;letter-spacing:-.025em;margin-bottom:12px}.feature-card h3{font-size:30px;line-height:1.04;letter-spacing:-.045em;color:#082b68;margin:12px 0;font-weight:950}.feature-card p{font-size:13px;line-height:1.45;color:#617797;margin:0 0 14px}.feature-card strong{font-size:11px;color:#1768e9;letter-spacing:.04em}
        @media(max-width:820px){
          #home .mission-home{min-height:1480px;padding:28px 20px 34px;overflow:hidden}
          .mission-copy{width:100%}.mission-kicker{font-size:9px;margin-bottom:12px}.mission-copy h1{font-size:47px;line-height:.96;margin-bottom:20px}
          .mission-lead{font-size:17px;line-height:1.48;margin-bottom:12px}.mission-body{font-size:13px;line-height:1.62}.mission-foot{font-size:7px;letter-spacing:.16em}.mission-rule{margin:18px 0 10px}
          .character-visual{position:relative;right:auto;top:auto;width:min(100%,560px);margin:24px auto 0}.block-label{font-size:clamp(9px,2.5vw,13px)}
          .mission-home-ja .mission-copy h1{font-size:42px;line-height:1.08}.mission-home-ja .block-label{font-size:clamp(8px,2.2vw,12px)}
          .home-news{position:relative;left:auto;right:auto;top:auto;display:grid;grid-template-columns:1fr;gap:14px;margin-top:28px;padding-bottom:40px}.feature-card{min-height:0;padding:20px 21px;border-radius:20px}.feature-card h3{font-size:27px;font-weight:950}.feature-card small{font-size:13px;font-weight:950}.feature-card .news-label{font-size:17.85px!important;font-weight:950!important;line-height:1.2;color:#e8792f!important}.feature-card p{font-size:12px}
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
