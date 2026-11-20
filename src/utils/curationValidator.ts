import {
  CHILDHOOD_WORLD_LOCATION_CATALOGUE,
  ChildhoodWorldLocationId,
  CuratedOrganizationProposedCollection,
  CuratedOrganizationProposedConnection,
  MemoryAnalysisReport,
  ParsedChatExport,
  ParsedChatMessage,
} from '../types/curation';
import {
  Collection,
  Memory,
  MemoryConnection,
  MemoryMediaType,
} from '../types/museum';

export const UNSORTED_COLLECTION_ID = 'col_unsorted_memories';
export const UNSORTED_COLLECTION_TITLE = 'Unsorted Memories';

const GENERIC_WEAK_TOKENS = new Set([
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
  'from',
  'into',
  'tree',
  'trees',
  'car',
  'cars',
  'sky',
  'sun',
  'day',
  'night',
  'home',
  'house',
  'room',
  'photo',
  'picture',
  'image',
  'video',
  'audio',
  'file',
  'memory',
  'memories',
  'story',
  'moment',
  'moments',
  'good',
  'nice',
  'happy',
  'smile',
  'smiling',
  'people',
  'person',
  'child',
  'kids',
  'outdoor',
  'indoor',
  'grass',
  'wall',
  'table',
  'chair',
  'light',
  'warm',
  'old',
  'new',
  'life',
  'time',
  'year',
  'blue',
  'green',
  'red',
  'white',
  'black',
]);

const MELODRAMATIC_TITLE_BLOCKLIST =
  /\b(destiny|eternal\s+soul|broken\s+heart|ghosts?\s+of|whispering\s+shadows|fated|miracle\s+child|forgotten\s+kingdom)\b/i;

const VALID_LOCATION_IDS = new Set<ChildhoodWorldLocationId>(
  Object.keys(CHILDHOOD_WORLD_LOCATION_CATALOGUE) as ChildhoodWorldLocationId[],
);

const SENSITIVE_RECONSTRUCTION_KEYWORDS =
  /\b(portrait|selfie|face|wedding|hospital|memorial|funeral|passed\s+away|grave|childhood\s+bedroom\s+recreation|specific\s+person|my\s+mom|my\s+dad|mother|father|grandma|grandpa|grandmother|grandfather)\b/i;

/**
 * Deterministic multi-format parser for personal chat exports.
 * Strictly preserves message order, sender names, and original timestamps without fabricating lines.
 */
