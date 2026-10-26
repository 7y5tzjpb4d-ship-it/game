function fmtMatter(n){
 if(state.breakInfinityActive&&n>=INFINITY*0.999&&(Number(state.matterLog10)||0)>Math.log10(INFINITY)+1e-9)return matterBigNumber().toDisplayString(2);
 if(!Number.isFinite(n))return '∞';
 if(n<1000)return Math.max(0,n).toFixed(2);
 const e=Math.floor(Math.log10(n)),m=n/Math.pow(10,e);
 return m.toFixed(2)+'e'+e;
}
function fmt(n){
 if(!Number.isFinite(n))return '∞';
 if(n<=0)return '0';
 if(n<1000)return Number(n.toPrecision(3)).toString();
 const e=Math.floor(Math.log10(n)),m=n/Math.pow(10,e);
 return Number(m.toPrecision(3))+'e'+e;
}
function fmtFixed(n,digits){
 if(!Number.isFinite(n))return '∞';
 if(n<=0)return (0).toFixed(digits);
 if(n<1000)return n.toFixed(digits);
 const e=Math.floor(Math.log10(n)),m=n/Math.pow(10,e);
 return m.toFixed(digits)+'e'+e;
}
function fmtBig(n,digits=3){return BigNumber.from(n).toDisplayString(digits);}
function fmtFixedBig(n,digits=2){const b=BigNumber.from(n);if(!b.mantissa)return (0).toFixed(digits);if(b.exponent<3&&b.exponent>-7)return b.toNumber().toFixed(digits);return b.mantissa.toFixed(digits)+'e'+b.exponent;}
function matterDisplayBig(){return matterBigNumber();}
function productionRateBigNumber(){let r=dimensionProductionBigNumber(0);if(state.activeChallenge===12)r=r.add(dimensionProductionBigNumber(1));return r;}
function dimensionAmountBig(i){const saved=state.amountBN?.[i];if(saved&&Number.isFinite(Number(saved.mantissa))&&Number.isFinite(Number(saved.exponent)))return BigNumber.from(saved).max(0);const b=BigNumber.from(Math.max(0,state.amount[i]||0));state.amountBN[i]=b.toJSON();return b;}
function setDimensionAmountBig(i,value){const b=BigNumber.from(value).max(0);state.amountBN[i]=b.toJSON();state.amount[i]=b.toNumber();return b;}
function dimensionProductionBigNumber(i){let mult=dimensionMultiplierBigNumber(i);if(challengeRuleActive(2))mult=mult.multiply(Math.max(0,Math.min(1,state.challenge2Recovery)));if(challengeRuleActive(3)&&i===0)mult=mult.multiply(0.01*state.challenge3TimeMult);if(state.activeInfinityChallenge===4&&i!==state.icLastBoughtDimension)mult=mult.power(0.25);if(state.activeInfinityChallenge===8)mult=mult.multiply(Math.max(0,state.ic8ProductionMultiplier));return dimensionAmountBig(i).power(dimensionAmountPower(i)).multiply(mult);}
function infinityPowerDimensionMultiplierBigNumber(){return BigNumber.from(state.infinityPowerBN||0).max(1).power(7);}
function dimensionMultiplierBigNumber(i){
 let m=BigNumber.from(challengeRuleActive(8)?1:dimensionBoostMult(i));
 // Infinity Power's x^7 bonus applies to every normal Dimension's production.
 m=m.multiply(infinityPowerDimensionMultiplierBigNumber());
 const tenBuy=(challengeRuleActive(7)?Math.min(2,1+0.2*state.boosts):(state.infinityUpgrades.includes('dimMult')?2.2:2))+(hasAchievement(58)?0.01:0);
 m=m.multiply(BigNumber.from(tenBuy).power(Math.floor(state.bought[i]/10)));
 if(state.activeInfinityChallenge===3||infinityChallengeCompleted(3))m=m.multiply(BigNumber.from(1.05+Math.max(0,Number(state.galaxies)||0)/200).power(state.tickspeed));
 if(infinityChallengeCompleted(8)&&i>=1&&i<=6)m=m.multiply(dimensionMultiplierBigNumber(0).divide(tickspeedMultiplierBigNumber()).multiply(dimensionMultiplierBigNumber(7).divide(tickspeedMultiplierBigNumber())).power(0.02));
 if(state.activeInfinityChallenge===6&&state.amount[1]>0)m=m.divide(BigNumber.from(Math.max(1,state.icMatter)));
 for(const f of [(i===0&&state.achievements[15])?1.1:1,(i===7&&state.achievements[10])?1.1:1,(i===0&&state.achievements[16])?1.05:1,(i<7&&state.achievements[19])?1.02:1,state.achievements[26]?1+(i+1)*0.01:1,state.achievements[31]?1.1:1])m=m.multiply(f);
 m=m.multiply(infinityUpgradeMultiplierBigNumber('timeMult')).multiply(infinityUpgradeMultiplierBigNumber('timeMult2'));
 if(i===0)m=m.multiply(infinityUpgradeMultiplierBigNumber('unspentBonus'));
 if(i===0||i===7)m=m.multiply(infinityUpgradeMultiplierBigNumber('18Mult'));
 if(i===1||i===6)m=m.multiply(infinityUpgradeMultiplierBigNumber('27Mult'));
 if(i===2||i===5)m=m.multiply(infinityUpgradeMultiplierBigNumber('36Mult'));
 if(i===3||i===4)m=m.multiply(infinityUpgradeMultiplierBigNumber('45Mult'));
 for(const id of ['totalAM','currentAM','infinities','achievements','slowestChallenge'])if(breakInfinityUpgradeBought(id))m=m.multiply(breakInfinityUpgradeEffectBigNumber(id));
 if(i===(state.activeChallenge===12?5:7))m=m.multiply(sacrificeMultiplierBigNumber());
 if(hasAchievement(64)&&i<4)m=m.multiply(1.25);
 if(hasAchievement(68)&&i===0)m=m.multiply(1.5);
 if(hasAchievement(71)&&i===0)m=m.multiply(3);
 if(hasAchievement(72))m=m.multiply(1.1);
 if(hasAchievement(73))m=m.multiply(matterBigNumber().power(0.00002).add(1));if(hasAchievement(84))m=m.multiply(matterBigNumber().power(0.00002).add(1));
 if(hasAchievement(76))m=m.multiply(Math.max(1,Math.pow(Math.max(1,state.playTime/86400/2),0.05)));
 if(hasAchievement(91)&&state.infinityTime<5)m=m.multiply(Math.max((5-state.infinityTime)*60,1));
 if(hasAchievement(92)&&state.infinityTime<60)m=m.multiply(Math.max((1-state.infinityTime/60)*100,1));
 if(hasAchievement(56)&&state.infinityTime<180)m=m.multiply(Math.max(6/(state.infinityTime/60+3),1));
 if(hasAchievement(65)&&(state.activeChallenge||state.activeInfinityChallenge)&&state.infinityTime<180)m=m.multiply(Math.max(4/(state.infinityTime/60+1),1));
 if(hasAchievement(74)&&(state.activeChallenge||state.activeInfinityChallenge))m=m.multiply(1.4);
 const finalMultiplier=m.multiply(tickspeedMultiplierBigNumber()).multiply(achievementMultiplier());
 // IC4's reward raises the complete Antimatter Dimension multiplier, including
 // tickspeed, achievements, and other applicable bonuses, to the 1.05 power.
 return infinityChallengeCompleted(4)?finalMultiplier.power(1.05):finalMultiplier;
}
function tickspeedMultiplierBigNumber(){if(state.activeInfinityChallenge===3)return BigNumber.from(1);const base=tickspeedBase();const freeTimeShardTickspeedCount=timeShardsFreeTickspeedInfo().count;let mult=BigNumber.from(base).power(Math.min(Math.max(0,Number(state.tickspeed)||0)+freeTimeShardTickspeedCount,1e9));mult=mult.multiply(BigNumber.from(tickspeedAchievementRewardMultiplier()));if(hasAchievement(83)){const galaxies=Math.max(0,Number(state.galaxies)||0);mult=mult.multiply(BigNumber.from(Math.pow(0.95,-galaxies)));}return mult;}
function sacrificeMultiplierBigNumber(){const b=state.sacrificeMultBN;return b&&Number.isFinite(Number(b.mantissa))&&Number.isFinite(Number(b.exponent))?BigNumber.from(b).max(1):BigNumber.from(state.sacrificeMult||1).max(1);}
function setSacrificeMultiplierBigNumber(value){const b=BigNumber.from(value).max(1);state.sacrificeMultBN=b.toJSON();state.sacrificeMult=b.toNumber();return b;}
function sacrificedFirstBigNumber(){const b=state.sacrificedFirstBN;return b&&Number.isFinite(Number(b.mantissa))&&Number.isFinite(Number(b.exponent))?BigNumber.from(b).max(0):BigNumber.from(state.sacrificedFirst||0).max(0);}
function infinityUpgradeMultiplierBigNumber(id){if(!hasInfinityUpgrade(id))return BigNumber.from(1);if(id==='unspentBonus')return getIPBigNumber().divide(2).power(1.5).add(1);return BigNumber.from(infinityUpgradeMultiplierValue(id));}
function breakInfinityUpgradeEffectBigNumber(id){return BigNumber.from(breakInfinityUpgradeEffect(id));}
function safeCostBigNumber(base,growth,n,alternateGrowth){
 const count=Math.max(0,Number(n)||0);
 const baseLog=Math.log10(base), growthLog=Math.log10(growth);
 const normalLog=baseLog+count*growthLog;
 const capLog=Math.log10(Number.MAX_VALUE);
 // Before Break Infinity, preserve the original geometric cost progression.
 if(!state.breakInfinityActive||normalLog<=capLog)return BigNumber.fromLog10(normalLog);
 // Post-Infinity scaling increases the cost multiplier itself after each purchase:
 // x10, x100, x1000... by default; repeatable upgrades reduce the scaling base.
 const firstPostCount=Math.max(0,Math.floor((capLog-baseLog)/growthLog)+1);
 const postCount=Math.max(0,count-firstPostCount);
 const scaling=Math.max(2,Number(alternateGrowth)||10);
 // Keep the ordinary geometric cost through the first cost above Infinity.
 // Each later ×10 Dimension purchase increases the per-10 cost multiplier:
 // ×1e3 -> ×1e4 -> ×1e5 ... (minimum ×3 with max upgrade).
 const triangular=postCount*(postCount+1)/2;
 const logCost=normalLog+triangular*Math.log10(scaling);
 return BigNumber.fromLog10(logCost);
}
function safeCostFromScaling(base,growth,n,alternateGrowth){return safeCostBigNumber(base,growth,n,alternateGrowth).toNumber();}
function costBigNumber(i,offset=0){const n=Math.floor((state.bought[i]+offset)/10)+(state.activeChallenge===9?(state.challenge9CostSteps?.[i]||0):0)+(state.activeInfinityChallenge===5?(state.ic5CostSteps?.[i]||0):0);const scaling=Math.max(3,10-(state.breakInfinityRepeatables[1]||0));if(challengeRuleActive(6)){const c6Base=[10,100,100,500,2500,20000,200000,4000000],c6Growth=[1e3,5e3,1e4,1.2e4,1.8e4,2.6e4,3.2e4,4.2e4];return safeCostBigNumber(c6Base[i],c6Growth[i],n,scaling);}return safeCostBigNumber(baseCosts[i],costGrowth[i],n,scaling);}
function cost(i,offset=0){return costBigNumber(i,offset);}
function dimensionResource(i){return challengeRuleActive(6)&&i>=2?dimensionAmountBig(i-2):matterBigNumber();}
function canAffordDimension(i,c=costBigNumber(i)){
 const resource=dimensionResource(i);
 return BigNumber.from(resource).compare(c)>=0;
}
function spendDimension(i,c){
 c=BigNumber.from(c);
 if(!canAffordDimension(i,c))return false;
 if(challengeRuleActive(6)&&i>=2){setDimensionAmountBig(i-2,dimensionAmountBig(i-2).subtract(c));return true;}
 setMatterBigNumber(matterBigNumber().subtract(c));return true;
}
function maxAffordable(i, limitToNextTen=true){
 let resource=dimensionResource(i), bought=state.bought[i], count=0, spent=BigNumber.from(0), c=costBigNumber(i);
 const limit=limitToNextTen?10-(bought%10):10000;
 while(count<limit&&resource.compare(c)>=0){
  resource=resource.subtract(c).max(0);spent=spent.add(c);count++;bought++;
  c=costBigNumber(i,bought-state.bought[i]);
 }
 return {count,spent:spent.toDisplayString(2)};
}
function applyChallenge9CostStep(purchasedCost, excludeDimension=-1, purchasedTickspeed=false){
 if(state.activeChallenge!==9)return;
 const target=BigNumber.from(purchasedCost);const sameExponent=a=>BigNumber.from(a).exponent===target.exponent;
 for(let j=0;j<8;j++)if(j!==excludeDimension&&sameExponent(costBigNumber(j)))state.challenge9CostSteps[j]=(state.challenge9CostSteps[j]||0)+1;
 if(!purchasedTickspeed&&sameExponent(tickspeedCostBigNumber()))state.challenge9TickspeedCostBumps=(state.challenge9TickspeedCostBumps||0)+1;
}
function totalGalaxyCount(){return Math.max(0,Number(state.galaxies)||0)+Math.max(0,Number(state.replicantiGalaxies)||0);}
function galaxyStrength(){return (hasInfinityUpgrade('galaxyBoost')?2:1)*(breakInfinityUpgradeBought('galaxyEffect')?1.5:1)*(infinityChallengeCompleted(5)?1.1:1)*(hasAchievement(86)?1.01:1);}
function tickspeedBase(){
 // Achievement rewards modify the starting tick interval once, independently
 // from the number of purchased/free Tickspeed upgrades.
 const normalGalaxies=Math.max(0,Number(state.galaxies)||0);
 const g=totalGalaxyCount();
 const strength=galaxyStrength();
 let base;
 if(g<3){
  const baseIntervals=challengeRuleActive(5)?[1/1.08,1/1.07632,1/1.072]:[1/1.1245,1/1.11888888,1/1.11267177];
  const baseIndex=Math.min(2,Math.max(0,Math.floor(normalGalaxies)));
  base=Math.min(100,1/(baseIntervals[baseIndex]-g*strength*0.02));
 } else {
  const baseMultiplier=challengeRuleActive(5)?0.83:0.8;
  base=1/(baseMultiplier*Math.pow(0.965,(g-2)*strength-2));
 }
 return base;
}
function tickspeedAchievementRewardMultiplier(){return Math.pow(1.02,[36,45,66].filter(hasAchievement).length);}
function tickspeedMult(){if(state.activeInfinityChallenge===3)return 1;const base=tickspeedBase();const mult=Math.pow(base,Math.min(state.tickspeed,1e9));const galaxies=Math.max(0,Number(state.galaxies)||0);const achievement83Mult=hasAchievement(83)?Math.pow(0.95,-galaxies):1;return Math.min(INFINITY,mult*tickspeedAchievementRewardMultiplier()*achievement83Mult);}
function tickspeedCostBigNumber(){
 const count=Math.max(0,Number(state.tickspeed)||0)+(state.activeChallenge===9?Math.max(0,Number(state.challenge9TickspeedCostBumps)||0):0);
 const baseLog=Math.log10(TICKSPEED_BASE_COST),growthLog=Math.log10(10),capLog=Math.log10(Number.MAX_VALUE);
 const normalLog=baseLog+count*growthLog;
 // Infinity前は毎回×10。Infinity後は倍率が購入ごとに×10ずつ増える。
 // Cost progression: e308, e309, e311, e314 ...; max upgrade changes
 // the scaling coefficient from ×10 to ×2 (e308, e309, e310.3, ...).
 if(!state.breakInfinityActive||normalLog<=capLog)return BigNumber.fromLog10(normalLog);
 const firstPostCount=Math.max(0,Math.floor((capLog-baseLog)/growthLog)+1);
 const postCount=Math.max(0,count-firstPostCount);
 const scaling=Math.max(2,10-(Number(state.breakInfinityRepeatables?.[0])||0));
 const triangular=postCount*(postCount+1)/2;
 return BigNumber.fromLog10(normalLog+triangular*Math.log10(scaling));
}
function tickspeedCost(){return tickspeedCostBigNumber();}
function canAffordTickspeed(c=tickspeedCost()){return matterBigNumber().compare(c)>=0;}
function spendTickspeed(c){c=BigNumber.from(c);if(!canAffordTickspeed(c))return false;setMatterBigNumber(matterBigNumber().subtract(c));return true;}
function dimensionBoostMult(i){
 const effectiveBoosts=state.boosts-(challengeRuleActive(11)?state.challenge11NoBonusBoosts:0);
 const boostPower=state.activeInfinityChallenge===7?10:(infinityChallengeCompleted(7)?4:(state.infinityUpgrades.includes('resetMult')?2.5:2));
 return Math.pow(state.activeInfinityChallenge===1&&challengeRuleActive(8)?1:boostPower, Math.max(effectiveBoosts-i,0));
}
function infinityUpgradeMultiplierValue(id){
 const infinities=Math.max(0,state.infinities);
 const minutesPlayed=Math.max(0,state.playTime)/60;
 const minutesInInfinity=Math.max(0,state.infinityTime)/60;
 const unspentIP=getIPBigNumber().toNumber();
 switch(id){
  // Wiki: max((Minutes / 2)^0.15, 1)
  case 'timeMult': return Math.max(Math.pow(minutesPlayed/2,0.15),1);
  // Wiki: max((Minutes / 4)^0.25, 1)
  case 'timeMult2': return Math.max(Math.pow(minutesInInfinity/4,0.25),1);
  // Wiki: 1 + (IP / 2)^1.5
  case 'unspentBonus': return 1+Math.pow(unspentIP/2,1.5);
  // Wiki: 1 + Infinities / 5
  case '18Mult': case '27Mult': case '36Mult': case '45Mult': return 1+infinities/5;
  default:return 1;
 }
}
function infinityUpgradeMultiplier(id){return hasInfinityUpgrade(id)?infinityUpgradeMultiplierValue(id):1;}
function dimensionMult(i){
 const infinityPowerMultiplier=infinityPowerDimensionMultiplierBigNumber().toNumber();
 const tenBuyMultiplier=(state.activeChallenge===7?Math.min(2,1+0.2*state.boosts):(state.infinityUpgrades.includes('dimMult')?2.2:2))+(hasAchievement(58)?0.01:0);
 let mult=infinityPowerMultiplier*(challengeRuleActive(8)?1:dimensionBoostMult(i))*Math.pow(tenBuyMultiplier,Math.floor(state.bought[i]/10))*(i===0&&state.achievements[15]?1.1:1)*(i===7&&state.achievements[10]?1.1:1)*(i===0&&state.achievements[16]?1.05:1)*(i<7&&state.achievements[19]?1.02:1)*(state.achievements[26]?1+(i+1)*0.01:1)*(state.achievements[31]?1.1:1);
 mult*=infinityUpgradeMultiplier('timeMult')*infinityUpgradeMultiplier('timeMult2');
 if(state.breakInfinityUnlocked){for(const id of ['totalAM','currentAM','infinities','achievements','slowestChallenge'])if(breakInfinityUpgradeBought(id))mult*=breakInfinityUpgradeEffect(id);}
 // 未使用IPボーナスは第1次元にのみ適用する。
 if(i===0)mult*=infinityUpgradeMultiplier('unspentBonus');
 if(i===0||i===7)mult*=infinityUpgradeMultiplier('18Mult');
 if(i===1||i===6)mult*=infinityUpgradeMultiplier('27Mult');
 if(i===2||i===5)mult*=infinityUpgradeMultiplier('36Mult');
 if(i===3||i===4)mult*=infinityUpgradeMultiplier('45Mult');
 if(hasAchievement(64)&&i<4)mult*=1.25;
 if(hasAchievement(68)&&i===0)mult*=1.5;
 if(hasAchievement(71)&&i===0)mult*=3;
 if(hasAchievement(72))mult*=1.1;
 if(hasAchievement(73))mult*=Math.pow(10,Math.min(300,matterLog()*0.00002))+1;if(hasAchievement(84))mult*=Math.pow(10,Math.min(300,matterLog()*0.00002))+1;
 if(hasAchievement(76))mult*=Math.max(1,Math.pow(Math.max(1,state.playTime/86400/2),0.05));
 if(hasAchievement(56)&&state.infinityTime<180)mult*=Math.max(6/(state.infinityTime/60+3),1);
 if(hasAchievement(65)&&(state.activeChallenge||state.activeInfinityChallenge)&&state.infinityTime<180)mult*=Math.max(4/(state.infinityTime/60+1),1);
 if(hasAchievement(74)&&(state.activeChallenge||state.activeInfinityChallenge))mult*=1.4;
 return mult;
}
// Dimension欄の表示にはdimensionMult()のみを使用。Tickspeedは生産計算にのみ適用する。
function achievementMultiplier(){
 // Each achievement gives x1.03; the x1.25 row bonus is awarded only for
 // each fully completed row of eight achievements, not every eight total.
 const unlocked=Array.isArray(state.achievements)?state.achievements:[];
 const count=unlocked.filter(Boolean).length;
 let completedRows=0;
 for(let start=0;start<achievementIds.length;start+=8){
  const end=Math.min(start+8,achievementIds.length);
  if(end-start===8&&Array.from({length:8},(_,offset)=>Boolean(unlocked[start+offset])).every(Boolean))completedRows++;
 }
 return Math.pow(1.03,count)*Math.pow(1.25,completedRows);
}
function productionMult(i){let m=dimensionMult(i)*(i===7?state.sacrificeMult:1)*tickspeedMult()*achievementMultiplier();if(challengeRuleActive(2))m*=Math.max(0,Math.min(1,state.challenge2Recovery));if(challengeRuleActive(3)&&i===0)m*=0.01*state.challenge3TimeMult;if(state.activeChallenge===12&&(i===1||i===3||i===5))m=Math.pow(Math.max(1,m),i===1?1.7:(i===3?1.4:1.3));return m;}
function dimensionAmountPower(i){return state.activeChallenge===12&&i===1?1.6:state.activeChallenge===12&&i===3?1.4:state.activeChallenge===12&&i===5?1.2:1;}
function dimensionOutput(i){return dimensionProductionBigNumber(i).toNumber();}
const achievementIds=[11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48,51,52,53,54,55,56,57,58,61,62,63,64,65,66,67,68,71,72,73,74,75,76,77,78,81,82,83,84,85,86,87,88,91,92,93,94,95,96,97,98];
state.achievements=Array.from({length:achievementIds.length},(_,i)=>Boolean(state.achievements?.[i]));
function achievementIndex(id){return achievementIds.indexOf(Number(id));}
function hasAchievement(id){const i=achievementIndex(id);return i>=0&&Boolean(state.achievements[i]);}
function unlockAchievement(id){const i=achievementIndex(id);if(i>=0)state.achievements[i]=true;}
function checkInfinityChallengeTimeAchievement(){
 const times=Array.from({length:8},(_,i)=>state.infinityChallengeTimes?.[i+1]);
 if(times.every(t=>Number.isFinite(Number(t))&&Number(t)>=0)){
  const sum=times.reduce((a,b)=>a+Number(b),0);
  if(sum<6.66)unlockAchievement(97);
 }
}
function infinityRealTimeSeconds(){
 const started=Number(state.infinityStartTimestamp);
 return Number.isFinite(started)&&started>0?Math.max(0,(Date.now()-started)/1000):Math.max(0,Number(state.infinityTime)||0);
}
function checkInfinityIPAchievements(gain, realElapsed=infinityRealTimeSeconds()){
 const ip=BigNumber.from(gain);
 const seconds=Math.max(0,Number(realElapsed)||0);
 if(ip.compare('1e200')>=0&&seconds<=2)unlockAchievement(91);
 if(ip.compare('1e250')>=0&&seconds<=20)unlockAchievement(92);
 if(ip.compare('1e300')>=0)unlockAchievement(93);
}
function checkReplicantiAchievement(){
 // On the web version, Achievement 95 requires reaching the Replicanti cap
 // within one hour; merely owning a Replicanti Galaxy is not sufficient.
 if(state.replicantiUnlocked&&infinityRealTimeSeconds()<=3600&&
    Number(state.replicanti)>=Number.MAX_VALUE)unlockAchievement(95);
}
function checkAchievements(){
 if(state.infinities>0)unlockAchievement(21);
 if(state.boosts>=1)unlockAchievement(22);
 if(state.amount[7]===99)unlockAchievement(23);
 if(matterBigNumber().compare('1e80')>0)unlockAchievement(24);
 if(state.boosts>=10)unlockAchievement(25);
 if(state.galaxies>=1)unlockAchievement(26);
 if(state.galaxies>=2)unlockAchievement(27);
 if(dimensionAmountBig(0).compare('1e150')>=0)unlockAchievement(28);
 if(Array.from({length:8},(_,i)=>dimensionMultiplierBigNumber(i)).some(m=>m.compare('1e31')>=0))unlockAchievement(31);
 if(state.activeChallenge!==8&&sacrificeMultiplierBigNumber().compare(600)>0)unlockAchievement(32);
 if(state.infinities>=10)unlockAchievement(33);
 if(matterBigNumber().compare('1e63')>=0&&productionRateBigNumber().compare(matterBigNumber())>0)unlockAchievement(42);
 if(tickspeedMultiplierBigNumber().log10()>=29)unlockAchievement(45);
 if(tickspeedMultiplierBigNumber().compare('1e58')>=0)unlockAchievement(66);
 if(Array.from({length:7},(_,i)=>dimensionAmountBig(i).compare('1e12')>=0).every(Boolean))unlockAchievement(46);
 if(state.completedChallenges.length>=3)unlockAchievement(47);
 if(state.completedChallenges.length>=12)unlockAchievement(48);
 if(state.infinityUpgrades.length>=16)unlockAchievement(41);
 if(state.exceedProductionTime>=30)unlockAchievement(44);
 const antitableMults=Array.from({length:8},(_,i)=>dimensionMultiplierBigNumber(i).log10());
 if(antitableMults.every((m,i)=>i===0||m>antitableMults[i-1]))unlockAchievement(43);
 // Break Infinity and autobuyer milestones.
 if(state.breakInfinityUnlocked||state.breakInfinityActive)unlockAchievement(51);
 const intervals=autobuyerInterval();
 if(intervals.slice(0,9).every(v=>v<=0.1000001))unlockAchievement(52);
 if(intervals.every(v=>v<=0.1000001))unlockAchievement(53);
 if(infinityRealTimeSeconds()>0&&infinityRealTimeSeconds()<=600&&atInfinity())unlockAchievement(54);
 if(infinityRealTimeSeconds()>0&&infinityRealTimeSeconds()<=60&&atInfinity())unlockAchievement(55);
 if(Array.isArray(state.autobuyers.dimBulkLevels)&&state.autobuyers.dimBulkLevels.length>=8&&state.autobuyers.dimBulkLevels.slice(0,8).every(v=>Number(v)>=9))unlockAchievement(61);
 if(currentIPPerMinuteBigNumber().compare('1e8')>=0)unlockAchievement(62);
 if(BigNumber.from(state.infinityPowerBN||0).compare(0)>0)unlockAchievement(63);
 if(state.completedInfinityChallenges.length>=1)unlockAchievement(67);
 if(Array.from({length:8},(_,i)=>dimensionMultiplierBigNumber(i).compare('1.8e308')>=0).every(Boolean))unlockAchievement(72);
 if(matterBigNumber().compare('9.9999e9999')>=0)unlockAchievement(73);
 // Achievement 65/74 use the best times for each of the 12 Normal Challenges only.
 // Do not sum arbitrary object values: old saves or extra keys can otherwise block the achievement.
 const normalChallengeBestTimes=Array.from({length:12},(_,i)=>{
   const key=String(i+1), raw=state.challengeTimes?.[key];
   return raw!==undefined&&raw!==null&&Number.isFinite(Number(raw))&&Number(raw)>=0?Number(raw):null;
 });
 if(normalChallengeBestTimes.every(t=>t!==null)){
   const totalBestTime=normalChallengeBestTimes.reduce((a,b)=>a+b,0);
   if(totalBestTime<180)unlockAchievement(65);
   if(totalBestTime<5)unlockAchievement(74);
 }
 if(state.infinityDimensions?.[3]?.unlocked||BigNumber.from(state.infinityDimensions?.[3]?.amount||0).compare(0)>0)unlockAchievement(75);
 if(state.playTime>=8*86400)unlockAchievement(76);
 if(BigNumber.from(state.infinityPowerBN||0).compare('1e6')>=0)unlockAchievement(77);
 if(state.galaxies>=50)unlockAchievement(83);
 if(BigNumber.from(state.infinityPowerBN||0).compare('1e260')>=0)unlockAchievement(94);
 checkReplicantiAchievement();
 // This project does not yet implement the Eternity reset layer; for now this marks the
 // Eternity milestone when the source game's Eternity IP threshold is reached.
 // Achievement 96 is event-based: it unlocks only on an actual Eternity reset, not at an IP threshold.
 checkInfinityChallengeTimeAchievement();
 if(state.infinityDimensions?.[7]?.unlocked)unlockAchievement(98);
 if(matterBigNumber().compare('1e35000')>=0)unlockAchievement(84);
 if(tickspeedMultiplierBigNumber().compare('1e3')>=0)unlockAchievement(86);
 if(state.infinities>=2e6)unlockAchievement(87);
 checkInfinityChallengeTimeAchievement();
}

