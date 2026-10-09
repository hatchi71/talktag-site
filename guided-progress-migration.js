(function(){
  "use strict";
  try {
    var marker="talktag-guided-short-cards-migrated:v1";
    if(localStorage.getItem(marker))return;
    var parts=window.TalkTagGuidedParts||[],completions=JSON.parse(localStorage.getItem("talktag-content-completions:v1")||"{}");
    Array.from(new Set(parts.map(function(p){return p.sourceId;}))).forEach(function(id){
      var group=parts.filter(function(p){return p.sourceId===id;}),old=JSON.parse(localStorage.getItem("talktag-audio:"+id)||"{}");
      var completion=completions["audio:"+id];
      group.forEach(function(p){
        var key="talktag-audio:"+p.id,state=p.id===id?Object.assign({},old):JSON.parse(localStorage.getItem(key)||"{}");
        if(Number(old.position)>0){var length=p.training.cues.at(-1).e;state.position=old.position>=p.sourceOffset&&old.position<p.sourceOffset+length?old.position-p.sourceOffset:0;}
        if(completion){completions["audio:"+p.id]=Object.assign({},completion);}
        if(old.completed)state.completed=true;
        localStorage.setItem(key,JSON.stringify(state));
      });
    });
    localStorage.setItem("talktag-content-completions:v1",JSON.stringify(completions));
    localStorage.setItem(marker,"true");
  }catch(error){/* Storage restrictions must never prevent playback. */}
})();
