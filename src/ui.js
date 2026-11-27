// 画面の組み立てと更新
import { format } from './big.js';
import { TIERS, UPGRADES, CARRY_LOG10, CARRY_MILESTONES, HCN } from './data.js';
import {
  tierCost, bulkCost, tierMult, tierProduction, countPerSec, isTierUnlocked, maxAffordable,
  buyTier, buyToMilestone, canCarry, digitsOnCarry, nextDigitAt, carry, digitBonus,
  upgradeState, buyUpgrade, hasAnyAuto, milestoneFactor, nextMilestone, milestonesPassed,
  divisorCount, isPrime, isPerfect, has, autoCarryAvailable, milestoneReached, countDigits,
} from './logic.js';

const $ = (sel) => document.querySelector(sel);

function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}時間${m}分`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

export class UI {
  constructor(game) {
    this.game = game;
    this.tierEls = [];
    this.upgradeEls = [];
    this.toastTimer = null;
    this.buildTiers();
    this.buildUpgrades();
    this.buildMilestones();
    this.bindEvents();
  }

  get state() {
    return this.game.state;
  }

  // ---------- 組み立て ----------

  buildTiers() {
    const list = $('#tiers');
    list.innerHTML = '';
    this.tierEls = TIERS.map((t, i) => {
      const li = document.createElement('li');
      li.className = 'tier';
      li.innerHTML = `
        <div class="tier-icon">${t.icon}</div>
        <div class="tier-body">
          <div class="tier-head">
            <span class="tier-name">${t.name}</span>
            <span class="tier-mult"></span>
          </div>
          <div class="tier-count"><span class="tier-count-num"></span><span class="tier-bought"></span></div>
          <div class="tier-prod"></div>
          <div class="tier-adapt"><span class="tier-adapt-text"></span><div class="bar"><div class="bar-fill"></div></div></div>
        </div>
        <button type="button" class="buy" data-tier="${i}"><span class="buy-label"></span><small class="buy-cost"></small></button>`;
      list.appendChild(li);
      return {
        li,
        mult: li.querySelector('.tier-mult'),
        count: li.querySelector('.tier-count-num'),
        bought: li.querySelector('.tier-bought'),
        prod: li.querySelector('.tier-prod'),
        adaptText: li.querySelector('.tier-adapt-text'),
        adaptBar: li.querySelector('.tier-adapt .bar-fill'),
        adapt: li.querySelector('.tier-adapt'),
        buy: li.querySelector('.buy'),
        buyLabel: li.querySelector('.buy-label'),
        buyCost: li.querySelector('.buy-cost'),
        name: li.querySelector('.tier-name'),
        icon: li.querySelector('.tier-icon'),
      };
    });
  }

  buildUpgrades() {
    const list = $('#upgrades');
    list.innerHTML = '';
    this.upgradeEls = UPGRADES.map((u) => {
      const li = document.createElement('li');
      li.className = 'upgrade';
      const req = u.requires.length
        ? `必要：${u.requires.map((id) => UPGRADES.find((x) => x.id === id).name).join('・')}`
        : '';
      li.innerHTML = `
        <div class="upgrade-body">
          <div class="upgrade-name">${u.name}</div>
          <div class="upgrade-desc">${u.desc}</div>
          ${req ? `<div class="upgrade-req">${req}</div>` : ''}
        </div>
        <button type="button" class="buy" data-upgrade="${u.id}"></button>`;
      list.appendChild(li);
      return { li, buy: li.querySelector('.buy'), u };
    });
  }

  buildMilestones() {
    const list = $('#milestones');
    list.innerHTML = '';
    this.milestoneEls = CARRY_MILESTONES.map((m) => {
      const li = document.createElement('li');
      li.className = 'milestone';
      li.innerHTML = `
        <div class="milestone-at">${m.at} 回</div>
        <div class="milestone-body">
          <div class="milestone-name">${m.name}</div>
          <div class="milestone-desc">${m.desc}</div>
        </div>`;
      list.appendChild(li);
      return { li, m };
    });
  }

  bindEvents() {
    // 購入ボタン：タップで 1 回、長押しで連続購入
    const tiers = $('#tiers');
    let repeatTimer = null;
    const stopRepeat = () => {
      clearTimeout(repeatTimer);
      clearInterval(repeatTimer);
      repeatTimer = null;
    };
    tiers.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('[data-tier]');
      if (!btn) return;
      const i = Number(btn.dataset.tier);
      stopRepeat();
      repeatTimer = setTimeout(() => {
        repeatTimer = setInterval(() => {
          this.buy(i);
          this.render();
        }, 70);
      }, 350);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => tiers.addEventListener(ev, stopRepeat));
    $('#main').addEventListener('scroll', stopRepeat, { passive: true });
    tiers.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tier]');
      if (!btn) return;
      this.buy(Number(btn.dataset.tier));
      this.render();
    });

    document.querySelectorAll('[data-buymode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.buyMode = btn.dataset.buymode;
        this.render();
      });
    });

    $('#auto-toggle').addEventListener('click', () => {
      this.state.auto = !this.state.auto;
      this.render();
    });
    $('#auto-carry-toggle').addEventListener('click', () => {
      this.state.autoCarry = !this.state.autoCarry;
      this.render();
    });

    $('#carry').addEventListener('click', () => {
      const gain = digitsOnCarry(this.state);
      if (gain.isZero()) return;
      const first = this.state.carries === 0;
      if (first) {
        const ok = window.confirm(
          `繰り上がると、数とすべての道具がリセットされます。\n代わりに「桁」を ${format(gain)} 個手に入れ、永続的な強化に使えます。\n繰り上がりますか？`,
        );
        if (!ok) return;
      }
      carry(this.state);
      this.game.save();
      this.toast(first
        ? `零の発見！\nまとまった数を「位」で表せるようになった。桁 +${format(gain)}`
        : `繰り上がり！ 桁 +${format(gain)}`, first ? 4000 : 2500);
      this.render();
    });

    $('#upgrades').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-upgrade]');
      if (!btn) return;
      if (buyUpgrade(this.state, btn.dataset.upgrade)) {
        this.game.save();
        this.render();
      }
    });

    document.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => this.showTab(btn.dataset.tab));
    });

    $('#save-now').addEventListener('click', () => {
      this.game.save();
      this.toast('保存しました');
    });
    $('#export').addEventListener('click', async () => {
      const text = this.game.exportSave();
      const area = $('#save-text');
      area.value = text;
      area.classList.remove('hidden');
      area.select();
      try {
        await navigator.clipboard.writeText(text);
        this.toast('セーブデータをコピーしました');
      } catch {
        this.toast('下の文字列をコピーして保管してください');
      }
    });
    $('#import').addEventListener('click', () => {
      const area = $('#save-text');
      if (area.classList.contains('hidden') || !area.value.trim()) {
        area.value = '';
        area.placeholder = 'ここにセーブデータを貼り付けて、もう一度「読み込み」を押してください';
        area.classList.remove('hidden');
        area.focus();
        return;
      }
      if (!window.confirm('今のデータを上書きして読み込みますか？')) return;
      if (this.game.importSave(area.value.trim())) {
        area.value = '';
        area.classList.add('hidden');
        this.toast('読み込みました');
        this.showTab('count');
      } else {
        this.toast('読み込めませんでした。文字列を確認してください');
      }
    });
    $('#hard-reset').addEventListener('click', () => {
      if (!window.confirm('すべての進行状況を消して、最初からやり直しますか？')) return;
      if (!window.confirm('本当に消しますか？元に戻せません。')) return;
      this.game.hardReset();
      this.toast('最初からやり直します');
      this.showTab('count');
    });
  }

  buy(i) {
    if (this.state.buyMode === 'milestone') return buyToMilestone(this.state, i);
    return buyTier(this.state, i);
  }

  showTab(name) {
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('[data-panel]').forEach((p) => p.classList.toggle('active', p.dataset.panel === name));
    $('#main').scrollTop = 0;
    this.render();
  }

  toast(text, ms = 2500) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }

  // ---------- 更新 ----------

  render() {
    const s = this.state;
    $('#count').textContent = format(s.count.floor());
    $('#rate').textContent = `+${format(countPerSec(s), 1)} /秒`;

    this.renderGoal();
    this.renderTiers();

    document.querySelectorAll('[data-buymode]').forEach((b) => b.classList.toggle('active', b.dataset.buymode === s.buyMode));
    const autoBtn = $('#auto-toggle');
    autoBtn.classList.toggle('hidden', !hasAnyAuto(s));
    autoBtn.classList.toggle('on', s.auto);
    autoBtn.textContent = `自動購入 ${s.auto ? 'ON' : 'OFF'}`;
    const autoCarryBtn = $('#auto-carry-toggle');
    autoCarryBtn.classList.toggle('hidden', !autoCarryAvailable(s));
    autoCarryBtn.classList.toggle('on', s.autoCarry);
    autoCarryBtn.textContent = `自動繰り上がり ${s.autoCarry ? 'ON' : 'OFF'}`;

    // 桁タブは一度でも繰り上がれるようになったら出す
    const digitsTab = document.querySelector('[data-tab="digits"]');
    digitsTab.classList.toggle('hidden', !(s.carries > 0 || canCarry(s)));
    digitsTab.classList.toggle('badge', s.carries > 0 && UPGRADES.some((u) => upgradeState(s, u) === 'affordable'));

    if (document.querySelector('[data-panel="digits"]').classList.contains('active')) this.renderDigits();
    if (document.querySelector('[data-panel="settings"]').classList.contains('active')) this.renderStats();
  }

  renderGoal() {
    const s = this.state;
    const btn = $('#carry');
    const can = canCarry(s);
    btn.classList.toggle('hidden', !can);
    if (can) {
      $('#carry-gain').textContent = `桁 +${format(digitsOnCarry(s))}（次の +1 まで 合計 ${format(nextDigitAt(s))}）`;
      $('#goal').classList.add('hidden');
      return;
    }
    $('#goal').classList.remove('hidden');
    const l = Math.max(0, s.runTotal.log10());
    const pct = Math.min(100, (l / CARRY_LOG10) * 100);
    $('#goal-text').textContent = s.carries === 0
      ? `数えきれなくなりそうだ…（この周で数えた合計 ${format(s.runTotal.floor())} / 1e${CARRY_LOG10}）`
      : `繰り上がりまで：この周で数えた合計 ${format(s.runTotal.floor())} / 1e${CARRY_LOG10}`;
    $('#goal-bar').style.width = `${pct}%`;
  }

  // 購入数の整数論的な性質を短く表す
  numberNote(bought) {
    const s = this.state;
    if (bought <= 0) return '';
    const notes = [];
    if (has(s, 'perfect') && isPerfect(bought)) notes.push('完全数');
    if (has(s, 'prime') && isPrime(bought)) notes.push('素数');
    if (has(s, 'divisor')) notes.push(`約数${divisorCount(bought)}個`);
    return notes.length ? ` · ${notes.join(' · ')}` : '';
  }

  renderTiers() {
    const s = this.state;
    let shownLocked = false;
    TIERS.forEach((t, i) => {
      const el = this.tierEls[i];
      const unlocked = isTierUnlocked(s, i);
      // 未解放の段は、次の 1 つだけ「？」で見せる
      if (!unlocked) {
        if (shownLocked) {
          el.li.classList.add('hidden');
          return;
        }
        shownLocked = true;
        el.li.classList.remove('hidden');
        el.li.classList.add('locked');
        el.name.textContent = '？？？';
        el.icon.textContent = '？';
        el.mult.textContent = '';
        el.count.textContent = '';
        el.bought.textContent = '';
        el.prod.textContent = `${TIERS[i - 1].name}を手に入れると現れる`;
        el.adapt.classList.add('hidden');
        el.buy.classList.add('hidden');
        return;
      }
      el.li.classList.remove('hidden', 'locked');
      el.name.textContent = t.name;
      el.icon.textContent = t.icon;
      el.buy.classList.remove('hidden');
      el.adapt.classList.remove('hidden');

      const tier = s.tiers[i];
      el.mult.textContent = `×${format(tierMult(s, i), 1)}`;
      el.count.textContent = format(tier.count.floor());
      el.bought.textContent = `購入 ${tier.bought}${this.numberNote(tier.bought)}`;
      const target = i === 0 ? '数' : TIERS[i - 1].name;
      el.prod.textContent = `毎秒 +${format(tierProduction(s, i), 1)} ${target}`;

      // 次の節目（高度合成数）
      const next = nextMilestone(tier.bought);
      const k = milestonesPassed(tier.bought);
      const prev = k === 0 ? 0 : HCN[k - 1];
      if (next === null) {
        el.adaptText.textContent = '節目をすべて通過';
        el.adaptBar.style.width = '100%';
      } else {
        el.adaptText.textContent = `節目 ${next} まで あと ${next - tier.bought}（×${milestoneFactor(s)}）`;
        el.adaptBar.style.width = `${((tier.bought - prev) / (next - prev)) * 100}%`;
      }

      let n;
      let cost;
      if (s.buyMode === 'max') {
        ({ n, cost } = maxAffordable(s, i));
        if (n === 0) {
          n = 1;
          cost = tierCost(i, tier.bought);
        }
      } else if (s.buyMode === 'milestone' && next !== null) {
        n = next - tier.bought;
        cost = bulkCost(i, tier.bought, n);
      } else {
        n = 1;
        cost = tierCost(i, tier.bought);
      }
      const can = s.count.gte(cost);
      el.buy.classList.toggle('cant', !can);
      el.buyLabel.textContent = n > 1 ? `+${format(n)} 個` : '購入';
      el.buyCost.textContent = format(cost);
    });
  }

  renderDigits() {
    const s = this.state;
    $('#digits').textContent = format(s.digits);
    $('#digits-sub').innerHTML = `累計 ${format(s.digitsTotal)} 桁 → 数の生産 ×${format(digitBonus(s), 2)}<br>繰り上がり ${s.carries} 回`;
    this.upgradeEls.forEach(({ li, buy, u }) => {
      const st = upgradeState(s, u);
      li.classList.toggle('owned', st === 'owned');
      li.classList.toggle('locked', st === 'locked');
      buy.classList.toggle('cant', st === 'expensive' || st === 'locked');
      buy.textContent = st === 'owned' ? '取得済み' : `${u.cost} 桁`;
    });
    this.milestoneEls.forEach(({ li, m }) => {
      li.classList.toggle('reached', milestoneReached(s, m.id));
    });
  }

  renderStats() {
    const s = this.state;
    $('#stats').innerHTML = `
      <dt>プレイ時間</dt><dd>${fmtTime(s.playTime)}</dd>
      <dt>今回の周の時間</dt><dd>${fmtTime(s.runTime)}</dd>
      <dt>数の桁数</dt><dd>${countDigits(s)} 桁</dd>
      <dt>繰り上がった回数</dt><dd>${s.carries} 回</dd>
      <dt>累計の桁</dt><dd>${format(s.digitsTotal)}</dd>`;
  }
}