function checkInfinityCompletionAchievements(elapsed, challengeId=0){
 const t=Math.max(0,Number(elapsed)||0);
 if(t<=600)unlockAchievement(54);
 if(t<=60)unlockAchievement(55);
 if(t<0.25)unlockAchievement(78);
 if(challengeId===2&&t<=180)unlockAchievement(56);
 if(challengeId===8&&t<=180)unlockAchievement(57);
 if(challengeId===9&&t<=180)unlockAchievement(58);
 if(challengeId===3&&t<=10)unlockAchievement(68);
 
}
function infinityCountGainForRun(elapsed){return hasAchievement(87)&&Number(elapsed)>5?250:1;}

function startingAntimatter(){
 // Starting antimatter rewards must apply to Normal Challenge starts as well as
 // ordinary runs. Higher-tier rewards take precedence over lower-tier rewards.
 if(hasAchievement(78))return 5e25;
 if(hasAchievement(55))return 5e10;
 if(hasAchievement(54))return 5e5;
 if(hasAchievement(37))return 5000;
 return hasAchievement(21)?100:10;
}
function infinityStartingAntimatter(){return startingAntimatter();}
function sacrificeTotalMultiplier(total){const t=BigNumber.from(total).max(1);const log=t.log10();const base=Math.max(1,log/10);const exponent=hasAchievement(57)?2.5:(hasAchievement(32)?2.2:2);return BigNumber.from(base).power(exponent);}
function sacrificeGainBigNumber(){const first=dimensionAmountBig(0);const total=sacrificedFirstBigNumber().add(first).max(1);if(infinityChallengeCompleted(2))return total.power(hasAchievement(88)?0.011:0.01).divide(sacrificeMultiplierBigNumber()).max(1);if(challengeRuleActive(8)){const denom=total.max(1).log10();const numer=first.max(1).log10();if(denom<=0)return BigNumber.from(1);return BigNumber.from(10).power(numer*0.05-denom*0.04).max(1); }const next=sacrificeTotalMultiplier(total);return next.divide(sacrificeMultiplierBigNumber()).max(1);}
function sacrificeGain(){return sacrificeGainBigNumber().toNumber();}
function unlocked(i){if(challengeRuleActive(10)&&i>=6)return false;if(i>0&&dimensionAmountBig(i-1).compare(0)<=0)return false;return i<4||state.boosts>=i-3;}
function productionRate(){return productionRateBigNumber().toNumber();}
function boostRequirement(){const n=state.boosts+1;let base=20;if(challengeRuleActive(10))base+=20*Math.max(0,n-3);else if(n>5)base+=15*(n-5);return Math.max(1,base-(hasInfinityUpgrade('resetBoost')?9:0)-(infinityChallengeCompleted(5)?1:0));}
function boostRequirementTier(){const n=state.boosts+1;return challengeRuleActive(10)?Math.min(6,n+3):(n<=5?n+3:8);}
function canBoost(){if(state.activeInfinityChallenge===1&&state.boosts>=2)return false;if(state.activeChallenge===8&&state.boosts>=5)return false;const tier=boostRequirementTier();return dimensionAmountBig(tier-1).compare(boostRequirement())>=0;}
function galaxyRequirement(){const base=challengeRuleActive(10)?99+90*state.galaxies:80+60*state.galaxies;return Math.max(1,base-(hasInfinityUpgrade('resetBoost')?9:0)-(infinityChallengeCompleted(5)?1:0));}
function canGalaxy(){const tier=challengeRuleActive(10)?5:7;return state.activeInfinityChallenge!==7&&!challengeRuleActive(8)&&dimensionAmountBig(tier).compare(galaxyRequirement())>=0;}
