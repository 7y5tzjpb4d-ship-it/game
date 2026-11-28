// 画面の組み立てと更新
import { Big, format } from './big.js';
import {
  TIERS, UPGRADES, REPEATABLES, PROOFS, CARRY_LOG10, HCN, EXPAND_DIGITS, FEW_TOOLS_LIMIT,
  FACTORY, INTEGER_UPGRADES, LAYER3_INTEGERS,
} from './data.js';
import {
  tierCost, bulkCost, tierMult, tierProduction, countPerSec, isTierUnlocked, maxAffordable,
  buyByMode, canCarry, canExpand, nextPrime, digitsOnCarry, nextDigitAt, carry, digitBonus,
  upgradeState, buyUpgrade, hasAnyAuto, milestoneFactor, nextMilestone, milestonesPassed,
  divisorCount, isPrime, perfectPassed, has, autoCarryAvailable, countDigits,
  repeatableCost, repeatableState, buyRepeatable, level, autoCarryGuardTime,
  proofsAvailable, proofUnlocked, proven, provenCount, activeProof, inProof, proofGoalReached,
  startProof, abandonProof, completeProof,
  expand, expandGain, layer2Visible, hasInt, factoryCost, factoryUnlocked, buyFactory, factoryProduction,
  negCountLog, negDigitLog, integerUpgradeState, buyIntegerUpgrade,
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
    this.buildRepeatables();
    this.buildProofs();
    this.buildFactory();
    this.buildIntegerUpgrades();
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
      const reqs = u.requires.map((id) => UPGRADES.find((x) => x.id === id).name);
      if (u.proofs) reqs.push(`証明 ${u.proofs} つ`);
      const req = reqs.length ? `必要：${reqs.join('・')}` : '';
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

  buildRepeatables() {
    const list = $('#repeatables');
    list.innerHTML = '';
    this.repeatableEls = REPEATABLES.map((r) => {
      const li = document.createElement('li');
      li.className = 'upgrade';
      li.innerHTML = `
        <div class="upgrade-body">
          <div class="upgrade-name">${r.name} <span class="upgrade-level"></span></div>
          <div class="upgrade-desc">${r.desc}（買うたびに重なる）</div>
        </div>
        <button type="button" class="buy" data-repeatable="${r.id}"></button>`;
      list.appendChild(li);
      return { li, buy: li.querySelector('.buy'), level: li.querySelector('.upgrade-level'), r };
    });
  }

  buildProofs() {
    const list = $('#proofs');
    list.innerHTML = '';
    this.proofEls = PROOFS.map((p, i) => {
      const li = document.createElement('li');
      li.className = 'proof';
      li.innerHTML = `
        <div class="proof-head">
          <span class="proof-name">${i + 1}. ${p.name}</span>
          <span class="proof-status"></span>
        </div>
        <div class="proof-line"><b>制約</b>　${p.rule}</div>
        <div class="proof-line"><b>目標</b>　この周で数えた合計 1e${p.goal}</div>
        <div class="proof-line"><b>定理</b>　${p.reward}</div>
        <button type="button" class="proof-start" data-proof="${p.id}">挑戦する</button>`;
      list.appendChild(li);
      return { li, status: li.querySelector('.proof-status'), btn: li.querySelector('.proof-start'), p };
    });
  }

  buildFactory() {
    const list = $('#factory');
    list.innerHTML = '';
    this.factoryEls = FACTORY.map((f, i) => {
      const li = document.createElement('li');
      li.className = 'tier';
      li.innerHTML = `
        <div class="tier-icon">${f.name}</div>
        <div class="tier-body">
          <div class="tier-count"><span class="tier-count-num"></span><span class="tier-bought"></span></div>
          <div class="tier-prod"></div>
        </div>
        <button type="button" class="buy" data-factory="${i}"><span>購入</span><small class="buy-cost"></small></button>`;
      list.appendChild(li);
      return {
        li,
        count: li.querySelector('.tier-count-num'),
        bought: li.querySelector('.tier-bought'),
        prod: li.querySelector('.tier-prod'),
        buy: li.querySelector('.buy'),
        cost: li.querySelector('.buy-cost'),
      };
    });
  }

  buildIntegerUpgrades() {
    const list = $('#integer-upgrades');
    list.innerHTML = '';
    this.integerUpgradeEls = INTEGER_UPGRADES.map((u) => {
      const li = document.createElement('li');
      li.className = 'upgrade';
      li.innerHTML = `
        <div class="upgrade-body">
          <div class="upgrade-name">${u.name}</div>
          <div class="upgrade-desc">${u.desc}</div>
        </div>
        <button type="button" class="buy" data-int-upgrade="${u.id}"></button>`;
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

    document.querySelectorAll('[data-automode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.automode;
        this.state.auto = mode !== 'off';
        if (mode !== 'off') this.state.autoMode = mode;
        this.render();
      });
    });
    document.querySelectorAll('[data-carrymode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.autoCarryMode = btn.dataset.carrymode;
        this.render();
      });
    });
    const amount = $('#carry-amount');
    const time = $('#carry-time');
    amount.addEventListener('change', () => {
      const v = Number(amount.value);
      if (v > 0) this.state.autoCarryAmount = v;
      this.render();
    });
    time.addEventListener('change', () => {
      const v = Math.floor(Number(time.value));
      if (v >= 1) this.state.autoCarryTime = v;
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

    $('#repeatables').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-repeatable]');
      if (!btn) return;
      if (buyRepeatable(this.state, btn.dataset.repeatable)) {
        this.game.save();
        this.render();
      }
    });

    $('#proofs').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-proof]');
      if (!btn) return;
      const p = PROOFS.find((x) => x.id === btn.dataset.proof);
      const ok = window.confirm(
        `「${p.name}」の証明を始めますか？\n今の周はリセットされ、桁はもらえません。\n制約：${p.rule}`,
      );
      if (!ok) return;
      if (startProof(this.state, p.id)) {
        this.game.save();
        this.showTab('count');
      }
    });
    $('#proof-complete').addEventListener('click', () => {
      const p = activeProof(this.state);
      if (!p || !proofGoalReached(this.state)) return;
      completeProof(this.state);
      this.game.save();
      this.toast(`証明完成！ 定理「${p.name}」\n${p.reward}`, 4000);
      this.render();
    });
    $('#proof-abandon').addEventListener('click', () => {
      const p = activeProof(this.state);
      if (!p) return;
      if (!window.confirm(`「${p.name}」の証明をやめますか？\n今の周はリセットされ、桁はもらえません。`)) return;
      abandonProof(this.state);
      this.game.save();
      this.render();
    });

    $('#expand-btn').addEventListener('click', () => {
      const gain = expandGain(this.state);
      if (gain.isZero() || this.state.proof) return;
      const ok = window.confirm(this.state.expansions === 0
        ? `拡張すると、数・道具・桁・桁の強化・繰り返し強化・証明がすべてリセットされます。\n代わりに「整数」を ${format(gain)} 個手に入れ、負の数の工場などに使えます。\n拡張しますか？`
        : `拡張しますか？（整数 +${format(gain)}）`);
      if (!ok) return;
      const first = this.state.expansions === 0;
      expand(this.state);
      this.game.save();
      this.toast(first ? `負の数の発見！\n数の世界が「整数」へ広がった。整数 +${format(gain)}` : `拡張！ 整数 +${format(gain)}`, first ? 4000 : 2500);
      this.showTab(first ? 'integers' : 'count');
    });
    $('#factory').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-factory]');
      if (!btn) return;
      if (buyFactory(this.state, Number(btn.dataset.factory))) this.render();
    });
    $('#integer-upgrades').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-int-upgrade]');
      if (!btn) return;
      if (buyIntegerUpgrade(this.state, btn.dataset.intUpgrade)) {
        this.game.save();
        this.render();
      }
    });
    $('#auto-digit-up-toggle').addEventListener('click', () => {
      this.state.autoDigitUpgrades = !this.state.autoDigitUpgrades;
      this.render();
    });
    $('#auto-expand-toggle').addEventListener('click', () => {
      this.state.autoExpand = !this.state.autoExpand;
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
    return buyByMode(this.state, i);
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

    this.renderProofBanner();
    this.renderGoal();
    this.renderTiers();

    // 素数を使うモードは「素数の輝き」を取ってから出す
    const primeOn = has(s, 'prime');
    if (!primeOn && s.buyMode === 'prime') s.buyMode = 'one';
    if (!primeOn && s.autoMode === 'prime') s.autoMode = 'max';
    document.querySelector('[data-buymode="prime"]').classList.toggle('hidden', !primeOn);
    document.querySelector('[data-automode="prime"]').classList.toggle('hidden', !primeOn);
    document.querySelectorAll('[data-buymode]').forEach((b) => b.classList.toggle('active', b.dataset.buymode === s.buyMode));
    $('#auto-row').classList.toggle('hidden', !hasAnyAuto(s));
    const autoActive = s.auto ? s.autoMode : 'off';
    document.querySelectorAll('[data-automode]').forEach((b) => b.classList.toggle('active', b.dataset.automode === autoActive));
    this.renderAutoCarry();
    const autoCarryBtn = $('#auto-carry-toggle');
    autoCarryBtn.classList.toggle('hidden', !autoCarryAvailable(s));
    autoCarryBtn.classList.toggle('on', s.autoCarry);
    autoCarryBtn.textContent = `自動繰り上がり ${s.autoCarry ? 'ON' : 'OFF'}`;

    // 桁タブは一度でも繰り上がれるようになったら出す
    const digitsTab = document.querySelector('[data-tab="digits"]');
    digitsTab.classList.toggle('hidden', !(s.carries > 0 || canCarry(s)));
    digitsTab.classList.toggle('badge', s.carries > 0 && UPGRADES.some((u) => upgradeState(s, u) === 'affordable'));

    const intTab = document.querySelector('[data-tab="integers"]');
    intTab.classList.toggle('hidden', !layer2Visible(s));
    intTab.classList.toggle('badge', s.expansions > 0 && INTEGER_UPGRADES.some((u) => integerUpgradeState(s, u) === 'affordable'));
    if (document.querySelector('[data-panel="integers"]').classList.contains('active')) this.renderIntegers();

    const proofsTab = document.querySelector('[data-tab="proofs"]');
    proofsTab.classList.toggle('hidden', !proofsAvailable(s));
    proofsTab.classList.toggle('badge', proofsAvailable(s) && !s.proof && PROOFS.some((p) => !proven(s, p.id) && proofUnlocked(s, p.id)) && provenCount(s) === 0);

    if (document.querySelector('[data-panel="digits"]').classList.contains('active')) this.renderDigits();
    if (document.querySelector('[data-panel="proofs"]').classList.contains('active')) this.renderProofs();
    if (document.querySelector('[data-panel="settings"]').classList.contains('active')) this.renderStats();
  }

  renderAutoCarry() {
    const s = this.state;
    const show = autoCarryAvailable(s) && s.autoCarry;
    $('#auto-carry-row').classList.toggle('hidden', !show);
    $('#carry-note').classList.toggle('hidden', !show);
    if (!show) return;
    document.querySelectorAll('[data-carrymode]').forEach((b) => b.classList.toggle('active', b.dataset.carrymode === s.autoCarryMode));
    $('#carry-amount-wrap').classList.toggle('hidden', s.autoCarryMode !== 'amount');
    $('#carry-time-wrap').classList.toggle('hidden', s.autoCarryMode !== 'time');
    // 入力中は上書きしない
    const amount = $('#carry-amount');
    const time = $('#carry-time');
    if (document.activeElement !== amount) amount.value = String(s.autoCarryAmount);
    if (document.activeElement !== time) time.value = String(s.autoCarryTime);
    let note;
    if (s.autoCarryMode === 'amount') note = `得られる桁が所持している桁の ${s.autoCarryAmount} 倍以上になったら繰り上がる`;
    else if (s.autoCarryMode === 'time') note = `1 周が ${s.autoCarryTime} 秒になったら繰り上がる`;
    else {
      const guard = autoCarryGuardTime(s);
      note = '桁の獲得効率が下がり始めたら繰り上がる。'
        + (guard === null ? '上がり続ける場合も、一定時間で繰り上がる' : `上がり続けても、この周の ${fmtTime(guard)} で繰り上がる`);
    }
    if (s.proof) note = '証明中は自動繰り上がりが止まる';
    $('#carry-note').textContent = note;
  }

  renderProofBanner() {
    const s = this.state;
    const p = activeProof(s);
    $('#proof-banner').classList.toggle('hidden', !p);
    if (!p) return;
    $('#proof-banner-name').textContent = p.name;
    $('#proof-banner-rule').textContent = `制約：${p.rule}`;
    const l = Math.max(0, s.runTotal.log10());
    $('#proof-banner-text').textContent = `この周で数えた合計 ${format(s.runTotal.floor())} / 1e${p.goal}`;
    $('#proof-banner-bar').style.width = `${Math.min(100, (l / p.goal) * 100)}%`;
    $('#proof-complete').classList.toggle('hidden', !proofGoalReached(s));
  }

  renderProofs() {
    const s = this.state;
    this.proofEls.forEach(({ li, status, btn, p }) => {
      const done = proven(s, p.id);
      const active = inProof(s, p.id);
      const open = proofUnlocked(s, p.id);
      li.classList.toggle('proven', done);
      li.classList.toggle('active', active);
      li.classList.toggle('locked', !done && !open);
      status.textContent = done ? '完成' : active ? '挑戦中' : open ? '挑戦できる' : '前の証明を完成させると開く';
      btn.classList.toggle('hidden', done || active || !open || !!s.proof);
    });
  }

  renderGoal() {
    const s = this.state;
    const btn = $('#carry');
    if (s.proof) {
      // 証明中は繰り上がりではなく、上の証明の表示で目標を見せる
      btn.classList.add('hidden');
      $('#goal').classList.add('hidden');
      return;
    }
    const can = canCarry(s);
    btn.classList.toggle('hidden', !can);
    if (can) {
      const next = nextDigitAt(s);
      $('#carry-gain').textContent = next
        ? `桁 +${format(digitsOnCarry(s))}（次の +1 まで 合計 ${format(next)}）`
        : `桁 +${format(digitsOnCarry(s))}`;
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
    if (has(s, 'prime') && isPrime(bought)) notes.push('素数');
    if (has(s, 'divisor')) notes.push(`約数${divisorCount(bought)}個`);
    if (has(s, 'perfect') && perfectPassed(bought) > 0) notes.push(`完全数${perfectPassed(bought)}`);
    return notes.length ? ` · ${notes.join(' · ')}` : '';
  }

  renderTiers() {
    const s = this.state;
    let shownLocked = false;
    TIERS.forEach((t, i) => {
      const el = this.tierEls[i];
      const unlocked = isTierUnlocked(s, i);
      // 「少ない道具」の証明中は、上の段を使えないことを 1 回だけ見せる
      if (!unlocked && inProof(s, 'fewTools') && i >= FEW_TOOLS_LIMIT) {
        if (i > FEW_TOOLS_LIMIT) {
          el.li.classList.add('hidden');
          return;
        }
        el.li.classList.remove('hidden');
        el.li.classList.add('locked');
        el.name.textContent = TIERS.slice(FEW_TOOLS_LIMIT).map((x) => x.name).join('・');
        el.icon.textContent = '×';
        el.mult.textContent = '';
        el.count.textContent = '';
        el.bought.textContent = '';
        el.prod.textContent = 'この証明では使えない';
        el.adapt.classList.add('hidden');
        el.buy.classList.add('hidden');
        return;
      }
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
      el.prod.textContent = inProof(s, 'primeTheorem') && !isPrime(tier.bought)
        ? '停止中（購入数が素数でない）'
        : `毎秒 +${format(tierProduction(s, i), 1)} ${target}`;

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
      } else if (s.buyMode === 'prime') {
        n = nextPrime(tier.bought) - tier.bought;
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
      buy.textContent = st === 'owned' ? '取得済み' : `${format(u.cost)} 桁`;
    });
    let anyRepeatable = false;
    this.repeatableEls.forEach(({ li, buy, level: lvEl, r }) => {
      const st = repeatableState(s, r);
      li.classList.toggle('hidden', st === 'locked');
      if (st !== 'locked') anyRepeatable = true;
      lvEl.textContent = `Lv ${level(s, r.id)}`;
      buy.classList.toggle('cant', st !== 'affordable');
      buy.textContent = `${format(repeatableCost(r, level(s, r.id)))} 桁`;
    });
    $('#repeatables-title').classList.toggle('hidden', !anyRepeatable);
    // 進み具合は桁数（log10）で表す
    const goal = Big.from(EXPAND_DIGITS);
    const pct = Math.min(100, Math.max(0, s.digits.log10() / goal.log10()) * 100);
    $('#expand-text').textContent = `所持している桁 ${format(s.digits)} / ${format(goal)}`;
    $('#expand-bar').style.width = `${pct}%`;
    const ready = canExpand(s);
    $('#expand').classList.toggle('ready', ready);
    const expandBtn = $('#expand-btn');
    expandBtn.disabled = !ready || !!s.proof;
    expandBtn.textContent = !ready ? '拡張する' : s.proof ? '証明中は拡張できない' : `拡張する（整数 +${format(expandGain(s))}）`;
  }

  renderIntegers() {
    const s = this.state;
    $('#integers').textContent = format(s.integers);
    $('#integers-sub').innerHTML = `負のエネルギー ${format(s.negEnergy, 1)}<br>`
      + `→ 数の生産 ×${format(Big.fromLog10(negCountLog(s)), 1)}、得られる桁 ×${format(Big.fromLog10(negDigitLog(s)), 1)}<br>`
      + `拡張 ${s.expansions} 回`;
    let shownLocked = false;
    this.factoryEls.forEach((el, i) => {
      const unlocked = factoryUnlocked(s, i);
      if (!unlocked && shownLocked) {
        el.li.classList.add('hidden');
        return;
      }
      el.li.classList.remove('hidden');
      el.li.classList.toggle('locked', !unlocked);
      if (!unlocked) {
        shownLocked = true;
        el.count.textContent = '';
        el.bought.textContent = '';
        el.prod.textContent = `${FACTORY[i - 1].name} を手に入れると使える`;
        el.buy.classList.add('hidden');
        return;
      }
      const f = s.factory[i];
      el.count.textContent = format(f.count.floor());
      el.bought.textContent = `購入 ${f.bought}`;
      el.prod.textContent = `毎秒 +${format(factoryProduction(s, i), 1)} ${i === 0 ? '負のエネルギー' : FACTORY[i - 1].name}`;
      const cost = factoryCost(i, f.bought);
      el.buy.classList.remove('hidden');
      el.buy.classList.toggle('cant', s.integers.lt(cost));
      el.cost.textContent = `${format(cost)} 整数`;
    });
    this.integerUpgradeEls.forEach(({ li, buy, u }) => {
      const st = integerUpgradeState(s, u);
      li.classList.toggle('owned', st === 'owned');
      buy.classList.toggle('cant', st === 'expensive');
      buy.textContent = st === 'owned' ? '取得済み' : `${format(u.cost)} 整数`;
    });
    const t1 = $('#auto-digit-up-toggle');
    t1.classList.toggle('hidden', !hasInt(s, 'autoDigitUpgrades'));
    t1.classList.toggle('on', s.autoDigitUpgrades);
    t1.textContent = `自動の公理 ${s.autoDigitUpgrades ? 'ON' : 'OFF'}`;
    const t2 = $('#auto-expand-toggle');
    t2.classList.toggle('hidden', !hasInt(s, 'autoExpand'));
    t2.classList.toggle('on', s.autoExpand);
    t2.textContent = `自動拡張 ${s.autoExpand ? 'ON' : 'OFF'}`;
    const goal = Big.from(LAYER3_INTEGERS);
    $('#layer3-text').textContent = `所持している整数 ${format(s.integers)} / ${format(goal)}`;
    $('#layer3-bar').style.width = `${Math.min(100, Math.max(0, s.integers.add(1).log10() / goal.log10()) * 100)}%`;
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

