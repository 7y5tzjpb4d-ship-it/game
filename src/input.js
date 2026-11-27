// キーボードとタッチ／マウスの入力をまとめて扱う
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    // タッチ・クリック中の位置（キャンバス座標）。押していなければ null
    this.pointer = null;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    const updatePointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer = {
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height,
      };
    };
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      updatePointer(e);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.pointer) updatePointer(e);
    });
    const release = () => { this.pointer = null; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
  }

  isDown(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  // 移動方向（-1〜1）を返す
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
