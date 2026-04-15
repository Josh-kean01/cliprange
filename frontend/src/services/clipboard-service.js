export async function copyTextToClipboard(value) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard access is blocked in this browser.");
  }

  await navigator.clipboard.writeText(value);
}
