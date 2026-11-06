/* Sound-first briefing on English and Korean GLR level-selection pages. */
(() => {
  if (document.body.dataset.audioType !== 'guided' || document.body.dataset.audioView !== 'levels') return;
  const english = window.TalkTagNative?.language === 'ko';
  const section = document.createElement('section');
  section.className = 'essay-practice glr-introduction';
  section.lang = english ? 'en' : 'ko';
  section.setAttribute('aria-labelledby', 'glrIntroductionTitle');
  section.innerHTML = english ? `
    <h2 id="glrIntroductionTitle">Turn the Korean you know into Korean you can say</h2>
    <p>You may understand a sentence when you read it but struggle to recognize it when you hear it—and find it even harder to say. <strong>Guided Listen &amp; Repeat helps you practice listening first, then saying what you hear.</strong> Listen to each sentence, then repeat it out loud during the quiet pause that follows.</p>
    <p>With each repetition, pay attention to sounds you may have missed: the rhythm, the emphasis, and the way words connect. Practice hearing expressions as groups of sounds and saying each sentence all the way through.</p>
    <h3>How to practice</h3>
    <ul>
      <li><strong>Start with the sound before analyzing the meaning.</strong> It’s okay if you don’t catch every word at first.</li>
      <li><strong>Listen, then speak during the quiet pause.</strong> Try to reproduce what you heard instead of reading it aloud.</li>
      <li><strong>Keep the script hidden while you get familiar with the sounds.</strong> Repeat the sentence from memory, then check the script and meaning once it feels more familiar.</li>
      <li><strong>Need more time to speak? Increase the speaking pause.</strong> The recording stays at its natural speed while you give yourself more time to practice.</li>
    </ul>
    <p>Take your time—you don’t have to get every sound right on your first try. Focus on the sounds first, then the emphasis and rhythm, and then the meaning.</p>
    <p><strong>Come back to the same card and practice it more than once.</strong> Each time, aim to speak a little more comfortably and rely a little less on the script.</p>` : `
    <h2 id="glrIntroductionTitle">아는 영어를, 입으로 꺼내는 연습</h2>
    <p>읽으면 뜻을 아는 문장도 소리로 들으면 잘 이해되지 않고, 직접 말하기는 더 어려울 때가 있습니다. <strong>Guided Listen &amp; Repeat는 먼저 귀로 듣고, 들은 소리를 입으로 따라 하는 연습</strong>입니다. 한 문장을 듣고, 이어지는 무음 구간 동안 직접 소리 내어 말해 보세요.</p>
    <p>반복하면서 처음에는 놓쳤던 강세와 리듬, 단어가 이어지는 소리에 귀를 기울여 보세요. 표현을 단어 하나씩이 아니라 소리의 덩어리로 익히고, 문장을 끝까지 말하는 연습을 쌓을 수 있습니다.</p>
    <h3>이렇게 연습해 보세요.</h3>
    <ul>
      <li><strong>뜻을 분석하기보다 소리부터 따라 하세요.</strong> 처음부터 모든 단어를 알아듣지 못해도 괜찮습니다.</li>
      <li><strong>듣고, 무음 구간 동안 소리 내어 말하세요.</strong> 눈으로 읽는 대신 귀로 들은 소리를 재현해 보세요.</li>
      <li><strong>소리에 익숙해질 때까지 스크립트를 숨겨 두세요.</strong> 들은 문장을 기억해서 말해 보고, 익숙해진 뒤 스크립트와 뜻을 확인하세요.</li>
      <li><strong>말할 시간이 부족하면 말하기 간격을 늘리세요.</strong> 음성은 자연스러운 속도 그대로 들으면서, 자신에게 필요한 연습 시간을 확보할 수 있습니다.</li>
    </ul>
    <p>완벽하게 따라 하려고 서두르지 않아도 됩니다. 먼저 소리에, 다음에는 강세와 리듬에, 그다음에는 의미에 집중해 보세요.</p>
    <p><strong>한 번으로 끝내지 말고, 같은 카드를 여러 번 연습해 보세요.</strong> 반복할 때마다 조금 더 편하게, 스크립트에 덜 의존하며 말하는 것을 목표로 해 보세요.</p>`;
  (document.querySelector('.audio-missions') || document.querySelector('.filter-bar'))?.after(section);
})();