export function parseChatExportText(
  rawText: string,
  fileName?: string,
): ParsedChatExport {
  const normalized = (rawText || '').replace(/\r\n/g, '\n').replace(/\u200e/g, '').trim();
  if (!normalized) {
    return {
      formatDetected: 'plain',
      participants: [],
      messages: [],
      warnings: ['Uploaded chat export was empty.'],
    };
  }

  // 1. Try JSON array or { messages: [...] }
  if (
    normalized.startsWith('{') ||
    normalized.startsWith('[') ||
    /\.json$/i.test(fileName || '')
  ) {
    try {
      const parsedJson = JSON.parse(normalized);
      const rawArray = Array.isArray(parsedJson)
        ? parsedJson
        : Array.isArray(parsedJson?.messages)
          ? parsedJson.messages
          : null;
      if (rawArray) {
        const messages: ParsedChatMessage[] = [];
        const participants = new Set<string>();
        rawArray.forEach((entry: any, idx: number) => {
          if (!entry || typeof entry !== 'object') return;
          const sender = String(
            entry.sender || entry.sender_name || entry.author || entry.from || entry.user || '',
          ).trim();
          const text = String(
            entry.text || entry.content || entry.message || entry.body || '',
          ).trim();
          const tsRaw = entry.timestamp || entry.date || entry.time || entry.timestamp_ms;
          const timestamp =
            typeof tsRaw === 'number' && Number.isFinite(tsRaw)
              ? new Date(tsRaw).toISOString()
              : typeof tsRaw === 'string' && tsRaw.trim()
                ? tsRaw.trim()
                : undefined;
          if (!text && !sender) return;
          const safeSender = sender || 'Participant';
          participants.add(safeSender);
          messages.push({
            sender: safeSender,
            text: text || '(attachment)',
            timestamp,
            orderIndex: idx,
          });
        });
        if (messages.length > 0) {
          return {
            formatDetected: 'json',
            participants: Array.from(participants),
            messages,
            warnings: [],
          };
        }
      }
    } catch {
      // Fall through to line-based parsing
    }
  }

  const lines = normalized.split('\n');
  const messages: ParsedChatMessage[] = [];
  const participants = new Set<string>();
  const warnings: string[] = [];
  let detectedFormat: ParsedChatExport['formatDetected'] = 'plain';

  // Pattern A: WhatsApp iOS: [12/06/2018, 16:42:10] Sender: Text
  const whatsappIosRe =
    /^\[([^\]]{4,40})\]\s+([^:]{1,64}?):\s*(.*)$/;
  // Pattern B: WhatsApp Android: 12/06/2018, 16:42 - Sender: Text
  const whatsappAndroidRe =
    /^(\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{2,4}(?:,?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)?)\s+[-–]\s+([^:]{1,64}?):\s*(.*)$/;
  // Pattern C: iMessage / Apple export: Sender (2019-07-04 14:22): Text  OR  2019-07-04 14:22 | Sender: Text
  const imessageBracketRe =
    /^([^:()\[\]]{1,54}?)\s+\(([^)]{4,36})\):\s*(.*)$/;
  const pipeDelimitedRe =
    /^([^|]{4,36})\s*\|\s*([^:]{1,54}?):\s*(.*)$/;
  // Pattern D: Simple script/transcript: Sender: Text
  const simpleSpeakerRe = /^([A-Za-z][A-Za-z0-9 _.'-]{0,42}):\s+(.+)$/;

  const isWhatsAppSystemNotice = (text: string) =>
    /messages and calls are end-to-end encrypted|created group|added you|changed the subject|left$/i.test(
      text,
    );

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let match: RegExpMatchArray | null = null;

    if ((match = line.match(whatsappIosRe))) {
      detectedFormat = 'whatsapp';
      const ts = match[1].trim();
      const sender = match[2].trim();
      const text = match[3];
      if (isWhatsAppSystemNotice(text)) continue;
      participants.add(sender);
      messages.push({
        sender,
        text,
        timestamp: ts,
        orderIndex: messages.length,
        rawLine: line,
      });
      continue;
    }

    if ((match = line.match(whatsappAndroidRe))) {
      detectedFormat = 'whatsapp';
      const ts = match[1].trim();
      const sender = match[2].trim();
      const text = match[3];
      if (isWhatsAppSystemNotice(text)) continue;
      participants.add(sender);
      messages.push({
        sender,
        text,
        timestamp: ts,
        orderIndex: messages.length,
        rawLine: line,
      });
      continue;
    }

    if ((match = line.match(imessageBracketRe))) {
      detectedFormat = 'imessage';
      const sender = match[1].trim();
      const ts = match[2].trim();
      const text = match[3];
      participants.add(sender);
      messages.push({
        sender,
        text,
        timestamp: ts,
        orderIndex: messages.length,
        rawLine: line,
      });
      continue;
    }

    if ((match = line.match(pipeDelimitedRe))) {
      detectedFormat = 'imessage';
      const ts = match[1].trim();
      const sender = match[2].trim();
      const text = match[3];
      participants.add(sender);
      messages.push({
        sender,
        text,
        timestamp: ts,
        orderIndex: messages.length,
        rawLine: line,
      });
      continue;
    }

    if ((match = line.match(simpleSpeakerRe))) {
      if (detectedFormat === 'plain') detectedFormat = 'transcript';
      const sender = match[1].trim();
      const text = match[2].trim();
      // Guard against URLs like "https://..." matching "https:"
      if (!/^https?$/i.test(sender)) {
        participants.add(sender);
        messages.push({
          sender,
          text,
          orderIndex: messages.length,
          rawLine: line,
        });
        continue;
      }
    }

    // Continuation of previous message in chronological order
    if (messages.length > 0) {
      messages[messages.length - 1].text = `${messages[messages.length - 1].text}\n${line}`;
    } else {
      warnings.push(`Unstructured leading line preserved verbatim: "${line.slice(0, 60)}"`);
      messages.push({
        sender: 'Transcript',
        text: line,
        orderIndex: messages.length,
        rawLine: line,
      });
      participants.add('Transcript');
    }
  }

  return {
    formatDetected: detectedFormat,
    participants: Array.from(participants),
    messages,
    warnings,
  };
}

