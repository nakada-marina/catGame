/* The kitchen helper is a cat; existing staff saves retain their helper. */
(function () {
  'use strict';
  const poses = ['idle','cook','wash','greet'];
  const names = { idle:'idle',cook:'serve',wash:'clean',greet:'joy' };
  const load = window.AdoptArt.load.then(sprites => !!sprites.shiro);
  function frame(pose='idle') { return window.AdoptArt.frame('shiro', names[pose] || 'idle'); }
  function pose({busy,washing,cooking}) { return busy>0?washing?'wash':cooking?'cook':'greet':'idle'; }
  window.StaffArt={load,frame,pose,poses};
})();
