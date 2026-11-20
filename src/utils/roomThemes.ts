import {
  GalleryLayoutMode,
  Memory,
  MemoryConnection,
  MemoryConnectionType,
  MemoryMediaType,
  Room,
  RoomDecorativeStyle,
} from '../types/museum';

export interface RoomVisualThemeProfile {
  categoryKey: string;
  themeTitle: string;
  atmosphereBadge: string;
  decorativeNote: string;
  decorativeMotifLabel: string;
  headerBgHex: string;
  headerBorderHex: string;
  galleryCanvasBgHex: string;
  wallExhibitionBgHex: string;
  alcoveWallHex: string;
  frameOuterHex: string;
  frameMatHex: string;
  accentHex: string;
  plaqueBgHex: string;
  plaqueTextHex: string;
  defaultLayout: GalleryLayoutMode;
  decorativeStyle: RoomDecorativeStyle;
  lightingSummary: string;
}

export const GALLERY_LAYOUT_OPTIONS: {
  id: GalleryLayoutMode;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'masonry',
    label: '1. Masonry Gallery',
    shortLabel: 'Masonry',
    description:
      'Expressive staggered columns with varied proportions and balanced spacing.',
  },
  {
    id: 'grid',
    label: '2. Grid Gallery',
    shortLabel: 'Grid',
    description:
      'Consistent, organized museum grid for structured collection browsing.',
  },
  {
    id: 'timeline',
    label: '3. Timeline Gallery',
    shortLabel: 'Timeline',
    description:
      'Chronological exhibition grouped by year & month (handles undated items gracefully).',
  },
  {
    id: 'scrapbook',
    label: '4. Scrapbook Gallery',
    shortLabel: 'Scrapbook',
    description:
      'Personal album aesthetic with archival paper textures, notes, and corner mounts.',
  },
  {
    id: 'wall',
    label: '5. Wall Gallery',
    shortLabel: 'Wall',
    description:
      'Framed museum wall arrangement with gallery spotlights and focal groupings.',
  },
  {
    id: 'carousel',
    label: '6. Carousel Gallery',
    shortLabel: 'Carousel',
    description:
      'Single-exhibit spotlight stage with curated sequence navigation.',
  },
];

export const EXHIBIT_TYPE_LABELS: Record<
  MemoryMediaType,
  { label: string; badgeLabel: string; pluralLabel: string }
> = {
  image: {
    label: 'Photograph',
    badgeLabel: 'Framed Photograph',
    pluralLabel: 'Photographs',
  },
  video: {
    label: 'Video',
    badgeLabel: 'Video Screen Exhibit',
    pluralLabel: 'Videos',
  },
  audio: {
    label: 'Audio Memory',
    badgeLabel: 'Audio Recording',
    pluralLabel: 'Audio Memories',
  },
  chat: {
    label: 'Chat Excerpt',
    badgeLabel: 'Conversation Exhibit',
    pluralLabel: 'Chat Excerpts',
  },
  document: {
    label: 'Document',
    badgeLabel: 'Archival Document',
    pluralLabel: 'Documents',
  },
  story: {
    label: 'Written Story / Letter',
    badgeLabel: 'Written Narrative',
    pluralLabel: 'Stories & Letters',
  },
  certificate: {
    label: 'Certificate / Achievement',
    badgeLabel: 'Formal Certificate',
    pluralLabel: 'Certificates',
  },
};