/**
 * Resolves and strictly validates a Childhood Room or Childhood Park placement against the known catalog.
 * Ensures non-blocking safe walkway clearance and valid target mapping.
 */
export function validateLocationPlacement(
  requestedLocation: string | undefined,
  mediaType: MemoryMediaType,
  preferredOffset?: {
    x?: number;
    y?: number;
    confidenceScore?: number;
    title?: string;
    extractedText?: string;
  },
): {
  locationId: ChildhoodWorldLocationId;
  catalogEntry: (typeof CHILDHOOD_WORLD_LOCATION_CATALOGUE)[ChildhoodWorldLocationId];
  offset: { x: number; y: number };
} {
  let locationId: ChildhoodWorldLocationId = 'keepsake_corner';

  if (
    typeof preferredOffset?.confidenceScore === 'number' &&
    preferredOffset.confidenceScore < 0.42
  ) {
    locationId = 'keepsake_corner';
  } else if (
    requestedLocation &&
    VALID_LOCATION_IDS.has(requestedLocation as ChildhoodWorldLocationId)
  ) {
    locationId = requestedLocation as ChildhoodWorldLocationId;
  } else {
    // Sensible deterministic defaults by media type
    switch (mediaType) {
      case 'video':
        locationId = 'outdoor_cinema';
        break;
      case 'audio':
        locationId = 'memory_radio';
        break;
      case 'document':
      case 'certificate':
        locationId = 'study_corner';
        break;
      case 'chat':
        locationId = 'treehouse';
        break;
      case 'story':
        locationId = 'bedroom';
        break;
      case 'image':
      default:
        locationId = 'memory_garden';
        break;
    }
  }

  const catalogEntry = CHILDHOOD_WORLD_LOCATION_CATALOGUE[locationId];
  const safeOffset = {
    x:
      typeof preferredOffset?.x === 'number' && Number.isFinite(preferredOffset.x)
        ? Math.max(-0.6, Math.min(0.6, preferredOffset.x))
        : 0,
    y:
      typeof preferredOffset?.y === 'number' && Number.isFinite(preferredOffset.y)
        ? Math.max(-0.4, Math.min(0.4, preferredOffset.y))
        : 0,
  };

  return { locationId, catalogEntry, offset: safeOffset };
}

export function requiresSensitive3DApproval(reportOrText: {
  promptText?: string;
  people?: string[];
  verifiedFacts?: string[];
}): boolean {
  if ((reportOrText.people || []).length > 0) return true;
  const combined = `${reportOrText.promptText || ''} ${(reportOrText.verifiedFacts || []).join(' ')}`;
  return SENSITIVE_RECONSTRUCTION_KEYWORDS.test(combined);
}

/**
 * Validates that a cross-memory relationship link is backed by concrete shared evidence
 * and NOT a trivial stopword/generic visual cue like "tree" or "car".
 */
