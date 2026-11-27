import {
  CHILDHOOD_WORLD_LOCATION_CATALOGUE,
  ChildhoodWorldLocationId,
  CurationBatchItemInput,
  CurationBatchItemStatus,
  CurationBatchState,
  CurationUndoSnapshot,
} from '../types/curation';
import {
  Collection,
  Memory,
  MemoryConnection,
} from '../types/museum';
import {
  buildGroundedFallbackReport,
  parseChatExportText,
  sanitizeAndOrganizeCollections,
  validateLocationPlacement,
} from './curationValidator';
import {
  saveCurationStateToStorage,
  saveMediaToIndexedDb,
  syncCurationStateToVault,
  syncMemoryRecordToVault,
} from './mediaStorage';
import { buildAndValidateMemoryTo3DBlueprint } from './memoryTo3DAssetResolver';

export interface RunCurationBatchCallbacks {
  onStateChange: (state: CurationBatchState) => void;
  onMemoriesAndCollectionsReady: (payload: {
    addedMemories: Memory[];
    updatedCollections: Collection[];
    addedConnections: MemoryConnection[];
    undoSnapshot: CurationUndoSnapshot;
    unsavedMemories?: Memory[];
  }) => void;
}

export interface ReviewedMemoryCommitInput {
  memory: Memory;
  mode: 'approved' | 'rejected_ai_saved_manual';
  edits: {
    title?: string;
    description?: string;
    date?: string;
    themes?: string[];
    locationId: ChildhoodWorldLocationId;
    moveToUnsorted?: boolean;
  };
}

