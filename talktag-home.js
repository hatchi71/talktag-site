(() => {
  const isJapaneseHome = /\/japanese\.html$/.test(location.pathname);
  const isKoreanHome = /\/korean\.html$/.test(location.pathname);
  const isHome = location.pathname === '/' || /\/index\.html$/.test(location.pathname) || isJapaneseHome || isKoreanHome;

  if (isHome) {
    const home = document.querySelector('#home .stage');
    if (home && !home.classList.contains('mission-home')) {
      home.classList.add('mission-home');
      if (isJapaneseHome) home.classList.add('mission-home-ja');
      if (isKoreanHome) home.classList.add('mission-home-ko');
      const copy = isKoreanHome ? {
        title: 'Learn Korean,<br>one piece<br><em>at a time.</em>',
        lead: 'Learning Korean is like building with small pieces,<br>one clear step at a time.',
        body: 'TalkTag helps Korean learners build strong language <b>LOGIC</b><br>through English guidance—then turn it into<br>Korean they can actually use.',
        figureLabel: 'Small Korean learning steps building toward confident communication',
        imageAlt: 'A learner stacking colorful Korean language learning blocks',
        goal: 'A More Confident<br>Korean Speaker',
        fluent: 'Natural Korean<br>Expression',
        natural: 'Real Korean<br>Communication',
        logic: 'Stronger<br>Korean Logic',
        chunks: 'Useful Korean<br>Chunks &amp; Patterns',
        daily: 'Small Daily<br>Practice',
        snowLabel: 'NEW · KOREAN SNOWBALLING',
        snowTitle: 'Listen, repeat,<br>and make Korean yours.',
        snowBody: 'Build short Korean expressions through guided repetition, retrieval, and real speaking practice.',
        snowAction: 'EXPLORE KOREAN SNOWBALLING →',
        secondLabel: 'NEW · LANGUAGE EXCHANGE',
        secondTitle: 'Learn together,<br>through real exchange.',
        secondBody: 'Korean speakers and international learners share languages, culture, and useful everyday expressions in one community.',
        secondAction: 'EXPLORE LEADER SPACE →',
        secondHref: 'korean.html?view=leader'
      } : isJapaneseHome ? {
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
        .topbar{height:96px;padding:0 28px}.top-brand{gap:14px}.top-brand>div{min-width:0}.top-brand>a{position:relative;display:block;width:72px;height:72px;flex:0 0 72px;overflow:hidden;border-radius:50%;background:#fff}.mobile-logo{display:block!important;position:absolute;left:50%;top:-18px;width:174px!important;height:auto!important;max-width:none;transform:translateX(-50%)}.catchphrase{font-size:22px;line-height:1.08;white-space:normal;max-width:310px}.crumb{font-size:12px}.top-actions{position:relative}.sidebar>a:first-child{display:none}.side-logo{display:none!important}.nav{margin-top:4px}
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
        .mission-home-ko .mission-copy h1{font-size:clamp(46px,5.2vw,74px)}.mission-home-ko .block-label{font-size:clamp(7px,.75vw,10px);line-height:1.12}.mission-home-ko .label-goal{font-size:clamp(6px,.67vw,9px)}
        .floating-share{position:relative;right:auto;top:auto;z-index:30;width:52px;height:52px;display:grid;place-items:center;flex:0 0 52px;padding:0;border:1px solid rgba(181,205,238,.95);border-radius:18px;background:rgba(255,255,255,.94);color:#1768e9;box-shadow:0 8px 22px rgba(24,52,85,.12);cursor:pointer;-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);transition:transform .18s ease,box-shadow .18s ease,background .18s ease}.floating-share:hover,.floating-share[aria-expanded="true"]{transform:translateY(-2px);background:#edf5ff;box-shadow:0 12px 28px rgba(24,52,85,.18)}.floating-share:focus-visible{outline:3px solid rgba(23,104,233,.28);outline-offset:3px}.floating-share svg{width:23px;height:23px;display:block}
        .floating-language{position:relative;right:auto;top:auto;z-index:30;width:56px;height:56px;display:grid;place-items:center;flex:0 0 56px;padding:0;border:2px solid #1768e9;border-radius:19px;background:rgba(255,255,255,.97);color:#1768e9;box-shadow:0 8px 22px rgba(24,52,85,.13);cursor:pointer;-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);transition:transform .18s ease,box-shadow .18s ease,background .18s ease}.floating-language:hover,.floating-language[aria-expanded="true"]{transform:translateY(-2px);background:#edf5ff;box-shadow:0 12px 28px rgba(24,52,85,.2)}.floating-language:focus-visible{outline:3px solid rgba(23,104,233,.28);outline-offset:3px}.floating-language svg{width:30px;height:30px;display:block}.language-current{position:absolute;right:-5px;bottom:-5px;min-width:29px;height:22px;display:grid;place-items:center;padding:0 6px;border:2px solid #fff;border-radius:999px;background:#1768e9;color:#fff;font-size:10px;font-weight:950;line-height:1;box-shadow:0 4px 10px rgba(23,104,233,.28)}
        .language-menu{position:absolute;right:88px;top:108px;z-index:32;width:230px;padding:10px;border:1px solid #dce6f3;border-radius:20px;background:rgba(255,255,255,.98);box-shadow:0 22px 52px rgba(24,52,85,.22);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}.language-menu[hidden]{display:none}.language-option{min-height:56px;display:grid;grid-template-columns:42px 1fr 24px;align-items:center;gap:12px;padding:7px 10px;border-radius:14px;color:#183455;text-decoration:none;font-size:15px;font-weight:850}.language-option:hover,.language-option:focus-visible{background:#eef5ff;outline:0}.language-option.active{background:#e7f1ff;color:#1768e9}.language-code{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:#edf1f7;color:#28466f;font-size:13px;font-weight:950}.language-option.active .language-code{background:#1768e9;color:#fff}.language-name{white-space:nowrap}.language-check{font-size:20px;font-weight:950;text-align:center;color:#1768e9}
        .share-menu{position:absolute;right:26px;top:108px;z-index:31;width:190px;padding:8px;border:1px solid #dce6f3;border-radius:18px;background:rgba(255,255,255,.98);box-shadow:0 20px 48px rgba(24,52,85,.2);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}.share-menu[hidden]{display:none}.share-option{width:100%;display:flex;align-items:center;gap:11px;border:0;border-radius:12px;background:transparent;padding:10px 11px;color:#183455;font-size:13px;font-weight:800;text-align:left;cursor:pointer}.share-option:hover,.share-option:focus-visible{background:#eef5ff;outline:0}.share-option-icon{width:28px;height:28px;display:grid;place-items:center;flex:0 0 28px;border-radius:9px;background:#eaf2ff;color:#1768e9;font-size:13px;font-weight:950}.share-option[data-share="kakao"] .share-option-icon{background:#fee500;color:#2d251c}.share-option[data-share="email"] .share-option-icon{background:#fff0e5;color:#e86113}.share-toast{position:absolute;right:26px;top:314px;z-index:32;padding:10px 14px;border-radius:12px;background:#082b68;color:#fff;font-size:12px;font-weight:800;box-shadow:0 12px 30px rgba(24,52,85,.22);opacity:0;transform:translateY(-5px);pointer-events:none;transition:opacity .18s ease,transform .18s ease}.share-toast.show{opacity:1;transform:translateY(0)}
        .home-news{position:absolute;left:46px;right:46px;top:635px;display:grid;grid-template-columns:1fr 1fr;gap:20px;padding-bottom:42px}
        .feature-card{display:block;text-decoration:none;border-radius:24px;padding:24px 28px;min-height:190px;box-shadow:0 16px 36px rgba(24,52,85,.09);transition:transform .18s ease,box-shadow .18s ease}.feature-card:hover{transform:translateY(-4px);box-shadow:0 20px 42px rgba(24,52,85,.14)}
        .feature-card.snow{background:linear-gradient(145deg,#fff8bf,#fff2a4)}.feature-card.readable{background:linear-gradient(145deg,#fff,#f1f6ff);border:1px solid #e1e9f5}
        .feature-card small{font-size:14px;font-weight:950;letter-spacing:.08em;color:#526f9e}.feature-card .news-label{font-size:18.9px!important;font-weight:950!important;line-height:1.2;color:#e8792f!important;letter-spacing:-.025em;margin-bottom:12px}.feature-card h3{font-size:30px;line-height:1.04;letter-spacing:-.045em;color:#082b68;margin:12px 0;font-weight:950}.feature-card p{font-size:13px;line-height:1.45;color:#617797;margin:0 0 14px}.feature-card strong{font-size:11px;color:#1768e9;letter-spacing:.04em}
        @media(max-width:820px){
          .topbar{height:88px;padding:0 10px}.top-brand{gap:8px}.top-brand>a{width:60px;height:60px;flex-basis:60px}.mobile-logo{top:-15px;width:145px!important}.catchphrase{font-size:15px;line-height:1.12;max-width:clamp(130px,28vw,210px)}.view{min-height:calc(100dvh - 160px)}
          #home .mission-home{min-height:1480px;padding:28px 20px 34px;overflow:hidden}
          .mission-copy{width:100%}.mission-kicker{font-size:9px;margin-bottom:12px}.mission-copy h1{font-size:47px;line-height:.96;margin-bottom:20px}
          .mission-lead{font-size:17px;line-height:1.48;margin-bottom:12px}.mission-body{font-size:13px;line-height:1.62}.mission-foot{font-size:7px;letter-spacing:.16em}.mission-rule{margin:18px 0 10px}
          .character-visual{position:relative;right:auto;top:auto;width:min(100%,560px);margin:24px auto 0}.block-label{font-size:clamp(9px,2.5vw,13px)}
          .mission-home-ja .mission-copy h1{font-size:42px;line-height:1.08}.mission-home-ja .block-label{font-size:clamp(8px,2.2vw,12px)}
          .mission-home-ko .mission-copy h1{font-size:44px;line-height:1}.mission-home-ko .block-label{font-size:clamp(7px,2vw,11px)}.mission-home-ko .label-goal{font-size:clamp(6px,1.75vw,9px)}
          .top-actions{gap:6px}.floating-share{position:relative;right:auto;top:auto;width:48px;height:48px;flex-basis:48px;border-radius:15px}.floating-language{position:relative;right:auto;top:auto;width:50px;height:50px;flex-basis:50px;border-radius:17px}.floating-language svg{width:27px;height:27px}.language-menu{position:absolute;right:68px;top:96px;width:224px}.share-menu{position:absolute;right:10px;top:96px;width:184px}.share-toast{position:absolute;right:10px;top:300px;max-width:calc(100vw - 28px)}
          .home-news{position:relative;left:auto;right:auto;top:auto;display:grid;grid-template-columns:1fr;gap:14px;margin-top:28px;padding-bottom:40px}.feature-card{min-height:0;padding:20px 21px;border-radius:20px}.feature-card h3{font-size:27px;font-weight:950}.feature-card small{font-size:13px;font-weight:950}.feature-card .news-label{font-size:17.85px!important;font-weight:950!important;line-height:1.2;color:#e8792f!important}.feature-card p{font-size:12px}
        }
      `;
      document.head.appendChild(style);
      const panel = document.querySelector('#home .ai-panel');
      if (panel) panel.remove();

      const shareButton = document.querySelector('.share');
      const workspace = document.querySelector('.workspace');
      if (shareButton && workspace) {
        const shareLabel = isJapaneseHome ? 'このページを共有' : isKoreanHome ? 'Share this Korean learning page' : 'Share this TalkTag space';
        shareButton.className = 'floating-share';
        shareButton.type = 'button';
        shareButton.setAttribute('aria-label', shareLabel);
        shareButton.setAttribute('aria-expanded', 'false');
        shareButton.setAttribute('aria-haspopup', 'menu');
        shareButton.title = shareLabel;
        shareButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0-12-4 4m4-4 4 4M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

        const shareMenu = document.createElement('div');
        shareMenu.className = 'share-menu';
        shareMenu.hidden = true;
        shareMenu.setAttribute('role', 'menu');
        shareMenu.setAttribute('aria-label', 'Share options');
        shareMenu.innerHTML = `
          <button class="share-option" type="button" role="menuitem" data-share="copy"><span class="share-option-icon">⧉</span><span>Copy link</span></button>
          <button class="share-option" type="button" role="menuitem" data-share="kakao"><span class="share-option-icon">K</span><span>Kakao</span></button>
          <button class="share-option" type="button" role="menuitem" data-share="email"><span class="share-option-icon">@</span><span>Email</span></button>`;
        workspace.appendChild(shareMenu);

        const toast = document.createElement('div');
        toast.className = 'share-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        workspace.appendChild(toast);
        let toastTimer;
        const showToast = message => {
          toast.textContent = message;
          toast.classList.add('show');
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
        };
        const pageUrl = () => {
          const url = new URL(location.href);
          url.searchParams.delete('deploy');
          return url.href;
        };
        const copyLink = async () => {
          try {
            await navigator.clipboard.writeText(pageUrl());
          } catch {
            const input = document.createElement('textarea');
            input.value = pageUrl();
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
          }
        };
        const closeShareMenu = () => {
          shareMenu.hidden = true;
          shareButton.setAttribute('aria-expanded', 'false');
        };
        shareButton.addEventListener('click', event => {
          event.stopPropagation();
          const openLanguageMenu = document.querySelector('.language-menu:not([hidden])');
          if (openLanguageMenu) {
            openLanguageMenu.hidden = true;
            document.querySelector('.floating-language')?.setAttribute('aria-expanded', 'false');
          }
          shareMenu.hidden = !shareMenu.hidden;
          shareButton.setAttribute('aria-expanded', String(!shareMenu.hidden));
          if (!shareMenu.hidden) shareMenu.querySelector('.share-option')?.focus();
        });
        shareMenu.addEventListener('click', async event => {
          const option = event.target.closest('.share-option');
          if (!option) return;
          const action = option.dataset.share;
          closeShareMenu();
          if (action === 'copy') {
            await copyLink();
            showToast('Link copied');
          } else if (action === 'kakao') {
            if (navigator.share) {
              try {
                await navigator.share({ title: document.title, text: 'Discover this TalkTag learning space.', url: pageUrl() });
              } catch (error) {
                if (error?.name !== 'AbortError') showToast('Sharing was not completed');
              }
            } else {
              await copyLink();
              showToast('Link copied — paste it into KakaoTalk');
            }
          } else if (action === 'email') {
            const subject = encodeURIComponent(document.title);
            const body = encodeURIComponent(`I thought you might like this TalkTag learning space:\n\n${pageUrl()}`);
            location.href = `mailto:?subject=${subject}&body=${body}`;
          }
        });
        document.addEventListener('click', event => {
          if (!shareMenu.hidden && !shareMenu.contains(event.target) && event.target !== shareButton) closeShareMenu();
        });
        document.addEventListener('keydown', event => {
          if (event.key === 'Escape') {
            closeShareMenu();
            shareButton.focus();
          }
        });
      }

      const languageSwitch = document.querySelector('.language-switch');
      if (languageSwitch && workspace) {
        const languages = [
          { code: 'EN', name: 'English', href: 'index.html', active: !isJapaneseHome && !isKoreanHome, lang: 'en' },
          { code: 'JA', name: '日本語', href: 'japanese.html', active: isJapaneseHome, lang: 'ja' },
          { code: 'KO', name: '한국어', href: 'korean.html', active: isKoreanHome, lang: 'ko' }
        ];
        const currentLanguage = languages.find(language => language.active) || languages[0];
        const languageButton = document.createElement('button');
        languageButton.className = 'floating-language';
        languageButton.type = 'button';
        languageButton.setAttribute('aria-label', 'Choose language');
        languageButton.setAttribute('aria-expanded', 'false');
        languageButton.setAttribute('aria-haspopup', 'menu');
        languageButton.title = 'Choose language';
        languageButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 9h17M3.5 15h17M12 3c2.2 2.3 3.3 5.3 3.3 9S14.2 18.7 12 21M12 3C9.8 5.3 8.7 8.3 8.7 12S9.8 18.7 12 21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span class="language-current">${currentLanguage.code}</span>`;
        shareButton.before(languageButton);

        const languageMenu = document.createElement('nav');
        languageMenu.className = 'language-menu';
        languageMenu.hidden = true;
        languageMenu.setAttribute('role', 'menu');
        languageMenu.setAttribute('aria-label', 'Languages');
        languageMenu.innerHTML = languages.map(language => `
          <a class="language-option${language.active ? ' active' : ''}" role="menuitem" lang="${language.lang}" href="${language.href}"${language.active ? ' aria-current="page"' : ''}>
            <span class="language-code">${language.code}</span>
            <span class="language-name">${language.name}</span>
            <span class="language-check" aria-hidden="true">${language.active ? '✓' : ''}</span>
          </a>`).join('');
        workspace.appendChild(languageMenu);
        languageSwitch.remove();

        const closeLanguageMenu = () => {
          languageMenu.hidden = true;
          languageButton.setAttribute('aria-expanded', 'false');
        };
        languageButton.addEventListener('click', event => {
          event.stopPropagation();
          const openShareMenu = document.querySelector('.share-menu:not([hidden])');
          if (openShareMenu) {
            openShareMenu.hidden = true;
            document.querySelector('.floating-share')?.setAttribute('aria-expanded', 'false');
          }
          languageMenu.hidden = !languageMenu.hidden;
          languageButton.setAttribute('aria-expanded', String(!languageMenu.hidden));
          if (!languageMenu.hidden) languageMenu.querySelector('.language-option')?.focus();
        });
        document.addEventListener('click', event => {
          if (!languageMenu.hidden && !languageMenu.contains(event.target) && event.target !== languageButton) closeLanguageMenu();
        });
        document.addEventListener('keydown', event => {
          if (event.key === 'Escape' && !languageMenu.hidden) {
            closeLanguageMenu();
            languageButton.focus();
          }
        });
      }
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
