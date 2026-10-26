#!/usr/bin/env node
// Release gate for the six mandatory support languages and two separate passes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const oldRoot='/Users/eungjukim/Documents/Codex/talktag-site-glr-miniskit';
const transDir=path.join(root,'_local-audio/korean-glr-a2-c2-005-010/translations');
const mediaReport=path.join(root,'_local-audio/korean-glr-a2-c2-005-010/public-verification.json');
if(!fs.existsSync(mediaReport))throw Error('No complete public audio verification; cannot generate live translations');
const langs=['vi','ne','km','my','th','ja'];
// Targeted editorial repairs after the two AI passes. Keep these keyed to the
// source line so a regenerated module cannot silently restore mixed scripts.
const editorialCorrections={
  '005-C1-1':{ja:'棚の値札とレジでの金額が違っていますが、どちらが間違っているかはまだ確認できていません。'},
  '005-C2-1':{ja:'お客様は表示された金額を見て購入を決められたので、後から別の金額を聞けば、だまされたと感じられても無理はありません。'},
  '005-C2-2':{km:'ត្រូវហើយ។ បើយើងចាប់ផ្តើមដោយពន្យល់ថា វាមិនមែនជាចេតនា នោះអាចស្តាប់ទៅដូចជាយើងមើលស្រាលបទពិសោធន៍របស់គាត់។'},
  '005-C2-3':{km:'ជាដំបូង ខ្ញុំនឹងទទួលស្គាល់ថាយើងបានធ្វើឱ្យគាត់ច្រឡំ រួចពិនិត្យតម្លៃដែលត្រូវអនុវត្តពិតប្រាកដ និងមូលហេតុ ហើយប្រាប់គាត់។'},
  '006-A2-3':{ne:'म मारिया हुँ। म अलि चाँडै आएँ।',ja:'マリアです。少し早く来ました。'},
  '006-B1-4':{ja:'あ、別のお名前で登録されていたんですね。予約を確認できました。'},
  '006-B2-1':{ja:'3時に予約していますが、予定が重なってしまいました。今日、別の時間に変更できますか？'},
  '006-C2-1':{km:'អតិថិជនទទួលបានសារបញ្ជាក់រួចហើយ។ បើឥឡូវយើងប្រាប់ថាការកក់ជាន់គ្នា គាត់ប្រហែលជាមានអារម្មណ៍ថាខាតពេល។'},
  '006-C2-3':{th:'ฉันจะแจ้งเวลาที่สามารถให้บริการได้และระยะเวลาที่ต้องรอให้ชัดเจน แล้วให้ลูกค้าตัดสินใจค่ะ'},
  '006-C2-4':{km:'ធ្វើបែបនោះចុះ។ ពន្យល់ឱ្យខ្លី និងច្បាស់លាស់ រួចក្រោយមកយើងពិនិត្យកំណត់ត្រាការកក់ដោយឡែក។'},
  '007-B2-2':{ja:'痛み自体が強くなったというより、痛む回数が増えました。'},
  '008-B1-1':{ne:'बिहानदेखि मोबाइल डेटा चलेको थिएन, त्यसैले फोन रिस्टार्ट गरेर हेरेँ।',ja:'朝からモバイルデータ通信が使えないので、スマホを再起動してみました。'},
  '008-B2-2':{km:'មើលទៅបញ្ហានេះអាស្រ័យលើរបៀបភ្ជាប់អ៊ីនធឺណិត ជាជាងបញ្ហានៅក្នុងកម្មវិធីផ្ទាល់។ កម្មវិធីផ្សេងៗក៏មានបញ្ហាដូចគ្នាដែរឬទេ?'},
  '008-C1-1':{ja:'原因は分かりませんが、Wi-Fiを切ってモバイルデータ通信に切り替えるたびに同じエラーメッセージが出ます。'},
  '008-C1-3':{ja:'自宅付近でも職場付近でも起きました。画面のスクリーンショットも保存してあります。'},
  '008-C2-4':{km:'ល្អហើយ។ ធ្វើបែបនេះ យើងអាចប្រាប់ពីដំណើរការបានច្បាស់ ដោយមិនធ្វើឱ្យការសន្និដ្ឋានស្តាប់ទៅដូចជាការពិត។'},
  '009-B1-2':{ja:'はい、連絡先の電話番号欄が空欄になっています。'},
  '009-B1-4':{ja:'はい、ここにご記入いただければ、すぐに確認いたします。'},
  '009-B2-1':{ne:'मैले हेरेको सूचनामा अनलाइन आवेदन दिने भनिएको थियो, के यहाँ पनि दर्ता गर्न सकिन्छ?',ja:'私が見た案内にはオンライン申請と書いてありましたが、ここでも受け付けてもらえますか？'},
  '009-C1-2':{km:'សេចក្តីជូនដំណឹងនោះប្រើសម្រាប់ការជ្រើសរើសលើកមុន។ ព័ត៌មានសម្រាប់ការជ្រើសរើសលើកនេះមាននៅក្នុងសេចក្តីជូនដំណឹងផ្សេងទៀត។'},
  '010-B2-3':{km:'ខ្ញុំបានកុម្ម៉ង់ភេសជ្ជៈពីរកែវ ប៉ុន្តែវិក្កយបត្របង្ហាញថាបីកែវ។',ja:'飲み物は2杯注文したのですが、レシートには3杯と表示されています。'},
  '010-C1-1':{th:'ฉันตรวจสอบยอดเงินที่ต่างกันตามที่ลูกค้าแจ้งแล้วค่ะ แต่ยังไม่ทราบว่าทำไมถึงขึ้นยอดแบบนั้นค่ะ'},
  '010-C2-3':{ne:'म ग्राहकलाई फरक परेको कुरा जाँच्दैछौँ भनेर भन्छु, अनि रेकर्डमा भएको समयका आधारमा क्रम फेरि मिलाउँछु।',th:'ฉันจะแจ้งลูกค้าว่ากำลังตรวจสอบส่วนที่ไม่ตรงกันอยู่ แล้วจะเรียงลำดับเหตุการณ์ใหม่ตามเวลาที่บันทึกไว้ค่ะ'}
};
const forbidden={
  vi:/[\u0900-\u097f\u1780-\u17ff\u1000-\u109f\u0e00-\u0e7f\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\u0600-\u06ff]/u,
  ne:/[\u1780-\u17ff\u1000-\u109f\u0e00-\u0e7f\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\u0600-\u06ff]/u,
  km:/[\u0900-\u097f\u1000-\u109f\u0e00-\u0e7f\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\u0600-\u06ff]/u,
  my:/[\u0900-\u097f\u1780-\u17ff\u0e00-\u0e7f\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\u0600-\u06ff]/u,
  th:/[\u0900-\u097f\u1780-\u17ff\u1000-\u109f\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\u0600-\u06ff]/u,
  ja:/[\u0900-\u097f\u1780-\u17ff\u1000-\u109f\u0e00-\u0e7f\uac00-\ud7af\u0600-\u06ff]/u
};
const normalize=(value,lang)=>{
  let text=value.trim().replace(/ {2,}/g,' ').replace(/([、。？！]) +/g,'$1').replace(/ +([、。？！])/g,'$1').replace(/(\p{Nd}), +(\p{Nd}{3})/gu,'$1,$2');
  if(lang==='km')text=text.replace(/[\u0964\u104b]/g,'។');
  return text;
};
const oldContext={window:{TalkTagNativeCatalogs:{ko:[]}}};
vm.runInNewContext(fs.readFileSync(path.join(oldRoot,'native-guided-ko-004.js'),'utf8'),oldContext,{timeout:1000});
const oldCards=oldContext.window.TalkTagNativeCatalogs.ko.filter(card=>card.level!=='A1');
const newCards=JSON.parse(fs.readFileSync(path.join(root,'_local-audio/korean-glr-a2-c2-005-010/draft-catalog.json'),'utf8'));
const cards=[...oldCards,...newCards];
if(cards.length!==97)throw Error(`Expected 97 split cards, found ${cards.length}`);
const rows=new Map();
let corrected=0;
for(const episode of ['004','005','006','007','008','009','010']){
  const first=JSON.parse(fs.readFileSync(path.join(transDir,`${episode}.draft.json`),'utf8'));
  const second=JSON.parse(fs.readFileSync(path.join(transDir,`${episode}.reviewed.json`),'utf8'));
  if(first.length!==second.length||first.length!==(episode==='004'?22:20))throw Error(`Wrong translation count for ${episode}`);
  for(let i=0;i<second.length;i++){
    if(first[i].key!==second[i].key||rows.has(second[i].key))throw Error(`Key mismatch or duplication at ${episode} row ${i}`);
    const finalRow={key:second[i].key};
    for(const lang of langs){
      if(typeof first[i][lang]!=='string'||!first[i][lang].trim()||typeof second[i][lang]!=='string'||!second[i][lang].trim())throw Error(`Empty ${lang} at ${second[i].key}`);
      if(first[i][lang].trim()!==second[i][lang].trim())corrected++;
      finalRow[lang]=normalize(editorialCorrections[second[i].key]?.[lang]??second[i][lang],lang);
      if(forbidden[lang].test(finalRow[lang]))throw Error(`Mixed writing systems in ${lang} at ${second[i].key}`);
      if(lang==='ja'&&/[A-Za-z]{4,}/.test(finalRow[lang]))throw Error(`Untranslated English word in Japanese at ${second[i].key}`);
    }
    rows.set(second[i].key,finalRow);
  }
}
if(rows.size!==142)throw Error(`Expected 142 unique Korean lines, got ${rows.size}`);
const registry={};
for(const card of cards){
  const episode=card.episode;
  const source=card.expressions;
  if(!source?.length||!Number.isInteger(card.sentenceStart))throw Error(`Missing source position: ${card.id}`);
  const selected=source.map((line,i)=>{
    const key=`${episode}-${card.level}-${card.sentenceStart+i}`;
    const row=rows.get(key);
    if(!row)throw Error(`Missing six-language meaning for ${card.id}/${key}`);
    return row;
  });
  registry[card.id]={
    sourceHash:crypto.createHash('sha256').update(source.join('\n')).digest('hex'),
    source,
    translations:Object.fromEntries(langs.map(lang=>[lang,selected.map(row=>row[lang])])),
    review:Object.fromEntries(langs.map(lang=>[lang,{status:'ai-reviewed',reviewedAt:'2026-10-26',passes:2}]))
  };
}
if(Object.keys(registry).length!==97)throw Error('Translation card coverage mismatch');
fs.writeFileSync(path.join(root,'korean-support-glr-a2-c2-004-010.js'),
  '/* Korean GLR A2–C2 004–010: two AI-assisted meaning checks; native review pending. */\n'+
  '(function(){"use strict";const registry=window.TalkTagKoreanTranslations||=Object.create(null);'+
  'Object.assign(registry,'+JSON.stringify(registry)+');})();\n');
console.log(`Validated two full six-language passes for 142 source lines and 97 split cards; ${corrected} corrections in second pass.`);
