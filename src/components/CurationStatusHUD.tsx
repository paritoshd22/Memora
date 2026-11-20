import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { CurationBatchState } from '../types/curation';

interface CurationStatusHUDProps {
  batchState: CurationBatchState | null;
  onDismiss: () => void;
  onOpenCollection: (collectionId: string) => void;
  onRetryFailed: () => void;
  onUndoLastBatch: () => void;
}

const PHASE_STEPS: Array<{
  id: CurationBatchState['phase'];
  label: string;
}> = [
  { id: 'uploading', label: 'Uploading' },
  { id: 'analysing', label: 'Analysing' },
  { id: 'organising', label: 'Organising' },
  { id: 'finding_related', label: 'Finding related memories' },
  { id: 'preparing_collections', label: 'Preparing collections' },
  { id: 'assigning_locations', label: 'Assigning museum locations' },
  { id: 'preparing', label: 'Preparing interactions' },
  { id: 'ready', label: 'Ready to explore' },
];

export const CurationStatusHUD: React.FC<CurationStatusHUDProps> = ({
  batchState,
  onDismiss,
  onOpenCollection,
  onRetryFailed,
  onUndoLastBatch,
}) => {
  if (!batchState || batchState.phase === 'idle') return null;

  const normalizedPhase =
    batchState.phase === 'linking' ? 'finding_related' : batchState.phase;

  const isRunning =
    normalizedPhase === 'uploading' ||
    normalizedPhase === 'analysing' ||
    normalizedPhase === 'organising' ||
    normalizedPhase === 'finding_related' ||
    normalizedPhase === 'preparing_collections' ||
    normalizedPhase === 'assigning_locations' ||
    normalizedPhase === 'preparing';

  const currentStepIndex = Math.max(
    0,
    PHASE_STEPS.findIndex((s) => s.id === normalizedPhase),
  );

  return (
    <aside
      aria-live="polite"
      aria-label="Automatic Memory Curation Progress"
      className="fixed top-20 right-4 md:right-6 z-30 w-[min(380px,calc(100vw-2rem))] rounded-2xl bg-[#FFFCF6]/98 border border-[#D8C5A6] shadow-2xl p-4 text-[#27231F]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isRunning ? (
            <Loader2 className="w-4 h-4 text-[#854D27] animate-spin shrink-0" />
          ) : batchState.phase === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-[#991B1B] shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#854D27]">
              MEMORA Curator • Stage {Math.min(PHASE_STEPS.length, currentStepIndex + 1)} of {PHASE_STEPS.length}
            </p>
            <h3 className="font-serif-display text-base font-semibold text-[#27231F] truncate">
              {batchState.phaseLabel}
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss curation notification"
          className="p-1 rounded-lg text-[#6E5641] hover:bg-[#F3ECE0] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 8-Stage Discrete Step Bar (No synthetic percentages) */}
      <div className="mt-3">
        <div className="grid grid-cols-8 gap-1">
          {PHASE_STEPS.map((step, idx) => {
            const done = normalizedPhase === 'ready' || idx < currentStepIndex;
            const active = idx === currentStepIndex && isRunning;
            return (
              <div
                key={step.id}
                title={step.label}
                className={`h-1.5 rounded-full transition-colors ${
                  batchState.phase === 'error' && idx === currentStepIndex
                    ? 'bg-[#C26D3A]'
                    : done
                      ? 'bg-[#15803D]'
                      : active
                        ? 'bg-[#854D27] animate-pulse'
                        : 'bg-[#EFE6D5]'
                }`}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#6E5641] font-mono-tabular">
          <span>
            {batchState.completedCount} of {batchState.totalCount} items processed
          </span>
          <span>
            {isRunning
              ? 'Explore freely while curating'
              : batchState.failedCount > 0
                ? `${batchState.failedCount} need retry`
                : 'Ready to explore'}
          </span>
        </div>
      </div>

      {/* 8-Stage Checklist */}
      {isRunning && (
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
          {PHASE_STEPS.map((step, idx) => {
            const done = idx < currentStepIndex;
            const active = step.id === normalizedPhase;
            return (
              <div
                key={step.id}
                className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#FAF0CA]/60 border-[#D6A15D] text-[#27231F] font-semibold'
                    : done
                      ? 'bg-[#F6F1E8] border-[#E8DED0] text-[#493629]'
                      : 'bg-transparent border-transparent text-[#8B7355]'
                }`}
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span className="truncate">{step.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Error Notification with Non-Destructive Retry */}
      {batchState.errorBannerMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] space-y-2">
          <p className="leading-relaxed">{batchState.errorBannerMessage}</p>
          {batchState.failedCount > 0 && (
            <button
              type="button"
              onClick={onRetryFailed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#991B1B] text-white hover:bg-[#7F1D1D] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry {batchState.failedCount} Failed Item
              {batchState.failedCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Completion Actions: View Collection + Undo Batch */}
      {!isRunning && (batchState.completedCount > 0 || batchState.lastUndoSnapshot) && (
        <div className="mt-3 pt-2.5 border-t border-[#E8DED0] flex flex-wrap items-center justify-between gap-2">
          {batchState.primaryReadyCollectionId && (
            <button
              type="button"
              onClick={() =>
                onOpenCollection(batchState.primaryReadyCollectionId!)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#D6A15D]" />
              View{' '}
              {batchState.primaryReadyCollectionTitle
                ? `"${batchState.primaryReadyCollectionTitle.slice(0, 22)}"`
                : 'Collection'}
            </button>
          )}
          {batchState.lastUndoSnapshot && (
            <button
              type="button"
              onClick={onUndoLastBatch}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F6F1E8] text-[#493629] border border-[#E8DED0] hover:bg-[#EFE6D5] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#854D27]" />
              Undo Batch
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
