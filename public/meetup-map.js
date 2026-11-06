/* Load the provider only after the visitor opens the map. Its official loader
   uses document.write, so keep it inside a separately parsed iframe document. */
document.querySelectorAll('.tt-meetup-map').forEach(panel=>{
 panel.addEventListener('toggle',()=>{
  const frame=panel.querySelector('iframe[data-map-src]');
  if(panel.open&&frame&&!frame.hasAttribute('src'))frame.src=frame.dataset.mapSrc;
 });
});
