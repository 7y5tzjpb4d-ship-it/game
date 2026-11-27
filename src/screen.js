// キャンバスを画面いっぱい（縦横比固定）に表示し、高解像度画面でもくっきり描く。
// ゲームのロジックは常に width × height の論理座標で扱う。
export class Screen {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = width;
    this.height = height;

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const stage = this.canvas.parentElement;
    const style = getComputedStyle(stage);
    const availW = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availH = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);

    // 縦横比を保ったまま収まる最大サイズ
    const scale = Math.min(availW / this.width, availH / this.height);
    const cssW = Math.floor(this.width * scale);
    const cssH = Math.floor(this.height * scale);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    // 端末のピクセル密度に合わせて内部解像度を上げる（上限 3 倍）
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);

    // 以降の描画は論理座標で書けば自動的に拡大される
    const k = this.canvas.width / this.width;
    this.ctx.setTransform(k, 0, 0, k, 0, 0);
  }

  // 画面上の座標（clientX/Y）を論理座標に変換
  toLogical(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.width,
      y: ((clientY - rect.top) / rect.height) * this.height,
    };
  }
}
