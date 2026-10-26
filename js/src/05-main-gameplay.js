function buildRows(){
 const root=$('dimensions');root.innerHTML='';rows=[];
 for(let i=0;i<8;i++){
  const d=document.createElement('div');d.className='dim'+(unlocked(i)?'':' locked');
  const tier=document.createElement('div');tier.className='tier';tier.textContent=i+1;
  const info=document.createElement('div');
  const nm=document.createElement('div');nm.className='dim-name';nm.textContent=names[i];
  const det=document.createElement('div');det.className='dim-info';
  const amt=document.createElement('div');amt.className='dim-amount';
  info.append(nm,det,amt);info.style.display='contents';
  const b=document.createElement('button');b.className='buy';b.type='button';b.onclick=()=>buy(i);
  d.append(tier,info,b);root.append(d);rows.push({d,det,amt,b});
 }
}
let lastRegularScreen='main';
let autobuyerCrunchInProgress=false;
function render(){
 syncBigNumberState();
 checkAchievements();
 setText($('statPlayTime'),formatPlayTime(state.playTime));
 setText($('statInfinityTime'),formatPlayTime(state.infinityTime));
 setText($('statFastestInfinity'),state.fastestInfinity>0?formatPlayTime(state.fastestInfinity):'未記録');
 document.querySelectorAll('[data-passive-ip-minute]').forEach(el=>{el.textContent='1分あたりの獲得量：'+(state.fastestInfinity>0?fmtBig(passiveIPRateBigNumber().multiply(60))+' IP':'最速Infinity記録後に表示');});document.querySelectorAll('[data-bi-generation-time]').forEach(el=>{el.textContent='生産時間：'+(state.fastestInfinity>0?Number(state.fastestInfinity*5).toFixed(1)+'秒':'未記録');});document.querySelectorAll('[data-ip-offline-minute]').forEach(el=>{el.textContent='オフライン時：'+fmtBig(bestIPPerMinuteBigNumber().multiply(0.5))+' IP/分（最高IP/分の50%）';});
 setText($('matter'),matterDisplayBig().toDisplayString(2));if(state.activeChallenge===11||state.activeInfinityChallenge===6){const el=$('matter');if(el)el.title='Matter: '+fmtMatter(state.activeInfinityChallenge===6?state.icMatter:state.challenge11Matter);}
 const nc11MatterPanel=$('challenge11MatterPanel');if(nc11MatterPanel)nc11MatterPanel.style.display=(state.activeChallenge===11||state.activeInfinityChallenge===6)?'block':'none';setText($('challenge11MatterLabel'),state.activeInfinityChallenge===6?'インフィニティチャレンジ6':'チャレンジ11');setText($('challenge11MatterDisplay'),fmtMatter(state.activeInfinityChallenge===6?state.icMatter:state.challenge11Matter));
 const eternityTab=document.querySelector('.screen-tabs button[data-screen="eternity"]');if(eternityTab)eternityTab.style.display=state.eternities>0?'':'none';
 updateAutobuyerUnlockAlert();
 notifyNewContentUnlocks();
 const productionRateBN=productionRateBigNumber();
 const rateText=productionRateBN.toDisplayString(2)+'/s';
 setText($('rate'),rateText);
 const hasIPStat=state.infinities>0;
 const hasEPStat=state.eternities>0;
 $('ipStat').style.display=hasIPStat?'block':'none';
 const epStat=$('epStat');
 if(epStat)epStat.style.display=hasEPStat?'block':'none';
 const visibleStatCount=2+(hasIPStat?1:0)+(hasEPStat?1:0);
 const statsStrip=$('ipStat').parentElement;
 statsStrip.style.display='flex';
 statsStrip.style.overflowX='auto';
 statsStrip.style.overflowY='hidden';
 statsStrip.style.scrollSnapType='x mandatory';
 statsStrip.style.webkitOverflowScrolling='touch';
 statsStrip.style.scrollbarWidth='thin';
 const statGap=window.matchMedia('(max-width: 540px)').matches?4:8;
 const statColumns=Math.min(3,visibleStatCount);
 const statBasis=`calc((100% - ${(statColumns-1)*statGap}px) / ${statColumns})`;
 statsStrip.querySelectorAll('.stat').forEach(el=>{el.style.flex=`0 0 ${statBasis}`;el.style.minWidth='0';el.style.scrollSnapAlign='start';});
 setText($('topIpCount'),getIPBigNumber().toDisplayString(3));
 setText($('topEpCount'),getEPBigNumber().toDisplayString(3));
 const mainCrunchWrap=$('mainBigCrunchWrap'),mainCrunchBtn=$('mainBigCrunchBtn'),mainEternityBtn=$('mainEternityBtn');
 if(mainCrunchWrap&&mainCrunchBtn){
  const canManualCrunch=(state.activeInfinityChallenge>0&&canCrunchNow())||(state.breakInfinityActive&&canCrunchNow());
  const eternityReady=canEternity();
  mainCrunchWrap.style.display=(state.breakInfinityActive||state.activeInfinityChallenge>0||eternityReady)?'flex':'none';
  mainEternityBtn.style.display=eternityReady?'block':'none';
  mainEternityBtn.disabled=!eternityReady;
  mainCrunchBtn.style.display=(state.breakInfinityActive||state.activeInfinityChallenge>0)?'block':'none';
  mainCrunchBtn.disabled=!canManualCrunch;
  mainCrunchBtn.innerHTML='Big Crunch for '+fmtBig(canManualCrunch?ipGainBigNumber():1)+' IP'+crunchEfficiencyMarkup();
  mainEternityBtn.innerHTML='Eternity for '+fmtBig(eternityReady?eternityPointGain():BigNumber.from(0))+' EP';
 }
 document.querySelectorAll('[data-current-multiplier]').forEach(el=>{const id=el.dataset.currentMultiplier;el.textContent='現在の倍率：'+infinityUpgradeCurrentMultiplier(id)+(state.infinityUpgrades.includes(id)?'':'（未購入）');});
 document.querySelectorAll('[data-bi-current-multiplier]').forEach(el=>{el.textContent='現在の倍率：×'+fmtFixedBig(breakInfinityUpgradeEffectBigNumber(el.dataset.biCurrentMultiplier),2)+(breakInfinityUpgradeBought(el.dataset.biCurrentMultiplier)?'':'（未購入）');});
 const wasCrunchReady=document.body.classList.contains('crunch-ready');
 const infinityReady=atInfinity()&&!state.breakInfinityActive;
 document.body.classList.toggle('crunch-ready',infinityReady);
 $('infinityPanel').style.display='none';
 if(infinityReady){document.body.dataset.screen='infinity';$('screenTabs').style.display='none';$('tabContent').hidden=false;$('tabContent').innerHTML='<h2>Infinity</h2><button type="button" class="big-crunch-btn" id="tabCrunchBtn">Big Crunch (+'+fmtBig(ipGainBigNumber())+' IP)'+crunchEfficiencyMarkup()+'</button>';$('tabCrunchBtn').onclick=()=>state.activeChallenge?completeChallenge():bigCrunch();}
 else{$('screenTabs').style.display='';if(wasCrunchReady&&!state.activeChallenge){const destination=autobuyerCrunchInProgress?lastRegularScreen:'main';switchScreen(destination);$('tabContent').hidden=destination==='main';if(destination==='main')$('tabContent').innerHTML='';}}
 setText($('ipCount'),getIPBigNumber().toDisplayString(3));setText($('infinityCount'),fmt(state.infinities));
 setText($('tickspeedMultiplier'),'購入 '+BigNumber.from(state.tickspeed).toDisplayString(0)+'回 · 倍率 ×'+tickspeedMultiplierBigNumber().toDisplayString(3));
 setText($('tickspeedDesc'),'');
 const sacrificeUnlocked=state.boosts>=5;
 $('sacrificeBtn').disabled=!sacrificeUnlocked||state.amount[state.activeChallenge===12?5:7]<1||dimensionAmountBig(0).compare(0)<=0||sacrificeGainBigNumber().compare(1.01)<0;
 setText($('sacrificeMultiplier'),'倍率 ×'+sacrificeMultiplierBigNumber().toDisplayString(2));
 $('sacrificePanel').style.opacity=sacrificeUnlocked?'1':'.65';
 const gain=sacrificeGainBigNumber();
 setText($('sacrificeBtn'),$('sacrificeBtn').disabled?'ロック中':'Sacrifice ×'+gain.toDisplayString(2));
 const tsCost=tickspeedCost();
 $('tickspeedBtn').disabled=matterBigNumber().compare(tickspeedCostBigNumber())<0;
 setText($('tickspeedBtn'),'購入 · '+tickspeedCostBigNumber().toDisplayString(2));
 $('tickspeedMaxBtn').disabled=matterBigNumber().compare(tickspeedCostBigNumber())<0;
 setText($('tickspeedMaxBtn'),'Buy Max');
 if(rows.length!==8||$('dimensions').children.length!==8)buildRows();
 for(let i=0;i<8;i++){
  const {d,det,amt,b}=rows[i],open=unlocked(i)&&!(challengeRuleActive(10)&&i>=6),c=costBigNumber(i);
  d.className='dim'+(open?'':' locked');
  const lockedReason=challengeRuleActive(10)&&i>=6?'チャレンジ制限':(i>=4&&state.boosts<i-3?'ブースト '+(i-3)+' 回':'未解禁');
  setText(det,open?'×'+dimensionMultiplierBigNumber(i).toDisplayString(2):lockedReason);
  setText(amt,BigNumber.from(state.amountBN?.[i]||state.amount[i]).toDisplayString(2));
  const max=state.buyMax?maxAffordable(i):null;
  const costText=costBigNumber(i).toDisplayString(2);
  b.disabled=!open||(state.buyMax?max.count===0:!canAffordDimension(i,c));
  setText(b,!open?'ロック中':(state.buyMax?('購入×'+fmt(max.count)+' コスト'+(max.count>0?max.spent:costText)):('購入×1 コスト'+costText)));
 }
 const n=state.boosts+1,req=boostRequirement(),tier=boostRequirementTier(),can=canBoost();
 $('boostBtn').disabled=!can;
 $('quickBoostBtn').disabled=!can;
 setText($('quickBoostBtn'),can?'次元ブースト実行':'次元ブースト');
 $('quickTickspeedBtn').disabled=false;
 setText($('quickTickspeedBtn'),state.buyMax?'購入: 最大個':'購入: 1個ずつ');
 $('quickMaxAllBtn').disabled=!canBuyAnything();
 setText($('quickBuyModeBtn'),'最大購入');
 $('mobileBoostBtn').disabled=!can;setText($('mobileBoostBtn'),'Dimension Boost '+fmt(state.boosts)+'\n第'+tier+'次元 '+fmt(req)+'個');
 const canQuickReset=state.activeChallenge===9;const canICReset=state.activeInfinityChallenge===4||state.activeInfinityChallenge===5;const mobileResetActions=document.querySelector('.mobile-reset-actions');if(mobileResetActions)mobileResetActions.classList.toggle('challenge9-active',canQuickReset||canICReset);['challenge9ResetBtn','mobileChallenge9ResetBtn'].forEach(id=>{const el=$(id);if(el){el.style.display=canQuickReset?'block':'none';el.disabled=!canQuickReset;el.textContent=state.boosts>0?'Boostを1つ消費してリセット':'消費なしでリセット';}});['icResetBtn','mobileICResetBtn'].forEach(id=>{const el=$(id);if(el){el.style.display=canICReset?'block':'none';el.disabled=!canICReset;el.textContent=state.boosts>0?'Boostを1つ消費してリセット':'消費なしでリセット';}});
 $('mobileGalaxyBtn').disabled=!canGalaxy();setText($('mobileGalaxyBtn'),'Antimatter Galaxy '+state.galaxies+'\n第'+(state.activeChallenge===10?6:8)+'次元 '+fmt(galaxyRequirement())+'個');
 $('mobileTickspeedBtn').disabled=false;setText($('mobileTickspeedBtn'),state.buyMax?'購入: 最大個':'購入: 1個ずつ');
 setText($('mobileBuyModeBtn'),'最大購入');
 const effect=n===1?'第1次元の倍率が2倍になります。':(n<=6?'第'+n+'次元以下の倍率が2倍になります。':'全ての次元の倍率が2倍になります。');
 setText($('boostDesc'),'条件：第'+tier+'次元を '+fmt(req)+' 個所持（現在 '+fmtBig(dimensionAmountBig(tier-1))+' 個）。'+effect);
 setText($('status'),'ゲームは自動保存されます。');
 syncBigNumberState();
}
function buy(i){
 if(!unlocked(i)||(challengeRuleActive(10)&&i>=6))return;
 const buyCount=state.buyMax?maxAffordable(i).count:1;let boughtNow=0;
 for(let k=0;k<buyCount;k++){
  const c=cost(i);
  if(!canAffordDimension(i,c)||!spendDimension(i,c))break;
  // IC5 applies its cost bump on every 10th purchase, before bought is incremented.
  if(state.activeInfinityChallenge===5&&state.bought[i]%10===9)applyIC5CostBump(i);
  setDimensionAmountBig(i,dimensionAmountBig(i).add(1));
  state.bought[i]++;
  onICDimensionPurchased(i,c);
  boughtNow++;
  if(challengeRuleActive(4)){for(let j=0;j<i;j++)setDimensionAmountBig(j,0);}
 }
 if(boughtNow){if(challengeRuleActive(2))challengePurchaseReset();if(state.activeChallenge===9&&state.bought[i]%10===0)applyChallenge9CostStep(cost(i,-1),i);if(i>=0)unlockAchievement(11+i);if(i===0&&dimensionAmountBig(0).compare('1e150')>=0)unlockAchievement(28);checkAchievements();render();save();}
}

