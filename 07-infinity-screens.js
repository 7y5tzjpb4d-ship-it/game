function infinityUpgradePrerequisiteMet(index){return index%4===0||state.infinityUpgrades.includes(infinityUpgradeData[index-1][0]);}
function infinityUpgradeCurrentMultiplier(id){return '×'+(id==='unspentBonus'?getIPBigNumber().divide(2).power(1.5).add(1):BigNumber.from(infinityUpgradeMultiplierValue(id))).toDisplayString(2);}
let infinitySubpage='upgrades';
let lastReplicantiRender=0;
let challengeSubpage='normal';
let mainSubpage='main';
let lastInfinityDimensionRender=0;
const infinityDimensionDefs=[
 {unlock:1100,cost:'1e8',growth:1e3,step:50},
 {unlock:1900,cost:'1e9',growth:1e6,step:30},
 {unlock:2400,cost:'1e10',growth:1e8,step:10},
 {unlock:10500,cost:'1e20',growth:1e10,step:5},
 {unlock:30000,cost:'1e140',growth:1e15,step:5},
 {unlock:45000,cost:'1e200',growth:1e20,step:5},
 {unlock:54000,cost:'1e250',growth:1e25,step:5},
 {unlock:60000,cost:'1e280',growth:1e30,step:5}
];
// IC / ID の新規解禁を検出し、画面を見ていなくても通知を表示する。
let observedICUnlocks=null;
let observedIDUnlocks=null;
function showContentUnlockToast(title,name,desc){
 let container=document.querySelector('.achievement-toast-container');
 if(!container){container=document.createElement('div');container.className='achievement-toast-container';container.setAttribute('aria-live','polite');document.body.appendChild(container);}
 const toast=document.createElement('div');toast.className='achievement-toast content-unlock-toast';
 const heading=document.createElement('div');heading.className='achievement-toast-title';heading.textContent=title;
 const label=document.createElement('div');label.className='achievement-toast-name';label.textContent=name;
 const detail=document.createElement('div');detail.className='achievement-toast-desc';detail.textContent=desc;
 toast.append(heading,label,detail);container.appendChild(toast);
 setTimeout(()=>{toast.style.transition='opacity .25s, transform .25s';toast.style.opacity='0';toast.style.transform='translateX(20px)';setTimeout(()=>toast.remove(),300);},5000);
}
function notifyNewContentUnlocks(){
 const icNow=infinityChallengeData.map(c=>infinityChallengeUnlocked(c.id));
 const idNow=infinityDimensionDefs.map((d,i)=>infinityDimensionUnlocked(i));
 // 初回はロード済みデータを基準値にし、セーブ読込直後に通知が大量発生するのを防ぐ。
 if(observedICUnlocks===null||observedIDUnlocks===null){observedICUnlocks=icNow;observedIDUnlocks=idNow;return;}
 icNow.forEach((unlocked,i)=>{if(unlocked&&!observedICUnlocks[i]){const c=infinityChallengeData[i];showContentUnlockToast('Infinity Challenge Unlocked!',`IC${c.id}: ${c.name}`,`解禁条件 ${c.unlock} Antimatter を達成しました。Challenge画面から挑戦できます。`);}});
 idNow.forEach((unlocked,i)=>{if(unlocked&&!observedIDUnlocks[i]){showContentUnlockToast('Infinity Dimension Unlocked!',`Infinity Dimension ${i+1}`,`解禁条件 1e${infinityDimensionDefs[i].unlock} Antimatter を達成しました。Infinity Dimension画面で確認できます。`);}});
 observedICUnlocks=icNow;observedIDUnlocks=idNow;
}

