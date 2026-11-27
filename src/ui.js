// 画面の組み立てと更新
import { format } from './big.js';
import { TIERS, UPGRADES, EVOLVE_LOG10, nextAdaptAt } from './data.js';
import {
  tierCost, tierMult, tierProduction, energyPerSec, isTierUnlocked, maxAffordable,
  buyTier, canEvolve, genesOnEvolve, nextGeneAt, evolve, geneBonus,
  upgradeState, buyUpgrade, hasAnyAuto, adaptFactor,
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
          buyTier(this.state, i);
          this.render();
        }, 70);
      }, 350);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => tiers.addEventListener(ev, stopRepeat));
    document.querySelector('main').addEventListener('scroll', stopRepeat, { passive: true });
    tiers.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tier]');
      if (!btn) return;
      buyTier(this.state, Number(btn.dataset.tier));
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

    $('#evolve').addEventListener('click', () => {
      const gain = genesOnEvolve(this.state);
      if (gain.isZero()) return;
      if (this.state.evolutions === 0) {
        const ok = window.confirm(
          `進化すると、エネルギーとすべての段がリセットされます。\n代わりに遺伝子 ${format(gain)} 個を手に入れ、永続的な強化に使えます。\n進化しますか？`,
        );
        if (!ok) return;
      }
      evolve(this.state);
      this.game.save();
      this.toast(`進化しました！ 遺伝子 +${format(gain)}`);
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
        this.showTab('cells');
      } else {
        this.toast('読み込めませんでした。文字列を確認してください');
      }
    });
    $('#hard-reset').addEventListener('click', () => {
      if (!window.confirm('すべての進行状況を消して、最初からやり直しますか？')) return;
      if (!window.confirm('本当に消しますか？元に戻せません。')) return;
      this.game.hardReset();
      this.toast('最初からやり直します');
      this.showTab('cells');
    });
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
    $('#energy').textContent = format(s.energy.floor());
    $('#rate').textContent = `+${format(energyPerSec(s), 1)} /秒`;

    this.renderGoal();
    this.renderTiers();

    document.querySelectorAll('[data-buymode]').forEach((b) => b.classList.toggle('active', b.dataset.buymode === s.buyMode));
    const autoBtn = $('#auto-toggle');
    autoBtn.classList.toggle('hidden', !hasAnyAuto(s));
    autoBtn.classList.toggle('on', s.auto);
    autoBtn.textContent = `自動購入 ${s.auto ? 'ON' : 'OFF'}`;

    // 遺伝子タブは一度でも進化できるようになったら出す
    const genesTab = document.querySelector('[data-tab="genes"]');
    const genesVisible = s.evolutions > 0 || canEvolve(s);
    genesTab.classList.toggle('hidden', !genesVisible);
    genesTab.classList.toggle('badge', UPGRADES.some((u) => upgradeState(s, u) === 'affordable'));

    if (document.querySelector('[data-panel="genes"]').classList.contains('active')) this.renderGenes();
    if (document.querySelector('[data-panel="settings"]').classList.contains('active')) this.renderStats();
  }

  renderGoal() {
    const s = this.state;
    const evolveBtn = $('#evolve');
    const can = canEvolve(s);
    evolveBtn.classList.toggle('hidden', !can);
    if (can) {
      $('#evolve-gain').textContent = `遺伝子 +${format(genesOnEvolve(s))}（次の +1 まで ${format(nextGeneAt(s))}）`;
      $('#goal').classList.add('hidden');
      return;
    }
    $('#goal').classList.remove('hidden');
    const l = Math.max(0, s.energy.log10());
    const pct = Math.min(100, (l / EVOLVE_LOG10) * 100);
    $('#goal-text').textContent = s.evolutions === 0
      ? `何かが起こりそうだ…（エネルギー 1e${EVOLVE_LOG10}）`
      : `進化まで：エネルギー 1e${EVOLVE_LOG10}`;
    $('#goal-bar').style.width = `${pct}%`;
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
      el.bought.textContent = `購入 ${tier.bought}`;
      const target = i === 0 ? 'エネルギー' : TIERS[i - 1].name;
      el.prod.textContent = `毎秒 +${format(tierProduction(s, i), 1)} ${target}`;

      const next = nextAdaptAt(tier.bought);
      const prev = next === 25 ? 0 : next === 50 ? 25 : next - 100 < 50 ? 50 : next - 100;
      el.adaptText.textContent = `適応まで あと ${next - tier.bought} 個 → ×${adaptFactor(s)}`;
      el.adaptBar.style.width = `${((tier.bought - prev) / (next - prev)) * 100}%`;

      let n;
      let cost;
      if (s.buyMode === 'max') {
        ({ n, cost } = maxAffordable(s, i));
        if (n === 0) {
          n = 1;
          cost = tierCost(i, tier.bought);
        }
      } else {
        n = 1;
        cost = tierCost(i, tier.bought);
      }
      const can = s.energy.gte(cost);
      el.buy.classList.toggle('cant', !can);
      el.buyLabel.textContent = n > 1 ? `+${format(n)} 個` : '購入';
      el.buyCost.textContent = format(cost);
    });
  }

  renderGenes() {
    const s = this.state;
    $('#genes').textContent = format(s.genes);
    $('#genes-sub').innerHTML = `累計 ${format(s.genesTotal)} 遺伝子 → 全生産 ×${format(geneBonus(s), 2)}<br>進化 ${s.evolutions} 回`;
    this.upgradeEls.forEach(({ li, buy, u }) => {
      const st = upgradeState(s, u);
      li.classList.toggle('owned', st === 'owned');
      li.classList.toggle('locked', st === 'locked');
      buy.classList.toggle('cant', st === 'expensive' || st === 'locked');
      buy.textContent = st === 'owned' ? '取得済み' : `${u.cost} 遺伝子`;
    });
  }

  renderStats() {
    const s = this.state;
    $('#stats').innerHTML = `
      <dt>プレイ時間</dt><dd>${fmtTime(s.playTime)}</dd>
      <dt>今回の進化からの時間</dt><dd>${fmtTime(s.runTime)}</dd>
      <dt>進化した回数</dt><dd>${s.evolutions} 回</dd>
      <dt>累計遺伝子</dt><dd>${format(s.genesTotal)}</dd>`;
  }
}
