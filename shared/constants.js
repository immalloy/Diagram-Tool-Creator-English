// Shared constants for index.html (PC) and sp.html (Smartphone).
// Plain JS file — loaded via <script src> without Babel, injected on window.
(function(){
  const RELATIONS = [
    { id:'like',    label:'Love',     color:'#F56A92', stamp:'♡' },
    { id:'dislike', label:'Hate',     color:'#7a6a7a', stamp:'✕' },
    { id:'rival',   label:'Rival',    color:'#F77F6E', stamp:'⚡' },
    { id:'trust',   label:'Trust',    color:'#7DD8B4', stamp:'★' },
    { id:'crush',   label:'Interested',color:'#B7A0EE', stamp:'?' },
    { id:'custom',  label:'Custom',   color:'#8CCBF0', stamp:'' },
  ];

  const ARROW_STYLES = [
    { id:'oneway',  label:'One-way →' },
    { id:'twoway',  label:'Two-way ⇄' },
    { id:'heart',   label:'Heart ♡' },
    { id:'cracked', label:'Cracked' },
    { id:'dotted',  label:'Dotted' },
    { id:'wavy',    label:'Wavy' },
  ];

  const NODE_COLORS = [
    '#FFB3C7','#FFD3A8','#FFE8A3','#C7EFC0','#A8E0D1','#B5D9F2','#C9BEF5','#E8BCE8','#FFFFFF','#3a2c3a'
  ];

  const EMOJI_PRESETS = [
    '🐱','🐶','🐰','🦊','🐻','🐼','🐯','🦁','🐨','🐸','🐵','🦄',
    '🧑','👩','👨','👧','👦','🧒','👱','🧙','🧛','🧚','🥷','🧟',
    '🌸','🌟','🎀','🧃','🍩','🍣','🍙','🍡','☕','🎮','📚','⚽'
  ];

  const STAMPS = ['♡','♥','💕','💢','💔','★','✨','？','！','♪','⚡','🌸'];

  const BG_PATTERNS = [
    { id:'dots',   label:'Dots',     className:'bg-dots',   color:'#FFF7EC' },
    { id:'grid',   label:'Grid',    className:'bg-grid',   color:'#FFF7EC' },
    { id:'check',  label:'Checks',  className:'bg-check',  color:'#FFF7EC' },
    { id:'hearts', label:'Hearts',  className:'bg-hearts', color:'#FFF0F5' },
    { id:'plain',  label:'Solid',   className:'bg-plain',  color:'#FFF7EC' },
  ];

  const BG_COLORS = ['#FFF7EC','#FFE9F1','#E6F7EE','#EEE8FB','#E4F1FB','#FFF3D6','#F5F5F5'];

  // Compress uploaded images: resize to max 400x400 and output as JPEG 80% quality.
  // Returns a Promise that resolves to a data URL string.
  function compressImage(file, maxSize, quality) {
    maxSize = maxSize || 400;
    quality = quality || 0.8;
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function() {
        var img = new Image();
        img.onerror = reject;
        img.onload = function() {
          var w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else       { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  Object.assign(window, { RELATIONS, ARROW_STYLES, NODE_COLORS, EMOJI_PRESETS, STAMPS, BG_PATTERNS, BG_COLORS, compressImage });
})();