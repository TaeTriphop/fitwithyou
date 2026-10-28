// ตัวกลางเล็กๆ ให้หน้าจอสั่งวาดใหม่หรือเปลี่ยนหน้าได้ โดยไม่ต้อง import app.js
let renderFn = () => {};

export function setRenderer(fn) {
  renderFn = fn;
}

export function rerender() {
  renderFn();
}

export function go(hash) {
  if (location.hash === hash) rerender();
  else location.hash = hash;
}
