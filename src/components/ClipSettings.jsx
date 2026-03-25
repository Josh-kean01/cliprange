import { Download, History, Settings2, Share2 } from "lucide-react";

import { OUTPUT_MODES } from "../lib/cliprange";
import SectionHeader from "./SectionHeader";
import SelectableTiles from "./SelectableTiles";
import StatusProgress from "./StatusProgress";
import MagicBento from "./ui/MagicBento";
import { Button } from "./ui/button";

export default function ClipSettings({
  editor,
  output,
  exporting,
  exportProgress,
  exportStatus,
  latestExport,
  onModeChange,
  onWatermarkChange,
  onSubtitlesChange,
  onTitleChange,
  onReopenHistory,
  onCopyShare,
  onExport,
}) {
  const actionLabel =
    editor.mode === "draft" ? "Save Draft" : editor.mode === "share" ? "Create Share Link" : "Export Clip";

  return (
    <MagicBento
      as="aside"
      className="scrollbar-hidden lg:max-h-[calc(100vh-8rem)] overflow-y-auto px-5 py-5 sm:px-6"
      contentClassName="space-y-5"
    >
      <SectionHeader
        icon={<Settings2 className="h-5 w-5" />}
        description="Choose how this clip should leave the editor, keep metadata aligned, and reopen recent work when needed."
        title="Clip Configuration"
      />

      <section className="space-y-3">
        <p className="text-sm font-semibold tracking-[-0.02em] text-white">Output Mode</p>
        <SelectableTiles items={OUTPUT_MODES} onChange={onModeChange} value={editor.mode} />
      </section>
      <section className="space-y-3">
        <label className="flex items-center justify-between rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
          <span className="space-y-1">
            <span className="block text-sm font-medium text-white">Remove Watermark</span>
            <span className="block text-xs leading-5 text-slate-400">Keep the export visually clean where possible.</span>
          </span>
          <input
            className="h-4 w-4 rounded border-white/20 bg-transparent accent-violet-400"
            type="checkbox"
            checked={output.removeWatermark}
            onChange={(event) => onWatermarkChange(event.target.checked)}
          />
        </label>

        <label className="flex items-center justify-between rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
          <span className="space-y-1">
            <span className="block text-sm font-medium text-white">Auto Subtitles</span>
            <span className="block text-xs leading-5 text-slate-400">Attach subtitles when the retrieved source includes them.</span>
          </span>
          <input
            className="h-4 w-4 rounded border-white/20 bg-transparent accent-violet-400"
            type="checkbox"
            checked={output.autoSubtitles}
            onChange={(event) => onSubtitlesChange(event.target.checked)}
          />
        </label>
      </section>

      <section className="space-y-3">
        <label className="space-y-2" htmlFor="clip-title">
          <span className="text-sm font-semibold tracking-[-0.02em] text-white">Clip Title</span>
        </label>
        <input
          className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50 focus:ring-2 focus:ring-violet-400/20"
          id="clip-title"
          type="text"
          placeholder="e.g. Amazing car reveal highlight"
          value={editor.title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </section>

      <div className="space-y-3">
        <Button disabled={exporting} onClick={onExport} size="wide" type="button" variant="primary">
          {editor.mode === "share" ? <Share2 className="h-4 w-4" /> : editor.mode === "draft" ? <History className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {exporting ? `Exporting ${exportProgress}%` : actionLabel}
        </Button>
        {latestExport?.downloadUrl ? (
          <Button download={latestExport.fileName} href={latestExport.downloadUrl} size="wide" variant="secondary">
            Download latest clip
          </Button>
        ) : null}
        {latestExport?.shareUrl ? (
          <>
            <Button onClick={() => onCopyShare(latestExport)} size="wide" type="button" variant="secondary">
              Copy share link
            </Button>
            <Button href={latestExport.shareUrl} rel="noreferrer" size="wide" target="_blank" variant="secondary">
              Open shared page
            </Button>
          </>
        ) : null}
        {latestExport?.kind === "draft" ? (
          <Button onClick={() => onReopenHistory(latestExport)} size="wide" type="button" variant="secondary">
            Reopen latest draft
          </Button>
        ) : null}
        <StatusProgress active={exporting} align="center" message={exportStatus} progress={exportProgress} />
      </div>
    </MagicBento>
  );
}
