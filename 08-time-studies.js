function tsOwned(id){return Array.isArray(state.timeStudies)&&state.timeStudies.includes(Number(id));}
function tsSpent(){return timeStudyData.reduce((sum,s)=>sum+(tsOwned(s[0])?s[1]:0),0);}
function tsTotal(){return Math.max(0,Math.floor(Number(state.timeTheorems)||0));}
function tsCanBuy(study){
 const [id,cost,req,,kind]=study;
 if(tsOwned(id)||tsTotal()<cost||(req.length&&!req.some(r=>tsOwned(r))))return false;
 if(req.length && !req.some(r=>tsOwned(r)))return false;
 if(kind==='ec5' && !(state.eternityChallengeCompletions?.[5]>0 || state.completedEternityChallenges?.includes?.(5)))return false;
 const dimensionRows=[[71,72,73],[81,82,83],[91,92,93],[101,102,103]];
 if(!tsOwned(201)){
  const firstRow=dimensionRows[0];
  const chosen=firstRow.find(x=>tsOwned(x));
  for(const row of dimensionRows){if(row.includes(id)&&chosen&&row.indexOf(id)!==firstRow.indexOf(chosen))return false;}
  if(dimensionRows.some(row=>row.includes(id))&&chosen===undefined&&id!==71&&id!==72&&id!==73)return false;
  if(firstRow.includes(id)&&firstRow.some(x=>tsOwned(x)&&x!==id))return false;
 }
 const paceRows=[[121,122,123],[131,132,133],[141,142,143]];
 const chosenPace=paceRows[0].find(x=>tsOwned(x));
 for(const row of paceRows){if(row.includes(id)&&chosenPace&&row.indexOf(id)!==paceRows[0].indexOf(chosenPace))return false;}
 if(paceRows[0].includes(id)&&paceRows[0].some(x=>tsOwned(x)&&x!==id))return false;
 const splitPairs=[[221,222],[223,224],[225,226],[227,228]];
 for(const pair of splitPairs){if(pair.includes(id)&&tsOwned(pair.find(x=>x!==id)))return false;}
 return true;
}
function tsFormatCost(n){return Number(n).toLocaleString('en-US');}
function tsPurchase(id){
 const s=tsById.get(Number(id));if(!s||!tsCanBuy(s))return;
 state.timeTheorems=tsTotal()-s[1];
 state.timeStudies=Array.isArray(state.timeStudies)?state.timeStudies:[];
 state.timeStudies.push(s[0]);
 save();switchScreen('eternity');
}
function tsBuyTheorem(kind){
 const current=tsTotal();
 let cost;
 if(kind==='am'){
  // Official escalating AM cost: e20000, then ×e20000 for every purchase.
  cost=BigNumber.fromLog10(20000*(current+1));
  const am=BigNumber.from(state.matterBN || matterBigNumber());
  if(am.compare(cost)<0)return;
  setMatterBigNumber(BigNumber.from(am).subtract(BigNumber.from(cost)));
 }else if(kind==='ip'){
  cost=current===0?BigNumber.from(1):BigNumber.fromLog10(100*current);
  if(!hasIPAtLeast(cost))return;
  spendIPBigNumber(cost);
 }else{
  cost=BigNumber.from(2).power(current);
  if(getEPBigNumber().compare(cost)<0)return;
  setEPBigNumber(getEPBigNumber().subtract(cost));
 }
 state.timeTheorems=current+1;save();switchScreen('eternity');
}
function tsRespec(){
 state.timeTheorems=tsTotal()+tsSpent();
 state.timeStudies=[];
 state.timeStudyRespec=false;
 save();switchScreen('eternity');
}
let timeStudyZoom=1;
function timeStudyView(){
 const rows=[
  [[11,3]],
  [[21,2],[22,4]],
  [[31,2],[32,3],[33,4]],
  [[41,2],[42,3]],
  [[51,3]],
  [[61,3],[62,4]],
  [[71,2],[72,3],[73,4]],
  [[81,2],[82,3],[83,4]],
  [[91,2],[92,3],[93,4]],
  [[101,2],[102,3],[103,4]],
  [[111,3]],
  [[121,2],[122,3],[123,4]],
  [[131,2],[132,3],[133,4]],
  [[141,2],[142,3],[143,4]],
  [[151,3]],
  [[161,3],[162,4]],
  [[171,3]],
  [[181,3]],
  [[191,2],[192,3],[193,4]],
  [[201,3]],
  [[211,1],[212,2],[213,4],[214,5]],
  [[221,1],[222,2],[223,3],[224,4],[225,5],[226,6],[227,7],[228,8]],
  [[231,1],[232,2],[233,3],[234,4]]
 ];
 // ECノードは本家Wiki記載の前提Studyの直下に置く。
 const ecAfter = {
  42: [{id:5, col:2, study:42}],
  111: [{id:7, col:2, study:111}],
  121: [{id:6, col:1, study:121}],
  123: [{id:8, col:3, study:123}],
  143: [{id:4, col:2, study:143}],
  151: [{id:9, col:2, study:151}],
  171: [{id:1, col:1, study:171},{id:2, col:2, study:171},{id:3, col:3, study:171}],
  181: [{id:10, col:2, study:181}],
  231: [{id:11, col:1, study:231}],
  233: [{id:12, col:2, study:233}]
 };
 const displayRows=[];
 for(let ri=0;ri<rows.length;ri++){
  displayRows.push({type:'study', sourceIndex:ri, studies:rows[ri]});
  const ids=rows[ri].map(p=>p[0]);
  const ec=ids.flatMap(id=>ecAfter[id]||[]);
  if(ec.length)displayRows.push({type:'ec', nodes:ec});
 }
 const rowIndex=new Map();
 displayRows.forEach((dr,di)=>{
  if(dr.type!=='study')return;
  dr.studies.forEach(pair=>rowIndex.set(pair[0],{row:di,col:pair[1]-1,cols:pair.some?.(p=>p[0]>=221&&p[0]<=228)?8:(dr.studies.some(p=>p[0]>=221&&p[0]<=228)?8:6)}));
 });
 const rowHeight=104;
 // SVG coordinates match the fixed row grid. Start/end at the visible button edges,
 // not the row boundaries, so connectors remain attached at every zoom level.
 const nodeCenterX = node => (node.col + 0.5) * (100 / node.cols);
 const rowTopY = row => row * rowHeight;
 const nodeBottomY = row => rowTopY(row) + 78;
 const nodeTopY = row => rowTopY(row) + 8;
 const connectorPath = (x1,y1,x2,y2) => {
  if (Math.abs(x1-x2) < 0.01) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const midY = y1 + Math.max(8, (y2-y1)*0.5);
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
 };
 const links=[];
 for(const study of timeStudyData){
  const target=rowIndex.get(study[0]);if(!target)continue;
  for(const req of study[2]){
   const source=rowIndex.get(req);if(!source||source.row>=target.row)continue;
   const x1=nodeCenterX(source),x2=nodeCenterX(target);
   const y1=nodeBottomY(source.row),y2=nodeTopY(target.row);
   const active=tsOwned(study[0])&&tsOwned(req);
   links.push(`<path class="ts-link ${active?'ts-link-active':''}" d="${connectorPath(x1,y1,x2,y2)}"/>`);
  }
 }
 const ecLinks=[];
 displayRows.forEach((dr,di)=>{
  if(dr.type!=='ec')return;
  for(const ec of dr.nodes){
   const source=rowIndex.get(ec.study);if(!source)continue;
   const x1=nodeCenterX(source),x2=(ec.col+0.5)*(100/6);
   const y1=nodeBottomY(source.row),y2=rowTopY(di)+8;
   ecLinks.push(`<path class="ts-link ts-ec-link" d="${connectorPath(x1,y1,x2,y2)}"/>`);
  }
 });
 const dilationDefs=[
  ['d1','Unlock Time Dilation',5000,'EC11×5・EC12×5、合計12,900 TTが必要'],
  ['d2','5th Time Dimensionを解放',1000000,'d1が必要'],
  ['d3','6th Time Dimensionを解放',10000000,'d2が必要'],
  ['d4','7th Time Dimensionを解放',100000000,'d3が必要'],
  ['d5','8th Time Dimensionを解放',1000000000,'d4が必要'],
  ['d6','Dilated TimeからTime Theoremを獲得',10000000000,'d5が必要']
 ];
 const dilationOwned=id=>Array.isArray(state.timeDilationStudies)&&state.timeDilationStudies.includes(id);
 const dilationNodes=`<div class="ts-tree-row ts-dilation-row" data-dilation-row>${dilationDefs.map(([id,label,cost,req],i)=>{
  const owned=dilationOwned(id),prev=i===0?null:dilationDefs[i-1][0];
  const ready=i===0?(state.timeStudyRespec!==true&&(tsOwned(231)||tsOwned(232))&&(tsOwned(233)||tsOwned(234))&&(state.eternityChallengeCompletions?.[11]||0)>=5&&(state.eternityChallengeCompletions?.[12]||0)>=5&&tsTotal()>=12900):dilationOwned(prev)&&tsTotal()>=cost;
  return `<div class="ts-cell"><button type="button" class="ts-dilation-node ${owned?'purchased':ready?'available':'blocked'}" data-dilation-study="${id}" ${owned||!ready?'disabled':''} title="${req}"><strong>${id}</strong><span>${label}</span><small>${cost.toLocaleString('en-US')} TT</small></button></div>`;
 }).join('')}</div>`;
 const totalRows=displayRows.length+1;
 // EC11 and EC12 both feed the Time Dilation unlock row; keep the two routes
 // separate and terminate them at the top edge of the corresponding controls.
 const ec11row=displayRows.findIndex(r=>r.type==='ec'&&r.nodes.some(n=>n.id===11));
 const ec12row=displayRows.findIndex(r=>r.type==='ec'&&r.nodes.some(n=>n.id===12));
 const dilationY=rowTopY(displayRows.length)+8;
 const dilationLinks=[
  ec11row>=0?`<path class="ts-link ts-ec-link" d="${connectorPath(25,rowTopY(ec11row)+72,25,dilationY)}"/>`:'',
  ec12row>=0?`<path class="ts-link ts-ec-link" d="${connectorPath(41.666,rowTopY(ec12row)+72,41.666,dilationY)}"/>`:''
 ].join('');
 const connectorSvg=`<svg class="ts-connectors" viewBox="0 0 100 ${totalRows*104}" preserveAspectRatio="none" aria-hidden="true">${links.join('')}${ecLinks.join('')}${dilationLinks}</svg>`;
 const nodes=displayRows.map((dr,di)=>{
  if(dr.type==='ec'){
   return `<div class="ts-tree-row ts-ec-inline-row" data-ec-row="${dr.nodes.map(n=>n.id).join('-')}">${Array.from({length:6},(_,i)=>{
    const ec=dr.nodes.find(n=>n.col===i);
    return ec?`<div class="ts-cell"><div class="ts-ec-node" title="EC${ec.id}：前提Study ${ec.study}"><strong>EC${ec.id}</strong><span>Eternity Challenge</span></div></div>`:`<div class="ts-cell empty"></div>`;
   }).join('')}</div>`;
  }
  const row=dr.studies;
  const wide=row.some(p=>p[0]>=221&&p[0]<=228);
  return `<div class="ts-tree-row ${wide?'ts-row-wide':''}" data-ts-row="${dr.sourceIndex}">${Array.from({length:wide?8:6},(_,i)=>{
   const pair=row.find(p=>p[1]===i+1);
   if(!pair)return `<div class="ts-cell empty"></div>`;
   const id=pair[0],study=tsById.get(id);if(!study)return `<div class="ts-cell empty"></div>`;
   const owned=tsOwned(id),can=tsCanBuy(study);
   return `<div class="ts-cell"><button type="button" class="ts-study ${owned?'purchased':can?'available':'blocked'}" data-ts-study="${id}" ${owned||!can?'disabled':''} title="${study[3]}"><strong>${id}</strong><span>${study[3]}</span><small>${study[1]} TT</small></button></div>`;
  }).join('')}</div>`;
 }).join('');
 const ecNodes='';
 return `<section class="ts-screen"><div class="ts-frame"><h2>Time Studies</h2>
 <div class="ts-tree-toolbar"><button type="button" data-ts-respec ${tsSpent()===0?'disabled':''}>Respec time studies</button><button type="button" data-ts-buy-all>Buy all studies</button></div>
 <div class="ts-tt-summary">You have <strong>${tsTotal()}</strong> Time Theorems.<div class="ts-tt-purchased">(Purchased ${tsTotal()} total)</div></div>
 <button type="button" class="ts-tt-max" data-ts-buy-tt-max>Buy max Theorems</button>
 <div class="ts-resource-grid ts-tt-grid">
   <button type="button" class="ts-resource ts-tt-button" data-ts-buy-tt="am" ${matterBigNumber().compare(BigNumber.fromLog10(20000*(tsTotal()+1)))<0?'disabled':''}><span>Buy Time Theorems</span><strong>Cost: ${BigNumber.fromLog10(20000*(tsTotal()+1)).toDisplayString(3)}</strong></button>
   <button type="button" class="ts-resource ts-tt-button" data-ts-buy-tt="ip" ${!hasIPAtLeast(tsTotal()===0?BigNumber.from(1):BigNumber.fromLog10(100*tsTotal()))?'disabled':''}><span>Buy Time Theorems</span><strong>Cost: ${(tsTotal()===0?BigNumber.from(1):BigNumber.fromLog10(100*tsTotal())).toDisplayString(3)} IP</strong></button>
   <button type="button" class="ts-resource ts-tt-button" data-ts-buy-tt="ep" ${getEPBigNumber().compare(BigNumber.from(2).power(tsTotal()))<0?'disabled':''}><span>Buy Time Theorems</span><strong>Cost: ${BigNumber.from(2).power(tsTotal()).toDisplayString(3)} EP</strong></button>
 </div></div><div class="ts-zoom-controls"><button type="button" data-ts-zoom="out" aria-label="縮小">−</button><span data-ts-zoom-label>100%</span><button type="button" data-ts-zoom="in" aria-label="拡大">＋</button><button type="button" data-ts-zoom="reset">リセット</button><small>ピンチ操作でも拡大縮小できます</small></div><div class="ts-tree-wrap"><div class="ts-tree" style="zoom:${timeStudyZoom}">${connectorSvg}${nodes}${dilationNodes}</div></div></div></section>`;
}
const tabViews={eternity:()=>timeStudyView(),autobuyers:()=>`<h2>Autobuyers</h2><button type="button" id="abToggleAll" style="margin:0 0 12px">${state.autobuyers.dims.every(Boolean)&&state.autobuyers.tickspeed&&state.autobuyers.boost&&state.autobuyers.galaxy&&state.autobuyers.crunch&&(!state.completedInfinityChallenges.includes(2)||state.autobuyers.sacrifice)?'全AutobuyerをOFF':'全AutobuyerをON'}</button><div class="ab-grid">${names.map((n,i)=>`<div class="ab-card"><div><strong>${n}</strong><small>${!dimAutobuyerUnlocked(i)?`ロック中：反物質 ${fmtMatter(Math.pow(10,40+i*10))} が必要`:`解禁済み · 間隔：${autobuyerInterval()[i].toFixed(2)}秒 · Bulk Buy：×${dimAutobuyerBulk(i)===Infinity?'∞':dimAutobuyerBulk(i)}`}</small><button type="button" class="ab-mode-button" data-ab-dim-mode-toggle="${i}">購入モード：${(state.autobuyers.dimModes?.[i]||state.autobuyers.dimMode||'10')==='10'?'次の10個購入ボーナスまで':'1個ずつ'} ↻</button>${dimBulkLevels()[i]>=9?'':`<button type="button" data-ab-upgrade="${i}" ${!autobuyerUpgradeUnlocked(i)|| (autobuyerInterval()[i]>0.1000001?!hasIPAtLeast(autobuyerIntervalUpgradeCost(i)):(!dimAutobuyerUnlocked(i)||!hasIPAtLeast(dimBulkUpgradeCost(i))))?'disabled':''}>${!autobuyerUpgradeUnlocked(i)?'ロック中':autobuyerInterval()[i]>0.1000001?`間隔短縮（IP ${fmt(autobuyerIntervalUpgradeCost(i))}）`:`Bulk ×${dimAutobuyerBulk(i)} → ×${dimAutobuyerBulk(i)*2}（IP ${fmt(dimBulkUpgradeCost(i))}）`}</button>`}</div><label class="ab-toggle"><input type="checkbox" data-ab-dim="${i}" ${state.autobuyers.dims[i]?'checked':''} ${!dimAutobuyerUnlocked(i)&&!state.autobuyers.dims[i]?'disabled':''}> ON</label></div>`).join('')}<div class="ab-card"><div><strong>Tickspeed</strong><small>${!tickspeedAutobuyerUnlocked()?`ロック中：反物質 1e140 が必要`:`解禁済み · 間隔：${autobuyerInterval()[8].toFixed(2)}秒 · 購入モード：${challengeCompleted(9)&&state.autobuyers.tickspeedMode==='max'?'最大まで購入':'1個ずつ'}`}</small>${challengeCompleted(9)?`<button type="button" class="ab-mode-button" data-ab-tickspeed-mode-toggle>購入モード：${state.autobuyers.tickspeedMode==='max'?'最大まで購入':'1個ずつ'} ↻</button>`:''}${autobuyerInterval()[8]<=0.1000001?'':`<button type="button" data-ab-upgrade="8" ${!autobuyerUpgradeUnlocked(8)||!hasIPAtLeast(autobuyerIntervalUpgradeCost(8))?'disabled':''}>${!autobuyerUpgradeUnlocked(8)?'NC9クリアで解放':`間隔短縮（IP ${fmt(autobuyerIntervalUpgradeCost(8))}）`}</button>`}</div><label class="ab-toggle"><input type="checkbox" data-ab="tickspeed" ${state.autobuyers.tickspeed?'checked':''} ${!tickspeedAutobuyerUnlocked()&&!state.autobuyers.tickspeed?'disabled':''}> ON</label></div><div class="ab-card"><div><strong>Dimension Boost</strong><small>${challengeCompleted(10)?`解放済み · 間隔：${autobuyerInterval()[9].toFixed(2)}秒`:'NC10クリアで解放'}</small><label style="display:flex;align-items:center;gap:6px;margin-top:7px;font-size:11px">購入上限 <input type="text" inputmode="numeric" autocomplete="off" id="abBoostLimit" placeholder="無制限" value="${state.autobuyers.boostLimit??''}" style="width:90px;max-width:100%;background:#292932;color:#fff;border:1px solid #555;border-radius:3px;padding:5px" ${!challengeCompleted(10)?'disabled':''}></label>${autobuyerInterval()[9]<=0.1000001?'':`<button type="button" data-ab-upgrade="9" ${!autobuyerUpgradeUnlocked(9)||!hasIPAtLeast(autobuyerIntervalUpgradeCost(9))||autobuyerInterval()[9]<=0.1?'disabled':''}>${!autobuyerUpgradeUnlocked(9)?'NC10クリアで解放':`間隔短縮（IP ${fmt(autobuyerIntervalUpgradeCost(9))}）`}</button>`}</div><label class="ab-toggle"><input type="checkbox" data-ab="boost" ${state.autobuyers.boost?'checked':''} ${!challengeCompleted(10)&&!state.autobuyers.boost?'disabled':''}> ON</label></div><div class="ab-card"><div><strong>Antimatter Galaxy</strong><small>${challengeCompleted(11)?`解放済み · 間隔：${autobuyerInterval()[10].toFixed(2)}秒`:'NC11クリアで解放'}</small><label style="display:flex;align-items:center;gap:6px;margin-top:7px;font-size:11px">購入上限 <input type="text" inputmode="numeric" autocomplete="off" id="abGalaxyLimit" placeholder="無制限" value="${state.autobuyers.galaxyLimit??''}" style="width:90px;max-width:100%;background:#292932;color:#fff;border:1px solid #555;border-radius:3px;padding:5px" ${!challengeCompleted(11)?'disabled':''}></label>${autobuyerInterval()[10]<=0.1000001?'':`<button type="button" data-ab-upgrade="10" ${!autobuyerUpgradeUnlocked(10)||!hasIPAtLeast(autobuyerIntervalUpgradeCost(10))||autobuyerInterval()[10]<=0.1?'disabled':''}>${!autobuyerUpgradeUnlocked(10)?'NC11クリアで解放':`間隔短縮（IP ${fmt(autobuyerIntervalUpgradeCost(10))}）`}</button>`}</div><label class="ab-toggle"><input type="checkbox" data-ab="galaxy" ${state.autobuyers.galaxy?'checked':''} ${!challengeCompleted(11)&&!state.autobuyers.galaxy?'disabled':''}> ON</label></div><div class="ab-card"><div><strong>Big Crunch</strong><small>${challengeCompleted(12)?`解放済み · 間隔：${autobuyerInterval()[11].toFixed(2)}秒`:'NC12クリアで解放'}</small>${state.breakInfinityActive?`<label style="display:flex;align-items:center;gap:6px;margin-top:7px;font-size:11px">自動Crunch目標IP <input type="text" inputmode="text" autocomplete="off" spellcheck="false" autocapitalize="off" id="abCrunchIPTarget" placeholder="空欄で無効" value="${state.autobuyers.crunchIPTarget??''}" style="width:120px;max-width:100%;background:#292932;color:#fff;border:1px solid #555;border-radius:3px;padding:5px"></label><small>獲得予定IPが目標以上でCrunch</small>`:''}${autobuyerInterval()[11]<=0.1000001?'':`<button type="button" data-ab-upgrade="11" ${!autobuyerUpgradeUnlocked(11)||!hasIPAtLeast(autobuyerIntervalUpgradeCost(11))||autobuyerInterval()[11]<=0.1?'disabled':''}>${!autobuyerUpgradeUnlocked(11)?'NC12クリアで解放':`間隔短縮（IP ${fmt(autobuyerIntervalUpgradeCost(11))}）`}</button>`}</div><label class="ab-toggle"><input type="checkbox" data-ab="crunch" ${state.autobuyers.crunch?'checked':''} ${!challengeCompleted(12)&&!state.autobuyers.crunch?'disabled':''}> ON</label></div>${state.completedInfinityChallenges.includes(2)?`<div class="ab-card"><div><strong>自動Sacrifice</strong><small>倍率増加が設定値以上になったら自動Sacrifice</small><label style="display:flex;align-items:center;gap:6px;margin-top:7px;font-size:11px">Sacrifice倍率<input type="text" inputmode="decimal" autocomplete="off" id="abSacrificeValue" value="${Number.isFinite(Number(state.autobuyers.sacrificeValue))&&Number(state.autobuyers.sacrificeValue)>1?state.autobuyers.sacrificeValue:2}" style="width:90px;max-width:100%;background:#292932;color:#fff;border:1px solid #555;border-radius:3px;padding:5px"></label></div><label class="ab-toggle"><input type="checkbox" data-ab="sacrifice" ${state.autobuyers.sacrifice?'checked':''}> ON</label></div>`:''}</div>`,challenges:()=>challengeSubpage==='infinity'?infinityChallengeView():`<h2>Challenges</h2><p style="color:var(--muted);font-size:12px;margin:0">Normal Challenges — 目標：1.8e308に到達</p>${state.activeChallenge?`<div class="challenge-description"><strong>挑戦中：NC${state.activeChallenge} — ${challengeData[state.activeChallenge-1].name}</strong><p>${challengeData[state.activeChallenge-1].desc}</p><p>現在の反物質：${matterBigNumber().toDisplayString(3)} / 目標：1.8e308</p>${state.activeChallenge===11?`<p>Normal Matter：${fmtMatter(state.challenge11Matter)}</p>`:''}<div class="challenge-controls">${atInfinity()?`<button type="button" data-challenge-complete>Infinity到達・クリア</button>`:''}<button type="button" data-challenge-exit>中断して通常プレイへ戻る</button></div></div>`:''}<div class="challenge-grid">${challengeData.map(c=>{const done=challengeCompleted(c.id),active=challengeActive(c.id),unlocked=challengeUnlocked(c.id),canStart=unlocked&&!active&&c.id!==1;return `<div class="challenge-card ${done?'completed':''} ${active?'active':''}"><strong>NC${c.id}: ${c.name}</strong><p>${c.desc}</p><p><small>報酬：${c.reward}</small></p>${state.challengeTimes[c.id]>0?`<p><small>最速記録：${formatPlayTime(state.challengeTimes[c.id])}</small></p>`:''}<span class="challenge-status">${challengeCardStatus(c.id)}</span>${active?`<button type="button" data-challenge-exit>中断</button>`:canStart?`<button type="button" data-challenge-start="${c.id}">開始</button>`:c.id===1?`<button type="button" disabled>初回Infinity済み</button>`:`<button type="button" disabled>${done?'クリア済み':unlocked?'挑戦不可':'16 Infinityで解放'}</button>`}</div>`}).join('')}</div>`,infinity:()=>infinitySubpage==='break'?breakInfinityView():infinitySubpage==='replicanti'?replicantiView():infinityUpgradeView(),achievements:()=>`<h2>実績</h2><p>実績による生産倍率：×${achievementMultiplier().toFixed(3)}</p><div class="achievement-grid">${[
{id:11,name:'You gotta start somewhere',desc:'第1次元を購入する。'},{id:12,name:'100 antimatter is a lot',desc:'第2次元を購入する。'},{id:13,name:'Half life 3 CONFIRMED',desc:'第3次元を購入する。'},{id:14,name:'L4D: Left 4 Dimensions',desc:'第4次元を購入する。'},{id:15,name:'5 Dimension Antimatter Punch',desc:'第5次元を購入する。'},{id:16,name:"We couldn't afford 9",desc:'第6次元を購入する。'},{id:17,name:'Not a luck related achievement',desc:'第7次元を購入する。'},{id:18,name:'90 degrees to infinity',desc:'第8次元を購入する。'},{id:21,name:'To Infinity!',desc:'Big Crunchを実行する。報酬：Infinity後、反物質100から開始。'},{id:22,name:'Boosting the boost',desc:'Dimension Boostを初めて購入する。'},{id:23,name:'The 9th Dimension is a lie',desc:'第8次元をちょうど99個所持する。報酬：第8次元が10%強化される。'},{id:24,name:'Antimatter Apocalypse',desc:'反物質を1e80以上にする。'},{id:25,name:'Boosting to the max',desc:'Dimension Boostを10回購入する。'},{id:26,name:'You got past The Big Wall',desc:'Antimatter Galaxyを購入する。'},{id:27,name:'Double Galaxy',desc:'Antimatter Galaxyを2個購入する。'},{id:28,name:"There's no point in doing that...",desc:'第1次元を1e150個以上所持した状態で、さらに1個購入する。報酬：第1次元が10%強化される。'},
{id:31,name:'I forgot to nerf that',desc:'いずれかのDimension倍率を1e31以上にする。報酬：第1次元が5%強化される。'},{id:32,name:'The Gods are pleased',desc:'Challenge 8以外でSacrifice倍率を600超にする。報酬：Sacrificeが強化される。'},{id:33,name:"That's a lot of infinites",desc:'Infinityを10回達成する。'},{id:34,name:"You didn't need it anyway",desc:'第8次元を所持せずInfinityする。報酬：第1〜第7次元が2%強化される。'},{id:35,name:"Don't you dare sleep",desc:'6時間を超えてオフラインになる。'},{id:36,name:'Claustrophobic',desc:'Galaxyをちょうど1個所持してInfinityする。報酬：Tickspeedが2%強化される。'},{id:37,name:"That's FAST!",desc:'2時間以内にInfinityする。報酬：Infinity後、反物質5000から開始。'},{id:38,name:"I don't believe in Gods",desc:'SacrificeせずにGalaxyを購入する。'},
{id:41,name:'No DLC required',desc:'Infinity Upgradeを16個購入する。'},{id:42,name:'Super Sanic',desc:'反物質が1e63以上のとき、生産量/秒を反物質より大きくする。'},{id:43,name:'How the antitables have turned..',desc:'第8次元の倍率を最大、第7次元を2番目に高くする順序にする。報酬：次元ごとに1〜8%強化。'},{id:44,name:'Over in 30 Seconds',desc:'生産量/秒が反物質を30秒間連続で上回る。'},{id:45,name:'Faster than a potato',desc:'Tickspeed倍率を1e29以上にする。報酬：Tickspeedが2%強化される。'},{id:46,name:'Multidimensional',desc:'第1〜第7次元をそれぞれ1e12以上にする。'},{id:47,name:'Daredevil',desc:'Normal Challengeを3つクリアする。'},{id:48,name:'Antichallenged',desc:'Normal Challengeを12個すべてクリアする。報酬：全Dimensionが10%強化される。'},
{id:51,name:'Limit Break',desc:'Break Infinityを解禁する。'},{id:52,name:'Age of Automation',desc:'第1～第8次元とTickspeedのAutobuyer間隔を最大まで強化する。'},{id:53,name:'Definitely not worth it',desc:'全Autobuyerの購入間隔を最大まで強化する。'},{id:54,name:'That’s FASTER!',desc:'10分以内にInfinityする。報酬：Infinity後、反物質500,000から開始。'},{id:55,name:'Forever isn’t that long',desc:'1分以内にInfinityする。報酬：Infinity後、反物質5e10から開始。'},{id:56,name:'Many Deaths',desc:'NC2を3分以内にクリアする。報酬：最初の3分間Dimensionを最大×2強化。'},{id:57,name:'Gift from the Gods',desc:'NC8を3分以内にクリアする。報酬：Dimensional Sacrificeを強化。'},{id:58,name:'This is fine.',desc:'NC9を3分以内にクリアする。報酬：10個購入倍率に+0.01。'},
{id:61,name:'Bulked Up',desc:'全Dimension AutobuyerのBulkを512まで強化する。報酬：Bulk購入数の上限を解除。'},{id:62,name:'Oh, hey... You’re still here?',desc:'IP獲得速度を100,000,000 IP/分以上にする。'},{id:63,name:'A new beginning',desc:'Infinity Powerの生産を開始する。'},{id:64,name:'Zero Deaths',desc:'Normal Challenge中、Boost・GalaxyなしでInfinityする。報酬：第1～第4次元が25%強化。'},{id:65,name:'Not-so-challenging',desc:'全Normal Challengeの最速記録の合計を3分未満にする。報酬：Challenge中、最初の3分間Dimensionを最大×4強化。'},{id:66,name:'Faster than a squared potato',desc:'Tickspeed倍率を1e58以上にする。報酬：Tickspeedを2%強化。'},{id:67,name:'Infinitely Challenging',desc:'Infinity Challengeを1つクリアする。'},{id:68,name:'You did this again just for the achievement right?',desc:'NC3を10秒以内にクリアする。報酬：第1次元が50%強化。'},
{id:71,name:'ERROR 909: Dimension not found',desc:'NC2中、Boost・Galaxyなし、第1次元を1個だけ所持してInfinityする。報酬：第1次元が3倍。'},{id:72,name:'Can’t hold all these infinities',desc:'全8 Dimensionの倍率を1.8e308以上にする。報酬：全Dimensionが10%強化。'},{id:73,name:'THIS ACHIEVEMENT DOESN’T EXIST',desc:'反物質を9.9999e9999以上にする。報酬：未使用反物質に応じてDimensionを強化。'},{id:74,name:'Not a second lost',desc:'全Normal Challengeの最速記録の合計を5秒未満にする。報酬：Challenge中、全Dimensionが40%強化。'},{id:75,name:'NEW DIMENSIONS???',desc:'第4 Infinity Dimensionを解禁する。報酬：Achievement倍率がInfinity Dimensionにも適用。'},{id:76,name:'One for each dimension',desc:'総プレイ時間を8日以上にする。報酬：プレイ時間に応じてDimensionを微強化。'},{id:77,name:'1 Million is a lot',desc:'Infinity Powerを1e6以上にする。'},{id:78,name:'Blink of an eye',desc:'0.25秒未満でInfinityする。報酬：Infinity後、反物質5e25から開始。'},
{id:81,name:'Game Design Is My Passion',desc:'IC5を15秒以内にクリアする。'},{id:82,name:'Anti-antichallenged',desc:'IC1～IC8をすべてクリアする。'},{id:83,name:'YOU CAN GET 50 GALAXIES?!?!',desc:'Galaxyを50個取得する。報酬：GalaxyごとにTickspeedを約5.26%強化。'},{id:84,name:'I got a few to spare',desc:'反物質を1e35000以上にする。報酬：未使用反物質に応じてDimensionを強化。'},{id:85,name:'ALL YOUR IP ARE BELONG TO US',desc:'Big Crunchで1e150 IP以上を獲得する。報酬：IP獲得量×4。'},{id:86,name:'Do you even bend time bro?',desc:'Tickspeed速度倍率を1e3以上にする。報酬：Galaxyを1%強化。'},{id:87,name:'2 MILLION INFINITIES',desc:'Infinityを2,000,000回達成する。報酬：5秒を超えるInfinityで獲得Infinity回数×250。'},{id:88,name:'Yet another infinity reference',desc:'1回のDimensional Sacrificeで1.8e308以上の倍率を得る。報酬：Dimensional Sacrificeを強化.'},
{id:91,name:'Ludicrous Speed',desc:'2秒以内に1e200 IP以上を獲得してBig Crunch。報酬：最初の5秒間、全Dimensionを最大×300強化。'},{id:92,name:'I brake for NOBODY!',desc:'20秒以内に1e250 IP以上を獲得してBig Crunch。報酬：最初の60秒間、全Dimensionを最大×100強化。'},{id:93,name:'MAXIMUM OVERDRIVE',desc:'1回のBig Crunchで1e300 IP以上を獲得。報酬：IP獲得量×4。'},{id:94,name:'4.3333 minutes of Infinity',desc:'Infinity Powerを1e260以上にする。報酬：Infinity Power獲得量×2。'},{id:95,name:'Is this safe?',desc:'1時間以内にReplicantiを上限まで増やす。報酬：Infinity後もReplicantiと1 Replicanti Galaxyを維持。'},{id:96,name:'Time is relative',desc:'Eternityを実行する。'},{id:97,name:'Like jumping on a lego',desc:'8つのInfinity Challenge最速記録の合計を6.66秒未満にする。'},{id:98,name:'0 degrees from Infinity',desc:'第8 Infinity Dimensionを解禁する。'}].map(a=>`<div class="achievement-tile ${state.achievements[achievementIndex(a.id)]?'unlocked':''}" data-achievement-id="${a.id}" data-achievement-name="${a.name}" data-achievement-desc="${a.desc}"><div class="achievement-id">${a.id}</div><div class="achievement-name">${a.name}</div></div>`).join('')}</div>`,statistics:()=>`<h2>統計</h2><p>総プレイ時間: <span id="statPlayTime">${formatPlayTime(state.playTime)}</span></p><p>Infinity内経過時間: <span id="statInfinityTime">${formatPlayTime(state.infinityTime)}</span></p><p>最速Infinity時間: <span id="statFastestInfinity">${state.fastestInfinity>0?formatPlayTime(state.fastestInfinity):'未記録'}</span></p><p>反物質: ${fmtMatter(state.matter)}</p><p>Infinity Point: ${getIPBigNumber().toDisplayString(3)}</p><p>Infinity回数: ${fmt(state.infinities)}</p><p>Dimension Boost: ${fmt(state.boosts)} / Galaxy: ${fmt(state.galaxies)}</p>`,options:()=>`<h2>設定</h2><button type="button" class="secondary" id="tabSaveBtn">セーブ</button> <button type="button" class="secondary" id="tabResetBtn">最初からやり直す</button>`};
