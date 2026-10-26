// Navigation between two screens should move the reading position to the new
// page's heading. Hash changes happen outside React, so the shell flags the
// next page mount and the page head consumes the flag exactly once. A first
// load never focuses the heading: the browser already starts the reader at
// the top of the document.
let pending = false;

export function requestRouteFocus() {
  pending = true;
}

export function takeRouteFocus() {
  const next = pending;
  pending = false;
  return next;
}