function stableMemoryIdForInput(
  item: CurationBatchItemInput,
  orderIndex: number,
): string {
  const safeTemp = (item.tempId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  if (safeTemp.length >= 6) {
    return `mem-ch-${safeTemp}`;
  }
  return `mem-auto-${Date.now()}-${orderIndex}-${Math.random().toString(36).slice(2, 6)}`;
}

function cleanFileNameTitle(fileName: string): string {
  return (
    fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() ||
    'Uploaded Memory'
  );
}

function buildMemoryFromAnalyzedItem(params: {
  item: CurationBatchItemInput;
  analysisRes: any;
  ownerId: string;
  orderIndex: number;
  awaitingApproval?: boolean;
  explicitLocalFallback?: boolean;
}): Memory {
  const {
    item,
    analysisRes,
    ownerId,
    orderIndex,
    awaitingApproval = true,
    explicitLocalFallback = false,
  } = params;

  const memId = stableMemoryIdForInput(item, orderIndex);
  const report =
    analysisRes?.report ||
    buildGroundedFallbackReport({
      mediaCategory: item.detectedMediaType,
      fileName: item.fileName,
      rawTextContent: item.rawTextContent,
      videoDurationSeconds: item.videoDurationSeconds,
    });

  const placement = validateLocationPlacement(
    report.recommendedLocationId,
    item.detectedMediaType,
  );

  const parsedChat =
    item.detectedMediaType === 'chat' && item.rawTextContent
      ? parseChatExportText(item.rawTextContent, item.fileName)
      : undefined;

  const userTitle = (item.userTitle || '').trim();
  const userDescription = (item.userDescription || '').trim();
  const userDate = (item.userDate || '').trim();

  const userOrSuggestedDate =
    userDate || (analysisRes?.suggestedDate || '').trim();
  const yearMatch = userOrSuggestedDate.match(/(\d{4})/);
  const explicitDateMatch = (report.explicitDates?.[0] || '').match(/(\d{4})/);
  const yearNum = yearMatch
    ? Number(yearMatch[1])
    : explicitDateMatch
      ? Number(explicitDateMatch[1])
      : new Date().getFullYear();

  const aiTitle = (
    analysisRes?.aiGeneratedTitle ||
    analysisRes?.suggestedTitle ||
    ''
  ).trim();
  const aiDescription = (
    analysisRes?.aiGeneratedDescription ||
    analysisRes?.suggestedDescription ||
    ''
  ).trim();

  const mediaTitle = userTitle || aiTitle || cleanFileNameTitle(item.fileName);

  const mediaUrl = item.originalDataUrl || undefined;
  const customImageUrl =
    item.detectedMediaType === 'image' ? item.originalDataUrl : undefined;

  const blueprint = buildAndValidateMemoryTo3DBlueprint({
    memoryId: memId,
    sourceMediaId: memId,
    promptText: `${item.fileName} ${mediaTitle} ${analysisRes?.suggestedDescription || ''}`,
    mediaType: item.detectedMediaType,
    defaultApprovalStatus: awaitingApproval ? 'pending' : 'approved',
  });

  blueprint.connectedSpace = placement.catalogEntry.spaceId;
  if (placement.catalogEntry.linkedObjectId) {
    blueprint.linkedObjectId = placement.catalogEntry.linkedObjectId;
  }

  const aiAssistantResponse =
    (analysisRes?.assistantResponse || report.assistantResponse || '').trim() ||
    `Suggested placement: ${placement.catalogEntry.label} in the Childhood Room.`;

  const suggestedThemes = Array.isArray(analysisRes?.suggestedThemes)
    ? analysisRes.suggestedThemes
    : Array.isArray(report.topics) && report.topics.length > 0
      ? report.topics
      : Array.isArray(analysisRes?.suggestedTags)
        ? analysisRes.suggestedTags
        : [item.detectedMediaType];

  const suggestedTags = Array.isArray(analysisRes?.suggestedTags)
    ? analysisRes.suggestedTags
    : suggestedThemes;

  const nowIso = new Date().toISOString();

  return {
    id: memId,
    ownerId,
    roomId: 'childhood',
    title: mediaTitle,
    subtitle: placement.catalogEntry.label,
    type: item.detectedMediaType,
    mediaType: item.detectedMediaType,
    mediaUrl,
    mediaMimeType: item.mimeType,
    mediaFileName: item.fileName,
    customImageUrl,
    // Keep unknown dates empty instead of fabricating a date string
    date: userOrSuggestedDate,
    year: yearNum,
    // Keep real-world location empty if not explicitly evidenced (room placement is stored in curatedZoneId / subtitle)
    location: (analysisRes?.suggestedLocation || '').trim(),
    people: Array.isArray(analysisRes?.suggestedPeople)
      ? analysisRes.suggestedPeople
      : parsedChat?.participants || [],
    emotionTags: ['Preserved Archive'],
    category:
      item.detectedMediaType === 'video'
        ? 'Film'
        : item.detectedMediaType === 'audio'
          ? 'Audio'
          : item.detectedMediaType === 'chat'
            ? 'Chat Archive'
            : item.detectedMediaType === 'document' ||
                item.detectedMediaType === 'certificate'
              ? 'Document'
              : item.detectedMediaType === 'story'
                ? 'Story'
                : 'Photo',
    description:
      userDescription ||
      aiDescription ||
      `Original ${item.detectedMediaType} preserved in MEMORA.`,
    story:
      (analysisRes?.suggestedStory || '').trim() ||
      (item.detectedMediaType === 'story' || item.detectedMediaType === 'document'
        ? item.rawTextContent || ''
        : ''),
    documentText:
      item.detectedMediaType === 'document' || item.detectedMediaType === 'story'
        ? item.rawTextContent
        : undefined,
    transcriptText: report.transcript,
    audioKind: report.audioKind,
    videoHighlights: report.videoMoments,
    chatLines:
      parsedChat && parsedChat.messages.length > 0
        ? parsedChat.messages.map((m) => ({
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp,
          }))
        : report.parsedChatMessages?.map((m: any) => ({
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp,
          })),
    accessionNumber: `ACC.${yearNum}.${memId.slice(-4).toUpperCase()}`,
    motif: 'treehouse_meadow',
    palette: ['#F4D8AF', '#D38B52', '#442D1C', '#D6A15D'],
    tags: suggestedThemes.length > 0 ? suggestedThemes : suggestedTags,
    aiSummary: report.recommendedReason,
    assistantNote: aiAssistantResponse,
    placementTarget: placement.catalogEntry.placementTarget,
    curatedZoneId: placement.locationId,
    // Held out of 3D room until the user explicitly reviews and approves placement
    hiddenFrom3D: awaitingApproval,
    curationReport: report,
    memoryTo3DBlueprint: blueprint,
    linkedSpaceId: placement.catalogEntry.spaceId,
    linkedObjectId: placement.catalogEntry.linkedObjectId,
    linked3DObject: placement.catalogEntry.label,
    userProvided: {
      title: userTitle || undefined,
      description: userDescription || undefined,
      date: userDate || undefined,
    },
    aiSuggestions:
      analysisRes?.analyzedBy === 'gemini'
        ? {
            title: aiTitle || undefined,
            description: aiDescription || undefined,
            tags: suggestedThemes,
            locationId: placement.locationId,
            assistantResponse: aiAssistantResponse,
            modelUsed: analysisRes?.modelUsed || report.modelUsed,
            generatedAt: nowIso,
          }
        : undefined,
    confirmationStatus: explicitLocalFallback
      ? 'manual_no_ai'
      : awaitingApproval
        ? undefined
        : 'user_confirmed',
    placement3D: {
      locationId: placement.locationId,
      placementTarget: placement.catalogEntry.placementTarget,
      linkedObjectId: placement.catalogEntry.linkedObjectId,
      position: [
        placement.catalogEntry.anchor.x,
        placement.catalogEntry.anchor.y,
        placement.catalogEntry.anchor.z,
      ],
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Applies user review edits OR rejects AI suggestions completely while preserving
 * the original uploaded file and user-supplied facts untouched.
 */
export function buildFinalMemoryFromReview(
  input: ReviewedMemoryCommitInput,
): Memory {
  const { memory, mode, edits } = input;
  const validated = validateLocationPlacement(
    edits.moveToUnsorted ? 'keepsake_corner' : edits.locationId,
    memory.mediaType || memory.type || 'image',
  );
  const catalogEntry = validated.catalogEntry;
  const nowIso = new Date().toISOString();

  if (mode === 'rejected_ai_saved_manual') {
    const manualTitle =
      (edits.title ?? memory.userProvided?.title ?? '').trim() ||
      cleanFileNameTitle(memory.mediaFileName || memory.title);
    const manualDescription =
      (edits.description ?? memory.userProvided?.description ?? '').trim() ||
      `Original ${memory.mediaType || memory.type || 'memory'} saved without AI suggestions.`;
    const manualDate = (edits.date ?? memory.userProvided?.date ?? '').trim();
    const yearMatch = manualDate.match(/(\d{4})/);

    return {
      ...memory,
      roomId: 'childhood',
      title: manualTitle,
      description: manualDescription,
      date: manualDate,
      year: yearMatch ? Number(yearMatch[1]) : memory.year,
      subtitle: edits.moveToUnsorted
        ? `${catalogEntry.label} (Unsorted)`
        : catalogEntry.label,
      tags:
        Array.isArray(edits.themes) && edits.themes.length > 0
          ? edits.themes
          : [memory.mediaType || memory.type || 'memory'],
      aiSummary: undefined,
      assistantNote: undefined,
      aiSuggestions: undefined,
      curationReport: undefined,
      curatedZoneId: catalogEntry.id,
      placementTarget: catalogEntry.placementTarget,
      linkedSpaceId: catalogEntry.spaceId,
      linkedObjectId: catalogEntry.linkedObjectId,
      linked3DObject: catalogEntry.label,
      hiddenFrom3D: false,
      confirmationStatus: 'manual_no_ai',
      userProvided: {
        title: manualTitle,
        description: manualDescription,
        date: manualDate || undefined,
      },
      placement3D: {
        locationId: catalogEntry.id,
        placementTarget: catalogEntry.placementTarget,
        linkedObjectId: catalogEntry.linkedObjectId,
        position: [
          catalogEntry.anchor.x,
          catalogEntry.anchor.y,
          catalogEntry.anchor.z,
        ],
      },
      memoryTo3DBlueprint: memory.memoryTo3DBlueprint
        ? {
            ...memory.memoryTo3DBlueprint,
            connectedSpace: catalogEntry.spaceId,
            linkedObjectId:
              catalogEntry.linkedObjectId ??
              memory.memoryTo3DBlueprint.linkedObjectId,
            userApprovalStatus: 'approved',
          }
        : memory.memoryTo3DBlueprint,
      updatedAt: nowIso,
    };
  }

  const cleanTitle = (edits.title ?? memory.title).trim() || memory.title;
  const cleanDescription =
    (edits.description ?? memory.description).trim() || memory.description;
  const cleanDate = (edits.date ?? memory.date ?? '').trim();
  const yearMatch = cleanDate.match(/(\d{4})/);
  const cleanThemes =
    Array.isArray(edits.themes) && edits.themes.length > 0
      ? edits.themes.map((t) => t.trim()).filter(Boolean).slice(0, 8)
      : memory.tags;

  const wasEdited =
    cleanTitle !== memory.title ||
    cleanDescription !== memory.description ||
    cleanDate !== (memory.date || '') ||
    catalogEntry.id !== memory.curatedZoneId;

  return {
    ...memory,
    roomId: 'childhood',
    title: cleanTitle,
    description: cleanDescription,
    date: cleanDate,
    year: yearMatch ? Number(yearMatch[1]) : memory.year,
    tags: cleanThemes,
    subtitle: edits.moveToUnsorted
      ? `${catalogEntry.label} (Unsorted)`
      : catalogEntry.label,
    curatedZoneId: catalogEntry.id,
    placementTarget: catalogEntry.placementTarget,
    linkedSpaceId: catalogEntry.spaceId,
    linkedObjectId: catalogEntry.linkedObjectId,
    linked3DObject: catalogEntry.label,
    hiddenFrom3D: false,
    confirmationStatus: wasEdited ? 'user_edited' : 'user_confirmed',
    curationReport: memory.curationReport
      ? {
          ...memory.curationReport,
          recommendedRoomId: 'childhood',
          recommendedLocationId: catalogEntry.id,
          recommendedDisplayObject: catalogEntry.linkedObjectId,
          topics: cleanThemes,
          autoPlacedIn3D: true,
        }
      : memory.curationReport,
    placement3D: {
      locationId: catalogEntry.id,
      placementTarget: catalogEntry.placementTarget,
      linkedObjectId: catalogEntry.linkedObjectId,
      position: [
        catalogEntry.anchor.x,
        catalogEntry.anchor.y,
        catalogEntry.anchor.z,
      ],
    },
    memoryTo3DBlueprint: memory.memoryTo3DBlueprint
      ? {
          ...memory.memoryTo3DBlueprint,
          connectedSpace: catalogEntry.spaceId,
          linkedObjectId:
            catalogEntry.linkedObjectId ??
            memory.memoryTo3DBlueprint.linkedObjectId,
          userApprovalStatus: 'approved',
        }
      : memory.memoryTo3DBlueprint,
    updatedAt: nowIso,
  };
}

/**
 * Gemini Memory Analysis & Review-Before-Save Pipeline:
 * 1. "Analyzing memory" — runs live server-side Gemini analysis on uploaded photo/video/audio/text.
 * 2. "Review suggestions" — stages analyzed draft memories WITHOUT modifying existing data or saving yet,
 *    so the user can review User Facts vs. Gemini Suggestions vs. Unknown Details, edit fields,
 *    Approve & Save, Reject AI & Save Original, or Discard.
 * 3. Supports AbortSignal so newer actions cancel stale requests cleanly.
 * 4. If `explicitLocalFallback` is true (user chose "Save Manually (No AI)" after an error), saves original directly.
 */
export async function executeAutoCurationBatch(params: {
  items: CurationBatchItemInput[];
  existingMemories: Memory[];
  existingCollections: Collection[];
  existingConnections: MemoryConnection[];
  userId: string;
  sessionToken?: string | null;
  explicitLocalFallback?: boolean;
  signal?: AbortSignal;
  callbacks: RunCurationBatchCallbacks;
}): Promise<CurationBatchState> {
  const {
    items,
    existingMemories,
    existingCollections,
    existingConnections,
    userId,
    sessionToken,
    explicitLocalFallback = false,
    signal,
    callbacks,
  } = params;

  const batchId = `batch_${Date.now()}`;
  const itemStatuses: CurationBatchItemStatus[] = items.map((it) => ({
    tempId: it.tempId,
    fileName: it.fileName,
    detectedMediaType: it.detectedMediaType,
    status: 'queued',
    saveStatus: 'pending',
    decision: 'pending',
    thumbnailUrl:
      it.detectedMediaType === 'image' ? it.originalDataUrl : undefined,
    userSuppliedFacts: {
      fileName: it.fileName,
      title: it.userTitle?.trim() || undefined,
      description: it.userDescription?.trim() || undefined,
      date: it.userDate?.trim() || undefined,
    },
    inputSnapshot: it,
  }));

  const emitState = (
    partial: Partial<CurationBatchState>,
  ): CurationBatchState => {
    const completedCount = itemStatuses.filter(
      (s) => s.status === 'done' && s.saveStatus === 'saved',
    ).length;
    const failedCount = itemStatuses.filter(
      (s) => s.status === 'failed' || s.saveStatus === 'failed',
    ).length;
    const nextState: CurationBatchState = {
      batchId,
      phase: 'analysing',
      phaseLabel: 'Analyzing memory with Gemini',
      totalCount: itemStatuses.length,
      completedCount,
      failedCount,
      items: itemStatuses.map((s) => ({ ...s })),
      ...partial,
    };
    if (!signal?.aborted) {
      callbacks.onStateChange(nextState);
    }
    return nextState;
  };

  if (items.length === 0) {
    return emitState({
      phase: 'error',
      phaseLabel: 'No memories selected',
      errorBannerMessage: 'Please select a photo, video, audio clip, or written memory to analyze.',
    });
  }

  emitState({
    phase: 'analysing',
    phaseLabel: explicitLocalFallback
      ? 'Saving memory without AI…'
      : 'Analyzing memory with Gemini',
  });

  const preparedMemories: Memory[] = [];
  const existingIds = new Set(existingMemories.map((m) => m.id));

  for (let idx = 0; idx < items.length; idx++) {
    if (signal?.aborted) {
      return {
        batchId,
        phase: 'idle',
        phaseLabel: 'Cancelled',
        totalCount: itemStatuses.length,
        completedCount: 0,
        failedCount: 0,
        items: itemStatuses,
      };
    }

    const item = items[idx];
    const stableId = stableMemoryIdForInput(item, idx);

    itemStatuses[idx].status = 'processing';
    emitState({
      phase: 'analysing',
      phaseLabel: explicitLocalFallback
        ? `Preparing manual save (${idx + 1}/${items.length})`
        : items.length === 1
          ? 'Analyzing memory with Gemini'
          : `Analyzing memory (${idx + 1}/${items.length})`,
    });

    try {
      let json: any = null;

      if (explicitLocalFallback) {
        const fallbackReport = buildGroundedFallbackReport({
          mediaCategory: item.detectedMediaType,
          fileName: item.fileName,
          rawTextContent: item.rawTextContent,
          videoDurationSeconds: item.videoDurationSeconds,
        });
        fallbackReport.analyzedBy = 'deterministic_fallback';
        fallbackReport.assistantResponse =
          'Saved manually without AI analysis. Your original file is preserved in the Childhood Room.';
        json = {
          ok: true,
          analyzedBy: 'deterministic_fallback',
          isDemo: false,
          isUnsorted: false,
          confidenceScore: fallbackReport.confidenceScore ?? 0.65,
          warnings: [
            'Saved manually without Gemini AI details. Original media is preserved untouched.',
          ],
          suggestedTitle:
            (item.userTitle || '').trim() || cleanFileNameTitle(item.fileName),
          suggestedDescription:
            (item.userDescription || '').trim() ||
            `Original ${item.detectedMediaType} saved manually to your Childhood Room.`,
          suggestedDate: (item.userDate || '').trim(),
          suggestedThemes: [item.detectedMediaType],
          assistantResponse: fallbackReport.assistantResponse,
          report: fallbackReport,
        };
      } else {
        const resp = await fetch('/api/curation/analyze-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            item,
            consentGranted: true,
          }),
        });
        json = await resp.json().catch(() => null);

        if (signal?.aborted) {
          return {
            batchId,
            phase: 'idle',
            phaseLabel: 'Cancelled',
            totalCount: itemStatuses.length,
            completedCount: 0,
            failedCount: 0,
            items: itemStatuses,
          };
        }

        if (
          !resp.ok ||
          !json?.ok ||
          json?.analyzedBy !== 'gemini' ||
          !json?.report
        ) {
          itemStatuses[idx].status = 'failed';
          const codeTag = json?.code ? `[${json.code}] ` : '';
          itemStatuses[idx].errorMessage =
            `${codeTag}${json?.message || 'Gemini analysis is currently unavailable. Your uploaded file is preserved — retry or save manually without AI.'}`;
          continue;
        }
      }

      const mem = buildMemoryFromAnalyzedItem({
        item,
        analysisRes: json,
        ownerId: userId,
        orderIndex: idx,
        awaitingApproval: !explicitLocalFallback,
        explicitLocalFallback,
      });

      if (existingIds.has(stableId)) {
        mem.id = stableId;
      }

      preparedMemories.push(mem);

      const zoneId: ChildhoodWorldLocationId =
        mem.curatedZoneId || 'memory_wall';
      itemStatuses[idx].status = 'done';
      itemStatuses[idx].memoryId = mem.id;
      itemStatuses[idx].locationId = zoneId;
      itemStatuses[idx].locationLabel =
        CHILDHOOD_WORLD_LOCATION_CATALOGUE[zoneId]?.label;
      itemStatuses[idx].suggestedTitle = mem.title;
      itemStatuses[idx].suggestedDescription = mem.description;
      itemStatuses[idx].suggestedDate = mem.date;
      itemStatuses[idx].suggestedTags = mem.tags;
      itemStatuses[idx].suggestedThemes =
        Array.isArray(json?.suggestedThemes) && json.suggestedThemes.length > 0
          ? json.suggestedThemes
          : mem.curationReport?.topics || mem.tags;
      itemStatuses[idx].verifiedFacts = mem.curationReport?.verifiedFacts || [];
      itemStatuses[idx].aiInferences = mem.curationReport?.aiInferences || [];
      itemStatuses[idx].uncertainInfo = mem.curationReport?.uncertainInfo || [];
      itemStatuses[idx].recommendedReason =
        mem.curationReport?.recommendedReason;
      itemStatuses[idx].assistantResponse = mem.assistantNote;
      itemStatuses[idx].confidenceScore =
        typeof json?.confidenceScore === 'number'
          ? json.confidenceScore
          : mem.curationReport?.confidenceScore;
      itemStatuses[idx].analyzedBy =
        json?.analyzedBy === 'gemini' ? 'gemini' : 'deterministic_fallback';
      itemStatuses[idx].modelUsed = json?.modelUsed;
      itemStatuses[idx].isDemo = Boolean(json?.isDemo);
      itemStatuses[idx].isUnsorted = Boolean(json?.isUnsorted);
      itemStatuses[idx].warnings = Array.isArray(json?.warnings)
        ? json.warnings
        : [];
      itemStatuses[idx].placementApproved = explicitLocalFallback;
      itemStatuses[idx].decision = explicitLocalFallback
        ? 'rejected_ai_saved_manual'
        : 'pending';
      itemStatuses[idx].draftMemory = mem;
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) {
        return {
          batchId,
          phase: 'idle',
          phaseLabel: 'Cancelled',
          totalCount: itemStatuses.length,
          completedCount: 0,
          failedCount: 0,
          items: itemStatuses,
        };
      }
      itemStatuses[idx].status = 'failed';
      itemStatuses[idx].errorMessage = String(
        err?.message || 'Network interruption during Gemini analysis.',
      );
    }
  }

  if (preparedMemories.length === 0) {
    return emitState({
      phase: 'error',
      phaseLabel: 'Gemini analysis could not complete',
      errorBannerMessage:
        itemStatuses[0]?.errorMessage ||
        'Gemini could not analyze the uploaded memory right now. Your uploaded file is preserved — click Retry with Gemini or Save Manually (No AI).',
    });
  }

  // Standard Gemini flow: STOP at Review phase so the user can inspect, edit, approve, or reject AI suggestions BEFORE anything is saved!
  if (!explicitLocalFallback) {
    const hasAnalysisFailures = itemStatuses.some((s) => s.status === 'failed');
    return emitState({
      phase: 'review',
      phaseLabel:
        preparedMemories.length === 1
          ? 'Review Gemini suggestions before saving'
          : `Review ${preparedMemories.length} Gemini suggestions before saving`,
      errorBannerMessage: hasAnalysisFailures
        ? `${itemStatuses.filter((s) => s.status === 'failed').length} item(s) could not be analyzed. Review ready items below, or retry/save failed items manually.`
        : undefined,
    });
  }

  // Explicit manual fallback flow: user already requested saving without AI
  emitState({
    phase: 'saving',
    phaseLabel: 'Saving memory',
  });

  const commitRes = await commitReviewedMemoriesBatch({
    drafts: preparedMemories.map((mem) => ({
      memory: mem,
      mode: 'rejected_ai_saved_manual',
      edits: {
        title: mem.title,
        description: mem.description,
        date: mem.date,
        themes: mem.tags,
        locationId: mem.curatedZoneId || 'memory_wall',
      },
    })),
    existingMemories,
    existingCollections,
    existingConnections,
    userId,
    sessionToken,
  });

  for (const savedMem of commitRes.saved) {
    const st = itemStatuses.find((s) => s.memoryId === savedMem.id);
    if (st) {
      st.saveStatus = 'saved';
      st.saveError = undefined;
      st.placementApproved = true;
      st.draftMemory = undefined;
    }
  }
  for (const failedEntry of commitRes.failed) {
    const st = itemStatuses.find((s) => s.memoryId === failedEntry.memory.id);
    if (st) {
      st.saveStatus = 'failed';
      st.saveError = failedEntry.error;
    }
  }

  callbacks.onMemoriesAndCollectionsReady({
    addedMemories: commitRes.saved,
    updatedCollections: commitRes.updatedCollections,
    addedConnections: commitRes.addedConnections,
    undoSnapshot: commitRes.undoSnapshot,
    unsavedMemories:
      commitRes.failed.length > 0
        ? commitRes.failed.map((f) => f.memory)
        : undefined,
  });

  if (commitRes.saved.length === 0) {
    return emitState({
      phase: 'save_failed',
      phaseLabel: 'Could not save — retry',
      errorBannerMessage:
        commitRes.failed[0]?.error ||
        'Could not save your memory to project storage. Click Retry Save to try again without creating duplicates.',
    });
  }

  return emitState({
    phase: commitRes.failed.length > 0 ? 'save_failed' : 'ready',
    phaseLabel:
      commitRes.failed.length > 0 ? 'Could not save — retry' : 'Memory added',
    primaryReadyCollectionId: commitRes.primaryCollectionId,
    primaryReadyCollectionTitle: commitRes.primaryCollectionTitle,
    lastUndoSnapshot: commitRes.undoSnapshot,
  });
}

