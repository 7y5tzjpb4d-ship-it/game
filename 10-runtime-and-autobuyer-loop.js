function applyPreEternityTestState(){
  setIPBigNumber(BigNumber.from('1e310'));
  state.totalIPGained=BigNumber.from('1e310').toNumber();
  state.infinities=Math.max(1,Number(state.infinities)||0);
  state.achievements=Array.from({length:achievementIds.length},()=>true);
  state.infinityUpgrades=infinityUpgradeData.map(u=>u[0]);
  state.ipOffline=true;
  state.breakInfinityUnlocked=true;
  state.breakInfinityActive=true;
  state.breakInfinityUpgrades=breakInfinityUpgradeData().map(u=>u[0]);
  state.breakInfinityRepeatables=[8,7,10];
  state.completedChallenges=Array.from({length:12},(_,i)=>i+1);
  state.challengeTimes=Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,0.01]));
  state.completedInfinityChallenges=Array.from({length:8},(_,i)=>i+1);
  state.infinityChallengeTimes=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,0.01]));
  state.fastestInfinity=0.01;
  state.autobuyers={...state.autobuyers, dims:Array(8).fill(true),tickspeed:true,tickspeedMode:'max',unlockedDims:Array(8).fill(true),tickspeedUnlocked:true,boost:true,galaxy:true,crunch:true,sacrifice:true,dimModes:Array(8).fill('10'),dimMode:'10',intervalUpgradeLevel:15,intervalUpgradeLevels:Array(12).fill(15),dimBulkLevels:Array(8).fill(9)};
  state.activeChallenge=0;
  state.activeInfinityChallenge=0;
  setMatterBigNumber(BigNumber.from('1.8e308'));
  state.totalAntimatterLog10=308.2552725051033;
  state.totalAntimatterProducedBN=BigNumber.from('1.8e308').toJSON();
  state.infinityPeakAMLog10=308.2552725051033;
  state.infinityCrunchReady=true;
  state.eternities=0;
  setEPBigNumber(0);
  state.eternityTestSetupApplied=true;
  try{localStorage.setItem('antimatterEternityTestSetupApplied','1');}catch(e){}
}
// 保存データがある場合は読み込み、初回だけEternity直前のテスト状態を適用する。
load();
let eternityTestSetupDone=false;try{eternityTestSetupDone=localStorage.getItem('antimatterEternityTestSetupApplied')==='1';}catch(e){}
if(!eternityTestSetupDone)applyPreEternityTestState();
if(state.activeInfinityChallenge)challengeSubpage='infinity';
save();
updateAutobuyerUnlockAlert();autobuyerUnlockAlert=false;previousDimAutobuyerUnlocks=Array.from({length:8},(_,i)=>dimAutobuyerUnlocked(i));
state.buyMax=true;$('buyModeBtn').textContent='最大購入';$('quickBuyModeBtn').textContent='最大購入';$('mobileBuyModeBtn').textContent='最大購入';buildRows();render();
let last=performance.now();
const achievementNames={11:'You gotta start somewhere',12:'100 antimatter is a lot',13:'Half life 3 CONFIRMED',14:'L4D: Left 4 Dimensions',15:'5 Dimension Antimatter Punch',16:"We couldn't afford 9",17:'Not a luck related achievement',18:'90 degrees to infinity',21:'To Infinity!',22:'Boosting the boost',23:'The 9th Dimension is a lie',24:'Antimatter Apocalypse',25:'Boosting to the max',26:'You got past The Big Wall',27:'Double Galaxy',28:"There's no point in doing that...",31:'I forgot to nerf that',32:'The Gods are pleased',33:"That's a lot of infinites",34:"You didn't need it anyway",35:"Don't you dare sleep",36:'Claustrophobic',37:"That's FAST!",38:"I don't believe in Gods",41:'No DLC required',42:'Super Sanic',43:'How the antitables have turned..',44:'Over in 30 Seconds',45:'Faster than a potato',46:'Multidimensional',47:'Daredevil',48:'Antichallenged',51:'Limit Break',52:'Age of Automation',53:'Definitely not worth it',54:"That’s FASTER!",55:"Forever isn’t that long",56:'Many Deaths',57:'Gift from the Gods',58:'This is fine.',61:'Bulked Up',62:"Oh, hey... You’re still here?",63:'A new beginning',64:'Zero Deaths',65:'Not-so-challenging',66:'Faster than a squared potato',67:'Infinitely Challenging',68:'You did this again just for the achievement right?',71:'ERROR 909: Dimension not found',72:'Can’t hold all these infinities',73:"THIS ACHIEVEMENT DOESN’T EXIST",74:'Not a second lost',75:'NEW DIMENSIONS???',76:'One for each dimension',77:'1 Million is a lot',78:'Blink of an eye',81:'Game Design Is My Passion',82:'Anti-antichallenged',83:'YOU CAN GET 50 GALAXIES?!?!',84:'I got a few to spare',85:'ALL YOUR IP ARE BELONG TO US',86:'Do you even bend time bro?',87:'2 MILLION INFINITIES',88:'Yet another infinity reference',91:'Ludicrous Speed',92:'I brake for NOBODY!',93:'MAXIMUM OVERDRIVE',94:'4.3333 minutes of Infinity',95:'Is this safe?',96:'Go Eternal',97:'Like jumping on a lego',98:'0 degrees from Infinity'};
const achievementDescs={11:'第1次元を購入する。',12:'第2次元を購入する。',13:'第3次元を購入する。',14:'第4次元を購入する。',15:'第5次元を購入する。',16:'第6次元を購入する。',17:'第7次元を購入する。',18:'第8次元を購入する。',21:'Big Crunchを実行する。報酬：Infinity後、反物質100から開始。',22:'Dimension Boostを初めて購入する。',23:'第8次元をちょうど99個所持する。',24:'反物質を1e80以上にする。',25:'Dimension Boostを10回購入する。',26:'Antimatter Galaxyを購入する。',27:'Antimatter Galaxyを2個購入する。',28:'第1次元を1e150個以上所持した状態で、さらに1個購入する。',31:'いずれかのDimension倍率を1e31以上にする。報酬：第1次元が5%強化される。',32:'Challenge 8以外でSacrifice倍率を600超にする。報酬：Sacrificeが強化される。',33:'Infinityを10回達成する。',34:'第8次元を所持せずInfinityする。報酬：第1〜第7次元が2%強化される。',35:'6時間を超えてオフラインになる。',36:'Galaxyをちょうど1個所持してInfinityする。報酬：Tickspeedが2%強化される。',37:'2時間以内にInfinityする。報酬：Infinity後、反物質5000から開始。',38:'SacrificeせずにGalaxyを購入する。',41:'Infinity Upgradeを16個購入する。報酬：Offline IPとIP Multiplierを解放する。',42:'反物質が1e63以上のとき、生産量/秒を反物質より大きくする。',43:'第8次元の倍率を最大、第7次元を2番目に高くする順序にする。報酬：次元ごとに1〜8%強化。',44:'生産量/秒が反物質を30秒間連続で上回る。',45:'Tickspeed倍率を1e29以上にする。報酬：Tickspeedが2%強化される。',46:'第1〜第7次元をそれぞれ1e12以上にする。',47:'Normal Challengeを3つクリアする。',48:'Normal Challengeを12個すべてクリアする。報酬：全Dimensionが10%強化される。',51:'Break Infinityを解禁する。',52:'第1～第8次元とTickspeedのAutobuyer間隔を最大まで強化する。',53:'全Autobuyerの購入間隔を最大まで強化する。',54:'10分以内にInfinityする。報酬：Infinity後、反物質500,000から開始。',55:'1分以内にInfinityする。報酬：Infinity後、反物質5e10から開始。',56:'NC2を3分以内にクリアする。報酬：Infinity開始から3分間、全Dimensionを最大×2強化。',57:'NC8を3分以内にクリアする。報酬：Dimensional Sacrificeを強化。',58:'NC9を3分以内にクリアする。報酬：10個購入倍率に+0.01。',61:'全Dimension AutobuyerのBulkを512まで強化する。報酬：Bulk購入数の上限を解除。',62:'IP獲得速度を100,000,000 IP/分以上にする。',63:'Infinity Powerの生産を開始する。',64:'Normal Challenge中、Boost・GalaxyなしでInfinityする。報酬：第1～第4次元が25%強化。',65:'全Normal Challengeの最速記録の合計を3分未満にする。報酬：Challenge中、最初の3分間Dimensionを最大×4強化。',66:'Tickspeed倍率を1e58以上にする。報酬：Tickspeedを2%強化。',67:'Infinity Challengeを1つクリアする。',68:'NC3を10秒以内にクリアする。報酬：第1次元が50%強化。',71:'NC2中、Boost・Galaxyなし、第1次元を1個だけ所持してInfinityする。報酬：第1次元が3倍。',72:'全8 Dimensionの倍率を1.8e308以上にする。報酬：全Dimensionが10%強化。',73:'反物質を9.9999e9999以上にする。報酬：現在の未使用反物質に応じてDimensionを強化。',74:'全Normal Challengeの最速記録の合計を5秒未満にする。報酬：Challenge中、全Dimensionが40%強化。',75:'第4 Infinity Dimensionを解禁する。報酬：Achievement倍率がInfinity Dimensionにも適用。',76:'総プレイ時間を8日以上にする。報酬：プレイ時間に応じてDimensionを微強化。',77:'Infinity Powerを1e6以上にする。',78:'0.25秒未満でInfinityする。報酬：Infinity後、反物質5e25から開始。',81:'IC5を15秒以内にクリアする。',82:'IC1～IC8をすべてクリアする。',83:'Galaxyを50個取得する。報酬：GalaxyごとにTickspeedを約5.26%強化。',84:'反物質を1e35000以上にする。報酬：現在の未使用反物質に応じてDimensionを強化。',85:'Big Crunchで1e150 IP以上を獲得する。報酬：IP獲得量×4。',86:'Tickspeed速度倍率を1e3以上にする。報酬：Galaxyを1%強化。',87:'Infinityを2,000,000回達成する。報酬：5秒を超えるInfinityで獲得Infinity回数×250。',88:'1回のDimensional Sacrificeで1.8e308以上の倍率を得る。報酬：Dimensional Sacrificeを強化。',91:'2秒以内に1e200 IP以上を獲得してBig Crunch。報酬：Infinity開始後5秒間、全Antimatter Dimensionを最大×300強化。',92:'20秒以内に1e250 IP以上を獲得してBig Crunch。報酬：Infinity開始後60秒間、全Antimatter Dimensionを最大×100強化。',93:'1回のBig Crunchで1e300 IP以上を獲得する。報酬：IP獲得量×4。',94:'Infinity Powerを1e260以上にする。報酬：Infinity Power獲得量×2。',95:'1時間以内にReplicantiを上限まで増やす。報酬：Infinity後もReplicantiとReplicanti Galaxyを維持する。',96:'Eternityを実行する。',97:'8つのInfinity Challenge最速記録の合計を6.66秒未満にする。',98:'第8 Infinity Dimensionを解禁する。'};
let observedAchievements=state.achievements.slice();
function showAchievementToast(id){
 let container=document.querySelector('.achievement-toast-container');if(!container){container=document.createElement('div');container.className='achievement-toast-container';container.setAttribute('aria-live','polite');document.body.appendChild(container);}
 const toast=document.createElement('div');toast.className='achievement-toast';const title=document.createElement('div');title.className='achievement-toast-title';title.textContent='Achievement Unlocked!';const name=document.createElement('div');name.className='achievement-toast-name';name.textContent=achievementNames[id]||('Achievement '+id);const desc=document.createElement('div');desc.className='achievement-toast-desc';desc.textContent=achievementDescs[id]||'';toast.append(title,name,desc);container.appendChild(toast);setTimeout(()=>{toast.style.transition='opacity .25s, transform .25s';toast.style.opacity='0';toast.style.transform='translateX(20px)';setTimeout(()=>toast.remove(),300);},4000);
}
function notifyNewAchievements(){state.achievements.forEach((unlocked,i)=>{if(unlocked&&!observedAchievements[i])showAchievementToast(achievementIds[i]);});observedAchievements=state.achievements.slice();}
function crunchAutobuyerReady(){if(!canCrunchNow())return false;if(state.activeChallenge)return true;if(!state.breakInfinityActive)return true;const raw=String(state.autobuyers.crunchIPTarget??'').trim();if(raw==='')return true;const target=parseBigNumberInput(raw);return !!target&&ipGainBigNumber().compare(target)>=0;}
function runAutobuyers(dt, options={}){
 let changed=false;
 const intervals=autobuyerInterval();
 // Keep elapsed time independent of activation/affordability. Like the original,
 // a buyer which has waited long enough fires as soon as its purchase is possible.
 // The scheduler follows the same priority sequence as the official source.
 for(let i=0;i<autobuyerElapsed.length;i++)autobuyerElapsed[i]+=dt;

 // Match the official Autobuyers.all order: Antimatter Dimensions are checked
 // from tier 1 through tier 8. Each buyer's affordability is re-evaluated after
 // every preceding purchase, so lower tiers cannot jump ahead of higher-priority
 // buyers merely because they appear lower in the UI.
 for(let i=0;i<8;i++){
  if(!state.autobuyers.dims[i]||!dimAutobuyerUnlocked(i)||!unlocked(i)||(challengeRuleActive(10)&&i>=6))continue;
  if(autobuyerElapsed[i]+1e-9<intervals[i])continue;
  // 本家 canTick は「そのTierを1個買えるか」を確認する。BUY_10 の場合も
  // 10個分の価格を事前条件にせず、tick() 内の buyMaxDimension が購入可否を決める。
  if(!canAffordDimension(i,cost(i)))continue;
  autobuyerElapsed[i]=0; // 本家は購入処理を呼んだ時点で cooldown を更新する
  const mode=state.autobuyers.dimModes?.[i]||state.autobuyers.dimMode||'10';
  const boughtNow=mode==='1'?buyOneDimensionTier(i):buyMaxDimensionTier(i,dimAutobuyerBulk(i));
  if(boughtNow){
   if(challengeRuleActive(2))challengePurchaseReset();
   state.achievements[i]=true;
   if(i===0&&dimensionAmountBig(0).compare('1e150')>=0)state.achievements[15]=true;
   changed=true;
  }
 }

 // Match the official Autobuyers.all order after Antimatter Dimensions:
 // Big Crunch -> Tickspeed -> Galaxy -> DimBoost -> Sacrifice.
 // Big Crunch is a prestige action, so it is evaluated before the remaining
 // single-complex autobuyers, just as in the original source.
 if(state.autobuyers.crunch&&challengeCompleted(12)&&autobuyerElapsed[11]+1e-9>=intervals[11]&&crunchAutobuyerReady()){
  autobuyerElapsed[11]=0;
  if(state.activeChallenge)completeChallenge();else bigCrunch(true);
  changed=true;
 }
 if(state.autobuyers.tickspeed&&tickspeedAutobuyerUnlocked()&&autobuyerElapsed[8]+1e-9>=intervals[8]&&canAffordTickspeed()){
  autobuyerElapsed[8]=0;
  const buyMaxTickspeed=challengeCompleted(9)&&state.autobuyers.tickspeedMode==='max';
  let boughtTickspeed=0,guard=0;
  do{
   const c=tickspeedCost();
   if(!canAffordTickspeed(c)||!spendTickspeed(c))break;
   state.tickspeed++;onICTickspeedPurchased(c);
   if(challengeRuleActive(2))challengePurchaseReset();
   if(state.activeChallenge===9)applyChallenge9CostStep(c,-1,true);
   boughtTickspeed++;guard++;
  }while(buyMaxTickspeed&&guard<10000);
  if(boughtTickspeed)changed=true;
 }

 const autobuyerLimitReached=(key,current)=>{
  const raw=state.autobuyers[key];
  if(typeof raw!=='string'||!/^[0-9]+$/.test(raw))return false;
  const limit=Number(raw);
  return Number.isFinite(limit)&&current>=limit;
 };
 const galaxyReady=()=>state.autobuyers.galaxy&&challengeCompleted(11)&&(state.breakInfinityActive||!atInfinity())&&canGalaxy()&&!autobuyerLimitReached('galaxyLimit',state.galaxies);
 const boostReady=()=>state.autobuyers.boost&&challengeCompleted(10)&&(state.breakInfinityActive||!atInfinity())&&canBoost()&&!autobuyerLimitReached('boostLimit',state.boosts);

 if(galaxyReady()&&autobuyerElapsed[10]+1e-9>=intervals[10]){
  const before=state.galaxies;galaxy();
  if(state.galaxies>before){autobuyerElapsed[10]=0;changed=true;}
 }
 if(!options.skipBoost&&boostReady()&&autobuyerElapsed[9]+1e-9>=intervals[9]){
  const didBoost=breakInfinityUpgradeBought('bulkBoost')?bulkBoostAutobuy():boost();
  if(didBoost){autobuyerElapsed[9]=0;changed=true;}
 }

 if(state.completedInfinityChallenges.includes(2)&&state.autobuyers.sacrifice){
  const threshold=Number(state.autobuyers.sacrificeValue),required=Number.isFinite(threshold)&&threshold>1?threshold:2;
  if(sacrificeGainBigNumber().compare(required)>=0){
   const before=sacrificeMultiplierBigNumber();sacrifice(true);
   if(sacrificeMultiplierBigNumber().compare(before)>0)changed=true;
  }
 }
 if(changed)checkAchievements();
 return changed;
}

