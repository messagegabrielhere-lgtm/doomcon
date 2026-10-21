// Shim: Talk to Tally now ships as an ES module (guide.mjs + tally-agent.mjs).
// Kept so any cached HTML that still loads /media/guide.js still gets the bot.
(function () {
  if (window.SirenGuide) return;
  var s = document.currentScript;
  var src = (s && s.src) ? s.src.replace(/guide\.js(\?.*)?$/, 'guide.mjs$1') : '/media/guide.mjs';
  var m = document.createElement('script');
  m.type = 'module';
  m.src = src;
  document.head.appendChild(m);
})();