function buyMaxDimensionTier(i, bulk=Infinity){
 // Mirrors the original buyMaxDimension(tier, bulk) contract:
 // do nothing unless the next complete group-to-10 is affordable, then buy
 // that remainder first and spend remaining bulk on complete groups of ten.
 if(!unlocked(i)||(challengeRuleActive(10)&&i>=6)||!(bulk>0))return 0;
 const goal=BigNumber.from(state.activeInfinityChallenge===5?infinityChallengeGoal():INFINITY);
 let bulkLeft=bulk===Infinity?Infinity:Math.max(0,Math.floor(Number(bulk)||0));
 let boughtNow=0;
 const buyUntilTen=()=>{
  const remainder=state.bought[i]%10===0?10:10-(state.bought[i]%10);
  const unitCost=cost(i);
  const totalCost=unitCost.multiply(remainder);
  const resource=dimensionResource(i);
  if(resource.compare(totalCost)<0)return false;
  if(!spendDimension(i,totalCost))return false;
  // buyUntilTen() in the official source applies the challenge bump before
  // increasing amount/bought.
  applyIC5CostBump(i);
  setDimensionAmountBig(i,dimensionAmountBig(i).add(remainder));
  state.bought[i]+=remainder;
  onICDimensionPurchased(i);
  if(challengeRuleActive(4)){for(let j=0;j<i;j++)setDimensionAmountBig(j,0);}
  if(state.activeChallenge===9)applyChallenge9CostStep(unitCost,i);
  boughtNow+=remainder;
  return true;
 };
 if(cost(i).compare(goal)>0&&state.activeChallenge)return 0;
 if(!buyUntilTen())return 0;
 bulkLeft--;
 if(bulkLeft<=0)return boughtNow;
 // In NC9/IC5 the source deliberately uses repeated buy-until-ten operations
 // because each purchase can trigger abnormal cost bumps.
 if(state.activeChallenge===9||state.activeInfinityChallenge===5){
  while(bulkLeft>0){
   const unitCost=cost(i),remainder=10;
   if(unitCost.compare(goal)>=0||dimensionResource(i).compare(unitCost.multiply(remainder))<0)break;
   if(!spendDimension(i,unitCost.multiply(remainder)))break;
   applyIC5CostBump(i);
   setDimensionAmountBig(i,dimensionAmountBig(i).add(remainder));
   state.bought[i]+=remainder;onICDimensionPurchased(i);
   if(challengeRuleActive(4)){for(let j=0;j<i;j++)setDimensionAmountBig(j,0);}
   applyChallenge9CostStep(unitCost,i);
   boughtNow+=remainder;bulkLeft--;
  }
  return boughtNow;
 }
 // This game's BigNumber cost model is expressed as a per-unit price that
 // changes at each ten-purchase boundary. Buying one group at a time preserves
 // that model's exact prices while matching the source's bulk-group semantics.
 let groups=0;
 while(bulkLeft>0&&groups<10000){
  const unitCost=cost(i),groupCost=unitCost.multiply(10);
  if(dimensionResource(i).compare(groupCost)<0)break;
  if(!spendDimension(i,groupCost))break;
  applyIC5CostBump(i);
  setDimensionAmountBig(i,dimensionAmountBig(i).add(10));
  state.bought[i]+=10;onICDimensionPurchased(i);
  if(challengeRuleActive(4)){for(let j=0;j<i;j++)setDimensionAmountBig(j,0);}
  boughtNow+=10;bulkLeft--;groups++;
 }
 return boughtNow;
}
function buyOneDimensionTier(i){
 if(!unlocked(i)||(challengeRuleActive(10)&&i>=6))return 0;
 const c=cost(i);if(!canAffordDimension(i,c)||!spendDimension(i,c))return 0;
 // The official game applies IC5 cost bumps only on the 10th purchase,
 // and before incrementing bought so comparisons use pre-purchase costs.
 if(state.bought[i]%10===9)applyIC5CostBump(i);
 setDimensionAmountBig(i,dimensionAmountBig(i).add(1));state.bought[i]++;onICDimensionPurchased(i);
 if(challengeRuleActive(4)){for(let j=0;j<i;j++)setDimensionAmountBig(j,0);}
 if(state.activeChallenge===9&&state.bought[i]%10===0)applyChallenge9CostStep(cost(i,-1),i);
 return 1;
}
function canBuyAnything(){
 if(canAffordTickspeed())return true;
 for(let i=0;i<8;i++)if(unlocked(i)&&maxAffordable(i).count>0)return true;
 return false;
}
function maxAll(){
 // Offline IP records only IP/min from a run in which Max All has not been used.
 state.maxAllUsedThisInfinity=true;state.bestIPPerMinBN=BigNumber.from(0).toJSON();
 // Official Max All order: buy each Normal Dimension from 1st through 8th,
 // then buy as many Tickspeed upgrades as possible.
 for(let i=0;i<8;i++){
  const boughtNow=buyMaxDimensionTier(i,Infinity);
  if(boughtNow){if(challengeRuleActive(2))challengePurchaseReset();unlockAchievement(11+i);}
 }
 let guard=0;
 while(guard<10000){
  const c=tickspeedCost();if(!canAffordTickspeed(c)||!spendTickspeed(c))break;
  state.tickspeed++;onICTickspeedPurchased(c);if(challengeRuleActive(2))challengePurchaseReset();
  if(state.activeChallenge===9)applyChallenge9CostStep(c,-1,true);
  guard++;
 }
 checkAchievements();render();save();
}

