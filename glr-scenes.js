/* Published GLR 001–005. Scene art never changes lesson/audio state. */
(function () {
  'use strict';
  const scenes = {
    "guided-a1-01": "Getting out of bed and accepting a glass of water",
    "guided-a2-01": "Washing a shirt and hanging it up to dry",
    "guided-b1-01": "Planning a short dog walk before the rain",
    "guided-b2-01": "Politely asking a neighbor to turn the music down",
    "guided-c1-01": "Arranging a repair visit with a worker",
    "guided-c2-01": "A host taking a quiet break while a guest relaxes",
    "guided-a1-02": "Getting a raincoat and umbrella ready to go outside",
    "guided-a2-02": "Asking someone to take a photograph by a landmark",
    "guided-b1-02": "Checking a mixed-up takeaway bag at a cafe",
    "guided-b2-02": "Rescheduling an appointment at a service counter",
    "guided-c1-02": "Checking an unexpected subscription renewal charge",
    "guided-c2-02": "Trying to assemble a shelf before asking for help",
    'guided-a1-03': 'Getting ready by the door with a jacket, shoes and keys',
    'guided-a2-03': 'Asking which bus to take at a bus stop',
    'guided-b1-03': 'Choosing the bus when rain changes the plan',
    'guided-b2-03': 'Checking the total price and delivery at a shop',
    'guided-c1-03': 'Clarifying a proposal and checking its cost',
    'guided-c2-03': 'Giving an honest answer in a friendly conversation',
    'guided-a1-04': 'Finding black glasses on a table beside a lamp',
    'guided-a2-04': 'Collecting a parcel from a package counter',
    'guided-b1-04': 'Calling about a late train and a later meeting',
    'guided-b2-04': 'Asking a waiter for a quieter table',
    'guided-c1-04': 'Checking whether parking is included in a booking',
    'guided-c2-04': 'Discussing a delayed but well-completed repair',
    'guided-a1-05': 'Pouring a little coffee and waiting for it to cool',
    'guided-a2-05': 'Returning a shirt with a receipt at a shop',
    'guided-b1-05': 'Finding a quiet room for a call',
    'guided-b2-05': 'Politely declining extra work while busy',
    'guided-c1-05': 'Sharing a suggestion and listening to other opinions',
    'guided-c2-05': 'Asking for a ride without pressuring a friend'
  };
  function attach(title, id, player) {
    if (!title || !scenes[id] || title.parentElement.classList.contains('glr-scene-title')) return;
    const header = document.createElement('div');
    header.className = 'glr-scene-title' + (player ? ' glr-scene-player' : '');
    title.before(header);
    header.append(title);
    const image = document.createElement('img');
    image.className = 'glr-scene-image';
    image.src = 'assets/glr-scenes/' + id + '.webp';
    image.alt = scenes[id];
    image.width = 360; image.height = 240;
    image.loading = player ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => image.remove(), {once: true});
    header.append(image);
  }
  function refresh() {
    if (document.body.dataset.audioType !== 'guided') return;
    document.querySelectorAll('#lessonList .lesson-card').forEach(card => {
      const id = (card.dataset.completionId || '').replace(/^audio:/, '');
      attach(card.querySelector('.lesson-copy h2'), id, false);
    });
    attach(document.getElementById('lessonTitle'), new URLSearchParams(location.search).get('id'), true);
  }
  refresh();
  const list = document.getElementById('lessonList');
  if (list) new MutationObserver(refresh).observe(list, {childList: true});
  window.addEventListener('pageshow', refresh);
})();
