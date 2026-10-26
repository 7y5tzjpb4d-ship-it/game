// Time Dimension prices and per-purchase price multipliers, based on the TD reference tables.
const timeDimensionBaseCosts=[
  BigNumber.from(1), BigNumber.from(5), BigNumber.from(100), BigNumber.from(1000),
  BigNumber.from('1e2350'), BigNumber.from('1e2650'), BigNumber.from('1e3000'), BigNumber.from('1e3350')
];
const timeDimensionPriceMultipliers=[3,9,27,81,24300,72900,218700,656100];
function timeDimensionCost(tier){
  const d=state.timeDimensions[tier];
  const bought=Math.max(0,Math.floor(Number(d?.bought)||0));
  const ep=getEPBigNumber();
  let priceMult=timeDimensionPriceMultipliers[tier];
  // The first two retroactive scaling thresholds affect TD1–4; the 1e6000
  // scaling increase affects every TD and is not retroactive in the reference.
  if(tier<4 && ep.compare(BigNumber.from('1.8e308'))>=0) priceMult*=1.5;
  if(tier<4 && ep.compare(BigNumber.from('1e1300'))>=0) priceMult=timeDimensionPriceMultipliers[tier]*2.2;
  if(ep.compare(BigNumber.from('1e6000'))>=0) priceMult=Math.pow(priceMult,4);
  return timeDimensionBaseCosts[tier].multiply(BigNumber.from(priceMult).power(bought));
}
function timeDimensionMultiplier(tier){const d=state.timeDimensions[tier];return BigNumber.from(4).power(Math.max(0,Math.floor((Number(d?.bought)||0))));}
function canBuyTimeDimension(tier){return state.eternities>0&&tier>=0&&tier<8&&getEPBigNumber().compare(timeDimensionCost(tier))>=0;}
function buyTimeDimension(tier){if(!canBuyTimeDimension(tier))return false;const cost=timeDimensionCost(tier);if(getEPBigNumber().compare(cost)<0)return false;setEPBigNumber(getEPBigNumber().subtract(cost));const d=state.timeDimensions[tier];d.bought=(Number(d.bought)||0)+1;d.amount=(Number(d.amount)||0)+1;d.multiplier=timeDimensionMultiplier(tier).toJSON();save();if(document.body.dataset.screen==='main'&&mainSubpage==='timeDimensions')switchScreen('main');return true;}
function updateTimeDimensionProduction(dt){if(state.eternities<=0||!(dt>0))return;const td=state.timeDimensions;for(let i=7;i>=1;i--){const source=td[i];if(source&&source.amount>0){const prod=BigNumber.from(source.amount).multiply(timeDimensionMultiplier(i)).multiply(dt);td[i-1].amount=BigNumber.from(td[i-1].amount||0).add(prod).toNumber();}}if(td[0]&&td[0].amount>0){state.timeShardsBN=BigNumber.from(state.timeShardsBN||0).add(BigNumber.from(td[0].amount).multiply(timeDimensionMultiplier(0)).multiply(dt)).toJSON();}}
function ipMultiplierCostBigNumber(){const level=Math.max(0,Math.floor(Number(state.ipMultLevel)||0));return BigNumber.fromLog10(level+1); }
function syncBigNumberState(){state.bigNumber={matter:matterDisplayBig(),productionRate:productionRateBigNumber(),ip:getIPBigNumber(),tickspeedPurchases:BigNumber.from(state.tickspeed),tickspeedCost:tickspeedCostBigNumber(),tickspeedMultiplier:tickspeedMultiplierBigNumber(),sacrificeMultiplier:sacrificeMultiplierBigNumber(),dimensionMultipliers:Array.from({length:8},(_,i)=>dimensionMultiplierBigNumber(i)),dimensionProduction:Array.from({length:8},(_,i)=>dimensionProductionBigNumber(i)),dimensionCosts:Array.from({length:8},(_,i)=>costBigNumber(i)),infinityUpgradeMultipliers:Object.fromEntries(infinityUpgradeDataSafe().map(id=>[id,infinityUpgradeMultiplierBigNumber(id)])),breakInfinityUpgradeMultipliers:Object.fromEntries(breakInfinityUpgradeData().map(([id])=>[id,breakInfinityUpgradeEffectBigNumber(id)]))};}
function infinityUpgradeDataSafe(){return ['timeMult','18Mult','36Mult','resetBoost','dimMult','27Mult','45Mult','galaxyBoost','timeMult2','unspentBonus','resetMult','passiveGen','skipReset1','skipReset2','skipReset3','skipResetGalaxy'];}
function atInfinity(){
 // Break Infinity解放直後は反物質がNumber.MAX_VALUEそのものに固定されている場合がある。
 // strict > 判定だと、BigNumberの加算が小さな生産量を丸め落とした際にCrunch不能になる。
 // Infinity到達条件は境界値以上（>=）とし、通常モードの従来判定は維持する。
 return state.breakInfinityActive ? matterBigNumber().compare(INFINITY)>=0 : state.matter>=INFINITY*0.999;
}
function matterBigNumber(){
 const bn=state.matterBN&&typeof state.matterBN==='object'&&Number.isFinite(Number(state.matterBN.mantissa))&&Number.isFinite(Number(state.matterBN.exponent))?BigNumber.from(state.matterBN):null;
 if(bn&&bn.mantissa>=0){state.matterLog10=bn.mantissa>0?bn.log10():0;state.matter=bn.toNumber();return bn;}
 const legacy=BigNumber.from(Math.max(0,Number(state.matter)||0));state.matterBN=legacy.toJSON();state.matterLog10=legacy.mantissa>0?legacy.log10():0;return legacy;
}
function matterLog(){return matterBigNumber().log10()||0;}
function setMatterBigNumber(value){let b=BigNumber.from(value).max(0);/* Recover malformed legacy/save exponents instead of letting one corrupted value poison every production tick and UI render. */if(!Number.isFinite(b.exponent)||Math.abs(b.exponent)>1e7){b=BigNumber.from(Number.MAX_VALUE);}if(state.activeInfinityChallenge){const goal=infinityChallengeGoal();if(b.compare(goal)>0)b=goal;}state.matterBN=b.toJSON();state.matterLog10=b.mantissa>0?b.log10():0;state.matter=b.toNumber();if(!Number.isFinite(state.infinityPeakAMLog10)||Math.abs(Number(state.infinityPeakAMLog10))>1e7)state.infinityPeakAMLog10=state.matterLog10;state.infinityPeakAMLog10=Math.max(Number(state.infinityPeakAMLog10)||0,state.matterLog10);if(state.breakInfinityActive&&b.compare(INFINITY)>=0)state.infinityCrunchReady=true;return b;}
function canCrunchNow(){if(state.activeInfinityChallenge)return matterBigNumber().compare(infinityChallengeGoal())>=0;return state.breakInfinityActive?Boolean(state.infinityCrunchReady||atInfinity()):atInfinity();}
function addMatterProduction(rate,dt){
 const rateBN=BigNumber.from(rate);if(!(dt>0)||rateBN.mantissa<=0)return;
 const current=matterBigNumber();
 const generated=rateBN.multiply(dt);
 let next=current.add(generated);
 let actuallyAdded=generated;
 if(!state.breakInfinityActive&&next.compare(INFINITY)>0){next=BigNumber.from(INFINITY);actuallyAdded=next.subtract(current).max(0);}
 state.totalAntimatterProducedBN=BigNumber.from(state.totalAntimatterProducedBN||0).add(actuallyAdded).toJSON();
 setMatterBigNumber(next);
}

