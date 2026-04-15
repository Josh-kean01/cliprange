import { escapeHtml } from "./http.js";
import { formatDuration, normalizeSourceKind } from "./clip-utils.js";

export function renderSharePage(item) {
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const notes = Array.isArray(item.notes) ? item.notes : [];
  const isShort =
    normalizeSourceKind(item.sourceKind ?? item.sourceRef?.sourceKind) === "short";
  const sourceLabel = isShort ? "Short source" : "Video source";
  const subtitleLabel = item.subtitlesApplied ? "Subtitles burned in" : "No subtitles burned";
  const watermarkLabel = item.watermarkApplied ? "ClipRange watermark" : "Watermark removed";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(item.title)} | ClipRange Share</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        color-scheme: dark;
        font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
        --bg: #05060f;
        --panel: rgba(11, 14, 30, 0.94);
        --panel-strong: rgba(6, 8, 18, 0.96);
        --surface: rgba(255, 255, 255, 0.05);
        --surface-border: rgba(255, 255, 255, 0.1);
        --text: #f8fafc;
        --muted: rgba(226, 232, 240, 0.78);
        --muted-strong: rgba(226, 232, 240, 0.9);
        --accent-start: rgba(130, 90, 255, 0.95);
        --accent-end: rgba(68, 211, 255, 0.92);
        --focus: rgba(232, 121, 249, 0.82);
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        min-height: 100%;
      }

      body {
        margin: 0;
        min-height: 100vh;
        padding: 24px 16px;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(132, 90, 255, 0.24), transparent 32%),
          radial-gradient(circle at top right, rgba(74, 222, 255, 0.12), transparent 24%),
          linear-gradient(180deg, #070916 0%, var(--bg) 100%);
      }

      a {
        color: inherit;
      }

      .page {
        width: min(1120px, 100%);
        margin: 0 auto;
      }

      .share-card {
        position: relative;
        overflow: hidden;
        border-radius: 32px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background:
          radial-gradient(circle at top left, rgba(120, 96, 255, 0.16), transparent 34%),
          radial-gradient(circle at top right, rgba(74, 222, 255, 0.12), transparent 28%),
          linear-gradient(180deg, var(--panel), var(--panel-strong));
        box-shadow: 0 32px 90px rgba(0, 0, 0, 0.38);
      }

      .share-card::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: radial-gradient(circle at top, rgba(255, 255, 255, 0.12), transparent 70%);
      }

      .share-shell {
        position: relative;
        display: grid;
        gap: 24px;
        padding: 20px;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--muted-strong);
      }

      .header {
        display: grid;
        gap: 16px;
      }

      .header h1 {
        margin: 0;
        font-size: clamp(2.2rem, 5vw, 4.25rem);
        line-height: 0.96;
        letter-spacing: -0.08em;
      }

      .summary {
        max-width: 42rem;
        margin: 0;
        color: var(--muted);
        font-size: 0.98rem;
        line-height: 1.8;
      }

      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.04);
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        color: var(--muted-strong);
      }

      .media-card {
        overflow: hidden;
        border-radius: 28px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.4);
      }

      .media-card video {
        display: block;
        width: 100%;
        aspect-ratio: 16 / 9;
        background: black;
      }

      .media-card--short {
        width: min(420px, 100%);
        margin-inline: auto;
      }

      .media-card--short video {
        aspect-ratio: 9 / 16;
      }

      .rail {
        display: grid;
        gap: 16px;
        align-content: start;
      }

      .panel {
        border-radius: 26px;
        border: 1px solid var(--surface-border);
        background: var(--surface);
        padding: 18px;
      }

      .panel-title {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: -0.03em;
      }

      .panel-copy {
        margin: 10px 0 0;
        color: var(--muted);
        font-size: 0.95rem;
        line-height: 1.75;
      }

      .stats {
        display: grid;
        gap: 12px;
        margin-top: 16px;
      }

      .stat {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .stat:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      .stat-label {
        color: rgba(148, 163, 184, 0.9);
        font-size: 0.9rem;
      }

      .stat-value {
        max-width: 60%;
        text-align: right;
        color: var(--muted-strong);
        font-size: 0.95rem;
        font-weight: 600;
        line-height: 1.5;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 48px;
        padding: 0 18px;
        border-radius: 999px;
        border: 1px solid transparent;
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: -0.01em;
        text-decoration: none;
        transition: transform 180ms ease, filter 180ms ease, border-color 180ms ease, background 180ms ease;
      }

      .button:hover {
        transform: translateY(-1px);
        filter: brightness(1.06);
      }

      .button:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--focus), 0 0 0 6px rgba(5, 6, 15, 0.92);
      }

      .button--primary {
        background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
        color: white;
        box-shadow: 0 14px 34px rgba(94, 86, 255, 0.38);
      }

      .button--secondary {
        border-color: rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.04);
        color: var(--muted-strong);
      }

      .notes {
        margin: 0;
        color: var(--muted);
        font-size: 0.95rem;
        line-height: 1.8;
      }

      .notes strong {
        color: white;
        display: block;
        margin-bottom: 8px;
      }

      @media (min-width: 980px) {
        .share-shell {
          grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
          gap: 28px;
          padding: 28px;
        }
      }

      @media (max-width: 680px) {
        body {
          padding: 18px 12px;
        }

        .share-card {
          border-radius: 28px;
        }

        .share-shell {
          padding: 16px;
          gap: 18px;
        }

        .summary {
          font-size: 0.95rem;
          line-height: 1.7;
        }

        .actions {
          flex-direction: column;
        }

        .button {
          width: 100%;
        }

        .stat {
          flex-direction: column;
          gap: 4px;
        }

        .stat-value {
          max-width: none;
          text-align: left;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <article class="share-card">
        <div class="share-shell">
          <section class="content">
            <header class="header">
              <span class="eyebrow">Shared from ClipRange</span>
              <div>
                <h1>${escapeHtml(item.title)}</h1>
                <p class="summary">
                  ${escapeHtml(item.sourceTitle || "Clip export")} is packaged as a ready-to-watch clip with its duration,
                  export mode, and delivery details preserved so the shared handoff stays clear.
                </p>
              </div>
              <div class="chip-row">
                <span class="chip">${escapeHtml(item.outputMode || item.kind || "clip")}</span>
                <span class="chip">${escapeHtml(sourceLabel)}</span>
                <span class="chip">${escapeHtml(formatDuration(item.duration))}</span>
              </div>
            </header>

            <div class="media-card${isShort ? " media-card--short" : ""}">
              <video controls playsinline poster="${escapeHtml(item.thumbnailUrl || "")}" src="${escapeHtml(item.downloadUrl)}"></video>
            </div>

            ${notes.length ? `<section class="panel"><p class="notes"><strong>Notes</strong>${notes.map((note) => escapeHtml(note)).join("<br />")}</p></section>` : ""}
          </section>

          <aside class="rail">
            <section class="panel">
              <p class="panel-title">Clip package</p>
              <p class="panel-copy">
                Download the rendered clip directly or use the metadata here to understand how this share was produced.
              </p>
              <div class="actions">
                <a class="button button--primary" href="${escapeHtml(item.downloadUrl)}" download="${escapeHtml(item.fileName || "cliprange-share.mp4")}">Download clip</a>
              </div>
            </section>

            <section class="panel">
              <p class="panel-title">Export snapshot</p>
              <div class="stats">
                <div class="stat">
                  <span class="stat-label">Duration</span>
                  <span class="stat-value">${escapeHtml(formatDuration(item.duration))}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Output</span>
                  <span class="stat-value">${escapeHtml(item.outputMode || item.kind || "clip")}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Source type</span>
                  <span class="stat-value">${escapeHtml(sourceLabel)}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Subtitles</span>
                  <span class="stat-value">${escapeHtml(subtitleLabel)}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Watermark</span>
                  <span class="stat-value">${escapeHtml(watermarkLabel)}</span>
                </div>
              </div>
            </section>

            ${(tags.length || notes.length) ? `<section class="panel"><p class="panel-title">Attached context</p><div class="chip-row" style="margin-top: 14px;">${tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}${!tags.length && notes.length ? `<span class="chip">Notes included</span>` : ""}</div></section>` : ""}
          </aside>
        </div>
      </article>
    </main>
  </body>
</html>`;
}
