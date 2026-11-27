// タッチ（メイン）とキーボード（PC での確認用）の入力をまとめて扱う
export class Input {
  constructor(screen) {
    const canvas = screen.canvas;
    this.keys = new Set();
    // 指が触れている位置（論理座標）。触れていなければ null
    this.pointer = null;
    this.activePointerId = null;

    // --- タッチ / マウス（Pointer Events で共通化）---
    canvas.addEventListener('pointerdown', (e) => {
      if (this.activePointerId !== null) return; // 最初の 1 本の指だけ追う
      this.activePointerId = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      this.pointer = screen.toLogical(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.activePointerId) return;
      this.pointer = screen.toLogical(e.clientX, e.clientY);
    });
    const release = (e) => {
      if (e.pointerId !== this.activePointerId) return;
      this.activePointerId = null;
      this.pointer = null;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    // --- スマホ特有の邪魔な挙動を止める ---
    const prevent = (e) => e.preventDefault();
    document.addEventListener('touchmove', prevent, { passive: false });
    document.addEventListener('contextmenu', prevent);
    // iOS Safari のピンチズーム
    document.addEventListener('gesturestart', prevent);

    // --- キーボード ---
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointer = null;
      this.activePointerId = null;
    });
  }

  isDown(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  // キーボードの移動方向（-1〜1）
  axis() {
    let x = 0;
    let y = 0;
    if (this.isDown('ArrowLeft', 'KeyA')) x -= 1;
    if (this.isDown('ArrowRight', 'KeyD')) x += 1;
    if (this.isDown('ArrowUp', 'KeyW')) y -= 1;
    if (this.isDown('ArrowDown', 'KeyS')) y += 1;
    return { x, y };
  }
}
