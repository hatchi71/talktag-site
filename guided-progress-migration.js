(function(){
  "use strict";
  try {
    var marker="talktag-guided-001002-replacement:v2-20261010";
    if(localStorage.getItem(marker))return;
    var completions=JSON.parse(localStorage.getItem("talktag-content-completions:v1")||"{}"),archive={audio:{},completions:{}};
    var replaced=/^guided-(?:a1|a2|b1|b2|c1|c2)-0[12](?:-part\d+)?$/;
    var keys=[];for(var i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
    keys.forEach(function(key){
      if(key.indexOf("talktag-audio:")===0&&replaced.test(key.slice(14)))archive.audio[key]=localStorage.getItem(key);
    });
    Object.keys(completions).forEach(function(key){if(key.indexOf("audio:")===0&&replaced.test(key.slice(6))){archive.completions[key]=completions[key];delete completions[key];}});
    // Save the old progress first; new scripts are different learning material.
    localStorage.setItem(marker+":archive",JSON.stringify(archive));
    Object.keys(archive.audio).forEach(function(key){localStorage.removeItem(key);});
    localStorage.setItem("talktag-content-completions:v1",JSON.stringify(completions));
    localStorage.setItem(marker,"true");
  }catch(error){/* Storage restrictions must never prevent playback. */}
})();
