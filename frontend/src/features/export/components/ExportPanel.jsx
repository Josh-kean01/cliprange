import { Download, History, Settings2, Share2 } from "lucide-react";

import { OUTPUT_MODES } from "../../../utils/cliprange";
import SectionHeader from "../../../components/shared/SectionHeader";
import SelectableTiles from "../../../components/shared/SelectableTiles";
import StatusProgress from "../../../components/shared/StatusProgress";
import MagicBento from "../../../components/ui/MagicBento";
import { Button } from "../../../components/ui/button";

export default function ExportPanel({
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
  canExport,
  exportDisabledReason,
}) {
  const actionLabel =
    editor.mode === "draft" ? "Save Draft" : editor.mode === "share" ? "Create Share Link" : "Export Clip";

  return (
    <MagicBento
      as="aside"
      className="px-5 py-5 sm:px-6 lg:max-h-[calc(100dvh-7.75rem)] lg:overflow-y-auto lg:pr-4"
      contentClassName="space-y-5"
      enableSpotlight={false}
      enableTilt={false}
    >
      <SectionHeader
        icon={<Settings2 className="h-5 w-5" />}
        description="Choose how this clip should leave the editor, keep export settings aligned, and reopen recent work when needed."
        title="Clip Configuration"
      />

      <section className="space-y-3">
        <p className="text-sm font-semibold tracking-[-0.02em] text-white">Output Mode</p>
        <SelectableTiles items={OUTPUT_MODES} onChange={onModeChange} value={editor.mode} />
      </section>
      <section className="space-y-3">
        <label className="surface-panel--inset flex items-center justify-between px-4 py-3">
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

        <label className="surface-panel--inset flex items-center justify-between px-4 py-3">
          <span className="space-y-1">
            <span className="block text-sm font-medium text-white">Auto Subtitles</span>
            <span className="block text-xs leading-5 text-slate-400">Fetch and burn subtitles during export when the source provides them.</span>
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
          className="surface-input"
          id="clip-title"
          type="text"
          placeholder="e.g. Amazing car reveal highlight"
          value={editor.title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </section>

      <div className="space-y-3">
        <Button
          disabled={!canExport || exporting}
          onClick={onExport}
          size="wide"
          title={!canExport ? exportDisabledReason : undefined}
          type="button"
          variant="primary"
        >
          {editor.mode === "share" ? <Share2 className="h-4 w-4" /> : editor.mode === "draft" ? <History className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {exporting ? `Exporting ${exportProgress}%` : actionLabel}
        </Button>
        {!canExport ? (
          <p className="text-xs leading-5 text-slate-400">
            {exportDisabledReason}
          </p>
        ) : null}
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