export function validateEvidenceConnection(
  source: Pick<
    Memory,
    'id' | 'title' | 'date' | 'year' | 'location' | 'people' | 'tags' | 'curationReport'
  >,
  target: Pick<
    Memory,
    'id' | 'title' | 'date' | 'year' | 'location' | 'people' | 'tags' | 'curationReport'
  >,
  candidate: {
    relationshipType: MemoryConnection['relationshipType'];
    relationshipLabel: string;
    evidenceReason: string;
  },
): { valid: boolean; reason: string } {
  if (!source || !target || source.id === target.id) {
    return { valid: false, reason: 'Source and target must be distinct memories.' };
  }

  const evidenceText = (candidate.evidenceReason || '').trim();
  if (evidenceText.length < 14) {
    return { valid: false, reason: 'Evidence explanation is too brief or vague.' };
  }

  // Reject evidence relying solely on generic tokens like "both have a tree" or "shared car"
  const meaningfulEvidenceTokens = evidenceText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length >= 3 && !GENERIC_WEAK_TOKENS.has(tok));

  if (meaningfulEvidenceTokens.length < 2) {
    return {
      valid: false,
      reason: 'Rejected generic visual similarity with no concrete contextual evidence.',
    };
  }

  // Check concrete factual overlap OR shared entity overlap
  const srcPeople = new Set((source.people || []).map((p) => p.toLowerCase().trim()).filter(Boolean));
  const tgtPeople = (target.people || []).map((p) => p.toLowerCase().trim()).filter(Boolean);
  const sharedPerson = tgtPeople.some((p) => srcPeople.has(p));

  const srcLoc = (source.location || '').toLowerCase().trim();
  const tgtLoc = (target.location || '').toLowerCase().trim();
  const sharedPlace =
    Boolean(srcLoc && tgtLoc) &&
    !['unspecified', 'unknown', 'uploaded archive', 'home'].includes(srcLoc) &&
    (srcLoc === tgtLoc || srcLoc.includes(tgtLoc) || tgtLoc.includes(srcLoc));

  const srcDate = (source.date || '').trim();
  const tgtDate = (target.date || '').trim();
  const sharedDate = Boolean(srcDate && tgtDate && srcDate === tgtDate);

  const srcTopics = new Set(
    [
      ...(source.tags || []),
      ...(source.curationReport?.topics || []),
      ...(source.curationReport?.explicitDates || []),
    ]
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length >= 3 && !GENERIC_WEAK_TOKENS.has(t)),
  );
  const tgtTopics = [
    ...(target.tags || []),
    ...(target.curationReport?.topics || []),
    ...(target.curationReport?.explicitDates || []),
  ]
    .map((t) => t.toLowerCase().trim())
    .filter((t) => t.length >= 3 && !GENERIC_WEAK_TOKENS.has(t));
  const sharedMeaningfulTopic = tgtTopics.some((t) => srcTopics.has(t));

  if (!sharedPerson && !sharedPlace && !sharedDate && !sharedMeaningfulTopic) {
    return {
      valid: false,
      reason:
        'Rejected ungrounded link: memories do not share verified people, place, explicit date, or meaningful topic.',
    };
  }

  return { valid: true, reason: evidenceText };
}

export function sanitizeCollectionTitle(rawTitle: string | undefined): string {
  const cleaned = (rawTitle || '').replace(/\s+/g, ' ').trim().slice(0, 72);
  if (!cleaned || MELODRAMATIC_TITLE_BLOCKLIST.test(cleaned)) {
    return UNSORTED_COLLECTION_TITLE;
  }
  return cleaned;
}

/**
 * Ensures every newly curated memory belongs cleanly to an evidence-backed collection
 * or safely falls back to "Unsorted Memories" rather than being forced into an invented theme.
 */