function infinityDimensionUnlocked(i){const def=infinityDimensionDefs[i];if(!def||Number(state.totalAntimatterLog10||0)<def.unlock)return false;if(i===0&&!hasIPAtLeast('1e8'))return false;return true;}
function ensureInfinityDimensionState(){
 if(!Array.isArray(state.infinityDimensions))state.infinityDimensions=[];
 state.infinityDimensions=Array.from({length:8},(_,i)=>{const d=state.infinityDimensions[i]||{};const amount=BigNumber.from(d.amount||0).max(0);let bought=Math.max(0,Math.floor(Number(d.bought)||0));/* Migrate legacy saves where bought counted 10-unit purchases rather than individual dimensions. */if(bought>0&&bought<10&&amount.compare(10)>=0)bought*=10;/* ID unlocks are permanent: never relock a dimension that was already unlocked. */return {amount:amount.toJSON(),bought,unlocked:Boolean(d.unlocked)||infinityDimensionUnlocked(i)};});
 if(!state.infinityPowerBN||!Number.isFinite(Number(state.infinityPowerBN.exponent)))state.infinityPowerBN=BigNumber.from(0).toJSON();
 state.infinityDimensions.forEach((d,i)=>{d.unlocked=Boolean(d.unlocked)||infinityDimensionUnlocked(i);});
}
function infinityDimensionAmount(i){ensureInfinityDimensionState();return BigNumber.from(state.infinityDimensions[i].amount||0).max(0);}
function infinityDimensionCost(i){ensureInfinityDimensionState();const d=state.infinityDimensions[i],def=infinityDimensionDefs[i],batches=Math.floor(d.bought/10);return BigNumber.from(def.cost).multiply(BigNumber.from(def.growth).power(batches));}
function infinityDimensionMultiplier(i){ensureInfinityDimensionState();return infinityDimensionProductionMultiplier().multiply(BigNumber.from(infinityDimensionDefs[i].step).power(Math.floor(state.infinityDimensions[i].bought/10)));}
function canBuyInfinityDimension(i){ensureInfinityDimensionState();return state.infinityDimensions[i].unlocked&&hasIPAtLeast(infinityDimensionCost(i));}
function buyInfinityDimension(i){ensureInfinityDimensionState();if(i<0||i>7||!canBuyInfinityDimension(i))return false;const cost=infinityDimensionCost(i);if(!spendIPBigNumber(cost))return false;const d=state.infinityDimensions[i];d.amount=BigNumber.from(d.amount).add(10).toJSON();d.bought+=10;save();if(document.body.dataset.screen==='main'&&mainSubpage==='infinityDimensions')switchScreen('main');return true;}
function fmtIDCost(n){const b=BigNumber.from(n);if(b.mantissa===0)return '0.00';if(b.exponent<3&&b.exponent>=-2)return b.toNumber().toFixed(2);return `${b.mantissa.toFixed(2)}e${b.exponent}`;}
function infinityDimensionView(){ensureInfinityDimensionState();const power=BigNumber.from(state.infinityPowerBN||0);return `<div class="id-screen"><h2>Infinity Dimensions</h2><p>Infinity Power：<strong>${fmtBig(power)}</strong>　通常次元への倍率：<strong>×${fmtBig(power.max(1).power(7))}</strong></p><p class="id-explain">Infinity DimensionはIPで10個ずつ購入します。第1次元はInfinity Powerを生産し、第2〜第8次元は1つ下の段階を生産します。</p><div class="id-dimension-list">${infinityDimensionDefs.map((def,i)=>{const d=state.infinityDimensions[i],amount=infinityDimensionAmount(i),cost=infinityDimensionCost(i),unlocked=d.unlocked;return `<article class="id-dimension ${unlocked?'':'id-locked'}"><div class="id-tier">${i+1}</div><div class="id-details"><strong>Infinity Dimension ${i+1}</strong><span>所持数：${fmtBig(amount)}（購入 ${fmt(d.bought)}）</span><span>×${fmtBig(infinityDimensionMultiplier(i))}</span><span>${unlocked?``:`解放条件：反物質 1e${def.unlock}`}</span></div><button type="button" class="buy id-buy" data-buy-id="${i}" ${canBuyInfinityDimension(i)?'':'disabled'}>${unlocked?`<small>コスト：${fmtIDCost(cost)} IP</small>`:'ロック中'}</button></article>`;}).join('')}</div></div>`;}

