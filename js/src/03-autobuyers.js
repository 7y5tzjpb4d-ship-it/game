function autobuyerUpgradeLevels(){state.autobuyers.intervalUpgradeLevels=Array.isArray(state.autobuyers.intervalUpgradeLevels)?Array.from({length:12},(_,i)=>Math.max(0,Math.floor(Number(state.autobuyers.intervalUpgradeLevels[i])||0))):Array(12).fill(0);return state.autobuyers.intervalUpgradeLevels;}
function autobuyerInterval(){const levels=autobuyerUpgradeLevels();const speed=breakInfinityUpgradeBought('autobuyerSpeed')?2:1;return autobuyerBaseIntervals.map((v,i)=>Math.max(0.1,v*Math.pow(0.6,levels[i]))/(speed>1?2:1));}
function resetDimensionAutobuyerTicksAfterPrestige(){const intervals=autobuyerInterval();for(let i=0;i<=8;i++)autobuyerElapsed[i]=intervals[i];}
function autobuyerIntervalUpgradeCost(i){return Math.pow(2,autobuyerUpgradeLevels()[i]||0);}
function dimBulkLevels(){state.autobuyers.dimBulkLevels=Array.isArray(state.autobuyers.dimBulkLevels)?Array.from({length:8},(_,i)=>Math.max(0,Math.min(9,Math.floor(Number(state.autobuyers.dimBulkLevels[i])||0)))):Array(8).fill(0);return state.autobuyers.dimBulkLevels;}
function dimAutobuyerBulk(i){const level=dimBulkLevels()[i]||0;
 // 本家同様、全次元のBulkを最大化した状態ではAchievement 61の報酬を即時適用する。
 // UI再描画・実績判定のタイミングに依存して512回制限が残らないよう、状態から直接判定する。
 const allBulkMaxed=Array.isArray(state.autobuyers.dimBulkLevels)&&state.autobuyers.dimBulkLevels.length>=8&&state.autobuyers.dimBulkLevels.slice(0,8).every(v=>Number(v)>=9);
 return level>=9&&(hasAchievement(61)||allBulkMaxed)?Infinity:level>=9?512:Math.pow(2,level);
}
function dimBulkUpgradeCost(i){const level=dimBulkLevels()[i]||0;let cost=Math.pow(2,autobuyerUpgradeLevels()[i]||0);for(let n=0;n<level;n++)cost=Math.ceil(cost*2.4);return cost;}
function buyDimBulkUpgrade(i){const level=dimBulkLevels()[i]||0;const cost=dimBulkUpgradeCost(i);if(i<0||i>7||!dimAutobuyerUnlocked(i)||autobuyerInterval()[i]>0.1000001||level>=9||!hasIPAtLeast(cost))return false;spendIPBigNumber(cost);state.autobuyers.dimBulkLevels[i]=level+1;save();if(document.body.dataset.screen==='autobuyers')switchScreen('autobuyers');else render();return true;}
function autobuyerUpgradeUnlocked(i){if(i<0||i>11)return false;if(i===8)return challengeCompleted(9);if(i===9)return challengeCompleted(10);if(i===10)return challengeCompleted(11);if(i===11)return challengeCompleted(12);return challengeCompleted(i+1);}
function buyAutobuyerIntervalUpgrade(i){if(i>=0&&i<8&&autobuyerInterval()[i]<=0.1000001)return buyDimBulkUpgrade(i);const cost=autobuyerIntervalUpgradeCost(i);if(!autobuyerUpgradeUnlocked(i)||!hasIPAtLeast(cost)||autobuyerInterval()[i]<=0.1)return false;spendIPBigNumber(cost);state.autobuyers.intervalUpgradeLevels[i]=(state.autobuyers.intervalUpgradeLevels[i]||0)+1;save();if(document.body.dataset.screen==='autobuyers')switchScreen('autobuyers');else render();return true;}
let previousDimAutobuyerUnlocks=Array(8).fill(false);
let autobuyerUnlockAlert=false;
function dimAutobuyerUnlocked(i){return Boolean(state.autobuyers.unlockedDims?.[i])||state.matter>=Math.pow(10,40+i*10);}
function tickspeedAutobuyerUnlocked(){return Boolean(state.autobuyers.tickspeedUnlocked)||state.matter>=1e140;}
function resetAutobuyerUnlocks(){state.autobuyers.unlockedDims=Array(8).fill(false);state.autobuyers.tickspeedUnlocked=false;state.autobuyers.dims=Array(8).fill(false);state.autobuyers.tickspeed=false;previousDimAutobuyerUnlocks=Array(8).fill(false);autobuyerUnlockAlert=false;}

function updateAutobuyerUnlockAlert(){const now=Array.from({length:8},(_,i)=>state.matter>=Math.pow(10,40+i*10));let newlyUnlocked=false;state.autobuyers.unlockedDims=Array.isArray(state.autobuyers.unlockedDims)?state.autobuyers.unlockedDims:Array(8).fill(false);now.forEach((v,i)=>{if(v&&!state.autobuyers.unlockedDims[i]){state.autobuyers.unlockedDims[i]=true;newlyUnlocked=true;}});if(state.matter>=1e140&&!state.autobuyers.tickspeedUnlocked){state.autobuyers.tickspeedUnlocked=true;newlyUnlocked=true;}if(newlyUnlocked){autobuyerUnlockAlert=true;save();}previousDimAutobuyerUnlocks=now;const tab=document.querySelector('.screen-tabs button[data-screen="autobuyers"]');if(tab)tab.classList.toggle('unlock-alert',autobuyerUnlockAlert);}
