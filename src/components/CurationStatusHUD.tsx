import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CHILDHOOD_WORLD_LOCATION_CATALOGUE,
  ChildhoodWorldLocationId,
  CurationBatchItemStatus,
  CurationBatchState,
} from '../types/curation';

export interface PlacementApprovalUpdate {
  memoryId: string;
  locationId: ChildhoodWorldLocationId;
  title?: string;
  description?: string;
  date?: string;
  moveToUnsorted?: boolean;
}

interface CurationStatusHUDProps {
  batchState: CurationBatchState | null;
  onDismiss: () => void;
  onOpenCollection: (collectionId: string) => void;
  onRetryFailed: () => void;
  onSaveWithLocalFallback?: () => void;
  onUndoLastBatch: () => void;
  onApproveItemPlacement?: (update: PlacementApprovalUpdate) => void;
  onApproveAllPlacements?: (updates: PlacementApprovalUpdate[]) => void;
  onEnterChildhoodPark?: () => void;
}

const PHASE_STEPS: Array<{
  id: CurationBatchState['phase'];
  label: string;
}> = [
  { id: 'uploading', label: 'Uploading' },
  { id: 'preserving_original', label: 'Preserving Original' },
  { id: 'analysing', label: 'Analysing' },
  { id: 'organising', label: 'Organising' },
  { id: 'finding_related', label: 'Finding Related' },
  { id: 'assigning_locations', label: 'Suggesting Location' },
  { id: 'review', label: 'Review' },
  { id: 'ready', label: 'Placed in Museum' },
];

const LOCATION_OPTIONS = Object.values(CHILDHOOD_WORLD_LOCATION_CATALOGUE);

interface DraftEdits {
  title: string;
  description: string;
  date: string;
  locationId: ChildhoodWorldLocationId;
}

