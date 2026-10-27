/* Published Essays & Articles covers. Keep artwork separate from audio and progress. */
(function () {
  'use strict';
  var scenes = {
    'aea-a1-001': ['en/001-a1', 'A person enjoys coffee beside an open window on a quiet morning.'],
    'aea-a2-001': ['en/001-a2', 'A friendly bakery owner speaks with a customer holding fresh bread.'],
    'aea-b1-001': ['en/001-b1', 'A commuter takes a peaceful walk home through a leafy park.'],
    'aea-b2-001': ['en/001-b2', 'A person rests on a riverside bench with nothing to accomplish.'],
    'aea-c1-001': ['en/001-c1', 'A person sets a phone aside and enjoys an uninterrupted moment by a window.'],
    'aea-c2-001': ['en/001-c2', 'A walker notices trees, flowers, and a neighbor along a familiar street.'],
    'aea-a1-002': ['en/002-a1', 'A neighbor calls Ben from home about his keys while he waits outside his apartment.', 'phone-call-v2'],
    'aea-a2-002': ['en/002-a2', 'Two shoppers cheerfully exchange grocery bags containing bananas and dog food.'],
    'aea-b1-002': ['en/002-b1', 'Two coworkers review the first page of a report together.'],
    'aea-b2-002': ['en/002-b2', 'A customer asks a repair technician about the total cost beside a washing machine.'],
    'aea-c1-002': ['en/002-c1', 'Coworkers discuss different assumptions in a focused planning meeting.'],
    'aea-c2-002': ['en/002-c2', 'Two men clarify expectations together at a kitchen table.', 'men-v2']
  };
  (window.TalkTagAudioLessons || []).forEach(function (lesson) {
    var scene = scenes[lesson.id];
    if (!scene || lesson.type !== 'plain' || lesson.available === false) return;
    lesson.artwork = '/assets/essay-scenes/' + scene[0] + '.jpg' + (scene[2] ? '?v=' + scene[2] : '');
    lesson.artworkAlt = scene[1];
  });
})();
