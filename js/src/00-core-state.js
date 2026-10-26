const $=id=>document.getElementById(id);
function setText(el,value){if(!el)return;const text=String(value);if(el.textContent!==text)el.textContent=text;}
// 巨大数を仮数・指数で保持する BigNumber。通常の Number の上限を超えて演算・比較・表示できる。
class BigNumber {
 constructor(mantissa=0, exponent=0){
  if(mantissa instanceof BigNumber){this.mantissa=mantissa.mantissa;this.exponent=mantissa.exponent;return;}
  if(typeof mantissa==='string'&&/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$/i.test(mantissa)){const parts=mantissa.trim().toLowerCase().split('e');this.mantissa=Number(parts[0]);this.exponent=parts.length>1?(Number(parts[1])||0):0;this.normalize();return;}
  this.mantissa=Number(mantissa)||0;this.exponent=Number(exponent)||0;this.normalize();
 }
 normalize(){if(this.mantissa===0){this.exponent=0;return this;}if(!Number.isFinite(this.mantissa)){this.mantissa=Math.sign(this.mantissa)||1;this.exponent=308;return this;}if(!Number.isFinite(this.exponent)||Math.abs(this.exponent)>1e7){this.mantissa=Math.sign(this.mantissa)||1;this.exponent=308;}if(this.mantissa<0){const sign=-1;this.mantissa=-this.mantissa;this._sign=sign;}const shift=Math.floor(Math.log10(this.mantissa));this.mantissa/=Math.pow(10,shift);this.exponent+=shift;if(this._sign){this.mantissa*=this._sign;delete this._sign;}if(Math.abs(this.mantissa)>=10){this.mantissa/=10;this.exponent++;}return this;}
 static from(value){if(value instanceof BigNumber)return new BigNumber(value);if(value&&typeof value==='object'&&'mantissa' in value&&'exponent' in value)return new BigNumber(Number(value.mantissa),Number(value.exponent));if(typeof value==='string'&&/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)e[+-]?\d+\s*$/i.test(value)){const [m,e]=value.trim().toLowerCase().split('e');return new BigNumber(Number(m),Number(e));}return new BigNumber(Number(value)||0);}
 static fromLog10(log){if(!Number.isFinite(log))return log===Infinity?new BigNumber(1,Number.MAX_VALUE):new BigNumber(0);const e=Math.floor(log);return new BigNumber(Math.pow(10,log-e),e);}
 log10(){return this.mantissa>0?this.exponent+Math.log10(this.mantissa):-Infinity;}
 compare(other){other=BigNumber.from(other);if(this.mantissa===0)return other.mantissa===0?0:(other.mantissa>0?-1:1);if(other.mantissa===0)return this.mantissa>0?1:-1;if(this.mantissa<0&&other.mantissa>=0)return -1;if(this.mantissa>=0&&other.mantissa<0)return 1;if(this.exponent!==other.exponent)return (this.exponent>other.exponent?1:-1)*Math.sign(this.mantissa||other.mantissa||1);const diff=this.mantissa-other.mantissa;if(Math.abs(diff)<=Number.EPSILON*Math.max(Math.abs(this.mantissa),Math.abs(other.mantissa))*2)return 0;return diff>0?1:-1;}
 add(other){other=BigNumber.from(other);if(!this.mantissa)return other;if(!other.mantissa)return new BigNumber(this);const d=this.exponent-other.exponent;if(Math.abs(d)>16)return new BigNumber(d>0?this:other);const e=Math.max(this.exponent,other.exponent);return new BigNumber(this.mantissa*Math.pow(10,this.exponent-e)+other.mantissa*Math.pow(10,other.exponent-e),e);}
 subtract(other){other=BigNumber.from(other);return this.add(new BigNumber(-other.mantissa,other.exponent));}
 multiply(other){other=BigNumber.from(other);return new BigNumber(this.mantissa*other.mantissa,this.exponent+other.exponent);}
 divide(other){other=BigNumber.from(other);if(!other.mantissa)throw new Error('division by zero');return new BigNumber(this.mantissa/other.mantissa,this.exponent-other.exponent);}
 power(power){if(this.mantissa<0&&Math.floor(power)!==power) return new BigNumber(NaN);if(!this.mantissa)return new BigNumber(power===0?1:0);const l=this.log10()*power;return BigNumber.fromLog10(l);}
 toNumber(){if(!this.mantissa)return 0;if(this.exponent>308||(this.exponent===308&&Math.abs(this.mantissa)>Number.MAX_VALUE/Math.pow(10,308)))return this.mantissa>0?Number.MAX_VALUE:-Number.MAX_VALUE;if(this.exponent< -324)return 0;const n=this.mantissa*Math.pow(10,this.exponent);return Number.isFinite(n)?n:(this.mantissa>0?Number.MAX_VALUE:-Number.MAX_VALUE);}
 valueOf(){return this.toNumber();}
 abs(){return new BigNumber(Math.abs(this.mantissa),this.exponent);}
 isFinite(){return Number.isFinite(this.mantissa)&&Number.isFinite(this.exponent);}
 max(other){return this.compare(other)>=0?new BigNumber(this):BigNumber.from(other);}
 min(other){return this.compare(other)<=0?new BigNumber(this):BigNumber.from(other);}
 toDisplayString(digits=2){if(!this.mantissa)return (0).toFixed(digits);if(this.exponent<3&&this.exponent>-7){const n=this.toNumber();if(Number.isFinite(n))return n.toFixed(digits);}const e=Number.isFinite(this.exponent)?Math.round(this.exponent):308;return this.mantissa.toFixed(digits)+'e'+String(Math.min(1e7,Math.max(-1e7,e)));}
 toJSON(){return {mantissa:this.mantissa,exponent:this.exponent};}
}
function parseBigNumberInput(raw){
 const value=String(raw??'').trim();
 if(!value)return null;
 if(!/^[+]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/.test(value))return null;
 const n=BigNumber.from(value);
 if(!Number.isFinite(n.mantissa)||!Number.isFinite(n.exponent)||n.mantissa<=0)return null;
 return n;
}
const names=['第1次元','第2次元','第3次元','第4次元','第5次元','第6次元','第7次元','第8次元'];
const baseCosts=[10,100,1e4,1e6,1e9,1e13,1e18,1e24];
const unlockAt=[0,0,0,0,0,0,0,0];
const costGrowth=[1e3,1e4,1e5,1e6,1e8,1e10,1e12,1e15];
const TICKSPEED_BASE_COST=1e3;
const state={replicantiUnlocked:false,replicanti:1,replicantiChance:1,replicantiChanceUpgrades:0,replicantiInterval:1000,replicantiIntervalUpgrades:0,replicantiGalaxyUpgrades:0,replicantiGalaxies:0,replicantiTimer:0,infinityDimensions:Array(8).fill(null).map(()=>({amount:{mantissa:0,exponent:0},bought:0,unlocked:false})),infinityPowerBN:{mantissa:0,exponent:0},matterBN:{mantissa:1,exponent:1},amountBN:Array(8).fill(null).map(()=>({mantissa:0,exponent:0})),matter:10,matterLog10:1,breakInfinityUnlocked:false,breakInfinityActive:false,breakInfinityUpgrades:[],breakInfinityRepeatables:[0,0,0],totalAntimatterLog10:1,totalAntimatterProducedBN:{mantissa:0,exponent:0},infinityPeakAMLog10:1,infinityCrunchReady:false,totalIPGained:0,amount:Array(8).fill(0),bought:Array(8).fill(0),boosts:0,galaxies:0,buyMax:true,tickspeed:0,sacrificeMult:1,sacrificeMultBN:{mantissa:1,exponent:0},sacrificedFirst:0,sacrificedFirstBN:{mantissa:0,exponent:0},ip:0,infinities:0,infinityUpgrades:[],ipMultLevel:0,ipOffline:false,achievements:Array(72).fill(false),eighthDimensionBoughtThisInfinity:false,exceedProductionTime:0,sacrificedThisInfinity:false,autobuyers:{dims:Array(8).fill(false),tickspeed:false,tickspeedMode:'single',unlockedDims:Array(8).fill(false),tickspeedUnlocked:false,boost:false,galaxy:false,crunch:false,sacrifice:false,dimModes:Array(8).fill('10'),dimMode:'10',intervalUpgradeLevel:0,intervalUpgradeLevels:Array(12).fill(0),dimBulkLevels:Array(8).fill(0),boostMode:'amount',boostValue:4,boostLimit:'',galaxyMode:'amount',galaxyValue:1,galaxyLimit:'',crunchMode:'amount',crunchValue:1,crunchIPTarget:'',sacrificeValue:2},playTime:0,infinityTime:0,infinityStartTimestamp:Date.now(),eternities:0,ep:0,epBN:{mantissa:0,exponent:0},timeTheorems:0,timeStudies:[],timeStudyRespec:false,timeStudyDimensionPath:'antimatter',timeStudyPacePath:'active',timeDimensions:Array(8).fill(null).map(()=>({amount:0,bought:0,multiplier:1})),timeShardsBN:{mantissa:0,exponent:0},fastestInfinity:0,peakIPPerMinBN:{mantissa:0,exponent:0},peakIPGainBN:{mantissa:0,exponent:0},bestIPPerMinBN:{mantissa:0,exponent:0},maxAllUsedThisInfinity:false,lastTenIPPerMinBN:[],activeChallenge:0,completedChallenges:[],activeInfinityChallenge:0,completedInfinityChallenges:[],infinityChallengeTimes:{},ic2SacrificeTimer:0,ic5CostSteps:Array(8).fill(0),ic8ProductionMultiplier:1,icLastBoughtDimension:-1,icMatter:10,challengeTimes:{},challenge9CostSteps:Array(8).fill(0),challenge9TickspeedCostBumps:0,challenge2Recovery:1,challenge3TimeMult:1,challenge11Matter:0,challenge11NoBonusBoosts:0,last:Date.now()};
const INFINITY=Number.MAX_VALUE;
function getIPBigNumber(){const v=state.ipBN;if(v&&typeof v==='object'&&Number.isFinite(Number(v.mantissa))&&Number.isFinite(Number(v.exponent)))return new BigNumber(Number(v.mantissa),Number(v.exponent));return BigNumber.from(state.ip||0);}
function setIPBigNumber(value){const b=BigNumber.from(value).max(0);state.ipBN={mantissa:b.mantissa,exponent:b.exponent};state.ip=b.toNumber();return b;}
function addIPBigNumber(value){return setIPBigNumber(getIPBigNumber().add(value));}
function spendIPBigNumber(value){const next=getIPBigNumber().subtract(value);if(next.compare(0)<0)return false;setIPBigNumber(next);return true;}
function hasIPAtLeast(value){return getIPBigNumber().compare(value)>=0;}
function getEPBigNumber(){const v=state.epBN;if(v&&typeof v==='object'&&Number.isFinite(Number(v.mantissa))&&Number.isFinite(Number(v.exponent)))return BigNumber.from(v).max(0);return BigNumber.from(state.ep||0).max(0);}
function setEPBigNumber(value){const b=BigNumber.from(value).max(0);state.epBN=b.toJSON();state.ep=b.toNumber();return b;}
function addEPBigNumber(value){return setEPBigNumber(getEPBigNumber().add(value));}
const ETERNITY_IP_REQUIREMENT=BigNumber.from('1.8e308');
function canEternity(){return getIPBigNumber().compare(ETERNITY_IP_REQUIREMENT)>0;}
function eternityPointGain(){const ip=getIPBigNumber();if(ip.compare(ETERNITY_IP_REQUIREMENT)<=0)return BigNumber.from(0);const exponent=ip.log10()/308-0.7;return floorBigNumber(BigNumber.from(5).power(exponent));}