export function getRoomVisualThemeProfile(room: Room): RoomVisualThemeProfile {
  const idLower = (room.id || '').toLowerCase();
  const nameLower = (room.name || '').toLowerCase();
  const themeLower = (room.theme || '').toLowerCase();

  // 1. Childhood: Warm amber lighting, nostalgic photographs, handwritten notes, playful decorative objects
  if (
    idLower.includes('childhood') ||
    nameLower.includes('childhood') ||
    themeLower.includes('cedar') ||
    room.decorativeStyle === 'playful_nostalgia'
  ) {
    return {
      categoryKey: 'childhood',
      themeTitle: room.theme || 'Warm Cedar & Sunlit Meadow',
      atmosphereBadge: 'Warm Amber Glow · Handwritten Notes & Early Keepsakes',
      decorativeNote:
        'Field Notebook Margin: “Summer afternoons measured by treehouse shadows & folded paper boats.”',
      decorativeMotifLabel: 'Cedar Treehouse & Paper Boat Keepsake',
      headerBgHex: '#FAF3E6',
      headerBorderHex: '#E4CFAF',
      galleryCanvasBgHex: '#FFFCF6',
      wallExhibitionBgHex: '#3A2618',
      alcoveWallHex: room.wallTintHex || '#47301E',
      frameOuterHex: '#5C3D24',
      frameMatHex: '#FAF4E8',
      accentHex: room.accentColor || '#D6A15D',
      plaqueBgHex: '#2C1E14',
      plaqueTextHex: '#FDE68A',
      defaultLayout: room.galleryLayout || 'scrapbook',
      decorativeStyle: 'playful_nostalgia',
      lightingSummary: 'Warm Amber Lantern Light (2900K)',
    };
  }

  // 2. Travels: Landscape imagery, map-inspired details, destination labels, adventurous colour palette
  if (
    idLower.includes('travel') ||
    nameLower.includes('travel') ||
    themeLower.includes('travel') ||
    room.decorativeStyle === 'compass_atlas'
  ) {
    return {
      categoryKey: 'travels',
      themeTitle: room.theme || 'Travel Blue & Travertine',
      atmosphereBadge: 'Cartographic Atlas · Destination Coordinates & Horizons',
      decorativeNote:
        'Wayfinder Loggia · N 40° 38′ / E 14° 36′ · Mediterranean & Alpine Passages',
      decorativeMotifLabel: 'Brass Compass & Cartographic Plinth',
      headerBgHex: '#F2F5F7',
      headerBorderHex: '#CEDAE2',
      galleryCanvasBgHex: '#FCFBF9',
      wallExhibitionBgHex: '#24313A',
      alcoveWallHex: room.wallTintHex || '#2A3944',
      frameOuterHex: '#384955',
      frameMatHex: '#F5F2EB',
      accentHex: room.accentColor || '#6E8FA6',
      plaqueBgHex: '#1F2B33',
      plaqueTextHex: '#E9D4B1',
      defaultLayout: room.galleryLayout || 'masonry',
      decorativeStyle: 'compass_atlas',
      lightingSummary: 'Crisp Coastal Daylight & Travertine Wash',
    };
  }

  // 3. Friendships: Lively photographs, conversational memories, scrapbook-inspired details, social storytelling
  if (
    idLower.includes('friend') ||
    nameLower.includes('friend') ||
    themeLower.includes('driftwood') ||
    room.decorativeStyle === 'scrapbook_salon'
  ) {
    return {
      categoryKey: 'friendships',
      themeTitle: room.theme || 'Coastal Amber & Driftwood',
      atmosphereBadge: 'Scrapbook Salon · Lively Snapshots & Shared Conversations',
      decorativeNote:
        'Shared Folklore: Instant frames, road-trip margin notes, and late-night conversations.',
      decorativeMotifLabel: 'Coastal Bonfire & Polaroid Salon',
      headerBgHex: '#FAF1E8',
      headerBorderHex: '#E5CEBC',
      galleryCanvasBgHex: '#FFFDF9',
      wallExhibitionBgHex: '#3D271D',
      alcoveWallHex: room.wallTintHex || '#462C20',
      frameOuterHex: '#6B422B',
      frameMatHex: '#FFF9F0',
      accentHex: room.accentColor || '#C26D3A',
      plaqueBgHex: '#2E1D15',
      plaqueTextHex: '#FCD392',
      defaultLayout: room.galleryLayout || 'scrapbook',
      decorativeStyle: 'scrapbook_salon',
      lightingSummary: 'Driftwood Bonfire & Sunset Amber',
    };
  }

  // 4. Family: Warm lighting, family portraits, meaningful dates, connected family stories
  if (
    idLower.includes('family') ||
    nameLower.includes('family') ||
    themeLower.includes('walnut') ||
    room.decorativeStyle === 'heirloom_hearth'
  ) {
    return {
      categoryKey: 'family',
      themeTitle: room.theme || 'Heirloom Walnut & Hearth',
      atmosphereBadge: 'Heirloom Hearth · Family Portraits, Dates & Lineage Stories',
      decorativeNote:
        'Generational Ledger: Connected stories passed down around the family table.',
      decorativeMotifLabel: 'Heirloom Walnut Table & Lineage Hearth',
      headerBgHex: '#F7EFE4',
      headerBorderHex: '#DFCEB9',
      galleryCanvasBgHex: '#FFFCF6',
      wallExhibitionBgHex: '#332217',
      alcoveWallHex: room.wallTintHex || '#3B2618',
      frameOuterHex: '#493629',
      frameMatHex: '#F7EFE2',
      accentHex: room.accentColor || '#854D27',
      plaqueBgHex: '#271B12',
      plaqueTextHex: '#E9D4B1',
      defaultLayout: room.galleryLayout || 'wall',
      decorativeStyle: 'heirloom_hearth',
      lightingSummary: 'Warm Hearth & Heirloom Walnut Spotlight',
    };
  }

  // 5. Achievements: Certificates, milestones, awards, and elegant exhibition-style displays
  if (
    idLower.includes('achieve') ||
    nameLower.includes('achieve') ||
    themeLower.includes('brass') ||
    room.decorativeStyle === 'laurel_monograph'
  ) {
    return {
      categoryKey: 'achievements',
      themeTitle: room.theme || 'Burnished Brass & Alabaster',
      atmosphereBadge: 'Formal Exhibition Hall · Certificates, Awards & Milestones',
      decorativeNote:
        'Permanent Accession: Double-matted certificates, monographs, and enduring milestones.',
      decorativeMotifLabel: 'Burnished Brass Seal & Alabaster Plinth',
      headerBgHex: '#F9F5EB',
      headerBorderHex: '#E2D5B8',
      galleryCanvasBgHex: '#FFFEFA',
      wallExhibitionBgHex: '#27231F',
      alcoveWallHex: room.wallTintHex || '#2E2822',
      frameOuterHex: '#8C6223',
      frameMatHex: '#FFFCF6',
      accentHex: room.accentColor || '#A16207',
      plaqueBgHex: '#1F1B17',
      plaqueTextHex: '#FDE68A',
      defaultLayout: room.galleryLayout || 'wall',
      decorativeStyle: 'laurel_monograph',
      lightingSummary: 'Focused Gallery Pin-Spot & Brass Reflection',
    };
  }

  // 6. College Years: Campus photographs, projects, friendships, event memories, personal milestones
  if (
    idLower.includes('college') ||
    nameLower.includes('college') ||
    themeLower.includes('collegiate') ||
    room.decorativeStyle === 'campus_quadrangle'
  ) {
    return {
      categoryKey: 'college-years',
      themeTitle: room.theme || 'Collegiate Sage & Parchment',
      atmosphereBadge: 'Campus Quadrangle · Studios, Projects & Seminar Years',
      decorativeNote:
        'Academic Folio: Late-night studio charrettes, campus quadrangles, and commencement milestones.',
      decorativeMotifLabel: 'Archival Folio Stack & Studio Lamp',
      headerBgHex: '#F2F4EE',
      headerBorderHex: '#D3DBC9',
      galleryCanvasBgHex: '#FCFBF7',
      wallExhibitionBgHex: '#293329',
      alcoveWallHex: room.wallTintHex || '#2F3B30',
      frameOuterHex: '#4A5847',
      frameMatHex: '#F7F4EC',
      accentHex: room.accentColor || '#87977C',
      plaqueBgHex: '#212921',
      plaqueTextHex: '#E9D4B1',
      defaultLayout: room.galleryLayout || 'timeline',
      decorativeStyle: 'campus_quadrangle',
      lightingSummary: 'Library Parchment & Sage Clerestory Light',
    };
  }

  // 7. Special Moments & Celebrations: Celebrations, important occasions, and curated highlights
  if (
    idLower.includes('special') ||
    idLower.includes('celeb') ||
    nameLower.includes('special') ||
    nameLower.includes('celeb') ||
    themeLower.includes('rose') ||
    room.decorativeStyle === 'lantern_conservatory'
  ) {
    return {
      categoryKey: 'special-moments',
      themeTitle: room.theme || 'Dusty Rose & Lantern Glow',
      atmosphereBadge: 'Lantern Conservatory · Celebrations, Vows & Highlights',
      decorativeNote:
        'Evening Salon: Curated highlights illuminated by courtyard lanterns and warm toasts.',
      decorativeMotifLabel: 'Courtyard Paper Lantern & Conservatory Glass',
      headerBgHex: '#FAF1EF',
      headerBorderHex: '#E6CFCB',
      galleryCanvasBgHex: '#FFFDFB',
      wallExhibitionBgHex: '#3B2626',
      alcoveWallHex: room.wallTintHex || '#422929',
      frameOuterHex: '#6E4542',
      frameMatHex: '#FFF8F6',
      accentHex: room.accentColor || '#C98D87',
      plaqueBgHex: '#2B1B1B',
      plaqueTextHex: '#F9DEC9',
      defaultLayout: room.galleryLayout || 'carousel',
      decorativeStyle: 'lantern_conservatory',
      lightingSummary: 'Rose-Gold Paper Lantern Twilight',
    };
  }

  // 8. Hobbies / Personal Milestones / Everyday Memories / Future Dreams / Custom Rooms
  return {
    categoryKey: idLower || 'custom',
    themeTitle: room.theme || 'Warm Ivory & Walnut',
    atmosphereBadge: `${room.theme || 'Curated Gallery'} · Personal Exhibition Wing`,
    decorativeNote:
      room.curatorQuote ||
      '“Every memory preserved with care becomes an enduring piece of personal architecture.”',
    decorativeMotifLabel: 'Sculptural Plinth & Botanical Press',
    headerBgHex: '#F6F1E8',
    headerBorderHex: '#E8DED0',
    galleryCanvasBgHex: '#FFFCF6',
    wallExhibitionBgHex: '#33261C',
    alcoveWallHex: room.wallTintHex || '#3B2A1E',
    frameOuterHex: '#493629',
    frameMatHex: '#FAF4E8',
    accentHex: room.accentColor || '#D6A15D',
    plaqueBgHex: '#27231F',
    plaqueTextHex: '#E9D4B1',
    defaultLayout: room.galleryLayout || 'grid',
    decorativeStyle: room.decorativeStyle || 'botanical_atelier',
    lightingSummary: 'Museum Golden-Hour Gallery Wash',
  };
}

