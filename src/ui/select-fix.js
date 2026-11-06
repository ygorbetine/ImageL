// CheerpJ devolve o foco ao textarea oculto logo apos o clique num <select> (Choice do Java). Isso tira o foco do select e o
// popup nativo fecha na hora. Segura esse foco por um instante depois de um clique num select dentro das janelas Java.
export function initSelectFix(doc = document, now = () => performance.now()) {
  const proto = (doc.defaultView || window).HTMLTextAreaElement.prototype;
  if (proto.__ilSelectFix) return;
  proto.__ilSelectFix = true;
  const orig = proto.focus;
  let until = 0;
  const inJava = t => t && t.tagName === 'SELECT' && t.closest && t.closest('.cjWindow');
  const arm = e => { if (inJava(e.target)) until = now() + 700; };
  doc.addEventListener('pointerdown', arm, true);
  doc.addEventListener('mousedown', arm, true);
  doc.addEventListener('mouseup', arm, true);
  doc.addEventListener('click', arm, true);
  doc.addEventListener('change', () => { until = 0; }, true);
  proto.focus = function (...a) {
    if (now() < until && inJava(doc.activeElement)) return;
    return orig.apply(this, a);
  };
}