function challenge9QuickReset(){
 if(state.activeChallenge!==9)return;
 // NC9のクイックリセット：Boostがあれば1つ消費し、なければ消費せずに立て直す。
 if(state.boosts>0)state.boosts--;
 setMatterBigNumber(startingAntimatter());
 state.amount=Array(8).fill(0);state.amountBN=Array(8).fill(null).map(()=>({mantissa:0,exponent:0}));
 state.bought=Array(8).fill(0);
 state.tickspeed=0;state.challenge9CostSteps=Array(8).fill(0);state.challenge9TickspeedCostBumps=0;
 state.sacrificeMult=1;state.sacrificeMultBN={mantissa:1,exponent:0};
 state.sacrificedFirst=0;state.sacrificedFirstBN={mantissa:0,exponent:0};
 autobuyerElapsed.fill(0);
 buildRows();render();save();
}
function infinityChallengeQuickReset(){
 if(state.activeInfinityChallenge!==4&&state.activeInfinityChallenge!==5)return;
 // IC4/IC5用の詰み対策：現在の挑戦は維持し、Boostを1つ消費してDimensionの進行状態を立て直す。
 if(state.boosts>0)state.boosts--;
 setMatterBigNumber(infinityStartingAntimatter());
 state.amount=Array(8).fill(0);state.amountBN=Array(8).fill(null).map(()=>({mantissa:0,exponent:0}));
 state.bought=Array(8).fill(0);state.tickspeed=0;
 state.sacrificeMult=1;state.sacrificeMultBN={mantissa:1,exponent:0};
 state.sacrificedFirst=0;state.sacrificedFirstBN={mantissa:0,exponent:0};
 if(state.activeInfinityChallenge===4)state.icLastBoughtDimension=-1;
 if(state.activeInfinityChallenge===5)state.ic5CostSteps=Array(8).fill(0);
 state.infinityCrunchReady=false;
 autobuyerElapsed.fill(0);buildRows();render();save();
}
function boost(){
 if(!canBoost())return;
 // The original resets the relevant autobuyers' lastTick timestamp on prestige;
 // with elapsed timers this makes dimensions and tickspeed immediately eligible.
 for(let i=0;i<9;i++)autobuyerElapsed[i]=autobuyerInterval()[i];
 autobuyerElapsed[9]=0;
 state.boosts++;if(state.activeChallenge===9){state.challenge9CostSteps=Array(8).fill(0);state.challenge9TickspeedCostBumps=0;}checkAchievements();if(challengeRuleActive(3))state.challenge3TimeMult=1;if(challengeRuleActive(11))state.challenge11Matter=1;if(state.activeInfinityChallenge===4)state.icLastBoughtDimension=-1;setMatterBigNumber(state.activeInfinityChallenge===5?infinityStartingAntimatter():startingAntimatter());state.amount=Array(8).fill(0);state.amountBN=Array(8).fill(null).map(()=>({mantissa:0,exponent:0}));state.bought=Array(8).fill(0);state.tickspeed=0;state.sacrificeMult=1;state.sacrificeMultBN={mantissa:1,exponent:0};state.sacrificedFirst=0;state.sacrificedFirstBN={mantissa:0,exponent:0};if(state.activeInfinityChallenge===5)state.ic5CostSteps=Array(8).fill(0);render();save();
}
function bulkBoostAutobuy(){
 // Bulk DimBoost: 現在所持している各TierのDimension数から、連続して実行可能なBoost数を算出し、リセットを1回にまとめる。
 if(!breakInfinityUpgradeBought('bulkBoost')||!canBoost())return false;
 const originalBoosts=state.boosts;
 const rawLimit=state.autobuyers?.boostLimit;
 const configuredLimit=typeof rawLimit==='string'&&/^[0-9]+$/.test(rawLimit)?Number(rawLimit):Infinity;
 const maxCount=Math.max(0,Math.min(100000,configuredLimit-originalBoosts));
 let count=0;
 while(count<maxCount){
  state.boosts=originalBoosts+count;
  if(!canBoost())break;
  count++;
 }
 state.boosts=originalBoosts;
 if(count<=0)return false;
 state.autobuyers && (autobuyerElapsed[9]=0);
 state.boosts+=count;
 for(let i=0;i<9;i++)autobuyerElapsed[i]=autobuyerInterval()[i];
 autobuyerElapsed[9]=0;
 checkAchievements();
 if(challengeRuleActive(3))state.challenge3TimeMult=1;
 if(challengeRuleActive(11))state.challenge11Matter=1;
 setMatterBigNumber(state.activeInfinityChallenge===5?infinityStartingAntimatter():startingAntimatter());
 state.amount=Array(8).fill(0);
 state.amountBN=Array(8).fill(null).map(()=>({mantissa:0,exponent:0}));
 state.bought=Array(8).fill(0);
 state.tickspeed=0;
 state.sacrificeMult=1;
 state.sacrificeMultBN={mantissa:1,exponent:0};
 state.sacrificedFirst=0;
 state.sacrificedFirstBN={mantissa:0,exponent:0};
 if(state.activeInfinityChallenge===5)state.ic5CostSteps=Array(8).fill(0);
 render();save();
 return true;
}
function sacrifice(silent=false){
 if(state.boosts<5||challengeRuleActive(10)||state.amount[state.activeChallenge===12?5:7]<1||state.amount[0]<=0)return;
 const gain=sacrificeGainBigNumber();
 if(gain.compare(1.01)<0)return;
 state.sacrificedThisInfinity=true;
 state.sacrificedFirstBN=sacrificedFirstBigNumber().add(dimensionAmountBig(0)).toJSON();state.sacrificedFirst=sacrificedFirstBigNumber().add(dimensionAmountBig(0)).toNumber();
 setSacrificeMultiplierBigNumber(sacrificeMultiplierBigNumber().multiply(gain));if(gain.compare('1.8e308')>=0)unlockAchievement(88);
 if(challengeRuleActive(8)){
  // NC8: Sacrifice resets antimatter, all Dimension amounts, purchase multipliers, and costs. Tickspeed is retained. Achievement 21 starts at 100 antimatter.
  setMatterBigNumber(startingAntimatter());
  state.amount=Array(8).fill(0);state.amountBN=Array(8).fill(null).map(()=>({mantissa:0,exponent:0}));
  state.bought=Array(8).fill(0);
 }else if(state.activeChallenge===12){for(let i=0;i<6;i++)setDimensionAmountBig(i,0);}else{for(let i=0;i<7;i++)setDimensionAmountBig(i,0);}
 checkAchievements();notifyNewAchievements();if(!silent){render();save();}
}
function galaxy(){
 if(challengeRuleActive(8)||state.activeInfinityChallenge===7||!canGalaxy())return;
 autobuyerElapsed[10]=0;
 resetDimensionAutobuyerTicksAfterPrestige();
 state.galaxies++;if(state.activeChallenge===9){state.challenge9CostSteps=Array(8).fill(0);state.challenge9TickspeedCostBumps=0;}if(!state.sacrificedThisInfinity)unlockAchievement(38);checkAchievements();if(challengeRuleActive(3))state.challenge3TimeMult=1;if(state.activeInfinityChallenge===4)state.icLastBoughtDimension=-1;if(state.activeInfinityChallenge===5)state.ic5CostSteps=Array(8).fill(0);
 setMatterBigNumber(startingAntimatter());
 state.amount=Array(8).fill(0);
 state.amountBN=Array(8).fill(null).map(()=>({mantissa:0,exponent:0}));
 state.bought=Array(8).fill(0);
 // Infinity Upgrade「初期Boost」系は通常プレイでのGalaxy購入後にも適用する。
 // チャレンジ中は従来どおりBoost 0から開始する。
 state.boosts=(state.activeChallenge||state.activeInfinityChallenge)?0:startingBoosts();
 state.tickspeed=0;
 state.sacrificeMult=1;
 state.sacrificeMultBN={mantissa:1,exponent:0};
 state.sacrificedFirst=0;
 state.sacrificedFirstBN={mantissa:0,exponent:0};
 render();save();
}
// Break Infinity後のIP獲得式（wiki.gg: Infinity）:
// floor(IP_Mult * 10^(log10(今回のInfinity中の最大AM) / 308 - 0.75))
// Infinity中に記録した最高AMを参照する。
function floorBigNumber(value){const b=BigNumber.from(value);if(b.mantissa<=0||b.exponent<0)return BigNumber.from(0);if(b.exponent>15)return b;return BigNumber.from(Math.floor(b.toNumber()));}
function ipGainBigNumber(includeAchievementRewards=true){
 const level=Math.max(0,Math.floor(Number(state.ipMultLevel)||0));
 const ipMult=BigNumber.fromLog10(level*Math.log10(2));
 if(!state.breakInfinityActive){let gain=ipMult;if(includeAchievementRewards&&hasAchievement(85))gain=gain.multiply(4);if(includeAchievementRewards&&hasAchievement(93))gain=gain.multiply(4);return gain;}
 let amLog=Number(state.infinityPeakAMLog10);
 if(!Number.isFinite(amLog)||Math.abs(amLog)>1e7)amLog=matterBigNumber().log10();
 if(!Number.isFinite(amLog))return BigNumber.from(0);
 const exponent=amLog/308-0.75;
 if(exponent<0)return BigNumber.from(0);
 let gain=floorBigNumber(ipMult.multiply(BigNumber.fromLog10(exponent)));if(includeAchievementRewards&&hasAchievement(85))gain=gain.multiply(4);if(includeAchievementRewards&&hasAchievement(93))gain=gain.multiply(4);return gain;
}
// 既存UI/一部の互換処理向け。報酬の加算には必ずipGainBigNumber()を使う。
function ipGainMultiplier(){return ipGainBigNumber().toNumber();}
function currentIPPerMinuteBigNumber(){const elapsed=Math.max(0,Number(state.infinityTime)||0);if(elapsed<=0)return BigNumber.from(0);return ipGainBigNumber().multiply(60).divide(elapsed);}
function peakIPPerMinuteBigNumber(){return BigNumber.from(state.peakIPPerMinBN||{mantissa:0,exponent:0});}
function peakIPGainBigNumber(){return BigNumber.from(state.peakIPGainBN||{mantissa:0,exponent:0});}
function bestIPPerMinuteBigNumber(){return BigNumber.from(state.bestIPPerMinBN||{mantissa:0,exponent:0});}
// Store each completed Infinity's IP/min and retain only the latest ten runs.
function recordInfinityIPPerMinute(peakRate,elapsed=1){if(state.maxAllUsedThisInfinity)return;const seconds=Math.max(0,Number(elapsed)||0);if(seconds<=0)return;const rate=BigNumber.from(peakRate).max(0);if(rate.compare(0)<=0)return;const history=Array.isArray(state.lastTenIPPerMinBN)?state.lastTenIPPerMinBN:[];history.push(rate.toJSON());state.lastTenIPPerMinBN=history.slice(-10);}
function bestRecentIPPerMinuteBigNumber(){let best=BigNumber.from(0);const history=Array.isArray(state.lastTenIPPerMinBN)?state.lastTenIPPerMinBN:[];for(const raw of history){const rate=BigNumber.from(raw||{mantissa:0,exponent:0}).max(0);if(rate.compare(best)>0)best=rate;}return best;}
// IP Generation: generate 5% per level of the best IP/min from the last ten completed Infinities.
function ipGenerationRateBigNumber(){const level=Math.max(0,Math.min(10,Math.floor(Number(state.breakInfinityRepeatables?.[2])||0)));if(!state.breakInfinityActive||level<=0)return BigNumber.from(0);return bestRecentIPPerMinuteBigNumber().multiply(level*0.05).divide(60);}
function updateCrunchEfficiencyPeak(){if(!(state.infinityTime>0))return;const rate=currentIPPerMinuteBigNumber();if(!state.maxAllUsedThisInfinity&&rate.compare(bestIPPerMinuteBigNumber())>0)state.bestIPPerMinBN=rate.toJSON();if(state.breakInfinityActive&&atInfinity()&&rate.compare(peakIPPerMinuteBigNumber())>0){state.peakIPPerMinBN=rate.toJSON();state.peakIPGainBN=ipGainBigNumber().toJSON();}}
function resetCrunchEfficiencyPeak(){state.peakIPPerMinBN=BigNumber.from(0).toJSON();state.peakIPGainBN=BigNumber.from(0).toJSON();}
function crunchEfficiencyMarkup(){const current=currentIPPerMinuteBigNumber(),peak=peakIPPerMinuteBigNumber(),gainAtPeak=peakIPGainBigNumber();return '<span class="crunch-efficiency-line">現在：'+fmtBig(current)+' IP/分</span><span class="crunch-efficiency-line">最高：'+fmtBig(gainAtPeak)+' IP（'+fmtBig(peak)+' IP/分）</span>'; }
// Passive Generation: 1 base IP per (fastest Infinity time × 10). This uses the pre-Break base IP gain, not the current Break Infinity reward.
function passiveIPRateBigNumber(){if(!hasInfinityUpgrade('passiveGen')||!(state.fastestInfinity>0))return BigNumber.from(0);const baseIPGain=BigNumber.fromLog10(Math.max(0,Math.max(0,Math.floor(Number(state.ipMultLevel)||0))*Math.log10(2)));return baseIPGain.divide(state.fastestInfinity*10);}
// Offline IP: while offline only, gain 50% of this Infinity run's dynamically updated best IP/min, converted to a per-second rate.
function offlineIPRateBigNumber(){if(!state.ipOffline)return BigNumber.from(0);return bestIPPerMinuteBigNumber().multiply(0.5).divide(60);}
function passiveIPRate(){return passiveIPRateBigNumber().toNumber();}
function startingBoosts(){if(hasInfinityUpgrade('skipResetGalaxy'))return 4;if(state.infinityUpgrades.includes('skipReset3'))return 3;if(state.infinityUpgrades.includes('skipReset2'))return 2;if(state.infinityUpgrades.includes('skipReset1'))return 1;return 0;}
function startingGalaxies(){return state.infinityUpgrades.includes('skipResetGalaxy')?1:0;}
function resetReplicantiOnInfinity(){
 if(!state.replicantiUnlocked)return;
 if(hasAchievement(95)){
  // Achievement 95 preserves the Replicanti amount and grants/preserves
  // exactly one Replicanti Galaxy on Infinity, even if the run had none.
  state.replicanti=Math.max(1,Math.min(Number.MAX_VALUE,Number(state.replicanti)||1));
  state.replicantiGalaxies=1;
 }else{
  state.replicanti=1;
  state.replicantiGalaxies=0;
 }
 state.replicantiTimer=0;
}
function resetInfinityDimensionsOnCrunch(){ensureInfinityDimensionState();for(const d of state.infinityDimensions)d.amount=BigNumber.from(Math.max(0,Number(d.bought)||0)).toJSON();state.infinityPowerBN=BigNumber.from(0).toJSON();}
function bigCrunch(fromAutobuyer=false){if(state.activeInfinityChallenge){completeInfinityChallenge();return;}if(!canCrunchNow())return;if(state.activeChallenge){completeChallenge();return;}updateCrunchEfficiencyPeak();autobuyerElapsed[11]=0;resetDimensionAutobuyerTicksAfterPrestige();const completedInfinity=Math.max(0,state.infinityTime);
 // NC1 is represented by an ordinary Infinity run in this implementation (its challenge card cannot be started). Record its best time so achievements 65/74 are not permanently blocked by a missing NC1 entry.
 if(!state.activeChallenge){const previousNC1=Number(state.challengeTimes?.[1]);state.challengeTimes[1]=Number.isFinite(previousNC1)&&previousNC1>=0?Math.min(previousNC1,completedInfinity):completedInfinity;}
 checkInfinityCompletionAchievements(infinityRealTimeSeconds(),0);if(state.amount[7]===0)unlockAchievement(34);if(state.galaxies===1)unlockAchievement(36);if(infinityRealTimeSeconds()<7200)unlockAchievement(37);if(state.galaxies>=1&&!state.sacrificedThisInfinity)unlockAchievement(38);if(state.activeChallenge&&state.boosts===0&&state.galaxies===0)unlockAchievement(64);if(state.activeChallenge===2&&dimensionAmountBig(0).compare(1)===0&&Array.from({length:7},(_,i)=>dimensionAmountBig(i+1).compare(0)===0).every(Boolean)&&state.boosts===0&&state.galaxies===0)unlockAchievement(71);const completedRealInfinity=infinityRealTimeSeconds();if(completedRealInfinity>0)state.fastestInfinity=state.fastestInfinity>0?Math.min(state.fastestInfinity,completedRealInfinity):completedRealInfinity;const baseIPGain=ipGainBigNumber(false);if(baseIPGain.compare('1e150')>=0)unlockAchievement(85);checkInfinityIPAchievements(baseIPGain,infinityRealTimeSeconds());const completedIPGain=ipGainBigNumber();recordInfinityIPPerMinute(bestIPPerMinuteBigNumber(),completedInfinity);addIPBigNumber(completedIPGain);ensureInfinityDimensionState();state.totalIPGained=(state.totalIPGained||0)+completedIPGain.toNumber();state.infinities+=infinityCountGainForRun(completedInfinity);unlockAchievement(21);state.infinityPeakAMLog10=0;state.infinityCrunchReady=false;resetReplicantiOnInfinity();resetInfinityDimensionsOnCrunch();setMatterBigNumber(infinityStartingAntimatter());state.amount=Array(8).fill(0);state.amountBN=Array(8).fill(null).map(()=>({mantissa:0,exponent:0}));state.bought=Array(8).fill(0);state.boosts=startingBoosts();state.galaxies=startingGalaxies();state.tickspeed=0;state.sacrificeMult=1;state.sacrificeMultBN={mantissa:1,exponent:0};state.sacrificedFirst=0;state.sacrificedFirstBN={mantissa:0,exponent:0};state.sacrificedThisInfinity=false;state.eighthDimensionBoughtThisInfinity=false;state.infinityTime=0;state.infinityStartTimestamp=Date.now();state.bestIPPerMinBN=BigNumber.from(0).toJSON();state.maxAllUsedThisInfinity=false;resetCrunchEfficiencyPeak();checkAchievements();notifyNewAchievements();buildRows();if(fromAutobuyer)autobuyerCrunchInProgress=true;else switchScreen('main');render();autobuyerCrunchInProgress=false;save();}
