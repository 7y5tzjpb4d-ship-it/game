// ゲーム本体：ループ・更新・描画
export class Game {
  constructor(screen, input) {
    this.screen = screen;
    this.input = input;
    this.width = screen.width;
    this.height = screen.height;
    this.lastTime = 0;
    this.paused = false;

    // アプリ切り替えやロック中は止める
    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
    });

    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      size: 32,
      speed: 240, // ピクセル／秒
    };
  }

  start() {
    requestAnimationFrame((t) => {
      this.lastTime = t;
      this.loop(t);
    });
  }

  loop(time) {
    // 経過時間（秒）。タブ切り替え後などの大きな飛びは抑える
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    if (!this.paused) {
      this.update(dt);
      this.draw();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const p = this.player;
    let { x, y } = this.input.axis();

    // 指が触れている間はその位置に向かって移動
    const ptr = this.input.pointer;
    if (ptr) {
      const dx = ptr.x - p.x;
      const dy = ptr.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        x = dx / dist;
        y = dy / dist;
      }
    }

    // 斜め移動が速くならないように正規化
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }

    p.x += x * p.speed * dt;
    p.y += y * p.speed * dt;

    // 画面外に出ないようにする
    const half = p.size / 2;
    p.x = Math.max(half, Math.min(this.width - half, p.x));
    p.y = Math.max(half, Math.min(this.height - half, p.y));
  }

  draw() {
    const ctx = this.screen.ctx;
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, this.width, this.height);

    const p = this.player;
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('画面をタッチして移動', this.width / 2, 32);
  }
}
