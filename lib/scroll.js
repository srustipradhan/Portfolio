// Scroll to a section by its settled (un-lifted) position. Sections rise into view with a transform,
// so the browser's own anchor jump would overshoot by however far the section is still lifted.
export function scrollToTarget(el, behavior = "smooth") {
  if (!el) return;
  let lift = 0;
  const wrap = el.closest(".reveal");
  if (wrap) lift = new DOMMatrix(getComputedStyle(wrap).transform).f || 0;
  window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - lift), behavior });
}
export function scrollToSelector(sel, behavior) {
  scrollToTarget(document.querySelector(sel), behavior);
}
