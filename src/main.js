import { format } from './big.js';
import { OFFLINE_CAP_SEC } from './data.js';
import { newGame, serialize, deserialize, tick, advance } from './logic.js';
import { UI } from './ui.js';

const SAVE_KEY = 'scale-save';
const AUTOSAVE_MS = 10_000;
const RENDER_MS = 100;

function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}時間${m}分`;
  if (m > 0) return `${m}分`;
  return `${Math.floor(sec)}秒`;
}

class Game {
  constructor() {
    this.state = this.load() ?? newGame();
    this.ui = new UI(this);
    this.lastFrame = performance.now();
    this.lastRender = 0;
  }

  load() {
    try {
      const text = localStorage.getItem(SAVE_KEY);
      return text ? deserialize(text) : null;
    } catch (e) {
      console.error('セーブデータを読み込めませんでした', e);
      return null;
    }
  }

  save() {
    this.state.lastSaved = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, serialize(this.state));
    } catch (e) {
      console.error('保存に失敗しました', e);
    }
  }

  exportSave() {
    this.save();
    return btoa(unescape(encodeURIComponent(serialize(this.state))));
  }

  importSave(text) {
    try {
      const json = decodeURIComponent(escape(atob(text)));
      this.state = deserialize(json);
      this.state.lastSaved = Date.now();
      this.save();
      return true;
    } catch {
      return false;
    }
  }

  hardReset() {
    this.state = newGame();
    this.save();
  }

  // 離れていた時間をまとめて進める
  catchUp(seconds) {
    const sec = Math.min(seconds, OFFLINE_CAP_SEC);
    if (sec < 1) return;
    const before = this.state.energy;
    advance(this.state, sec);
    if (sec >= 10) {
      const gained = this.state.energy.sub(before);
      const capped = seconds > OFFLINE_CAP_SEC ? '（上限 24 時間）' : '';
      this.ui.toast(`離れていた ${fmtDuration(sec)}${capped}の間に\nエネルギー ${gained.sign() >= 0 ? '+' : ''}${format(gained)}`, 4000);
    }
  }

  start() {
    // 前回の保存からの経過時間（オフライン進行）
    this.catchUp((Date.now() - this.state.lastSaved) / 1000);
    this.ui.render();

    setInterval(() => this.save(), AUTOSAVE_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.save();
      } else {
        // 裏に回っている間は描画ループが止まるので、戻ったときに追いつく
        this.catchUp((Date.now() - this.state.lastSaved) / 1000);
        this.lastFrame = performance.now();
      }
    });
    window.addEventListener('pagehide', () => this.save());

    const loop = (now) => {
      const dt = (now - this.lastFrame) / 1000;
      this.lastFrame = now;
      if (dt > 1) {
        advance(this.state, dt);
      } else if (dt > 0) {
        tick(this.state, dt);
      }
      if (now - this.lastRender >= RENDER_MS) {
        this.lastRender = now;
        this.ui.render();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

new Game().start();
