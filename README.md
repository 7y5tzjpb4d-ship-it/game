# game

HTML と JavaScript で作るブラウザゲーム。ビルドツールや依存パッケージは不要。

## 概要

（ここにゲームの概要を記載）

## 操作

- 矢印キー / WASD：移動
- タッチ・クリック：その位置へ移動

## ディレクトリ構成

```
.
├── index.html    # エントリーポイント
├── style.css     # 画面レイアウト
├── src/
│   ├── main.js   # 起動処理
│   ├── game.js   # ゲームループ・更新・描画
│   └── input.js  # キーボード／タッチ入力
├── assets/       # 画像・音声などのアセット
└── docs/         # 設計・仕様ドキュメント
```

## 開発

ES モジュールを使っているため、`index.html` を直接開くのではなくローカルサーバー経由で開く。

```sh
python3 -m http.server 8000
# または
npx serve .
```

ブラウザで http://localhost:8000 を開く。VS Code の場合は拡張機能「Live Server」でも可。
