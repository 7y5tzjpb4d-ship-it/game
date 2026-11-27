import { Game } from './game.js';
import { Input } from './input.js';
import { Screen } from './screen.js';

// ゲームの論理解像度（縦長 3:4）。実際の表示サイズは端末に合わせて拡大縮小される
const WIDTH = 480;
const HEIGHT = 640;

const screen = new Screen(document.getElementById('game'), WIDTH, HEIGHT);
const input = new Input(screen);
const game = new Game(screen, input);

game.start();
