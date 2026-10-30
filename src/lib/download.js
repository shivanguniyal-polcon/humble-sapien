// One download path for the whole site.
//
// A blob URL must stay alive until the browser has started the download.
// Revoking it on the same tick cancels the file in Safari and older Firefox,
// because the click only queues the transfer. Ten seconds is long enough for
// the queue to drain and still releases the memory in the same session.

export const downloadFile = (name, data, type = 'application/json;charset=utf-8') => {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