/**
 * Persists user-approved (or AI-rejected manual) draft memories to IndexedDB +
 * server disk vault, organizes collections, and prepares them for 3D Childhood Room display.
 */
export async function commitReviewedMemoriesBatch(params: {
  drafts: ReviewedMemoryCommitInput[];
  existingMemories: Memory[];
  existingCollections: Collection[];
  existingConnections: MemoryConnection[];
  userId: string;
  sessionToken?: string | null;
}): Promise<{
  saved: Memory[];
  failed: Array<{ memory: Memory; error: string }>;
  updatedCollections: Collection[];
  addedConnections: MemoryConnection[];
  undoSnapshot: CurationUndoSnapshot;
  primaryCollectionId?: string;
  primaryCollectionTitle?: string;
}> {
  const {
    drafts,
    existingMemories,
    existingCollections,
    existingConnections,
    userId,
    sessionToken,
  } = params;

  const undoSnapshot: CurationUndoSnapshot = {
    batchId: `commit_${Date.now()}`,
    createdAt: new Date().toISOString(),
    createdMemoryIds: [],
    createdCollectionIds: [],
    previousMemories: existingMemories,
    previousCollections: existingCollections,
    previousConnections: existingConnections,
    summaryLabel: `${drafts.length} reviewed memor${drafts.length === 1 ? 'y' : 'ies'}`,
  };

  const saved: Memory[] = [];
  const failed: Array<{ memory: Memory; error: string }> = [];

  for (const draft of drafts) {
    const finalized = buildFinalMemoryFromReview(draft);

    // Store untouched original media in IndexedDB right before vault persistence
    const rawOriginal = finalized.mediaUrl || finalized.customImageUrl;
    if (rawOriginal && rawOriginal.startsWith('data:')) {
      const mType = finalized.mediaType || finalized.type || 'image';
      const domain =
        mType === 'video'
          ? 'video'
          : mType === 'audio'
            ? 'audio'
            : mType === 'image'
              ? 'photograph'
              : 'document';
      await saveMediaToIndexedDb(finalized.id, rawOriginal, domain).catch(
        () => {},
      );
    }

    const syncRes = await syncMemoryRecordToVault(
      { ...finalized, userId },
      userId,
      sessionToken,
    );

    if (syncRes.ok && syncRes.synced) {
      const serverMem = syncRes.savedMemory;
      if (serverMem && typeof serverMem.mediaUrl === 'string') {
        finalized.mediaUrl = serverMem.mediaUrl;
      }
      if (serverMem && typeof serverMem.customImageUrl === 'string') {
        finalized.customImageUrl = serverMem.customImageUrl;
      }
      saved.push(finalized);
      undoSnapshot.createdMemoryIds.push(finalized.id);
    } else {
      failed.push({
        memory: finalized,
        error:
          syncRes.errorMessage || 'Could not persist memory to project storage.',
      });
    }
  }

  let updatedCollections = existingCollections;
  let addedConnections: MemoryConnection[] = [];

  if (saved.length > 0) {
    const combinedMemories = [
      ...saved,
      ...existingMemories.filter((em) => !saved.some((sm) => sm.id === em.id)),
    ];
    try {
      const orgResp = await fetch('/api/curation/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newMemories: saved,
          allMemories: combinedMemories,
          existingCollections,
        }),
      });
      const orgJson = await orgResp.json().catch(() => null);
      if (orgJson?.ok && Array.isArray(orgJson.collections)) {
        updatedCollections = orgJson.collections;
        const existingColIds = new Set(existingCollections.map((c) => c.id));
        undoSnapshot.createdCollectionIds = updatedCollections
          .filter((c) => !existingColIds.has(c.id))
          .map((c) => c.id);

        if (Array.isArray(orgJson.connections)) {
          const existingPairKeys = new Set(
            existingConnections.map((c) =>
              [c.sourceMemoryId, c.targetMemoryId].sort().join('::'),
            ),
          );
          addedConnections = orgJson.connections.filter(
            (c: MemoryConnection) =>
              !existingPairKeys.has(
                [c.sourceMemoryId, c.targetMemoryId].sort().join('::'),
              ),
          );
        }
      } else {
        updatedCollections = sanitizeAndOrganizeCollections({
          proposedCollections: [],
          memories: combinedMemories,
          existingCollections,
        });
      }
    } catch {
      updatedCollections = sanitizeAndOrganizeCollections({
        proposedCollections: [],
        memories: combinedMemories,
        existingCollections,
      });
    }

    for (const mem of saved) {
      const matchingCols = updatedCollections.filter((c) =>
        c.memoryIds.includes(mem.id),
      );
      mem.collectionIds = matchingCols.map((c) => c.id);
    }

    const mergedConnections = [...addedConnections, ...existingConnections];
    saveCurationStateToStorage(userId, updatedCollections, mergedConnections);
    await syncCurationStateToVault(
      userId,
      updatedCollections,
      mergedConnections,
      sessionToken,
    ).catch(() => {});
  }

  const primaryCol =
    updatedCollections.find((c) =>
      saved.some((m) => c.memoryIds.includes(m.id)),
    ) || updatedCollections[0];

  return {
    saved,
    failed,
    updatedCollections,
    addedConnections,
    undoSnapshot,
    primaryCollectionId: primaryCol?.id,
    primaryCollectionTitle: primaryCol?.title,
  };
}