function breakInfinityUpgradeBought(id){return state.breakInfinityUpgrades.includes(id);}
function breakInfinityCanUnlock(){return (state.autobuyers.intervalUpgradeLevels?.[11]||0)>=15;}
function breakInfinityUpgradeData(){return [
 ['totalAM','Total Antimatter','累計生産した反物質に応じて全Dimensionを強化',1e4],
 ['currentAM','Current Antimatter','現在の反物質に応じて全Dimensionを強化',5e4],
 ['infinities','Infinitied','Infinity回数に応じて全Dimensionを強化',1e5],
 ['achievements','Achievement Multiplier','実績数に応じて全Dimensionを強化',1e6],
 ['slowestChallenge','Slowest Challenge','最も遅いChallengeクリア時間に応じてDimensionを強化',1e7],
 ['fastestInfinity','Infinitied Generation','最速Infinity時間に応じてInfinity回数を自動増加',2e7],
 ['bulkBoost','Bulk DimBoost','Dimension Boostをまとめて購入',5e9],
 ['galaxyEffect','Galaxy Effect','Galaxy効果を50%強化',5e11],
 ['autobuyerSpeed','Autobuyer Speed','Autobuyerの動作速度を2倍にする',1e15]
];}
function breakInfinityRepeatableData(){return [
 ['tickspeedCost','Tickspeed Cost Scaling','Infinity後のTickspeedコストスケーリングを緩和',1e6,5],
 ['dimensionCost','Dimension Cost Scaling','Infinity後のDimensionコストスケーリングを緩和',1e7,5000],
 ['ipGeneration','IP Generation','過去10回のInfinityにおける最高IP/分の5%を自動生成（最大50%）',1e7,10]
];}
function breakInfinityUpgradeEffect(id){switch(id){case 'totalAM':{const total=BigNumber.from(state.totalAntimatterProducedBN||0);const log=total.mantissa>0?total.log10():0;return Math.sqrt(Math.max(1,Math.floor(Number.isFinite(log)?log:0)+1));}case 'currentAM':{const log=matterLog();return Math.sqrt(Math.max(1,Math.floor(Number.isFinite(log)?log:0)+1));}case 'infinities':{const count=Math.max(0,Number(state.infinities)||0);return 1+Math.max(Math.log10(Math.max(count,1)),0)*10;}case 'achievements':{const count=state.achievements.filter(Boolean).length;return Math.max(Math.pow(count-30,3)/40,1);}case 'slowestChallenge':{const times=Object.values(state.challengeTimes).map(Number).filter(t=>Number.isFinite(t)&&t>=0);const worstTime=times.length?Math.max(...times):Infinity;return Math.min(30000,Math.max(1,3000/Math.max(worstTime,0.1)));}case 'galaxyEffect':return 1.5;default:return 1;}}
const challengeData=[
 {id:1,name:'1st Dimension Autobuyer Challenge',desc:'初めてInfinityに到達する。初回Infinityは自動的にクリア扱いとなり、再挑戦はできません。',reward:'第1次元Autobuyerの間隔アップグレード'},
 {id:2,name:'2nd Dimension Autobuyer Challenge',desc:'DimensionまたはTickspeedを購入すると全Dimensionの生産が停止し、3分かけて徐々に回復します。',reward:'第2次元Autobuyerの間隔アップグレード'},
 {id:3,name:'3rd Dimension Autobuyer Challenge',desc:'第1次元の生産が大幅に弱体化しますが、時間経過で倍率が指数的に増加します。Boost/Galaxyで倍率はリセットされます。',reward:'第3次元Autobuyerの間隔アップグレード'},
 {id:4,name:'4th Dimension Autobuyer Challenge',desc:'Dimensionを購入すると、それより下位のDimensionの所持数が0になります。',reward:'第4次元Autobuyerの間隔アップグレード'},
 {id:5,name:'5th Dimension Autobuyer Challenge',desc:'Tickspeedの効果はGalaxy 0個で×1.080、1個で×1.100、2個で×1.120となります。',reward:'第5次元Autobuyerの間隔アップグレード'},
 {id:6,name:'6th Dimension Autobuyer Challenge',desc:'第3〜第8次元は反物質ではなく2段階下位のDimensionを消費して購入します。専用の購入価格を使用します。',reward:'第6次元Autobuyerの間隔アップグレード'},
 {id:7,name:'7th Dimension Autobuyer Challenge',desc:'10個購入ボーナスはBoost回数に応じて強化され、倍率は最大×2です。',reward:'第7次元Autobuyerの間隔アップグレード'},
 {id:8,name:'8th Dimension Autobuyer Challenge',desc:'Dimension Boostの倍率がなくなり、Galaxyは購入できません。Boostは最大5回です。SacrificeはTickspeedを維持したまま反物質とDimensionをリセットし、効果が大幅に強化されます。',reward:'第8次元Autobuyerの間隔アップグレード'},
 {id:9,name:'Tickspeed Autobuyer Challenge',desc:'TickspeedまたはDimensionを10個購入すると、同じコスト帯の他の購入コストも次の段階へ進みます。',reward:'Tickspeed Autobuyerの間隔アップグレード'},
 {id:10,name:'Automated Dimension Boosts Challenge',desc:'第1〜第6次元のみ使用できます。Dimension Boostは通常より多くのDimensionを要求し、Galaxyは第6次元99個から始まり、1個ごとに90個ずつ増えます。Sacrificeは使用できません。16回以上Infinityが必要です。',reward:'Dimension Boost Autobuyer'},
 {id:11,name:'Automated Antimatter Galaxies Challenge',desc:'第2次元を1個以上持つとNormal Matterが増加し、反物質を超えるとボーナスなしでDimension Boostが発生します。Matterの増加率はBoost数・Galaxy数で上昇します。16回以上Infinityが必要です。',reward:'Antimatter Galaxy Autobuyer'},
 {id:12,name:'Automated Big Crunches Challenge',desc:'各Dimensionは2段階下位を生産します。第1・第2次元は反物質も生産します。第2・第4・第6次元の所持数をそれぞれ1.6乗・1.4乗・1.2乗して生産します。16回以上Infinityが必要です。',reward:'Big Crunch Autobuyer'}
];
const infinityChallengeData=[
 {id:1,name:'The First Infinity',unlock:'1e2000',goal:'1e650',desc:'複数のNormal Challengeの制約が同時に適用されます。NC9・NC12の制約は適用されません。',reward:'クリア済みICの種類ごとに、Infinity Dimensionの生産量 ×1.3'},
 {id:2,name:'Is This Safe?',unlock:'1e11000',goal:'1e10500',desc:'8th Dimensionを所持すると、400msごとにSacrificeが自動実行されます。',reward:'Sacrificeの効果を強化し、Sacrifice Autobuyerを解禁'},
 {id:3,name:'That Which Does Not Kill You',unlock:'1e12000',goal:'1e5000',desc:'Tickspeedの効果が変更され、購入回数に応じてDimensionの倍率が変化します。',reward:'Tickspeed購入に応じてNormal Dimensionを強化'},
 {id:4,name:'When Will It Be Enough?',unlock:'1e14000',goal:'1e13000',desc:'最後に購入したDimension以外の生産倍率が弱体化します。',reward:'Normal Dimensionの倍率を1.05乗'},
 {id:5,name:'Infinite Time',unlock:'1e18000',goal:'1e16500',desc:'Dimensionの購入によって、他のDimensionのコストが段階的に上昇します。',reward:'Galaxyの効果を強化し、Galaxy・Dimension Boostの必要数を減少'},
 {id:6,name:'The Gods Are Angry',unlock:'1e22500',goal:'2e22222',desc:'Matterが増加し、2nd Dimensionを所持するとDimension倍率にペナルティがかかります。',reward:'Tickspeedに応じてInfinity Dimensionを強化'},
 {id:7,name:'Hevipelle did nothing wrong',unlock:'1e23000',goal:'1e10000',desc:'Antimatter Galaxyを購入できず、Dimension Boostの倍率が制限されます。',reward:'Dimension Boostの基本倍率を強化'},
 {id:8,name:'Only Matter',unlock:'1e28000',goal:'1e27000',desc:'時間経過でDimensionの生産量が低下し、DimensionまたはTickspeedの購入で回復します。',reward:'1st・8th Dimensionの倍率に応じて中間Dimensionを強化'}
];
