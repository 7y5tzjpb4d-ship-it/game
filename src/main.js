import { Game } from './game.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const input = new Input(canvas);
const game = new Game(canvas, input);

game.start();