/**
 * Retries saving previously failed memories using their EXACT same stable IDs
 * to prevent duplicates on retry.
 */
export async function retrySaveMemoriesBatch(params: {
  memories: Memory[];
  userId: string;
  sessionToken?: string | null;
}): Promise<{
  saved: Memory[];
  failed: Array<{ memory: Memory; error: string }>;
}> {
  const saved: Memory[] = [];
  const failed: Array<{ memory: Memory; error: string }> = [];

  for (const mem of params.memories) {
    const syncRes = await syncMemoryRecordToVault(
      { ...mem, userId: params.userId, updatedAt: new Date().toISOString() },
      params.userId,
      params.sessionToken,
    );
    if (syncRes.ok && syncRes.synced) {
      const serverMem = syncRes.savedMemory;
      const updated: Memory = {
        ...mem,
        mediaUrl:
          serverMem && typeof serverMem.mediaUrl === 'string'
            ? serverMem.mediaUrl
            : mem.mediaUrl,
        customImageUrl:
          serverMem && typeof serverMem.customImageUrl === 'string'
            ? serverMem.customImageUrl
            : mem.customImageUrl,
      };
      saved.push(updated);
    } else {
      failed.push({
        memory: mem,
        error: syncRes.errorMessage || 'Could not save — retry',
      });
    }
  }

  return { saved, failed };
}