function timeShardsFreeTickspeedInfo(){
  const shards=BigNumber.from(state.timeShardsBN||0).max(0);
  let count=0;
  // Free Tickspeed upgrades are awarded at successive Time Shard thresholds.
  // First threshold is 1e3 shards; each subsequent threshold is 1.33x the previous.
  let next=BigNumber.from(1);
  while(count<100000 && shards.compare(next)>=0){
    count++;
    next=next.multiply(BigNumber.from('1.33'));
  }
  return {count,next};
}
function timeDimensionView(){const ep=getEPBigNumber();const shards=BigNumber.from(state.timeShardsBN||0);const freeTS=timeShardsFreeTickspeedInfo();return `<div class="td-screen"><h2>Time Dimensions</h2><div class="td-summary">Time Shards：<strong>${fmtBig(shards)}</strong><br>Time ShardsによるTickspeedアップグレード：<strong>${fmt(freeTS.count)} 回</strong><br>次のTickspeedアップグレードまで：<strong>${fmtBig(freeTS.next)} Time Shards</strong></div><p>時間次元はEPで購入し、下位の時間次元とTime Shardsを生産します。</p><div class="td-list">${timeDimensionBaseCosts.map((base,i)=>{const d=state.timeDimensions[i]||{amount:0,bought:0};const cost=timeDimensionCost(i);return `<article class="td-row"><div class="td-tier">${i+1}</div><div class="td-info"><strong>${i+1}th Time Dimension</strong><span>所持数：${fmtBig(BigNumber.from(d.amount||0))} · 購入数：${fmt(d.bought||0)}</span><span>倍率：×${fmtBig(timeDimensionMultiplier(i))}</span></div><button type="button" class="td-buy" data-buy-td="${i}" ${canBuyTimeDimension(i)?'':'disabled'}><small>コスト：${fmtBig(cost)} EP</small>購入</button></article>`;}).join('')}</div></div>`;}
function replicantiInfinityDimensionMultiplier(){if(!state.replicantiUnlocked)return BigNumber.from(1);const r=Math.max(1,Number(state.replicanti)||1);const log2=Math.log2(r);return BigNumber.from(Math.max(1,log2*log2));}
function infinityDimensionProductionMultiplier(){let mult=BigNumber.from(1);if(infinityChallengeCompleted(1))mult=mult.multiply(BigNumber.from(1.3).power(state.completedInfinityChallenges.length));if(infinityChallengeCompleted(6))mult=mult.multiply(tickspeedMultiplierBigNumber().max(1).power(0.0005));if(hasAchievement(75))mult=mult.multiply(achievementMultiplier());return mult.multiply(replicantiInfinityDimensionMultiplier());}
function replicantiChanceCost(){return BigNumber.fromLog10(150+15*state.replicantiChanceUpgrades);}
function replicantiIntervalCost(){return BigNumber.fromLog10(140+10*state.replicantiIntervalUpgrades);}
function replicantiGalaxyCost(){
 const n=Math.max(0,Math.floor(Number(state.replicantiGalaxyUpgrades)||0));
 let logCost=170+25*n+5*n*(n-1)/2;
 const distinctStart=100;
 if(n>=distinctStart){
  const distinct=n-distinctStart;
  logCost+=50*distinct*(distinct-1+2*5)/2;
 }
 const remoteStart=1000;
 if(n>=remoteStart){
  const remote=n-remoteStart;
  logCost+=5*remote*(remote+1)*(2*remote+1)/6;
 }
 return BigNumber.fromLog10(logCost);
}
function unlockReplicanti(){if(state.replicantiUnlocked||!hasIPAtLeast('1e140'))return;spendIPBigNumber('1e140');state.replicantiUnlocked=true;state.replicanti=1;state.replicantiTimer=0;save();switchScreen('infinity');}
function buyReplicantiUpgrade(type){if(!state.replicantiUnlocked)return;if(type==='chance'){if(state.replicantiChanceUpgrades>=99||!hasIPAtLeast(replicantiChanceCost()))return;spendIPBigNumber(replicantiChanceCost());state.replicantiChanceUpgrades++;state.replicantiChance= Math.min(100,1+state.replicantiChanceUpgrades);}else if(type==='interval'){if(state.replicantiInterval<=50||!hasIPAtLeast(replicantiIntervalCost()))return;spendIPBigNumber(replicantiIntervalCost());state.replicantiIntervalUpgrades++;state.replicantiInterval=Math.max(50,1000*Math.pow(.9,state.replicantiIntervalUpgrades));}else if(type==='galaxy'){if(!hasIPAtLeast(replicantiGalaxyCost()))return;spendIPBigNumber(replicantiGalaxyCost());state.replicantiGalaxyUpgrades++;}save();switchScreen('infinity');}
function buyReplicantiGalaxy(){if(!state.replicantiUnlocked||state.replicanti<Number.MAX_VALUE||state.replicantiGalaxies>=state.replicantiGalaxyUpgrades)return;state.replicantiGalaxies++;state.replicanti=1;state.replicantiTimer=0;galaxyResetForReplicanti();save();switchScreen('infinity');}
function galaxyResetForReplicanti(){
 // Keep the Replicanti Galaxy count, but mirror the normal Galaxy reset effects.
 autobuyerElapsed[10]=0;
 resetDimensionAutobuyerTicksAfterPrestige();
 if(state.activeChallenge===9){
  state.challenge9CostSteps=Array(8).fill(0);
  state.challenge9TickspeedCostBumps=0;
 }
 if(challengeRuleActive(3))state.challenge3TimeMult=1;
 if(state.activeInfinityChallenge===4)state.icLastBoughtDimension=-1;
 if(state.activeInfinityChallenge===5)state.ic5CostSteps=Array(8).fill(0);
 setMatterBigNumber(startingAntimatter());
 state.amount=Array(8).fill(0);
 state.amountBN=Array(8).fill(null).map(()=>({mantissa:0,exponent:0}));
 state.bought=Array(8).fill(0);
 state.boosts=(state.activeChallenge||state.activeInfinityChallenge)?0:startingBoosts();
 // tickspeed.js resetTickspeed(): reset purchased Tickspeed and NC9's extra cost bumps.
 state.tickspeed=0;
 if(state.activeChallenge===9)state.challenge9TickspeedCostBumps=0;
 state.sacrificeMult=1;
 state.sacrificeMultBN={mantissa:1,exponent:0};
 state.sacrificedFirst=0;
 state.sacrificedFirstBN={mantissa:0,exponent:0};
}
function replicantiSecondsRemaining(){if(!state.replicantiUnlocked)return null;const r=Math.max(1,Number(state.replicanti)||1);if(r>=Number.MAX_VALUE)return 0;const chance=Math.max(0,Math.min(100,Number(state.replicantiChance)||0))/100;const interval=Math.max(50,Number(state.replicantiInterval)||1000)/1000;if(chance<=0)return Infinity;const logGrowth=Math.log1p(chance);if(!(logGrowth>0))return Infinity;const seconds=(Math.log(Number.MAX_VALUE)-Math.log(r))*interval/logGrowth;return Number.isFinite(seconds)&&seconds>=0?seconds:Infinity;}
function formatReplicantiTimeRemaining(){const seconds=replicantiSecondsRemaining();if(seconds===null)return '未解放';if(seconds===0)return '到達済み';if(!Number.isFinite(seconds))return '計算不可';if(seconds<60)return `${seconds.toFixed(1)} 秒`;const total=Math.ceil(seconds);const days=Math.floor(total/86400),hours=Math.floor(total%86400/3600),minutes=Math.floor(total%3600/60),secs=total%60;if(days>0)return `${days}日 ${hours}時間 ${minutes}分 ${secs}秒`;if(hours>0)return `${hours}時間 ${minutes}分 ${secs}秒`;if(minutes>0)return `${minutes}分 ${secs}秒`;return `${secs}秒`;}
function updateReplicantiCountdownDisplay(){if(document.body.dataset.screen!=='infinity'||infinitySubpage!=='replicanti')return;const el=document.getElementById('replicanti-time-remaining');if(el)el.textContent=formatReplicantiTimeRemaining();}
function sampleReplicantiGrowth(amount,probability){const n=Math.max(1,Math.floor(amount));const p=Math.max(0,Math.min(1,probability));if(p<=0)return 0;let gained=0;for(let i=0;i<n;i++)if(Math.random()<p)gained++;return gained;}
function updateReplicanti(dt){if(!state.replicantiUnlocked||dt<=0)return;state.replicantiTimer+=dt*1000;const interval=Math.max(50,state.replicantiInterval);if(state.replicantiTimer<interval){checkReplicantiAchievement();return;}const ticks=Math.min(1000,Math.floor(state.replicantiTimer/interval));state.replicantiTimer-=ticks*interval;const p=Math.max(0,Math.min(1,state.replicantiChance/100));let r=Math.max(1,state.replicanti);if(r>=Number.MAX_VALUE){state.replicanti=Number.MAX_VALUE;state.replicantiTimer=0;checkReplicantiAchievement();return;}if(ticks>=100||(r*p)>=10){const logNext=Math.log(r)+ticks*Math.log1p(p);state.replicanti=logNext>=Math.log(Number.MAX_VALUE)?Number.MAX_VALUE:Math.max(1,Math.exp(logNext));if(state.replicanti>=Number.MAX_VALUE)state.replicantiTimer=0;}else{for(let k=0;k<ticks;k++){r=Math.max(1,state.replicanti);if(r>=Number.MAX_VALUE){state.replicanti=Number.MAX_VALUE;state.replicantiTimer=0;break;}if(r*(p)<10){const gained=sampleReplicantiGrowth(r,p);state.replicanti=Math.min(Number.MAX_VALUE,r+gained);}else{const logNext=Math.log(r)+Math.log1p(p);state.replicanti=logNext>=Math.log(Number.MAX_VALUE)?Number.MAX_VALUE:Math.exp(logNext);if(state.replicanti>=Number.MAX_VALUE)state.replicantiTimer=0;}}}checkReplicantiAchievement();}
function replicantiView(){const unlocked=state.replicantiUnlocked;const r=Math.max(1,state.replicanti||1);const maxGal=Math.max(state.replicantiGalaxyUpgrades,hasAchievement(95)?1:0);if(!unlocked)return `<div class="replicanti-screen"><h2>Replicanti</h2><button type="button" class="replicanti-primary" data-rep-action="unlock" ${hasIPAtLeast('1e140')?'':'disabled'}>Replicantiを解放（1e140 IP）</button></div>`;return `<div class="replicanti-screen"><h2>Replicanti</h2><div class="replicanti-count"><small>所持Replicanti</small><strong>${r>=Number.MAX_VALUE?'1.80e308（上限）':fmt(r)}</strong><span>Infinity Dimension倍率：×${fmtBig(replicantiInfinityDimensionMultiplier())}</span></div><div class="replicanti-time-estimate">1.8e308到達まで：<strong id="replicanti-time-remaining">${formatReplicantiTimeRemaining()}</strong></div><div class="replicanti-upgrades"><button type="button" class="${state.replicantiChanceUpgrades<99&&hasIPAtLeast(replicantiChanceCost())?'available':''}" data-rep-action="chance" ${state.replicantiChanceUpgrades>=99||!hasIPAtLeast(replicantiChanceCost())?'disabled':''}><strong>増殖確率</strong><span>現在：${state.replicantiChance}%</span><small>+1% · コスト：${fmtBig(replicantiChanceCost())} IP</small></button><button type="button" class="${state.replicantiInterval>50&&hasIPAtLeast(replicantiIntervalCost())?'available':''}" data-rep-action="interval" ${state.replicantiInterval<=50||!hasIPAtLeast(replicantiIntervalCost())?'disabled':''}><strong>増殖間隔</strong><span>現在：${state.replicantiInterval.toFixed(1)} ms</span><small>×0.9 · コスト：${fmtBig(replicantiIntervalCost())} IP</small></button><button type="button" class="${hasIPAtLeast(replicantiGalaxyCost())?'available':''}" data-rep-action="galaxy" ${!hasIPAtLeast(replicantiGalaxyCost())?'disabled':''}><strong>最大Replicanti Galaxy</strong><span>現在：${state.replicantiGalaxies} / ${maxGal}</span><small>上限+1 · コスト：${fmtBig(replicantiGalaxyCost())} IP</small></button></div><div class="replicanti-galaxy"><strong>Replicanti Galaxy：${state.replicantiGalaxies}</strong><p>${r>=Number.MAX_VALUE?'Replicantiが上限に到達しました。Galaxyを購入できます。':'1.80e308に到達すると購入できます。'}</p><button type="button" class="replicanti-primary" data-rep-action="buyGalaxy" ${r>=Number.MAX_VALUE&&state.replicantiGalaxies<maxGal?'':'disabled'}>Replicanti Galaxyを獲得</button></div></div>`;}
function updateInfinityDimensionProduction(dt){ensureInfinityDimensionState();if(!(dt>0))return;for(let i=7;i>=1;i--){const source=infinityDimensionAmount(i);const produced=source.multiply(BigNumber.from(dt/10).multiply(infinityDimensionMultiplier(i)));const targetAmount=infinityDimensionAmount(i-1).add(produced).toJSON();/* infinityDimensionAmount()/infinityDimensionMultiplier() normalize the array by replacing it; compute the RHS first so we don't assign into a stale array object. */state.infinityDimensions[i-1].amount=targetAmount;}let producedPower=infinityDimensionAmount(0).multiply(BigNumber.from(dt).multiply(infinityDimensionMultiplier(0)));if(hasAchievement(94))producedPower=producedPower.multiply(2);state.infinityPowerBN=BigNumber.from(state.infinityPowerBN||0).add(producedPower).toJSON();}
function breakInfinityView(){
 const active=Boolean(state.breakInfinityActive);
 const oneTime=breakInfinityUpgradeData().map(([id,name,desc,cost])=>{
  const bought=breakInfinityUpgradeBought(id),can=active&&!bought&&hasIPAtLeast(cost);
  const showMultiplier=['totalAM','currentAM','infinities','slowestChallenge','achievements'].includes(id);
  return `<button type="button" class="infinity-upgrade-btn ${bought?'purchased':''}" data-bi-upgrade="${id}" ${can?'':'disabled'}><strong>${name}</strong><span>${desc}</span>${id==='fastestInfinity'?`<span class="bi-generation-time" data-bi-generation-time>${state.fastestInfinity>0?Number(state.fastestInfinity*5).toFixed(1)+'秒':'未記録'}</span>`:''}${showMultiplier?`<span data-bi-current-multiplier="${id}">現在の倍率：×${fmtFixedBig(breakInfinityUpgradeEffectBigNumber(id),2)}</span>`:''}<small>${bought?'購入済み':`コスト：${fmt(cost)} IP`}</small></button>`;
 }).join('');
 const repeatables=breakInfinityRepeatableData().map(([id,name,desc,baseCost,mult])=>{
  const index=id==='tickspeedCost'?0:id==='dimensionCost'?1:2;
  const level=state.breakInfinityRepeatables[index]||0;
  const cost=baseCost*Math.pow(mult,level),max=index===2?10:index===0?8:7;
  const currentScaling=index===0?Math.max(2,10-level):index===1?Math.max(3,10-level):null;
  return `<button type="button" class="infinity-upgrade-btn ${level>=max?'purchased':''}" data-bi-repeat="${index}" ${!active||level>=max||!hasIPAtLeast(cost)?'disabled':''}><strong>${name}</strong><span>${desc}</span>${currentScaling!==null?`<span>現在倍率：×${currentScaling}</span>`:''}${index===2?`<span data-bi-ip-generation-minute>現在の生成量：${fmtBig(bestRecentIPPerMinuteBigNumber().multiply(level*0.05))} IP/分</span>`:''}<small>${level>=max?'最大レベル':`コスト：${fmt(cost)} IP`}</small></button>`;
 }).join('');
 return `<h2>Break Infinity</h2>
 <p>所持IP：<strong>${getIPBigNumber().toDisplayString(3)}</strong> · Infinity回数：${fmt(state.infinities)}</p>
 ${!state.breakInfinityUnlocked?`<div class="infinity-upgrade-grid" style="grid-template-columns:1fr"><button type="button" class="infinity-upgrade-btn" id="biUnlockPanel" style="width:100%;grid-column:1/-1" ${breakInfinityCanUnlock()?'':'disabled'}><strong>Break Infinity：ロック中</strong><span>解禁条件：Auto Crunchの購入間隔を0.1秒まで強化する</span> <small>${breakInfinityCanUnlock()?'パネルを押して解禁':'ロック中'}</small></button></div>`:
 `<div class="infinity-upgrade-grid break-infinity-upgrade-grid">${oneTime}${repeatables}</div>`}`;
}
function infinityUpgradeView(){const unlocked=state.infinities>0;const cards=[0,4,8,12,1,5,9,13,2,6,10,14,3,7,11,15].map(i=>({u:infinityUpgradeData[i],i})).map(({u,i})=>{const bought=state.infinityUpgrades.includes(u[0]);const prerequisite=infinityUpgradePrerequisiteMet(i);const canBuy=unlocked&&!bought&&prerequisite&&hasIPAtLeast(u[3]);const showMultiplier=!['resetBoost','dimMult','galaxyBoost','resetMult','passiveGen','skipReset1','skipReset2','skipReset3','skipResetGalaxy'].includes(u[0]);return `<button type="button" class="infinity-upgrade-btn ${bought?'purchased':''}" data-infinity-upgrade="${u[0]}" ${canBuy?'':'disabled'}><strong>${u[1]}</strong><span>${u[2]}</span>${u[0]==='passiveGen'?`<span data-passive-ip-minute>1分あたりの獲得量：${state.fastestInfinity>0?fmtFixed(60*passiveIPRate(),3)+' IP':'最速Infinity記録後に表示'}</span>`:''}${showMultiplier?`<span data-current-multiplier="${u[0]}">現在の倍率：${infinityUpgradeCurrentMultiplier(u[0])}</span>`:''}<small>${bought?'購入済み':!prerequisite?'上のアップグレードが必要':`コスト：${u[3]} IP`}</small></button>`}).join('');return `<h2>Infinity Upgrades</h2><p>所持IP：<strong>${getIPBigNumber().toDisplayString(3)}</strong> · Infinity回数：${fmt(state.infinities)}</p><div class="infinity-upgrade-grid">${cards}</div>${state.achievements[achievementIndex(41)]?`<div class="infinity-extra-upgrades"><button type="button" class="infinity-upgrade-btn ${state.ipOffline?'purchased':''}" data-infinity-extra="ipOffline" ${unlocked&&!state.ipOffline&&hasIPAtLeast(1000)?'':'disabled'}><strong>Offline IP</strong><span>オフライン中のみ、最高IP/分の50%を獲得</span><span data-ip-offline-minute>オフライン時：${fmtBig(bestIPPerMinuteBigNumber().multiply(0.5))} IP/分（最高IP/分の50%）</span><small>${state.ipOffline?'購入済み':'コスト：1,000 IP'}</small></button><button type="button" class="infinity-upgrade-btn" data-infinity-extra="ipMult" ${unlocked&&hasIPAtLeast(ipMultiplierCostBigNumber())?'':'disabled'}><strong>IP Multiplier</strong><span>IP獲得量 ×${BigNumber.fromLog10((Math.max(0,Math.floor(Number(state.ipMultLevel)||0))+1)*Math.log10(2)).toDisplayString(2)}</span><small>コスト：${ipMultiplierCostBigNumber().toDisplayString(2)} IP</small></button></div>`:''}` }
function formatPlayTime(seconds){const total=Math.max(0,Math.floor((Number(seconds)||0)*10)/10);const d=Math.floor(total/86400),h=Math.floor(total%86400/3600),m=Math.floor(total%3600/60),s=total%60;return (d?d+'日 ':'')+h+'時間 '+m+'分 '+s.toFixed(1)+'秒';}