export const CurationStatusHUD: React.FC<CurationStatusHUDProps> = ({
  batchState,
  onDismiss,
  onOpenCollection,
  onRetryFailed,
  onSaveWithLocalFallback,
  onUndoLastBatch,
  onApproveItemPlacement,
  onApproveAllPlacements,
  onEnterChildhoodPark,
}) => {
  const [draftEdits, setDraftEdits] = useState<Record<string, DraftEdits>>({});
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!batchState) return;
    setDraftEdits((prev) => {
      const next = { ...prev };
      for (const item of batchState.items) {
        if (item.memoryId && !next[item.memoryId]) {
          next[item.memoryId] = {
            title: item.suggestedTitle || item.fileName,
            description: item.suggestedDescription || '',
            date: item.suggestedDate || '',
            locationId: item.locationId || 'keepsake_corner',
          };
        }
      }
      return next;
    });
  }, [batchState]);

  useEffect(() => {
    if (!batchState) return;
    const reviewDone = batchState.items.filter(
      (it) => it.status === 'done' && Boolean(it.memoryId),
    );
    const pendingApproval = reviewDone.filter((it) => !it.placementApproved);
    const failed = batchState.items.filter((it) => it.status === 'failed');
    if (
      batchState.phase === 'ready' &&
      pendingApproval.length === 0 &&
      failed.length === 0
    ) {
      setIsMinimized(true);
    } else if (
      batchState.phase === 'review' ||
      batchState.phase === 'error' ||
      pendingApproval.length > 0
    ) {
      setIsMinimized(false);
    }
  }, [batchState]);

  if (!batchState || batchState.phase === 'idle') return null;

  const normalizedPhase =
    batchState.phase === 'linking'
      ? 'finding_related'
      : batchState.phase === 'preparing_collections' ||
          batchState.phase === 'preparing'
        ? 'assigning_locations'
        : batchState.phase;

  const isRunning =
    normalizedPhase === 'uploading' ||
    normalizedPhase === 'preserving_original' ||
    normalizedPhase === 'analysing' ||
    normalizedPhase === 'organising' ||
    normalizedPhase === 'finding_related' ||
    normalizedPhase === 'assigning_locations';

  const currentStepIndex = Math.max(
    0,
    PHASE_STEPS.findIndex((s) => s.id === normalizedPhase),
  );

  const reviewItems = batchState.items.filter(
    (it): it is CurationBatchItemStatus & { memoryId: string } =>
      it.status === 'done' && Boolean(it.memoryId),
  );
  const unapprovedItems = reviewItems.filter((it) => !it.placementApproved);
  const failedItems = batchState.items.filter((it) => it.status === 'failed');

  const updateDraft = (memoryId: string, patch: Partial<DraftEdits>) => {
    setDraftEdits((prev) => ({
      ...prev,
      [memoryId]: {
        ...(prev[memoryId] || {
          title: '',
          description: '',
          date: '',
          locationId: 'keepsake_corner',
        }),
        ...patch,
      },
    }));
  };

  const handleConfirmAll = () => {
    if (!onApproveAllPlacements || unapprovedItems.length === 0) return;
    const updates: PlacementApprovalUpdate[] = unapprovedItems.map((it) => {
      const edit = draftEdits[it.memoryId];
      return {
        memoryId: it.memoryId,
        locationId: edit?.locationId || it.locationId || 'keepsake_corner',
        title: edit?.title ?? it.suggestedTitle,
        description: edit?.description ?? it.suggestedDescription,
        date: edit?.date ?? it.suggestedDate,
      };
    });
    onApproveAllPlacements(updates);
  };

  return (
    <aside
      aria-live="polite"
      aria-label="Memory Curation and Placement Review"
      className={`fixed top-16 right-4 md:right-6 z-30 ${
        isMinimized
          ? 'w-[min(340px,calc(100vw-2rem))]'
          : 'w-[min(410px,calc(100vw-2rem))] max-h-[calc(100vh-5.5rem)]'
      } flex flex-col rounded-2xl bg-[#FFFCF6] border border-[#D8C5A6] shadow-2xl text-[#27231F] overflow-hidden transition-all`}
    >
      {/* Top Progress Header */}
      <div className="p-3.5 border-b border-[#EFE6D5] shrink-0">
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
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#854D27]">
                MEMORA Curator · Stage {Math.min(PHASE_STEPS.length, currentStepIndex + 1)} of {PHASE_STEPS.length}
              </p>
              <h3 className="font-serif-display text-sm font-semibold text-[#27231F] truncate">
                {batchState.phaseLabel}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              aria-label={isMinimized ? 'Expand curation panel' : 'Minimize curation panel'}
              title={isMinimized ? 'Expand curation panel' : 'Minimize curation panel'}
              className="p-1 rounded-lg text-[#6E5641] hover:bg-[#F3ECE0] cursor-pointer"
            >
              {isMinimized ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss curation panel"
              title="Close panel"
              className="p-1 rounded-lg text-[#6E5641] hover:bg-[#F3ECE0] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 8-Stage Discrete Progress Bar */}
        <div className="mt-2.5">
          <div className="grid grid-cols-8 gap-1">
            {PHASE_STEPS.map((step, idx) => {
              const done =
                normalizedPhase === 'ready' || idx < currentStepIndex;
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
                          ? 'bg-[#854D27]'
                          : 'bg-[#EFE6D5]'
                  }`}
                />
              );
            })}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#6E5641] font-mono-tabular">
            <span>
              {batchState.completedCount} of {batchState.totalCount} analysed
            </span>
            <span>
              {isRunning
                ? 'Explore freely while curating'
                : unapprovedItems.length > 0
                  ? `${unapprovedItems.length} awaiting approval`
                  : batchState.failedCount > 0
                    ? `${batchState.failedCount} failed — preserved`
                    : 'Placed in 3D Park'}
            </span>
          </div>
        </div>

        {isMinimized && normalizedPhase === 'ready' && onEnterChildhoodPark && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onEnterChildhoodPark}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#3A2F26] cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#D6A15D]" />
              Explore in 3D Park
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F6F1E8] border border-[#D4C3AA] text-[#493629] hover:bg-[#EFE6D5] cursor-pointer"
            >
              Details
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Body */}
      {!isMinimized && (
      <div className="p-4 space-y-3 overflow-y-auto">
        {/* Running Checklist */}
        {isRunning && (
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {PHASE_STEPS.map((step, idx) => {
              const done = idx < currentStepIndex;
              const active = step.id === normalizedPhase;
              return (
                <div
                  key={step.id}
                  className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#FAF0CA]/65 border-[#D6A15D] text-[#27231F] font-semibold'
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

        {/* Placement Review Cards */}
        {!isRunning && reviewItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#27231F]">
                Placement Review ({reviewItems.length})
              </p>
              {unapprovedItems.length > 1 && onApproveAllPlacements && (
                <button
                  type="button"
                  onClick={handleConfirmAll}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#27231F] text-[#FFFCF6] hover:bg-[#3E3026] cursor-pointer"
                >
                  Confirm &amp; Place All ({unapprovedItems.length})
                </button>
              )}
            </div>

            {reviewItems.map((item) => {
              const edit = draftEdits[item.memoryId] || {
                title: item.suggestedTitle || item.fileName,
                description: item.suggestedDescription || '',
                date: item.suggestedDate || '',
                locationId: item.locationId || 'keepsake_corner',
              };
              const confPct =
                typeof item.confidenceScore === 'number'
                  ? Math.round(item.confidenceScore * 100)
                  : null;
              const confLabel =
                confPct === null
                  ? 'Reviewed'
                  : confPct >= 75
                    ? `High (${confPct}%)`
                    : confPct >= 55
                      ? `Moderate (${confPct}%)`
                      : `Low (${confPct}%) · Unsorted`;

              return (
                <div
                  key={item.memoryId}
                  className={`rounded-xl border p-3 space-y-2.5 ${
                    item.placementApproved
                      ? 'bg-[#F3F8F2] border-[#B7D6B4]'
                      : 'bg-[#FAF4E8] border-[#DFCDAE]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={edit.title}
                        className="w-16 h-16 rounded-lg object-contain bg-[#EFE6D5] border border-[#D8C5A6] shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[#EFE6D5] border border-[#D8C5A6] flex items-center justify-center text-[#854D27] shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span
                          className={`px-1.5 py-0.5 rounded font-semibold ${
                            item.analyzedBy === 'gemini' && !item.isDemo
                              ? 'bg-[#E6F4EA] text-[#15803D]'
                              : 'bg-[#FEF3C7] text-[#92400E]'
                          }`}
                        >
                          {item.analyzedBy === 'gemini' && !item.isDemo
                            ? `Gemini (${item.modelUsed || 'live'})`
                            : 'Local Fallback (Non-Gemini)'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#EFE6D5] text-[#493629] font-medium">
                          Confidence: {confLabel}
                        </span>
                      </div>

                      {item.placementApproved ? (
                        <>
                          <p className="text-xs font-semibold text-[#1E3A1E] truncate">
                            {edit.title}
                          </p>
                          <p className="text-[11px] text-[#2F5A2F] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            Placed in{' '}
                            {CHILDHOOD_WORLD_LOCATION_CATALOGUE[edit.locationId]
                              ?.label || edit.locationId}
                          </p>
                        </>
                      ) : (
                        <input
                          type="text"
                          value={edit.title}
                          onChange={(e) =>
                            updateDraft(item.memoryId, { title: e.target.value })
                          }
                          aria-label="Memory title"
                          className="w-full px-2 py-1 rounded-lg bg-[#FFFCF6] border border-[#DFCDAE] text-xs font-semibold text-[#27231F]"
                        />
                      )}
                    </div>
                  </div>

                  {!item.placementApproved && (
                    <>
                      <textarea
                        rows={2}
                        value={edit.description}
                        onChange={(e) =>
                          updateDraft(item.memoryId, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Short archival description…"
                        aria-label="Memory description"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFCF6] border border-[#DFCDAE] text-[11px] text-[#27231F]"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-[#6E5641] mb-0.5">
                            Verified Date / Year
                          </label>
                          <input
                            type="text"
                            value={edit.date}
                            onChange={(e) =>
                              updateDraft(item.memoryId, {
                                date: e.target.value,
                              })
                            }
                            placeholder="Optional"
                            className="w-full px-2 py-1 rounded-lg bg-[#FFFCF6] border border-[#DFCDAE] text-[11px] text-[#27231F]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#6E5641] mb-0.5">
                            Childhood Park Location
                          </label>
                          <select
                            value={edit.locationId}
                            onChange={(e) =>
                              updateDraft(item.memoryId, {
                                locationId: e.target
                                  .value as ChildhoodWorldLocationId,
                              })
                            }
                            aria-label="Choose Childhood Park location"
                            className="w-full px-2 py-1 rounded-lg bg-[#FFFCF6] border border-[#DFCDAE] text-[11px] text-[#27231F]"
                          >
                            {LOCATION_OPTIONS.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {item.recommendedReason && (
                        <p className="text-[11px] text-[#493629] leading-snug bg-[#FFFCF6] rounded-lg px-2.5 py-1.5 border border-[#EFE6D5]">
                          <MapPin className="w-3 h-3 inline mr-1 text-[#854D27]" />
                          {item.recommendedReason}
                        </p>
                      )}

                      {item.warnings && item.warnings.length > 0 && (
                        <p className="text-[11px] text-[#92400E] leading-snug">
                          {item.warnings[0]}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            onApproveItemPlacement?.({
                              memoryId: item.memoryId,
                              locationId: 'keepsake_corner',
                              title: edit.title,
                              description: edit.description,
                              date: edit.date,
                              moveToUnsorted: true,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#FFFCF6] text-[#493629] border border-[#DFCDAE] hover:bg-[#EFE6D5] cursor-pointer"
                        >
                          <Archive className="w-3 h-3 text-[#854D27]" />
                          Move to Unsorted
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onApproveItemPlacement?.({
                              memoryId: item.memoryId,
                              locationId: edit.locationId,
                              title: edit.title,
                              description: edit.description,
                              date: edit.date,
                            })
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#3E3026] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-[#D6A15D]" />
                          Confirm &amp; Place in 3D
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Failed Items & Honest Error / Explicit Fallback Controls */}
        {(batchState.errorBannerMessage || failedItems.length > 0) && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] space-y-2">
            <p className="font-semibold">
              {batchState.errorBannerMessage ||
                'Some uploaded files could not be analysed by Gemini.'}
            </p>
            {failedItems.length > 0 && (
              <ul className="space-y-1 text-[11px]">
                {failedItems.map((fi) => (
                  <li key={fi.tempId} className="leading-snug">
                    • <strong>{fi.fileName}:</strong>{' '}
                    {fi.errorMessage || 'Original preserved for retry.'}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {batchState.failedCount > 0 && (
                <button
                  type="button"
                  onClick={onRetryFailed}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#991B1B] text-white hover:bg-[#7F1D1D] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry with Gemini ({batchState.failedCount})
                </button>
              )}
              {batchState.failedCount > 0 && onSaveWithLocalFallback && (
                <button
                  type="button"
                  onClick={onSaveWithLocalFallback}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFFCF6] text-[#7F1D1D] border border-[#FCA5A5] hover:bg-[#FEE2E2] cursor-pointer"
                >
                  Save Locally (Non-Gemini)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions: Explore in 3D Park / View Collection / Undo */}
        {!isRunning && (batchState.completedCount > 0 || batchState.lastUndoSnapshot) && (
          <div className="pt-2.5 border-t border-[#E8DED0] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {unapprovedItems.length === 0 && onEnterChildhoodPark && (
                <button
                  type="button"
                  onClick={onEnterChildhoodPark}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#854D27] text-[#FFFCF6] hover:bg-[#6E3E1F] cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Explore in 3D Park
                </button>
              )}
              {batchState.primaryReadyCollectionId && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenCollection(batchState.primaryReadyCollectionId!)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#D6A15D]" />
                  View Collection
                </button>
              )}
            </div>
            {batchState.lastUndoSnapshot && (
              <button
                type="button"
                onClick={onUndoLastBatch}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F6F1E8] text-[#493629] border border-[#E8DED0] hover:bg-[#EFE6D5] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#854D27]" />
                Undo
              </button>
            )}
          </div>
        )}
      </div>
      )}
    </aside>
  );
};
