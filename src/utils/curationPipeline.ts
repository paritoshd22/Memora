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

function stableMemoryIdForInput(item: CurationBatchItemInput, orderIndex: number): string {
  const safeTemp = (item.tempId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  if (safeTemp.length >= 6) {
    return `mem-ch-${safeTemp}`;
  }
  return `mem-auto-${Date.now()}-${orderIndex}-${Math.random().toString(36).slice(2, 6)}`;
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
    awaitingApproval = false,
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

  const aiTitle =
    (analysisRes?.aiGeneratedTitle || analysisRes?.suggestedTitle || '').trim();
  const aiDescription =
    (
      analysisRes?.aiGeneratedDescription ||
      analysisRes?.suggestedDescription ||
      ''
    ).trim();

  const mediaTitle =
    userTitle ||
    aiTitle ||
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

  const aiAssistantResponse =
    (analysisRes?.assistantResponse || report.assistantResponse || '').trim() ||
    `Your memory "${mediaTitle}" has been placed in the ${placement.catalogEntry.label}.`;

  const suggestedTags = Array.isArray(analysisRes?.suggestedTags)
    ? analysisRes.suggestedTags
    : [item.detectedMediaType, placement.locationId];

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
    tags: suggestedTags,
    aiSummary: report.recommendedReason,
    assistantNote: aiAssistantResponse,
    placementTarget: placement.catalogEntry.placementTarget,
    curatedZoneId: placement.locationId,
    // Immediately display in the 3D Childhood Room unless explicitly held for approval
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
            tags: suggestedTags,
            locationId: placement.locationId,
            assistantResponse: aiAssistantResponse,
            modelUsed: analysisRes?.modelUsed || report.modelUsed,
            generatedAt: nowIso,
          }
        : undefined,
    confirmationStatus: explicitLocalFallback ? 'manual_no_ai' : 'auto_placed',
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
 * Automatic Childhood Room AI Memory Pipeline:
 * 1. "Analyzing memory" — runs live Gemini analysis on the uploaded image & text (or explicit manual save without AI).
 * 2. Prepares 3D placement & Childhood Room location automatically.
 * 3. "Saving memory" — writes original media + structured record to persistent project disk vault + IndexedDB.
 * 4. "Memory added" — ONLY emitted once persistence is confirmed (`ok: true`); displays immediately in the 3D room.
 * 5. "Could not save — retry" — emitted if persistence fails, keeping the exact same stable ID so retry creates zero duplicates.
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
    saveStatus: 'pending',
    thumbnailUrl: it.detectedMediaType === 'image' ? it.originalDataUrl : undefined,
    inputSnapshot: it,
  }));

  const emitState = (partial: Partial<CurationBatchState>): CurationBatchState => {
    const completedCount = itemStatuses.filter(
      (s) => s.status === 'done' && s.saveStatus === 'saved',
    ).length;
    const failedCount = itemStatuses.filter(
      (s) => s.status === 'failed' || s.saveStatus === 'failed',
    ).length;
    const nextState: CurationBatchState = {
      batchId,
      phase: 'analysing',
      phaseLabel: 'Analyzing memory',
      totalCount: itemStatuses.length,
      completedCount,
      failedCount,
      items: itemStatuses.map((s) => ({ ...s })),
      ...partial,
    };
    callbacks.onStateChange(nextState);
    return nextState;
  };

  emitState({
    phase: 'analysing',
    phaseLabel: explicitLocalFallback
      ? 'Saving memory without AI…'
      : 'Analyzing memory',
  });

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

  const preparedMemories: Memory[] = [];
  const existingIds = new Set(existingMemories.map((m) => m.id));

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const stableId = stableMemoryIdForInput(item, idx);

    itemStatuses[idx].status = 'processing';
    emitState({
      phase: 'analysing',
      phaseLabel: explicitLocalFallback
        ? `Preparing manual save (${idx + 1}/${items.length})`
        : items.length === 1
          ? 'Analyzing memory'
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
          'Saved manually without AI analysis. Your original image is preserved in the Childhood Room.';
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
            (item.userTitle || '').trim() ||
            item.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() ||
            'Uploaded Memory',
          suggestedDescription:
            (item.userDescription || '').trim() ||
            `Original ${item.detectedMediaType} saved manually to your Childhood Room.`,
          suggestedDate: (item.userDate || '').trim(),
          assistantResponse: fallbackReport.assistantResponse,
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
            `${codeTag}${json?.message || 'Gemini analysis is currently unavailable. Your uploaded image is preserved — retry or save manually without AI.'}`;
          continue;
        }
      }

      const mem = buildMemoryFromAnalyzedItem({
        item,
        analysisRes: json,
        ownerId: userId,
        orderIndex: idx,
        awaitingApproval: false,
        explicitLocalFallback,
      });

      // Keep stable ID consistent if this exact upload tempId already exists
      if (existingIds.has(stableId)) {
        mem.id = stableId;
      }

      // Immediately store untouched original media in IndexedDB
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
      itemStatuses[idx].recommendedReason = mem.curationReport?.recommendedReason;
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
      itemStatuses[idx].warnings = Array.isArray(json?.warnings) ? json.warnings : [];
      itemStatuses[idx].placementApproved = true;
    } catch (err: any) {
      itemStatuses[idx].status = 'failed';
      itemStatuses[idx].errorMessage =
        String(err?.message || 'Network interruption during Gemini analysis.');
    }
  }

  if (preparedMemories.length === 0) {
    return emitState({
      phase: 'error',
      phaseLabel: 'Gemini unavailable — save manually or retry',
      errorBannerMessage:
        itemStatuses[0]?.errorMessage ||
        'Gemini could not analyze the uploaded memory right now. Your uploaded image is preserved — click Retry with Gemini or Save Manually (No AI).',
    });
  }

  // Stage 2: Persist to project server disk vault BEFORE confirming "Memory added"
  emitState({
    phase: 'saving',
    phaseLabel: 'Saving memory',
  });

  const savedMemories: Memory[] = [];
  const unsavedMemories: Memory[] = [];

  for (const mem of preparedMemories) {
    const st = itemStatuses.find((s) => s.memoryId === mem.id);
    if (st) st.saveStatus = 'saving';

    const syncRes = await syncMemoryRecordToVault(
      { ...mem, userId },
      userId,
      sessionToken,
    );

    if (syncRes.ok && syncRes.synced) {
      // Adopt durable /api/storage/media/<id> URL returned by server while keeping local cache intact
      const serverMem = syncRes.savedMemory;
      if (serverMem && typeof serverMem.mediaUrl === 'string') {
        mem.mediaUrl = serverMem.mediaUrl;
      }
      if (serverMem && typeof serverMem.customImageUrl === 'string') {
        mem.customImageUrl = serverMem.customImageUrl;
      }
      savedMemories.push(mem);
      undoSnapshot.createdMemoryIds.push(mem.id);
      if (st) {
        st.saveStatus = 'saved';
        st.saveError = undefined;
      }
    } else {
      unsavedMemories.push(mem);
      if (st) {
        st.saveStatus = 'failed';
        st.saveError =
          syncRes.errorMessage || 'Could not persist memory to project storage.';
      }
    }
  }

  // If NONE of the memories saved to persistent storage, honestly report "Could not save — retry"
  if (savedMemories.length === 0) {
    callbacks.onMemoriesAndCollectionsReady({
      addedMemories: [],
      updatedCollections: existingCollections,
      addedConnections: [],
      undoSnapshot,
      unsavedMemories,
    });

    return emitState({
      phase: 'save_failed',
      phaseLabel: 'Could not save — retry',
      errorBannerMessage:
        itemStatuses.find((s) => s.saveStatus === 'failed')?.saveError ||
        'Could not save your memory to project storage. Click Retry Save to try again without creating duplicates.',
    });
  }

  // Stage 3: Organize collections & connections in background for confirmed saved memories
  const combinedMemories = [
    ...savedMemories,
    ...existingMemories.filter(
      (em) => !savedMemories.some((sm) => sm.id === em.id),
    ),
  ];
  let updatedCollections = existingCollections;
  let addedConnections: MemoryConnection[] = [];

  try {
    const orgResp = await fetch('/api/curation/organize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newMemories: savedMemories,
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

  for (const mem of savedMemories) {
    const matchingCols = updatedCollections.filter((c) =>
      c.memoryIds.includes(mem.id),
    );
    mem.collectionIds = matchingCols.map((c) => c.id);
    const st = itemStatuses.find((s) => s.memoryId === mem.id);
    if (st && matchingCols.length > 0) {
      st.collectionTitle = matchingCols[0].title;
    }
  }

  const mergedConnections = [...addedConnections, ...existingConnections];
  saveCurationStateToStorage(userId, updatedCollections, mergedConnections);
  await syncCurationStateToVault(
    userId,
    updatedCollections,
    mergedConnections,
    sessionToken,
  ).catch(() => {});

  // Commit confirmed saved memories immediately into the Childhood Room 3D display
  callbacks.onMemoriesAndCollectionsReady({
    addedMemories: savedMemories,
    updatedCollections,
    addedConnections,
    undoSnapshot,
    unsavedMemories: unsavedMemories.length > 0 ? unsavedMemories : undefined,
  });

  const primaryCol =
    updatedCollections.find((c) =>
      savedMemories.some((m) => c.memoryIds.includes(m.id)),
    ) || updatedCollections[0];

  const hasSaveFailures = unsavedMemories.length > 0;
  const hasAnalysisFailures = itemStatuses.some((s) => s.status === 'failed');

  const firstAssistantMsg = savedMemories[0]?.assistantNote;
  const assistantSummary =
    savedMemories.length === 1
      ? `Your memory has been added to the room. ${firstAssistantMsg || ''}`.trim()
      : `${savedMemories.length} memories have been added to the Childhood Room.`;

  if (hasSaveFailures) {
    return emitState({
      phase: 'save_failed',
      phaseLabel: 'Could not save — retry',
      primaryReadyCollectionId: primaryCol?.id,
      primaryReadyCollectionTitle: primaryCol?.title,
      assistantSummary,
      errorBannerMessage: `${unsavedMemories.length} memor${unsavedMemories.length === 1 ? 'y' : 'ies'} could not be saved. Click Retry Save to save without duplicates.`,
      lastUndoSnapshot: undoSnapshot,
    });
  }

  return emitState({
    phase: 'ready',
    phaseLabel: 'Memory added',
    primaryReadyCollectionId: primaryCol?.id,
    primaryReadyCollectionTitle: primaryCol?.title,
    assistantSummary,
    errorBannerMessage: hasAnalysisFailures
      ? `${itemStatuses.filter((s) => s.status === 'failed').length} item(s) could not be analyzed by Gemini. Original files remain ready to retry or save manually.`
      : undefined,
    lastUndoSnapshot: undoSnapshot,
  });
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