function tick(now){
 const dt=Math.min(.25,(now-last)/1000);last=now;state.playTime+=dt;updateInfinityDimensionProduction(dt);updateTimeDimensionProduction(dt);updateReplicanti(dt);if(state.infinities>0)state.infinityTime+=dt;
 if(challengeRuleActive(2))state.challenge2Recovery=Math.min(1,state.challenge2Recovery+dt/180);
 if(productionRateBigNumber().compare(matterBigNumber())>0)state.exceedProductionTime+=dt;else state.exceedProductionTime=0;
 if(challengeRuleActive(3))state.challenge3TimeMult=Math.min(INFINITY,state.challenge3TimeMult*Math.pow(1.00038,10*dt));
 if(challengeRuleActive(11)&&state.amount[1]>0)state.challenge11Matter=Math.min(INFINITY,Math.max(1,state.challenge11Matter)*Math.pow(1.03+state.boosts/200+state.galaxies/100,10*dt));if(state.activeInfinityChallenge===6)state.icMatter=Math.min(INFINITY,Math.max(1,state.icMatter)*Math.pow(1.03+state.boosts/200+state.galaxies/100,200*dt));if(state.activeInfinityChallenge===8)state.ic8ProductionMultiplier*=Math.pow(0.8446303389034288,1000*dt);if(state.activeInfinityChallenge===2&&state.amount[7]>0){state.ic2SacrificeTimer+=dt;if(state.ic2SacrificeTimer>=0.4){state.ic2SacrificeTimer%=0.4;sacrifice(true);}}
 if(state.activeChallenge===12){for(let i=7;i>=2;i--){const prod=dimensionProductionBigNumber(i).multiply(0.1*dt);const cur=dimensionAmountBig(i-2);const v=cur.add(prod);setDimensionAmountBig(i-2,v);}}else{for(let i=7;i>=1;i--){if(challengeRuleActive(10)&&i>=6)continue;const prod=dimensionProductionBigNumber(i).multiply(0.1*dt);const cur=dimensionAmountBig(i-1);const v=cur.add(prod);setDimensionAmountBig(i-1,v);}}
 const passiveGain=passiveIPRateBigNumber().multiply(dt);addIPBigNumber(passiveGain);state.totalIPGained=(state.totalIPGained||0)+passiveGain.toNumber();
 if(state.breakInfinityActive&&breakInfinityUpgradeBought('fastestInfinity')&&state.fastestInfinity>0)state.infinities+=dt/(state.fastestInfinity*5);
 {const biIPGain=ipGenerationRateBigNumber().multiply(dt);if(biIPGain.compare(0)>0){addIPBigNumber(biIPGain);state.totalIPGained=(state.totalIPGained||0)+biIPGain.toNumber();}}
 const matterBeforeLog=matterLog();addMatterProduction(productionRateBigNumber(),dt);if(matterLog()>=matterBeforeLog)state.totalAntimatterLog10=Math.max(state.totalAntimatterLog10,matterLog());// Challenge targets are completed by Big Crunch, not automatically on reaching the threshold.
 let challenge11MatterBoosted=false;
 if(challengeRuleActive(11)&&BigNumber.from(state.challenge11Matter).compare(matterBigNumber())>0){state.boosts++;state.challenge11NoBonusBoosts++;state.challenge11Matter=1;setMatterBigNumber(startingAntimatter());state.amount=Array(8).fill(0);state.amountBN=Array(8).fill(null).map(()=>({mantissa:0,exponent:0}));state.bought=Array(8).fill(0);state.tickspeed=0;state.sacrificeMult=1;state.sacrificeMultBN={mantissa:1,exponent:0};state.sacrificedFirst=0;state.sacrificedFirstBN={mantissa:0,exponent:0};autobuyerElapsed[9]=0;challenge11MatterBoosted=true;}
 updateCrunchEfficiencyPeak();runAutobuyers(dt,{skipBoost:challenge11MatterBoosted});checkAchievements();notifyNewAchievements();
 render();updateReplicantiCountdownDisplay();// Infinity Dimension画面は約30fpsで再描画し、数値更新のカクつきを軽減する。
 if(document.body.dataset.screen==='main'&&(mainSubpage==='infinityDimensions'||mainSubpage==='timeDimensions')&&now-lastInfinityDimensionRender>=33){lastInfinityDimensionRender=now;switchScreen('main');}if(document.body.dataset.screen==='infinity'&&infinitySubpage==='replicanti'&&now-lastReplicantiRender>=500){lastReplicantiRender=now;switchScreen('infinity');}if((state.activeChallenge||state.activeInfinityChallenge)&&document.body.dataset.screen==='challenges'&&now-lastRender>500){switchScreen('challenges');}lastRender=now;
 if(now-lastSave>5000){save();lastSave=now;}
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
let hiddenAt=null;
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){hiddenAt=Date.now();save();}
 else if(hiddenAt!==null){
  const elapsed=Math.min(86400,Math.max(0,(Date.now()-hiddenAt)/1000));
  hiddenAt=null;
  applyOfflineProgress(elapsed);
  last=performance.now();
  render();save();
 }
});
window.addEventListener('pagehide',()=>{hiddenAt=Date.now();save();});
window.addEventListener('pageshow',()=>{if(document.visibilityState==='visible'&&hiddenAt!==null){const elapsed=Math.min(86400,Math.max(0,(Date.now()-hiddenAt)/1000));hiddenAt=null;applyOfflineProgress(elapsed);last=performance.now();render();save();}});
window.addEventListener('beforeunload',save);
