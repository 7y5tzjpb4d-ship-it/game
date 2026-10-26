// 縦向き固定をサポートする環境では縦向きを要求する（ブラウザの制限により拒否される場合あり）。
async function requestPortraitOrientation(){
  try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('portrait'); } catch (_) {}
}
window.addEventListener('load', requestPortraitOrientation);
document.addEventListener('click', requestPortraitOrientation, {once:true});