/**
 * Generates grounded, evidence-based memory connection suggestions strictly from
 * information actually present in the user's memory records (never inventing dates,
 * identities, locations, or events).
 */
export function generateGroundedMemoryConnections(
  memories: Memory[],
  rooms: Room[],
  focusRoomId?: string | null,
  existingConnections: MemoryConnection[] = [],
): MemoryConnection[] {
  const suggestions: MemoryConnection[] = [];
  const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

  const existingPairs = new Set(
    existingConnections.map((c) =>
      [c.sourceMemoryId, c.targetMemoryId].sort().join('::'),
    ),
  );

  // Prioritize pairs where at least one memory is in focusRoomId (if provided)
  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const m1 = memories[i];
      const m2 = memories[j];

      if (
        focusRoomId &&
        m1.roomId !== focusRoomId &&
        m2.roomId !== focusRoomId
      ) {
        continue;
      }

      const pairKey = [m1.id, m2.id].sort().join('::');
      if (existingPairs.has(pairKey)) continue;

      const r1Name = roomMap.get(m1.roomId) || m1.roomId;
      const r2Name = roomMap.get(m2.roomId) || m2.roomId;
      const isCrossRoom = m1.roomId !== m2.roomId;

      // 1. Check explicitly identified shared people
      const p1 = (m1.people || []).map((p) => p.trim()).filter(Boolean);
      const p2 = (m2.people || []).map((p) => p.trim()).filter(Boolean);
      const sharedPeople = p1.filter((person) =>
        p2.some((other) => other.toLowerCase() === person.toLowerCase()),
      );

      // 2. Check shared location tokens (excluding generic "Personal Archive")
      const loc1 = (m1.location || '').trim();
      const loc2 = (m2.location || '').trim();
      const hasValidLoc =
        loc1 &&
        loc2 &&
        loc1.toLowerCase() !== 'personal archive' &&
        loc2.toLowerCase() !== 'personal archive';
      const locTokens1 = loc1
        .toLowerCase()
        .split(/[,/\s]+/)
        .filter((t) => t.length >= 4);
      const locTokens2 = loc2
        .toLowerCase()
        .split(/[,/\s]+/)
        .filter((t) => t.length >= 4);
      const sharedLocationToken = hasValidLoc
        ? locTokens1.find((t) => locTokens2.includes(t))
        : undefined;

      // 3. Check shared tags
      const t1 = (m1.tags || []).map((t) => t.trim()).filter(Boolean);
      const t2 = (m2.tags || []).map((t) => t.trim()).filter(Boolean);
      const sharedTags = t1.filter((tag) =>
        t2.some(
          (other) =>
            other.toLowerCase() === tag.toLowerCase() &&
            !['uploaded', 'personal upload', 'image', 'video', 'audio', 'document'].includes(
              other.toLowerCase(),
            ),
        ),
      );

      // 4. Check exact date or same year
      const exactSameDate =
        Boolean(m1.date && m2.date) && m1.date === m2.date;
      const sameYear =
        Boolean(m1.year && m2.year) && m1.year === m2.year;

      let relationshipType: MemoryConnectionType | null = null;
      let relationshipLabel = '';
      const evidenceParts: string[] = [];

      if (exactSameDate && (sharedLocationToken || sharedPeople.length > 0)) {
        relationshipType = 'same_event';
        relationshipLabel = `Memories from the Same Day (${m1.date})`;
        evidenceParts.push(`Both records carry the exact date ${m1.date}`);
      }

      if (sharedPeople.length > 0) {
        if (!relationshipType) {
          relationshipType = isCrossRoom ? 'cross_room' : 'shared_people';
          relationshipLabel = `Shared People: ${sharedPeople.join(', ')}`;
        }
        evidenceParts.push(
          `Explicitly lists ${sharedPeople.join(', ')} in both memories`,
        );
      }

      if (sharedLocationToken) {
        if (!relationshipType) {
          relationshipType = isCrossRoom ? 'cross_room' : 'shared_place';
          relationshipLabel = `Connected Place (${loc1} & ${loc2})`;
        }
        evidenceParts.push(
          `Shared location reference ("${loc1}" and "${loc2}")`,
        );
      }

      if (sharedTags.length > 0) {
        if (!relationshipType) {
          relationshipType = isCrossRoom ? 'cross_room' : 'related_story';
          relationshipLabel = `Related Theme: ${sharedTags.join(', ')}`;
        }
        evidenceParts.push(
          `Shared curatorial tags (${sharedTags.join(', ')})`,
        );
      }

      if (sameYear && (sharedPeople.length > 0 || sharedTags.length > 0 || sharedLocationToken)) {
        evidenceParts.push(`Both recorded in ${m1.year}`);
      } else if (sameYear && !relationshipType && m1.roomId === m2.roomId) {
        relationshipType = 'time_period';
        relationshipLabel = `Same Era in ${r1Name} (${m1.year})`;
        evidenceParts.push(
          `Both memories in ${r1Name} are dated to ${m1.year}`,
        );
      }

      if (relationshipType && evidenceParts.length > 0) {
        if (isCrossRoom) {
          evidenceParts.push(`Bridges ${r1Name} and ${r2Name}`);
        }
        suggestions.push({
          id: `conn-sug-${m1.id}-${m2.id}`,
          sourceMemoryId: m1.id,
          targetMemoryId: m2.id,
          relationshipType,
          relationshipLabel,
          evidenceReason: `${evidenceParts.join(' · ')}.`,
          status: 'suggested',
          providerNote: 'Grounded Metadata Evidence Analyzer',
        });
        existingPairs.add(pairKey);
      }

      if (suggestions.length >= 8) break;
    }
    if (suggestions.length >= 8) break;
  }

  return suggestions;
}
