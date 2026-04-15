export function triggerBrowserDownload(url, fileName) {
  const link = document.createElement("a");
  link.href = new URL(url, window.location.origin).toString();
  link.download = fileName;
  link.rel = "noreferrer";
  document.body.append(link);
  link.click();
  link.remove();
}
