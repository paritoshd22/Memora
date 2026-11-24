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
  }) => void;
}

function buildMemoryFromAnalyzedItem(params: {
  item: CurationBatchItemInput;
  analysisRes: any;
  ownerId: string;
  orderIndex: number;
  awaitingApproval?: boolean;
}): Memory {
  const { item, analysisRes, ownerId, orderIndex, awaitingApproval = true } = params;
  const memId = `mem-auto-${Date.now()}-${orderIndex}-${Math.random().toString(36).slice(2, 6)}`;
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

  const userOrSuggestedDate =
    (item.userDate || '').trim() || (analysisRes?.suggestedDate || '').trim();
  const yearMatch = userOrSuggestedDate.match(/(\d{4})/);
  const explicitDateMatch = (report.explicitDates?.[0] || '').match(/(\d{4})/);
  const yearNum = yearMatch
    ? Number(yearMatch[1])
    : explicitDateMatch
      ? Number(explicitDateMatch[1])
      : new Date().getFullYear();

  const mediaTitle =
    (item.userTitle || '').trim() ||
    (analysisRes?.suggestedTitle || '').trim() ||
    item.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() ||
    'Uploaded Memory';

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

  return {
    id: memId,
    ownerId,
    roomId: 'childhood',
    title: mediaTitle,
    subtitle: `${placement.catalogEntry.label}`,
    type: item.detectedMediaType,
    mediaType: item.detectedMediaType,
    mediaUrl,
    mediaMimeType: item.mimeType,
    mediaFileName: item.fileName,
    customImageUrl,
    date: userOrSuggestedDate,
    year: yearNum,
    location:
      (analysisRes?.suggestedLocation || '').trim() ||
      placement.catalogEntry.label,
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
            : item.detectedMediaType === 'document' || item.detectedMediaType === 'certificate'
              ? 'Document'
              : item.detectedMediaType === 'story'
                ? 'Story'
                : 'Photo',
    description:
      (item.userDescription || '').trim() ||
      (analysisRes?.suggestedDescription || '').trim() ||
      `Original ${item.detectedMediaType} preserved automatically in MEMORA.`,
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
    tags: Array.isArray(analysisRes?.suggestedTags)
      ? analysisRes.suggestedTags
      : [item.detectedMediaType, placement.locationId],
    aiSummary: report.recommendedReason,
    placementTarget: placement.catalogEntry.placementTarget,
    curatedZoneId: placement.locationId,
    // Keep hidden in 3D until the visitor approves placement in the review step
    hiddenFrom3D: awaitingApproval,
    curationReport: report,
    memoryTo3DBlueprint: blueprint,
    linkedSpaceId: placement.catalogEntry.spaceId,
    linkedObjectId: placement.catalogEntry.linkedObjectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Runs non-blocking automatic background curation across all uploaded items.
 * Preserves original uploaded files in IndexedDB immediately before any AI call,
 * calls the live server-side Gemini endpoint (/api/curation/analyze-item),
 * never silently substitutes demo/fallback output for Gemini, and pauses at the
 * interactive Placement Review step so only user-approved placements enter 3D.
 */
export async function executeAutoCurationBatch(params: {
  items: CurationBatchItemInput[];
  existingMemories: Memory[];
  existingCollections: Collection[];
  existingConnections: MemoryConnection[];
  userId: string;
  sessionToken?: string | null;
  explicitLocalFallback?: boolean;
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
    callbacks,
  } = params;

  const batchId = `batch_${Date.now()}`;
  const itemStatuses: CurationBatchItemStatus[] = items.map((it) => ({
    tempId: it.tempId,
    fileName: it.fileName,
    detectedMediaType: it.detectedMediaType,
    status: 'queued',
    thumbnailUrl: it.detectedMediaType === 'image' ? it.originalDataUrl : undefined,
    inputSnapshot: it,
  }));

  const emitState = (partial: Partial<CurationBatchState>): CurationBatchState => {
    const completedCount = itemStatuses.filter((s) => s.status === 'done').length;
    const failedCount = itemStatuses.filter((s) => s.status === 'failed').length;
    const nextState: CurationBatchState = {
      batchId,
      phase: 'uploading',
      phaseLabel: 'Uploading',
      totalCount: itemStatuses.length,
      completedCount,
      failedCount,
      items: itemStatuses.map((s) => ({ ...s })),
      ...partial,
    };
    callbacks.onStateChange(nextState);
    return nextState;
  };

  emitState({ phase: 'uploading', phaseLabel: 'Uploading memories securely…' });

  const undoSnapshot: CurationUndoSnapshot = {
    batchId,
    createdAt: new Date().toISOString(),
    createdMemoryIds: [],
    createdCollectionIds: [],
    previousMemories: existingMemories,
    previousCollections: existingCollections,
    previousConnections: existingConnections,
    summaryLabel: `${items.length} uploaded memor${items.length === 1 ? 'y' : 'ies'}`,
  };

  const addedMemories: Memory[] = [];
  const existingFileNames = new Set(
    existingMemories
      .map((m) => (m.mediaFileName || '').trim().toLowerCase())
      .filter(Boolean),
  );

  // Stage 2: Preserve originals safely before analysis
  emitState({
    phase: 'preserving_original',
    phaseLabel: 'Preserving original media untouched…',
  });

  // Stage 3: Live Gemini analysis (or explicit user-requested local fallback)
  emitState({
    phase: 'analysing',
    phaseLabel: explicitLocalFallback
      ? 'Preparing explicit local fallback (Non-Gemini)…'
      : 'Analysing with Gemini…',
  });

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const normalizedFileName = (item.fileName || '').trim().toLowerCase();

    // Prevent duplicate memory creation if already in archive or batch
    if (
      normalizedFileName &&
      item.captureSource === 'upload' &&
      existingFileNames.has(normalizedFileName)
    ) {
      itemStatuses[idx].status = 'failed';
      itemStatuses[idx].errorMessage = `"${item.fileName}" is already in your MEMORA archive (duplicate skipped).`;
      continue;
    }

    itemStatuses[idx].status = 'processing';
    emitState({
      phase: 'analysing',
      phaseLabel: explicitLocalFallback
        ? `Preparing local fallback (${idx + 1}/${items.length}): ${item.fileName}`
        : `Analysing with Gemini (${idx + 1}/${items.length}): ${item.fileName}`,
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
        fallbackReport.confidenceScore = 0.48;
        fallbackReport.recommendedLocationId = 'keepsake_corner';
        fallbackReport.recommendedReason =
          'Saved via explicit Local Fallback (Non-Gemini). Please choose your preferred Childhood Park location below.';
        json = {
          ok: true,
          analyzedBy: 'deterministic_fallback',
          isDemo: true,
          isUnsorted: true,
          confidenceScore: 0.48,
          warnings: [
            'Analyzed locally without Gemini (explicit fallback). Original media is preserved untouched.',
          ],
          suggestedTitle:
            (item.userTitle || '').trim() ||
            item.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() ||
            'Uploaded Memory',
          suggestedDescription:
            (item.userDescription || '').trim() ||
            `Original ${item.detectedMediaType} preserved locally without Gemini AI.`,
          suggestedDate: (item.userDate || '').trim(),
          report: fallbackReport,
        };
      } else {
        const resp = await fetch('/api/curation/analyze-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item,
            consentGranted: true,
          }),
        });
        json = await resp.json().catch(() => null);

        if (!resp.ok || !json?.ok || json?.analyzedBy !== 'gemini' || !json?.report) {
          itemStatuses[idx].status = 'failed';
          const codeTag = json?.code ? `[${json.code}] ` : '';
          itemStatuses[idx].errorMessage =
            `${codeTag}${json?.message || 'Live Gemini analysis did not complete. Your original file is preserved for retry.'}`;
          continue;
        }
      }

      const mem = buildMemoryFromAnalyzedItem({
        item,
        analysisRes: json,
        ownerId: userId,
        orderIndex: idx,
        awaitingApproval: true,
      });

      // Immediately store untouched original media in IndexedDB (never large binaries in localStorage)
      if (item.originalDataUrl) {
        const domain =
          item.detectedMediaType === 'video'
            ? 'video'
            : item.detectedMediaType === 'audio'
              ? 'audio'
              : item.detectedMediaType === 'image'
                ? 'photograph'
                : 'document';
        await saveMediaToIndexedDb(mem.id, item.originalDataUrl, domain).catch(
          () => {},
        );
      }

      if (normalizedFileName) {
        existingFileNames.add(normalizedFileName);
      }
      addedMemories.push(mem);
      undoSnapshot.createdMemoryIds.push(mem.id);

      const zoneId: ChildhoodWorldLocationId =
        mem.curatedZoneId || 'keepsake_corner';
      itemStatuses[idx].status = 'done';
      itemStatuses[idx].memoryId = mem.id;
      itemStatuses[idx].locationId = zoneId;
      itemStatuses[idx].locationLabel =
        CHILDHOOD_WORLD_LOCATION_CATALOGUE[zoneId]?.label;
      itemStatuses[idx].suggestedTitle = mem.title;
      itemStatuses[idx].suggestedDescription = mem.description;
      itemStatuses[idx].suggestedDate = mem.date;
      itemStatuses[idx].recommendedReason = mem.curationReport?.recommendedReason;
      itemStatuses[idx].confidenceScore =
        typeof json?.confidenceScore === 'number'
          ? json.confidenceScore
          : mem.curationReport?.confidenceScore;
      itemStatuses[idx].analyzedBy =
        json?.analyzedBy === 'gemini' ? 'gemini' : 'deterministic_fallback';
      itemStatuses[idx].modelUsed = json?.modelUsed;
      itemStatuses[idx].isDemo = Boolean(json?.isDemo);
      itemStatuses[idx].isUnsorted = Boolean(json?.isUnsorted);
      itemStatuses[idx].warnings = Array.isArray(json?.warnings) ? json.warnings : [];
      itemStatuses[idx].placementApproved = false;
    } catch (err: any) {
      itemStatuses[idx].status = 'failed';
      itemStatuses[idx].errorMessage =
        String(err?.message || 'Network interruption during analysis.');
    }
  }

  if (addedMemories.length === 0) {
    return emitState({
      phase: 'error',
      phaseLabel: 'Gemini analysis unavailable — originals preserved for retry',
      errorBannerMessage:
        itemStatuses[0]?.errorMessage ||
        'Gemini could not analyse the uploaded items right now. Click Retry, or choose Save with Local Fallback (Non-Gemini).',
    });
  }

  // Stage 4: Organising into evidence-backed collections
  emitState({
    phase: 'organising',
    phaseLabel: 'Organising…',
  });

  const combinedMemories = [...addedMemories, ...existingMemories];
  let updatedCollections = existingCollections;
  let addedConnections: MemoryConnection[] = [];

  try {
    const orgResp = await fetch('/api/curation/organize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newMemories: addedMemories,
        allMemories: combinedMemories,
        existingCollections,
      }),
    });
    const orgJson = await orgResp.json();

    // Stage 5: Finding related memories
    emitState({
      phase: 'finding_related',
      phaseLabel: 'Finding related memories…',
    });

    if (orgJson?.ok && Array.isArray(orgJson.collections)) {
      updatedCollections = orgJson.collections;
      const existingColIds = new Set(existingCollections.map((c) => c.id));
      undoSnapshot.createdCollectionIds = updatedCollections
        .filter((c) => !existingColIds.has(c.id))
        .map((c) => c.id);

      // Stage 6: Suggesting museum locations
      emitState({
        phase: 'assigning_locations',
        phaseLabel: 'Suggesting Childhood Park locations…',
      });

      if (Array.isArray(orgJson.placements)) {
        const placementByMem = new Map<string, string>(
          orgJson.placements.map((p: any) => [p.memoryId, p.locationId]),
        );
        for (const mem of addedMemories) {
          const proposedLoc = placementByMem.get(mem.id);
          if (proposedLoc) {
            const validated = validateLocationPlacement(
              proposedLoc,
              mem.type || mem.mediaType || 'image',
            );
            mem.curatedZoneId = validated.locationId;
            mem.placementTarget = validated.catalogEntry.placementTarget;
            mem.linkedSpaceId = validated.catalogEntry.spaceId;
            mem.linkedObjectId = validated.catalogEntry.linkedObjectId;
            mem.subtitle = validated.catalogEntry.label;
            const st = itemStatuses.find((s) => s.memoryId === mem.id);
            if (st) {
              st.locationId = validated.locationId;
              st.locationLabel = validated.catalogEntry.label;
            }
          }
        }
      }

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

  for (const mem of addedMemories) {
    const matchingCols = updatedCollections.filter((c) =>
      c.memoryIds.includes(mem.id),
    );
    mem.collectionIds = matchingCols.map((c) => c.id);
    const st = itemStatuses.find((s) => s.memoryId === mem.id);
    if (st && matchingCols.length > 0) {
      st.collectionTitle = matchingCols[0].title;
    }
  }

  for (const mem of addedMemories) {
    await syncMemoryRecordToVault(
      { ...mem, userId },
      userId,
      sessionToken,
    ).catch(() => {});
  }

  const mergedConnections = [...addedConnections, ...existingConnections];
  saveCurationStateToStorage(userId, updatedCollections, mergedConnections);
  await syncCurationStateToVault(
    userId,
    updatedCollections,
    mergedConnections,
    sessionToken,
  ).catch(() => {});

  // Commit draft memories (hiddenFrom3D: true until user approves in Placement Review)
  callbacks.onMemoriesAndCollectionsReady({
    addedMemories,
    updatedCollections,
    addedConnections,
    undoSnapshot,
  });

  const primaryCol =
    updatedCollections.find((c) =>
      addedMemories.some((m) => c.memoryIds.includes(m.id)),
    ) || updatedCollections[0];

  const hasFailures = itemStatuses.some((s) => s.status === 'failed');

  // Stage 7: Interactive Placement Review — user edits/approves before 3D display becomes permanent
  return emitState({
    phase: 'review',
    phaseLabel: hasFailures
      ? 'Review placements — failed items kept ready to retry'
      : 'Review & approve 3D Childhood Park placement',
    primaryReadyCollectionId: primaryCol?.id,
    primaryReadyCollectionTitle: primaryCol?.title,
    errorBannerMessage: hasFailures
      ? `${itemStatuses.filter((s) => s.status === 'failed').length} item(s) could not be analysed. Original files remain preserved for Retry.`
      : undefined,
    lastUndoSnapshot: undoSnapshot,
  });
}