// Time Studies: tree, Time Theorem purchases, path restrictions and respec.
// The tree/cost/prerequisite data follows the supplied wiki references. Study effects
// are intentionally kept separate from this UI implementation.
const timeStudyData = [
 [11,1,[],'Tickspeedの効果が1st Time Dimensionにも及ぶ','base'],
 [21,3,[11],'Replicantiの計算式が変化','base'],[22,2,[11],'Replicantiの最短増殖速度が50ms→1msに短縮','base'],
 [31,3,[21],'Infinityに到達した回数を参照するアップグレードの効果が向上','base'],[32,2,[22],'Dimension Boostの回数に応じてInfinity到達回数が割増される','base'],[33,2,[22],'Big Crunchの際Replicanti Galaxyの半分を引き継ぐ','base'],
 [41,4,[31],'所持しているGalaxy1つごとにInfinity Pointの獲得量1.2倍','base'],[42,6,[32],'Galaxy購入に必要な第8次元の数が減少','base'],
 [51,3,[41,42],'Infinity Pointの獲得量が1e15倍になる','base'],[61,3,[51],'Eternity Pointの獲得量が15倍になる','base'],[62,3,[42],'Replicantiの増加速度が3倍になる（EC5をクリア済みの場合）','ec5'],
 [71,4,[61],'Sacrificeの効果が他の全てのAntimatter Dimensionに及ぶ','antimatter'],[72,6,[61],'Sacrificeの効果が4th Infinity Dimensionに及ぶ','infinity'],[73,5,[61],'Sacrificeの効果が3rd Time Dimensionに及ぶ','time'],
 [81,4,[71],'Dimension Boostの基本倍率が×10になる','antimatter'],[82,6,[72],'Dimension Boostの効果がInfinity Dimensionにも及ぶ','infinity'],[83,5,[73],'無料Tickspeed Upgradeの数に応じてDimension Boostの倍率が上昇する','time'],
 [91,4,[81],'このEternityでの経過時間に応じてAntimatter Dimensionの倍率が上昇する','antimatter'],[92,5,[82],'最速Eternityの記録に応じてInfinity Dimensionの倍率が上昇する','infinity'],[93,7,[83],'無料Tickspeed Upgradeの数に応じてTime Dimensionの倍率が上昇する','time'],
 [101,4,[91],'Replicantiの量に応じてAntimatter Dimensionの倍率が上昇する','antimatter'],[102,6,[92],'Replicanti Galaxyの数に応じてReplicantiの倍率が上昇する','infinity'],[103,6,[93],'Replicanti Galaxyの数に応じてTime Dimensionの倍率が上昇する','time'],
 [111,12,[101,102,103],'Infinity Pointの計算式が変化する','base'],
 [121,9,[111],'最後の10回のEternityが短いほど獲得EPが増加する（上限×50）','active'],[122,9,[111],'獲得EPが35倍になる','passive'],[123,9,[111],'このEternityでの経過時間に応じて獲得EPが増加する','idle'],
 [131,5,[121],'自動Replicanti Galaxy購入が無効になる代わりにReplicanti Galaxyを50%多く獲得する','active'],[132,5,[122],'Replicanti Galaxyの効果が40%上昇し、Replicantiの増加速度が1.5倍になる','passive'],[133,5,[123],'Replicantiの増加速度が10分の1になる代わりに、Replicanti Galaxyの効果が50%上昇する','idle'],
 [141,4,[131],'このInfinity中、IP倍率が時間経過で減衰する','active'],[142,4,[132],'Infinity Pointの獲得量が1e25倍になる','passive'],[143,4,[133],'このInfinity中、IP倍率が時間経過で上昇する','idle'],
 [151,8,[141,142,143],'全てのTime Dimensionの効果が1e4倍になる','base'],[161,7,[151],'Antimatter Dimensionの効果が1e616倍になる','base'],[162,7,[151],'Infinity Dimensionの効果が1e11倍になる','base'],
 [171,15,[161,162],'Time ShardによるTickspeed Upgradeの必要量の増加倍率が1.33倍から1.25倍に緩和される','base'],[181,200,[171],'Big Crunchで獲得するIPの1%を毎秒獲得する','base'],
 [191,400,[181],'Eternity時にInfinity到達回数の5%をBanked Infinitiesとして保持する','base'],[192,730,[181],'Replicantiの上限が1.8e308を超えて増加するようになる','base'],[193,300,[181],'Eternity回数に応じてAntimatter Dimensionの効果が上昇する（上限1e13000倍）','base'],
 [201,900,[192],'7～10行目のDimensionルートを2つ選択できるようになる','base'],
 [211,120,[191],'Dimension Boostに必要なコストの増加数が5減少する','base'],[212,150,[191],'Time Shardの量に応じてGalaxyの効果が上昇する','base'],[213,200,[193],'Replicantiの増加速度が20倍になる','base'],[214,120,[193],'Sacrificeの効果が強化され、8th Antimatter Dimensionの効果が上昇する（上限1e125000倍）','base'],
 [221,900,[211],'Dimension Boostの回数に応じてTime Dimensionの倍率が上昇する','light'],[222,900,[211],'Dimension Boostに必要なコストの増加数がさらに2減少する','dark'],
 [223,900,[212],'Galaxy購入コストの増加段階が始まるタイミングが7 Galaxy分遅くなる','light'],[224,900,[212],'Dimension Boostの回数に応じてGalaxy購入コストの増加段階が遅くなる（2000 Boostごと）','dark'],
 [225,900,[213],'Replicantiの量に応じて追加のReplicanti Galaxyを獲得する','light'],[226,900,[213],'購入済みReplicanti Galaxy Upgradeの最大数に応じて追加のReplicanti Galaxyを獲得する','dark'],
 [227,900,[214],'Sacrificeの効果が4th Time Dimensionにも及ぶ','light'],[228,900,[214],'Sacrificeの計算式が強化される','dark'],
 [231,500,[221,222],'Dimension Boostの回数に応じてDimension Boostの効果が上昇する','lightdark'],[232,500,[223,224],'通常Galaxyの数に応じてGalaxyの効果が上昇する','lightdark'],
 [233,500,[225,226],'Replicantiの量に応じてReplicanti Galaxy最大数Upgradeのコストが減少する','lightdark'],[234,500,[227,228],'Sacrificeの効果が1st Antimatter Dimensionにも及ぶ','lightdark']
];
const tsById = new Map(timeStudyData.map(s=>[s[0],s]));