export function sanitizeAndOrganizeCollections(params: {
  proposedCollections: CuratedOrganizationProposedCollection[];
  memories: Memory[];
  existingCollections: Collection[];
}): Collection[] {
  const memoryById = new Map(params.memories.map((m) => [m.id, m]));
  const resultMap = new Map<string, Collection>();

  for (const col of params.existingCollections) {
    resultMap.set(col.id, {
      ...col,
      memoryIds: Array.from(new Set(col.memoryIds)),
    });
  }

  const assignedMemoryIds = new Set<string>();
  for (const existing of params.existingCollections) {
    existing.memoryIds.forEach((id) => assignedMemoryIds.add(id));
  }

  const paletteCycle = ['#D6A15D', '#B6854B', '#7C9366', '#6F8BA4', '#9E7B6B'];
  let paletteIdx = params.existingCollections.length;

  for (const prop of params.proposedCollections) {
    const validMemIds = Array.from(
      new Set((prop.memoryIds || []).filter((id) => memoryById.has(id))),
    );
    if (validMemIds.length === 0) continue;

    const safeTitle = sanitizeCollectionTitle(prop.title);
    const evidenceText = (prop.evidenceSummary || '').trim();
    const isStrongEvidence =
      safeTitle !== UNSORTED_COLLECTION_TITLE && evidenceText.length >= 10;

    if (!isStrongEvidence) {
      // Fall back to Unsorted Memories rather than forcing an invented grouping
      continue;
    }

    // Reuse existing collection if matching title (case-insensitive)
    const matchingExisting = Array.from(resultMap.values()).find(
      (c) => c.title.toLowerCase() === safeTitle.toLowerCase(),
    );

    const mediaTypesSet = new Set<MemoryMediaType>();
    const interactionsSet = new Set<string>();
    validMemIds.forEach((id) => {
      const m = memoryById.get(id);
      if (!m) return;
      const mt = m.type || m.mediaType || 'image';
      mediaTypesSet.add(mt);
      if (mt === 'video') interactionsSet.add('Video Screening');
      if (mt === 'audio') interactionsSet.add('Listening Station');
      if (mt === 'chat') interactionsSet.add('Archived Message Replay');
      if (mt === 'document' || mt === 'certificate' || mt === 'story') {
        interactionsSet.add('Journal & Archive Reader');
      }
      if (mt === 'image') interactionsSet.add('Framed Inspection');
    });

    const locValidation = validateLocationPlacement(
      prop.suggestedEnvironment,
      Array.from(mediaTypesSet)[0] || 'image',
    );

    if (matchingExisting) {
      matchingExisting.memoryIds = Array.from(
        new Set([...matchingExisting.memoryIds, ...validMemIds]),
      );
      matchingExisting.mediaTypes = Array.from(
        new Set([
          ...(matchingExisting.mediaTypes || []),
          ...Array.from(mediaTypesSet),
        ]),
      );
      matchingExisting.availableInteractions = Array.from(
        new Set([
          ...(matchingExisting.availableInteractions || []),
          ...Array.from(interactionsSet),
        ]),
      );
      validMemIds.forEach((id) => assignedMemoryIds.add(id));
    } else {
      const colId =
        prop.id && /^[a-zA-Z0-9_-]{4,64}$/.test(prop.id)
          ? prop.id
          : `col_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      resultMap.set(colId, {
        id: colId,
        title: safeTitle,
        subtitle:
          (prop.subtitle || '').trim().slice(0, 96) ||
          `${validMemIds.length} Curated Exhibit${validMemIds.length === 1 ? '' : 's'}`,
        curatorNote:
          (prop.curatorNote || '').trim() ||
          `Grouped automatically from verified archive cues.`,
        memoryIds: validMemIds,
        accentColor: paletteCycle[paletteIdx++ % paletteCycle.length],
        seasonTag: 'Auto-Curated',
        themeTag: locValidation.catalogEntry.label,
        evidenceSummary: evidenceText,
        suggestedEnvironment: locValidation.locationId,
        mediaTypes: Array.from(mediaTypesSet),
        availableInteractions: Array.from(interactionsSet),
        confidenceNote:
          (prop.confidenceNote || '').trim() ||
          'Organised directly from uploaded content cues.',
        isAutoGenerated: true,
        createdAt: new Date().toISOString(),
      });
      validMemIds.forEach((id) => assignedMemoryIds.add(id));
    }
  }

  // Ensure any newly added or unassigned memories with no collection go cleanly into Unsorted Memories
  const unassignedIds = params.memories
    .filter((m) => !assignedMemoryIds.has(m.id))
    .map((m) => m.id);

  if (unassignedIds.length > 0) {
    const existingUnsorted = resultMap.get(UNSORTED_COLLECTION_ID);
    const unsortedTypes = Array.from(
      new Set(
        unassignedIds
          .map((id) => memoryById.get(id))
          .filter((m): m is Memory => Boolean(m))
          .map((m) => m.type || m.mediaType || 'image'),
      ),
    );
    if (existingUnsorted) {
      existingUnsorted.memoryIds = Array.from(
        new Set([...existingUnsorted.memoryIds, ...unassignedIds]),
      );
      existingUnsorted.mediaTypes = Array.from(
        new Set([...(existingUnsorted.mediaTypes || []), ...unsortedTypes]),
      );
    } else {
      resultMap.set(UNSORTED_COLLECTION_ID, {
        id: UNSORTED_COLLECTION_ID,
        title: UNSORTED_COLLECTION_TITLE,
        subtitle: 'Personal items held safely without forced assumptions',
        curatorNote:
          'Items placed here lacked sufficient shared dates, places, or explicit evidence to force a narrower grouping. Rename, merge, or move anytime.',
        memoryIds: unassignedIds,
        accentColor: '#9E8C76',
        seasonTag: 'Unclassified Archive',
        themeTag: 'Heirloom Keepsake Vitrine',
        evidenceSummary:
          'Held in Unsorted Memories because evidence was ambiguous or standalone.',
        suggestedEnvironment: 'keepsake_corner',
        mediaTypes: unsortedTypes,
        availableInteractions: ['Archive Inspection'],
        confidenceNote:
          'Safe fallback collection — zero invented categories.',
        isAutoGenerated: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return Array.from(resultMap.values());
}

/**
 * Deterministic fallback analysis report builder when creating or normalizing grounded records.
 */
export function buildGroundedFallbackReport(params: {
  mediaCategory: MemoryMediaType;
  fileName: string;
  rawTextContent?: string;
  transcript?: string;
  audioKind?: 'music' | 'speech' | 'environmental';
  videoDurationSeconds?: number;
}): MemoryAnalysisReport {
  const parsedChat =
    params.mediaCategory === 'chat' && params.rawTextContent
      ? parseChatExportText(params.rawTextContent, params.fileName)
      : undefined;

  const cueText = `${params.fileName || ''} ${params.rawTextContent || ''} ${params.transcript || ''}`.toLowerCase();
  let inferredLocation: ChildhoodWorldLocationId | undefined;
  if (/bicycle|bike|cycling|pedal|trail/.test(cueText)) {
    inferredLocation = 'bicycle_trail';
  } else if (/treehouse|fort|ladder|friend|chat/.test(cueText) || params.mediaCategory === 'chat') {
    inferredLocation = 'treehouse';
  } else if (/garden|flower|swing|meadow/.test(cueText)) {
    inferredLocation = 'memory_garden';
  } else if (/study|desk|school|certificate|diploma|homework|exam/.test(cueText)) {
    inferredLocation = 'study_corner';
  } else if (/bedroom|bed|sleep|story|night/.test(cueText)) {
    inferredLocation = 'bedroom';
  }

  const placement = validateLocationPlacement(inferredLocation, params.mediaCategory);
  const verifiedFacts: string[] = [`Original file uploaded: ${params.fileName}`];
  if (params.videoDurationSeconds && params.videoDurationSeconds > 0) {
    verifiedFacts.push(`Video duration: ${Math.round(params.videoDurationSeconds)}s`);
  }
  if (parsedChat && parsedChat.messages.length > 0) {
    verifiedFacts.push(
      `Parsed ${parsedChat.messages.length} archived messages across participants: ${parsedChat.participants.join(', ') || 'Unknown'}`,
    );
  }
  if (params.transcript) {
    verifiedFacts.push('Audio transcript extracted from original recording.');
  }

  const aiInferences: string[] = [
    `Recommended placement in ${placement.catalogEntry.label} based on file format and contextual cues.`,
  ];

  return {
    analyzedBy: 'deterministic_fallback',
    analyzedAt: new Date().toISOString(),
    mediaCategory: params.mediaCategory,
    mainSubject: params.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Uploaded Memory',
    confidenceScore: inferredLocation ? 0.72 : 0.5,
    detectedObjects: inferredLocation === 'bicycle_trail' ? ['bicycle'] : [],
    detectedActivities: inferredLocation === 'bicycle_trail' ? ['cycling'] : [],
    sceneCues: [],
    extractedText:
      params.mediaCategory === 'document' || params.mediaCategory === 'story'
        ? params.rawTextContent?.slice(0, 4000)
        : undefined,
    explicitDates: [],
    topics: inferredLocation === 'bicycle_trail' ? ['cycling', 'bicycle'] : [],
    transcript: params.transcript,
    audioKind: params.audioKind,
    parsedChatMessages: parsedChat?.messages,
    verifiedFacts,
    aiInferences,
    uncertainInfo: [
      'Awaiting or saved without Gemini semantic interpretation; only directly readable file attributes are recorded as verified facts.',
    ],
    recommendedRoomId: 'childhood',
    recommendedLocationId: placement.locationId,
    recommendedDisplayObject: placement.catalogEntry.linkedObjectId,
    recommendedInteraction:
      placement.locationId === 'bicycle_trail'
        ? 'Bicycle Trail Ride & Photo Strip'
        : params.mediaCategory === 'video'
          ? 'Outdoor Cinema Video Player'
          : params.mediaCategory === 'audio'
            ? 'Memory Radio Audio Station'
            : params.mediaCategory === 'chat'
              ? 'Archived Conversation Replay'
              : params.mediaCategory === 'document' ||
                  params.mediaCategory === 'certificate' ||
                  params.mediaCategory === 'story'
                ? 'Study Desk & Journal Reader'
                : 'Framed Gallery Photo Viewer',
    recommendedReason: `Placed in ${placement.catalogEntry.label} based on media format and title cues.`,
    sensitiveReconstructionRequiresApproval: false,
    autoPlacedIn3D: true,
  };
}
