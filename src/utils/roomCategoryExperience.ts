import {
  BlueprintEnvironmentSpec,
  BlueprintExhibitFormatType,
  BlueprintExhibitInteractionType,
  BlueprintMemoryExhibitSpec,
  ImmersiveRoomBlueprint,
  MemorySanitizedContext,
  RoomCategoryKey,
  RoomDesignConfig,
  RoomMemoryVisualDataSummary,
  RoomStarterMemoryTemplate,
} from '../types/aiStudio';
import {
  ArtworkMotif,
  ExhibitionDisplayStyle,
  GalleryLayoutMode,
  Memory,
  MemoryMediaType,
  RoomDecorativeStyle,
} from '../types/museum';

export interface RoomCategoryExperienceProfile {
  key: RoomCategoryKey;
  label: string;
  shortBadge: string;
  subtitle: string;
  themeName: string;
  wallColorHex: string;
  floorTintHex: string;
  archColorHex: string;
  accentColorHex: string;
  lightingPreset:
    | 'golden_hour'
    | 'warm_salon'
    | 'moonlit_atrium'
    | 'daylight_gallery';
  lightIntensity: number;
  exhibitLayout: 'triptych' | 'salon_grid' | 'panoramic';
  decorations: 'botanical_olive' | 'sculptural_plinths' | 'minimalist';
  exhibitionStyle: ExhibitionDisplayStyle;
  galleryLayout: GalleryLayoutMode;
  decorativeStyle: RoomDecorativeStyle;
  featuredMotif: ArtworkMotif;
  curatorQuote: string;
  roomDescription: string;
  curatorRationale: string;
  interactive3DInstallations: string[];
  detectionKeywords: string[];
  emotionMetrics: Array<{
    theme: string;
    baseScore: number;
    colorHex: string;
    note: string;
  }>;
  starterMemories: RoomStarterMemoryTemplate[];
}

export const ROOM_CATEGORY_EXPERIENCE_PROFILES: Record<
  RoomCategoryKey,
  RoomCategoryExperienceProfile
> = {
  childhood: {
    key: 'childhood',
    label: 'Childhood & Early Wonder',
    shortBadge: 'Childhood Wonder',
    subtitle: 'A Sunlit Memory Park of Play Trails, Treehouse & Firsts',
    themeName: 'Sunlit Childhood Memory Park — Garden Trails, Play Grove & Treehouse',
    wallColorHex: '#FDF4E3',
    floorTintHex: '#EEDCC1',
    archColorHex: '#D8B589',
    accentColorHex: '#D6A15D',
    lightingPreset: 'golden_hour',
    lightIntensity: 2.35,
    exhibitLayout: 'salon_grid',
    decorations: 'sculptural_plinths',
    exhibitionStyle: 'memory_shelves',
    galleryLayout: 'scrapbook',
    decorativeStyle: 'playful_nostalgia',
    featuredMotif: 'treehouse_meadow',
    curatorQuote:
      'In the quiet corners of childhood, every afternoon felt infinite and every small object held a universe.',
    roomDescription:
      'An open-air, explorable Childhood Memory Park designed as a connected 3D world. Enter through a timber garden arbor onto a winding gravel memory trail, surrounded by soft meadow grass, flower beds, mature trees and warm late-afternoon light. The park includes a wooden treehouse and tyre swing, a first-bicycle trail, hopscotch and cricket play court, a small reflection pond with a timber bench, and a freestanding memory trellis. Keep a small home-and-play nook at the edge for bedroom keepsakes, storybooks and original childhood objects. Place original user memories contextually at the activities and places they belong to instead of presenting the experience as a conventional gallery.',
    curatorRationale:
      'The Childhood category should feel like entering a personal childhood park that can be explored like a gentle 3D memory experience. Prioritise a clear entrance, winding memory trail, garden landmarks, treehouse, swing, bicycle and play court. Keep a small home keepsake nook as a secondary destination. Use original photographs, videos, chats and stories as contextual memory links at the relevant places; never fabricate personal events or replace authentic media with AI-generated substitutes.',
    interactive3DInstallations: [
      'Open-Air Childhood Memory Park with Timber Entry Arbor and Winding Gravel Memory Trail',
      'Meadow Garden with Mature Trees, Flower Beds, Stepping Stones, Reflection Pond and Timber Bench',
      'Wooden Treehouse Grove with Climbable Ladder, Tyre Swing and Friendship Keepsakes',
      'First Bicycle Trail with Contextual Riding Memories and Milestone Displays',
      'Play Court with Hopscotch, Toy Train, Wooden Blocks and Cricket Set',
      'Freestanding Memory Trellis and Original Photo, Video, Audio and Story Playback Points',
      'Small Home Keepsake Nook with Storybooks, Teddy Bear and Childhood Objects',
    ],
    detectionKeywords: [
      'childhood',
      'child',
      'kid',
      'kids',
      'baby',
      'nursery',
      'early',
      'growing up',
      'school days',
      'elementary',
      'toy',
      'toys',
      'treehouse',
      'playground',
      'nostalgia',
      'young',
      'boyhood',
      'girlhood',
    ],
    emotionMetrics: [
      {
        theme: 'Nostalgic Wonder & Play',
        baseScore: 96,
        colorHex: '#D6A15D',
        note: 'High concentration of early discovery, imaginative play, and sunlit outdoor keepsakes.',
      },
      {
        theme: 'Home & Early Warmth',
        baseScore: 91,
        colorHex: '#E07A5F',
        note: 'Strong emotional anchoring around childhood home spaces, bedtime stories, and seasonal traditions.',
      },
      {
        theme: 'First Milestones',
        baseScore: 87,
        colorHex: '#81B29A',
        note: 'Chronological progression of first bicycles, school art projects, and backyard adventures.',
      },
      {
        theme: 'Tactile Keepsake Density',
        baseScore: 93,
        colorHex: '#C9A66B',
        note: 'Rich mix of physical artifacts, handwritten notes, and candid family snapshots.',
      },
    ],
    starterMemories: [
      {
        title: 'The Cedar Treehouse Blueprint & First Lantern',
        date: '2004-06-14',
        year: 2004,
        location: 'Backyard Oak Grove',
        category: 'Childhood Wonder',
        description:
          'Late afternoon sunlight filtering through oak leaves onto the rough-cut cedar planks of our summer hideout.',
        story:
          'We spent three whole Saturdays hoisting scrap cedar boards with a garden rope pulley. When the brass camp lantern finally lit up the rafters at dusk, it felt like we had built our own floating kingdom above the lawn.',
        tags: ['childhood', 'treehouse', 'summer', 'backyard', 'wonder'],
        people: ['Dad', 'Siblings'],
        type: 'image',
        motif: 'treehouse_meadow',
        palette: ['#F4D8AF', '#D38B52', '#5C3A21', '#FCE3B8'],
        frameStyle: 'walnut_classic',
      },
      {
        title: 'Paper Boats After the Monsoon Rain',
        date: '2005-08-22',
        year: 2005,
        location: 'Maple Street Curbside Stream',
        category: 'Playful Afternoon',
        description:
          'A fleet of folded notebook-paper boats racing past fallen autumn leaves in clear rainwater.',
        story:
          'Every time a sudden August downpour cleared, we ran outside with pages torn from old drawing pads. We named each paper vessel and followed them three blocks down the glistening pavement.',
        tags: ['childhood', 'paper-boats', 'rain', 'play', 'nostalgia'],
        people: ['Childhood Friends'],
        type: 'story',
        motif: 'paper_boats',
        palette: ['#E9F1F7', '#89A7C2', '#D6A15D', '#3B4F66'],
        frameStyle: 'floating_halo',
      },
      {
        title: 'First Summer Orchard Walk & Golden Hour',
        date: '2006-04-09',
        year: 2006,
        location: 'Sunlit Park Path',
        category: 'First Milestone',
        description:
          'A gleaming cherry-red bicycle frame resting beside the orchard path at golden hour.',
        story:
          'The exact moment I realized nobody was holding the back of the saddle anymore—the wind caught the handlebar ribbons and the whole park path opened up ahead.',
        tags: ['childhood', 'milestone', 'bicycle', 'park', 'freedom'],
        people: ['Mom', 'Dad'],
        type: 'image',
        motif: 'grandparents_orchard',
        palette: ['#F7E3C6', '#C85A32', '#6B8E63', '#2E2925'],
        frameStyle: 'champagne_brass',
      },
      {
        title: 'Rainy Sunday Storybook & Wooden Blocks',
        date: '2007-11-03',
        year: 2007,
        location: 'Attic Playroom',
        category: 'Home Keepsake',
        description:
          'Hand-painted wooden alphabet blocks stacked into a cathedral beside a dog-eared illustrated atlas.',
        story:
          'When November rain drummed against the skylight, the attic rug became an architectural studio of wooden blocks, watercolor tins, and hot cocoa.',
        tags: ['childhood', 'playroom', 'books', 'blocks', 'cozy'],
        people: ['Grandma'],
        type: 'document',
        motif: 'sunday_baking',
        palette: ['#F5E8D3', '#C9A66B', '#8C583A', '#3D2B1F'],
        frameStyle: 'vitrine_niche',
      },
    ],
  },

  travels: {
    key: 'travels',
    label: 'Voyages, Atlas & Horizons',
    shortBadge: 'World Voyages',
    subtitle: 'Distant Coastlines, Mountain Passes & Cartographic Notes',
    themeName: 'Coastal Travertine, Olive Slate & Cartographer Brass',
    wallColorHex: '#F3EFE6',
    floorTintHex: '#DDD4C3',
    archColorHex: '#8C9B8E',
    accentColorHex: '#5B8A72',
    lightingPreset: 'daylight_gallery',
    lightIntensity: 2.25,
    exhibitLayout: 'panoramic',
    decorations: 'botanical_olive',
    exhibitionStyle: 'immersive_panorama',
    galleryLayout: 'masonry',
    decorativeStyle: 'compass_atlas',
    featuredMotif: 'amalfi_arches',
    curatorQuote:
      'We travel not to escape life, but to let distant horizons redraw the map of who we are.',
    roomDescription:
      'An expansive 3D cartographic pavilion featuring a central brass armillary globe & compass rose plinth, vintage leather expedition trunks, panoramic horizon cyclorama lighting, and geographical memory data visualizations.',
    curatorRationale:
      'Gemini detected a Voyages & Horizons theme. The 3D room is configured with natural daylight gallery washes, a central brass cartography globe installation, and geographic route & era data representations.',
    interactive3DInstallations: [
      'Central 3D Brass Armillary Globe & Engraved Compass Plinth',
      'Vintage Leather Expedition Trunk & Open Atlas Lectern',
      'Curved Panoramic Horizon Cyclorama Illumination',
      '3D Geographic Route & Travel Memory Data Monolith',
    ],
    detectionKeywords: [
      'travel',
      'travels',
      'trip',
      'trips',
      'journey',
      'journeys',
      'voyage',
      'adventure',
      'adventures',
      'vacation',
      'holiday',
      'world',
      'atlas',
      'map',
      'explore',
      'abroad',
      'europe',
      'asia',
      'island',
      'coast',
    ],
    emotionMetrics: [
      {
        theme: 'Wanderlust & Discovery',
        baseScore: 95,
        colorHex: '#5B8A72',
        note: 'Strong geographical diversity across coastal, alpine, and historic urban destinations.',
      },
      {
        theme: 'Scenic Horizon Immersion',
        baseScore: 92,
        colorHex: '#4E8098',
        note: 'High ratio of wide-angle landscape vistas and golden-hour architectural studies.',
      },
      {
        theme: 'Cultural & Culinary Notes',
        baseScore: 86,
        colorHex: '#D6A15D',
        note: 'Rich field notes documenting local markets, train journeys, and coastal walks.',
      },
      {
        theme: 'Cartographic Continuity',
        baseScore: 89,
        colorHex: '#8C9B8E',
        note: 'Clear multi-year progression of expeditions and stamped travel ephemera.',
      },
    ],
    starterMemories: [
      {
        title: 'Dawn Mist Over the Amalfi Limestone Cliffs',
        date: '2019-05-18',
        year: 2019,
        location: 'Ravello & Amalfi Coast, Italy',
        category: 'Coastal Voyage',
        description:
          'First morning light breaking over terraced lemon groves and the cobalt Tyrrhenian Sea.',
        story:
          'Walking the stone footpath at 6:00 AM before the village woke—only the scent of sea salt, wild rosemary, and espresso drifting from a cliffside terrace.',
        tags: ['travel', 'italy', 'coast', 'sunrise', 'mediterranean'],
        people: ['Travel Partner'],
        type: 'image',
        motif: 'amalfi_arches',
        palette: ['#E8F1F5', '#4E8098', '#D6A15D', '#233D4D'],
        frameStyle: 'floating_halo',
      },
      {
        title: 'Night Train Through the Swiss Alpine Pass',
        date: '2021-10-11',
        year: 2021,
        location: 'Bernina Express Route, Switzerland',
        category: 'Alpine Expedition',
        description:
          'Granite viaducts and larch forests glowing gold against fresh October snow.',
        story:
          'With a thermos of spiced tea and a pocket sketchbook by the panoramic carriage window, we watched glaciers appear under a cloudless twilight sky.',
        tags: ['travel', 'alps', 'train', 'mountains', 'autumn'],
        people: ['Solo Journey'],
        type: 'image',
        motif: 'alpine_train',
        palette: ['#F0F4F8', '#6B8E9B', '#C9A66B', '#2A363B'],
        frameStyle: 'minimal_dark',
      },
      {
        title: 'Kyoto Bamboo Sanctuary & Temple Bell at Dusk',
        date: '2023-04-04',
        year: 2023,
        location: 'Arashiyama, Kyoto',
        category: 'Cultural Pilgrimage',
        description:
          'Warm paper lanterns illuminating moss-covered stone steps beneath towering emerald bamboo.',
        story:
          'As evening mist settled over the Katsura River, the low resonance of a distant bronze temple bell seemed to suspend time completely.',
        tags: ['travel', 'kyoto', 'japan', 'lanterns', 'sanctuary'],
        people: ['Friends'],
        type: 'story',
        motif: 'kyoto_torii',
        palette: ['#EAE6DF', '#5B8A72', '#D6A15D', '#26332B'],
        frameStyle: 'walnut_classic',
      },
    ],
  },

  family: {
    key: 'family',
    label: 'Family Lineage & Hearth',
    shortBadge: 'Family Hearth',
    subtitle: 'Generational Stories, Heirloom Table & Shared Roots',
    themeName: 'Heirloom Walnut, Warm Alabaster & Hearthside Gold',
    wallColorHex: '#FAF3E8',
    floorTintHex: '#E5D3B8',
    archColorHex: '#C29B6C',
    accentColorHex: '#B87B4B',
    lightingPreset: 'warm_salon',
    lightIntensity: 2.3,
    exhibitLayout: 'triptych',
    decorations: 'sculptural_plinths',
    exhibitionStyle: 'classic_wall_gallery',
    galleryLayout: 'wall',
    decorativeStyle: 'heirloom_hearth',
    featuredMotif: 'family_table',
    curatorQuote:
      'Around the family hearth, generations speak to one another through recipes, laughter, and kept promises.',
    roomDescription:
      'A dignified 3D family heritage salon anchored by a warm limestone & walnut hearth installation, an heirloom gathering table with brass candlesticks, and generational portrait framing.',
    curatorRationale:
      'Gemini detected a Family Lineage & Hearth theme. The 3D room features warm salon wall washes, an architectural hearth & heirloom table centerpiece, and multi-generational relationship data visualization.',
    interactive3DInstallations: [
      'Central 3D Heirloom Walnut Table & Brass Candlesticks',
      'Architectural Limestone Hearth & Warm Ember Glow',
      'Generational Portrait Triptych & Lineage Ledger Plinth',
      '3D Family Kinship & Era Analytics Monolith',
    ],
    detectionKeywords: [
      'family',
      'parents',
      'mom',
      'mother',
      'dad',
      'father',
      'grandparents',
      'grandma',
      'grandpa',
      'sister',
      'brother',
      'siblings',
      'ancestry',
      'heritage',
      'lineage',
      'home',
      'hearth',
      'tradition',
      'reunion',
    ],
    emotionMetrics: [
      {
        theme: 'Generational Continuity',
        baseScore: 96,
        colorHex: '#B87B4B',
        note: 'Deep archival threads connecting grandparents, parents, and present-day family rituals.',
      },
      {
        theme: 'Hearthside Warmth',
        baseScore: 94,
        colorHex: '#D6A15D',
        note: 'High emotional warmth around holiday gatherings, Sunday dinners, and handwritten recipes.',
      },
      {
        theme: 'Shared Kinship Network',
        baseScore: 90,
        colorHex: '#87977C',
        note: 'Rich multi-person tagging across shared milestones and home celebrations.',
      },
      {
        theme: 'Heirloom Preservation',
        baseScore: 92,
        colorHex: '#C98D87',
        note: 'Strong presence of preserved letters, vintage portraits, and family keepsakes.',
      },
    ],
    starterMemories: [
      {
        title: 'Sunday Harvest Table Under the Pergola',
        date: '2016-09-25',
        year: 2016,
        location: 'Family Courtyard Garden',
        category: 'Family Gathering',
        description:
          'Three generations gathered around the long walnut table set with linen runners and autumn figs.',
        story:
          'Grandmother told the story of how her father planted the fig tree in 1962 while everyone passed platters of roasted rosemary potatoes down the table.',
        tags: ['family', 'tradition', 'dinner', 'generations', 'autumn'],
        people: ['Grandma', 'Parents', 'Cousins'],
        type: 'image',
        motif: 'family_table',
        palette: ['#F7E9D7', '#B87B4B', '#7A5438', '#3B281B'],
        frameStyle: 'champagne_brass',
      },
      {
        title: 'Grandfather’s Handwritten Recipe & Brass Pocket Watch',
        date: '1988-12-24',
        year: 1988,
        location: 'Old Family Kitchen',
        category: 'Family Heirloom',
        description:
          'Faded fountain-pen ink on cream cardstock beside an engraved gold pocket watch.',
        story:
          'Every December Eve, this card comes out of the cedar recipe box—complete with his margin notes reminding us never to rush the dough.',
        tags: ['family', 'heirloom', 'recipe', 'heritage', 'winter'],
        people: ['Grandpa'],
        type: 'document',
        motif: 'sunday_baking',
        palette: ['#F4E8D1', '#C9A66B', '#854D27', '#2D2118'],
        frameStyle: 'walnut_classic',
      },
      {
        title: 'Summer Orchard Portraits at Golden Hour',
        date: '2020-07-19',
        year: 2020,
        location: 'Homestead Veranda',
        category: 'Kinship Portrait',
        description:
          'Warm evening light across the wrap-around wooden porch as fireflies began to rise from the meadow.',
        story:
          'An unplanned portrait taken with a vintage film camera just after dusk—capturing everyone laughing at the exact same second.',
        tags: ['family', 'portrait', 'summer', 'home', 'veranda'],
        people: ['Mom', 'Dad', 'Siblings'],
        type: 'image',
        motif: 'grandparents_orchard',
        palette: ['#F9E6C9', '#D6A15D', '#76896E', '#332922'],
        frameStyle: 'champagne_brass',
      },
    ],
  },

  friendships: {
    key: 'friendships',
    label: 'Friendships & Shared Laughter',
    shortBadge: 'Kindred Spirits',
    subtitle: 'Late-Night Conversations, Road Trips & Polaroid Collages',
    themeName: 'Terracotta Linen, Warm Driftwood & Golden Twilight',
    wallColorHex: '#FBF2E9',
    floorTintHex: '#E8D5C4',
    archColorHex: '#D49A7B',
    accentColorHex: '#D07A56',
    lightingPreset: 'golden_hour',
    lightIntensity: 2.25,
    exhibitLayout: 'salon_grid',
    decorations: 'sculptural_plinths',
    exhibitionStyle: 'scrapbook_collage',
    galleryLayout: 'scrapbook',
    decorativeStyle: 'scrapbook_salon',
    featuredMotif: 'coastal_bonfire',
    curatorQuote:
      'True friendship is an unspoken archive of inside jokes, midnight drives, and standing side by side.',
    roomDescription:
      'A vibrant 3D friendship salon featuring a central vinyl turntable & campfire lantern lounge island, pinned Polaroid collage boards, and interactive social memory visualizations.',
    curatorRationale:
      'Gemini detected a Friendships & Shared Laughter theme. The 3D room is styled with warm terracotta-cream walls, a central vinyl & Polaroid lounge installation, and social connection density charts.',
    interactive3DInstallations: [
      'Central 3D Vinyl Turntable & Warm Campfire Lantern Lounge',
      'Pinned Polaroid & Postcard Collage Exhibition Boards',
      'Acoustic Keepsake Plinth & Shared Road-Trip Map',
      '3D Friendship Circle & Shared Moment Analytics Monolith',
    ],
    detectionKeywords: [
      'friend',
      'friends',
      'friendship',
      'friendships',
      'bestie',
      'squad',
      'crew',
      'pal',
      'pals',
      'road trip',
      'bonfire',
      'hangout',
      'party',
      'reunion',
      'social',
      'laughter',
    ],
    emotionMetrics: [
      {
        theme: 'Spontaneous Joy & Laughter',
        baseScore: 95,
        colorHex: '#D07A56',
        note: 'High density of candid group snapshots, road trips, and celebratory gatherings.',
      },
      {
        theme: 'Enduring Camaraderie',
        baseScore: 91,
        colorHex: '#D6A15D',
        note: 'Multi-year continuity of core friendship circles across cities and seasons.',
      },
      {
        theme: 'Shared Adventures',
        baseScore: 89,
        colorHex: '#6B9080',
        note: 'Strong cluster of beach bonfires, festival nights, and spontaneous weekend drives.',
      },
      {
        theme: 'Candid Storytelling',
        baseScore: 93,
        colorHex: '#C98D87',
        note: 'Rich personal anecdotes and shared quotes preserved on each memory plaque.',
      },
    ],
    starterMemories: [
      {
        title: 'Pacific Highway Bonfire & Acoustic Guitar at Dusk',
        date: '2018-08-14',
        year: 2018,
        location: 'Big Sur Cove',
        category: 'Road Trip',
        description:
          'Sparks rising from driftwood embers against a violet coastal twilight.',
        story:
          'After driving the coast highway all afternoon with the windows down, we gathered driftwood on the cove and sang every song we knew until the tide came in.',
        tags: ['friends', 'bonfire', 'road-trip', 'coast', 'music'],
        people: ['Alex', 'Maya', 'Sam'],
        type: 'image',
        motif: 'coastal_bonfire',
        palette: ['#F7D6B5', '#D07A56', '#4A5D73', '#241E1C'],
        frameStyle: 'walnut_classic',
      },
      {
        title: 'Rooftop Dinner & String Lights Over the City',
        date: '2021-06-29',
        year: 2021,
        location: 'Downtown Loft Terrace',
        category: 'Reunion Night',
        description:
          'Warm Edison bulbs reflected in cider glasses above the glowing city skyline.',
        story:
          'The first evening we were all back in the same city after two years apart—five hours felt like five minutes.',
        tags: ['friends', 'reunion', 'rooftop', 'city', 'summer'],
        people: ['Jordan', 'Elena', 'Liam'],
        type: 'image',
        motif: 'courtyard_lanterns',
        palette: ['#FAE5C8', '#D6A15D', '#574B60', '#231F20'],
        frameStyle: 'floating_halo',
      },
      {
        title: 'Polaroid Wall From Our Mountain Cabin Weekend',
        date: '2023-01-15',
        year: 2023,
        location: 'Pine Ridge A-Frame',
        category: 'Winter Retreat',
        description:
          'Twelve instant film prints arranged beside a steaming kettle and board games.',
        story:
          'Snowed in for forty-eight hours with a stack of vinyl records, homemade ramen, and an instant camera that never left the coffee table.',
        tags: ['friends', 'polaroid', 'cabin', 'winter', 'laughter'],
        people: ['Cabin Crew'],
        type: 'story',
        motif: 'polaroid_roadtrip',
        palette: ['#F2E8DC', '#C98D87', '#6E8376', '#2B2623'],
        frameStyle: 'scrapbook_board',
      },
    ],
  },

  achievements: {
    key: 'achievements',
    label: 'Milestones, Laurels & Triumphs',
    shortBadge: 'Hall of Milestones',
    subtitle: 'Dedication, Breakthroughs, Honours & Defining Victories',
    themeName: 'Imperial Alabaster, Obsidian Bronze & Burnished Gold',
    wallColorHex: '#F9F6EE',
    floorTintHex: '#E6DEC8',
    archColorHex: '#C9A66B',
    accentColorHex: '#C9A66B',
    lightingPreset: 'warm_salon',
    lightIntensity: 2.4,
    exhibitLayout: 'triptych',
    decorations: 'sculptural_plinths',
    exhibitionStyle: 'floating_exhibition',
    galleryLayout: 'timeline',
    decorativeStyle: 'laurel_monograph',
    featuredMotif: 'marathon_dawn',
    curatorQuote:
      'Every milestone on display is the visible summit of countless quiet hours of perseverance.',
    roomDescription:
      'A monumental 3D Hall of Milestones featuring illuminated museum glass vitrines, burnished brass trophy & laurel podiums, and chronological achievement analytics.',
    curatorRationale:
      'Gemini detected a Milestones & Achievements theme. The 3D room is configured with high-contrast museum spotlighting, sculptural laurel & award podiums, and milestone progression data visualization.',
    interactive3DInstallations: [
      'Central 3D Burnished Brass Laurel Sculpture & Honor Podium',
      'Illuminated Museum Glass Award & Diploma Vitrines',
      'Chronological Breakthrough Plinths with Focused Spotlights',
      '3D Milestone Progression & Impact Analytics Monolith',
    ],
    detectionKeywords: [
      'achievement',
      'achievements',
      'award',
      'awards',
      'milestone',
      'milestones',
      'career',
      'graduation',
      'degree',
      'trophy',
      'trophies',
      'medal',
      'success',
      'promotion',
      'launch',
      'victory',
      'certification',
      'honor',
      'honours',
    ],
    emotionMetrics: [
      {
        theme: 'Perseverance & Mastery',
        baseScore: 97,
        colorHex: '#C9A66B',
        note: 'High concentration of long-term personal, academic, and professional breakthroughs.',
      },
      {
        theme: 'Defining Turning Points',
        baseScore: 93,
        colorHex: '#D6A15D',
        note: 'Clear chronological arc of graduations, launches, and honors.',
      },
      {
        theme: 'Mentorship & Gratitude',
        baseScore: 88,
        colorHex: '#87977C',
        note: 'Strong recognition of mentors, collaborators, and supporters behind each triumph.',
      },
      {
        theme: 'Archival Documentation',
        baseScore: 94,
        colorHex: '#4E8098',
        note: 'Rich collection of certificates, keynote photographs, and commemorative artifacts.',
      },
    ],
    starterMemories: [
      {
        title: 'Commencement Morning Under the Bell Tower',
        date: '2017-05-20',
        year: 2017,
        location: 'University Grand Quad',
        category: 'Academic Honour',
        description:
          'Sunlight catching the gold-embossed diploma folio and ceremonial stole.',
        story:
          'Four years of late library nights, lab notebooks, and thesis revisions culminated in the moment the bell tower chimed across the quad.',
        tags: ['achievements', 'graduation', 'milestone', 'honors', 'education'],
        people: ['Family', 'Thesis Advisor'],
        type: 'certificate',
        motif: 'symphony_hall',
        palette: ['#FAF3E0', '#C9A66B', '#3E4C59', '#1F2421'],
        frameStyle: 'champagne_brass',
      },
      {
        title: 'First Keystone Project Launch & Golden Laurel Plaque',
        date: '2021-11-08',
        year: 2021,
        location: 'Design & Innovation Hall',
        category: 'Career Breakthrough',
        description:
          'Brushed brass commemorative plaque beside the original architectural concept sketch.',
        story:
          'Taking an idea from a napkin sketch to a live flagship release—proof that disciplined craft and a dedicated team can build something lasting.',
        tags: ['achievements', 'career', 'launch', 'award', 'innovation'],
        people: ['Core Team'],
        type: 'certificate',
        motif: 'atelier_studio',
        palette: ['#F5EFE6', '#D6A15D', '#5C4B3B', '#231F1C'],
        frameStyle: 'champagne_brass',
      },
      {
        title: 'Summit Finish Line at 4,200 Meters',
        date: '2023-09-10',
        year: 2023,
        location: 'High Alpine Ridge',
        category: 'Personal Endurance',
        description:
          'Engraved finisher medal held against a sea of morning clouds below the summit cairn.',
        story:
          'Six months of dawn training runs led to this quiet, breathless sunrise above the clouds.',
        tags: ['achievements', 'endurance', 'summit', 'medal', 'perseverance'],
        people: ['Training Partner'],
        type: 'image',
        motif: 'marathon_dawn',
        palette: ['#F2F5F7', '#C9A66B', '#526D82', '#27374D'],
        frameStyle: 'floating_halo',
      },
    ],
  },

  college_years: {
    key: 'college_years',
    label: 'Academic & Formative Chapters',
    shortBadge: 'Campus & Study',
    subtitle: 'Library Lamplight, Studio Seminars & Formative Ideas',
    themeName: 'Collegiate Sage, Archival Parchment & Library Walnut',
    wallColorHex: '#F5F2EA',
    floorTintHex: '#DFD7C5',
    archColorHex: '#87977C',
    accentColorHex: '#738667',
    lightingPreset: 'warm_salon',
    lightIntensity: 2.2,
    exhibitLayout: 'salon_grid',
    decorations: 'botanical_olive',
    exhibitionStyle: 'timeline_wall',
    galleryLayout: 'timeline',
    decorativeStyle: 'campus_quadrangle',
    featuredMotif: 'atelier_studio',
    curatorQuote:
      'Between old library stacks and midnight coffee cups, we discovered the questions worth spending a lifetime answering.',
    roomDescription:
      'An atmospheric 3D collegiate study & gallery featuring a central walnut library lectern with stacked archival folios, a brass banker’s reading lamp, and a chronological timeline rail.',
    curatorRationale:
      'Gemini detected an Academic & Formative Chapters theme. The 3D room combines library walnut joinery, parchment walls, a central scholar’s lectern installation, and semester-by-semester timeline visualization.',
    interactive3DInstallations: [
      'Central 3D Walnut Scholar Lectern & Stacked Archival Folios',
      'Warm Brass Library Banker Lamp & Annotated Notebooks',
      'Continuous Brushed-Brass Chronological Timeline Rail',
      '3D Academic Era & Knowledge Graph Monolith',
    ],
    detectionKeywords: [
      'college',
      'university',
      'campus',
      'uni',
      'student',
      'dorm',
      'alma mater',
      'academic',
      'study',
      'library',
      'seminar',
      'thesis',
      'semester',
      'sophomore',
      'senior',
      'freshman',
    ],
    emotionMetrics: [
      {
        theme: 'Intellectual Curiosity',
        baseScore: 95,
        colorHex: '#738667',
        note: 'Strong concentration of studio projects, research notes, and seminar breakthroughs.',
      },
      {
        theme: 'Campus Community',
        baseScore: 90,
        colorHex: '#D6A15D',
        note: 'Memorable dorm gatherings, autumn quad walks, and late-night study sessions.',
      },
      {
        theme: 'Creative Experimentation',
        baseScore: 88,
        colorHex: '#4E8098',
        note: 'Diverse mix of written essays, sketches, and collaborative events.',
      },
      {
        theme: 'Formative Growth',
        baseScore: 94,
        colorHex: '#B87B4B',
        note: 'Clear chronological evolution from first-year arrival to graduation.',
      },
    ],
    starterMemories: [
      {
        title: 'Autumn Leaves Across the Old Library Quad',
        date: '2014-10-21',
        year: 2014,
        location: 'North Quadrangle',
        category: 'Campus Life',
        description:
          'Amber gingko leaves blanketing the stone path leading to the reading room rotunda.',
        story:
          'Walking out of the late afternoon lecture as the carillon bells rang five o’clock and the whole quadrangle glowed gold.',
        tags: ['college', 'campus', 'autumn', 'library', 'quad'],
        people: ['Study Group'],
        type: 'image',
        motif: 'grandparents_orchard',
        palette: ['#F6E8CC', '#738667', '#C9A66B', '#2F362B'],
        frameStyle: 'walnut_classic',
      },
      {
        title: 'Midnight Reading Room & Margin Annotations',
        date: '2015-12-09',
        year: 2015,
        location: 'Rare Books Reading Room',
        category: 'Scholarly Note',
        description:
          'Green glass banker’s lamp illuminating fountain-pen notes and bound journals.',
        story:
          'The quiet camaraderie of the reading room during December finals, when a single breakthrough paragraph made the whole semester click.',
        tags: ['college', 'study', 'books', 'notes', 'library'],
        people: ['Roommate'],
        type: 'document',
        motif: 'atelier_studio',
        palette: ['#F4EFE0', '#738667', '#854D27', '#232820'],
        frameStyle: 'champagne_brass',
      },
    ],
  },

  special_moments: {
    key: 'special_moments',
    label: 'Celebrations & Turning Points',
    shortBadge: 'Luminous Moments',
    subtitle: 'Lantern Conservatories, Vows, Anniversaries & Sacred Hours',
    themeName: 'Champagne Silk, Dusty Rose & Floating Lantern Conservatory',
    wallColorHex: '#FDF6F0',
    floorTintHex: '#EAD8CD',
    archColorHex: '#C98D87',
    accentColorHex: '#C98D87',
    lightingPreset: 'golden_hour',
    lightIntensity: 2.35,
    exhibitLayout: 'triptych',
    decorations: 'sculptural_plinths',
    exhibitionStyle: 'floating_island',
    galleryLayout: 'carousel',
    decorativeStyle: 'lantern_conservatory',
    featuredMotif: 'courtyard_lanterns',
    curatorQuote:
      'There are hours so luminous they stand outside of ordinary time, lighting every year that follows.',
    roomDescription:
      'A poetic 3D lantern conservatory featuring suspended warm silk lanterns above a central travertine reflection island, champagne-brass frames, and celebration memory analytics.',
    curatorRationale:
      'Gemini detected a Celebrations & Turning Points theme. The 3D room is designed as an intimate lantern conservatory with warm floating illumination and milestone emotion metrics.',
    interactive3DInstallations: [
      'Central 3D Floating Silk Lantern Canopy & Reflection Island',
      'Champagne-Gold Vow & Keepsake Vitrine Pedestals',
      'Warm Candlelight Perimeter Alcoves',
      '3D Celebration & Turning-Point Data Monolith',
    ],
    detectionKeywords: [
      'special',
      'moment',
      'moments',
      'wedding',
      'anniversary',
      'engagement',
      'proposal',
      'birthday',
      'celebration',
      'ceremony',
      'festival',
      'love',
      'romance',
      'new year',
      'sacred',
    ],
    emotionMetrics: [
      {
        theme: 'Luminous Celebration',
        baseScore: 97,
        colorHex: '#C98D87',
        note: 'Peak emotional resonance across life-defining vows, anniversaries, and toasts.',
      },
      {
        theme: 'Poetic Atmosphere',
        baseScore: 94,
        colorHex: '#D6A15D',
        note: 'Warm candlelight, lantern-lit courtyards, and golden-hour portraits.',
      },
      {
        theme: 'Heartfelt Keepsakes',
        baseScore: 91,
        colorHex: '#87977C',
        note: 'Preserved invitations, handwritten vows, and cherished tokens.',
      },
      {
        theme: 'Timeless Recall',
        baseScore: 95,
        colorHex: '#B87B4B',
        note: 'High favorite-mark ratio indicating core life anchor memories.',
      },
    ],
    starterMemories: [
      {
        title: 'Courtyard of a Hundred Floating Lanterns',
        date: '2022-06-18',
        year: 2022,
        location: 'Villa Botanical Conservatory',
        category: 'Sacred Celebration',
        description:
          'Warm silk lanterns reflected in the courtyard pool beneath a twilight sky.',
        story:
          'As the string quartet played the final note and everyone raised their glasses, a gentle breeze set every lantern glowing in unison.',
        tags: ['special-moments', 'celebration', 'lanterns', 'evening', 'love'],
        people: ['Partner', 'Loved Ones'],
        type: 'image',
        motif: 'courtyard_lanterns',
        palette: ['#FDF0E6', '#C98D87', '#D6A15D', '#2D2224'],
        frameStyle: 'champagne_brass',
      },
      {
        title: 'Handwritten Vows & Pressed Olive Branch',
        date: '2022-06-18',
        year: 2022,
        location: 'Sunlit Terrace',
        category: 'Keepsake Vow',
        description:
          'Deckle-edged cotton paper tied with silk ribbon beside a preserved silver-green olive sprig.',
        story:
          'Words written at sunrise on the morning of the ceremony, kept safe inside a linen folio.',
        tags: ['special-moments', 'vows', 'keepsake', 'heirloom'],
        people: ['Partner'],
        type: 'document',
        motif: 'greenhouse_vows',
        palette: ['#FAF3EB', '#C98D87', '#87977C', '#332826'],
        frameStyle: 'floating_halo',
      },
    ],
  },

  creative_atelier: {
    key: 'creative_atelier',
    label: 'Art, Craft & Creative Atelier',
    shortBadge: 'Creative Atelier',
    subtitle: 'Sketchbooks, Ceramic Studies, Film Rolls & Maker Bench',
    themeName: 'Atelier Linen, Raw Umber & Daylight North-Light Studio',
    wallColorHex: '#F7F4ED',
    floorTintHex: '#DFD6C7',
    archColorHex: '#9E8268',
    accentColorHex: '#B07248',
    lightingPreset: 'daylight_gallery',
    lightIntensity: 2.35,
    exhibitLayout: 'salon_grid',
    decorations: 'sculptural_plinths',
    exhibitionStyle: 'floating_exhibition',
    galleryLayout: 'masonry',
    decorativeStyle: 'botanical_atelier',
    featuredMotif: 'atelier_studio',
    curatorQuote:
      'Every sketch, negative, and rough prototype is a footprint of the imagination learning to see.',
    roomDescription:
      'A north-lit 3D artist & maker atelier featuring a central architect’s drafting table, analog camera & ceramic sculpture plinths, and creative medium data visualizations.',
    curatorRationale:
      'Gemini detected an Art, Craft & Creative Atelier theme. The 3D room uses crisp studio daylighting, a central drafting & sculpture bench installation, and creative medium breakdown charts.',
    interactive3DInstallations: [
      'Central 3D Architect & Artist Drafting Table with Canvas Easel',
      'Analog Medium-Format Camera & Ceramic Vessel Plinths',
      'Suspended North-Light Studio Baffles',
      '3D Creative Medium & Palette Analytics Monolith',
    ],
    detectionKeywords: [
      'art',
      'atelier',
      'studio',
      'design',
      'craft',
      'painting',
      'drawing',
      'sketch',
      'sketchbook',
      'photography',
      'photo',
      'camera',
      'film',
      'pottery',
      'ceramics',
      'architecture',
      'creative',
      'portfolio',
      'maker',
    ],
    emotionMetrics: [
      {
        theme: 'Visual Craft & Originality',
        baseScore: 96,
        colorHex: '#B07248',
        note: 'High concentration of original studies, photographs, and tactile studio artifacts.',
      },
      {
        theme: 'Chromatic Harmony',
        baseScore: 93,
        colorHex: '#D6A15D',
        note: 'Curated warm ochre, umber, and mineral pigment palette consistency.',
      },
      {
        theme: 'Iterative Process',
        baseScore: 89,
        colorHex: '#5B8A72',
        note: 'Documented evolution from early sketchbook studies to finished works.',
      },
      {
        theme: 'Medium Diversity',
        baseScore: 91,
        colorHex: '#4E8098',
        note: 'Balanced representation of photography, ink sketches, and 3D objects.',
      },
    ],
    starterMemories: [
      {
        title: 'North-Light Atelier Bench & Medium-Format Film Roll',
        date: '2022-03-12',
        year: 2022,
        location: 'Daylight Studio',
        category: 'Studio Study',
        description:
          'A brass twin-lens camera resting beside charcoal studies and raw linen swatches.',
        story:
          'Developing the first roll of 120 black-and-white film shot during early morning walks through the historic district.',
        tags: ['art', 'studio', 'photography', 'film', 'sketchbook'],
        people: ['Studio Collective'],
        type: 'image',
        motif: 'atelier_studio',
        palette: ['#F4EFE6', '#B07248', '#6B5E52', '#221E1B'],
        frameStyle: 'minimal_dark',
      },
    ],
  },

  music_sound: {
    key: 'music_sound',
    label: 'Sonic Conservatory & Vinyl Lounge',
    shortBadge: 'Sonic Lounge',
    subtitle: 'Acoustic Resonance, Concert Nights & Vinyl Pressings',
    themeName: 'Midnight Walnut, Acoustic Brass & Warm Tube-Amp Glow',
    wallColorHex: '#F4EDE2',
    floorTintHex: '#DECBB3',
    archColorHex: '#B88B4A',
    accentColorHex: '#C9934B',
    lightingPreset: 'warm_salon',
    lightIntensity: 2.25,
    exhibitLayout: 'panoramic',
    decorations: 'sculptural_plinths',
    exhibitionStyle: 'cinematic_video_gallery',
    galleryLayout: 'carousel',
    decorativeStyle: 'scrapbook_salon',
    featuredMotif: 'vinyl_attic',
    curatorQuote:
      'A single chord can reopen a room in memory faster than any key ever forged.',
    roomDescription:
      'An intimate 3D sonic conservatory featuring a central walnut vinyl listening console, brass acoustic horn sculpture, concert ticket & score vitrines, and sonic memory data charts.',
    curatorRationale:
      'Gemini detected a Music & Sonic Conservatory theme. The 3D room is tailored with warm acoustic wood tones, a central vinyl & instrument installation, and audio-visual memory analytics.',
    interactive3DInstallations: [
      'Central 3D Walnut Hi-Fi Vinyl Console & Brass Acoustic Horn',
      'Acoustic Guitar & Annotated Sheet Music Stand',
      'Framed Vinyl Sleeve & Concert Ephemera Wall',
      '3D Sonic Resonance & Era Analytics Monolith',
    ],
    detectionKeywords: [
      'music',
      'song',
      'songs',
      'sound',
      'vinyl',
      'record',
      'records',
      'concert',
      'gig',
      'festival',
      'piano',
      'guitar',
      'band',
      'album',
      'playlist',
      'symphony',
      'jazz',
      'acoustic',
    ],
    emotionMetrics: [
      {
        theme: 'Harmonic Nostalgia',
        baseScore: 96,
        colorHex: '#C9934B',
        note: 'Deep emotional pairing between life chapters and signature soundtracks.',
      },
      {
        theme: 'Live Performance Energy',
        baseScore: 91,
        colorHex: '#D07A56',
        note: 'Vibrant documentation of intimate acoustic sessions and concert halls.',
      },
      {
        theme: 'Analog Craft',
        baseScore: 93,
        colorHex: '#854D27',
        note: 'High affinity for vinyl pressings, handwritten lyrics, and instruments.',
      },
      {
        theme: 'Audio-Visual Immersion',
        baseScore: 90,
        colorHex: '#5B8A72',
        note: 'Strong synergy with room soundscapes and video/audio exhibits.',
      },
    ],
    starterMemories: [
      {
        title: 'Late-Night Vinyl Pressing & Warm Tube Amplifier',
        date: '2020-11-19',
        year: 2020,
        location: 'Listening Alcove',
        category: 'Sonic Memory',
        description:
          'Amber vacuum-tube glow reflecting off a spinning 33 RPM jazz pressing.',
        story:
          'Dropping the needle on a first-pressing record while rain tapped against the windowpane.',
        tags: ['music', 'vinyl', 'jazz', 'evening', 'soundscape'],
        people: ['Solo Session'],
        type: 'audio',
        motif: 'vinyl_attic',
        palette: ['#F2E4D0', '#C9934B', '#5A3E28', '#1C1612'],
        frameStyle: 'walnut_classic',
      },
    ],
  },

  nature_sanctuary: {
    key: 'nature_sanctuary',
    label: 'Botanical & Outdoor Sanctuary',
    shortBadge: 'Botanical Sanctuary',
    subtitle: 'Sunlit Gardens, Forest Trails, Herbarium & Quiet Waters',
    themeName: 'Botanical Sage, Sunlit Limestone & Conservatory Glass',
    wallColorHex: '#F3F5EE',
    floorTintHex: '#DCE0D1',
    archColorHex: '#7E9678',
    accentColorHex: '#688B63',
    lightingPreset: 'daylight_gallery',
    lightIntensity: 2.35,
    exhibitLayout: 'panoramic',
    decorations: 'botanical_olive',
    exhibitionStyle: 'floating_island',
    galleryLayout: 'masonry',
    decorativeStyle: 'botanical_atelier',
    featuredMotif: 'botanical_press',
    curatorQuote:
      'In the patience of trees and seasonal light, we find the quiet rhythm our memories keep.',
    roomDescription:
      'A serene 3D botanical conservatory featuring a central living olive-tree & stone water basin island, pressed herbarium vitrines, and natural season analytics.',
    curatorRationale:
      'Gemini detected a Botanical & Nature Sanctuary theme. The 3D room brings conservatory daylighting, a central botanical tree & reflection basin installation, and seasonal memory distribution charts.',
    interactive3DInstallations: [
      'Central 3D Conservatory Olive Tree & Limestone Water Basin',
      'Pressed Botanical Herbarium Glass Vitrines',
      'Natural Daylight Skylight Louvers',
      '3D Seasonal & Ecological Memory Data Monolith',
    ],
    detectionKeywords: [
      'nature',
      'garden',
      'botanical',
      'forest',
      'trees',
      'mountain',
      'ocean',
      'sea',
      'beach',
      'lake',
      'outdoors',
      'hiking',
      'trail',
      'flowers',
      'plants',
      'wildlife',
      'pet',
      'pets',
      'sanctuary',
    ],
    emotionMetrics: [
      {
        theme: 'Biophilic Serenity',
        baseScore: 96,
        colorHex: '#688B63',
        note: 'Restorative connection to forest trails, gardens, and coastal waters.',
      },
      {
        theme: 'Seasonal Rhythm',
        baseScore: 92,
        colorHex: '#D6A15D',
        note: 'Balanced representation of spring blooms, summer canopies, and autumn foliage.',
      },
      {
        theme: 'Outdoor Exploration',
        baseScore: 89,
        colorHex: '#4E8098',
        note: 'Rich field observations and landscape photography.',
      },
      {
        theme: 'Organic Palette Harmony',
        baseScore: 94,
        colorHex: '#87977C',
        note: 'Cohesive sage, moss, travertine, and sky-blue tonal distribution.',
      },
    ],
    starterMemories: [
      {
        title: 'Morning Sunbeams Through the Conservatory Olive Grove',
        date: '2021-05-03',
        year: 2021,
        location: 'Botanical Glasshouse',
        category: 'Nature Sanctuary',
        description:
          'Silver-green olive leaves catching mist and early sunlight above warm limestone.',
        story:
          'A quiet hour sitting beside the stone fountain listening to water and birdsong before the gates opened.',
        tags: ['nature', 'garden', 'botanical', 'morning', 'peace'],
        people: ['Solo Walk'],
        type: 'image',
        motif: 'botanical_press',
        palette: ['#EEF3E8', '#688B63', '#C9A66B', '#253324'],
        frameStyle: 'walnut_classic',
      },
    ],
  },
};

export const ROOM_CATEGORY_LIST: RoomCategoryExperienceProfile[] = Object.values(
  ROOM_CATEGORY_EXPERIENCE_PROFILES,
);

/**
 * Intelligently detects the semantic room category from a user-entered room name,
 * subtitle, description, or explicit category selection.
 */
export function detectRoomCategoryFromInput(
  inputText: string,
  explicitCategory?: RoomCategoryKey,
): {
  categoryKey: RoomCategoryKey;
  profile: RoomCategoryExperienceProfile;
  matchedKeywords: string[];
  confidence: number;
} {
  if (explicitCategory && ROOM_CATEGORY_EXPERIENCE_PROFILES[explicitCategory]) {
    const profile = ROOM_CATEGORY_EXPERIENCE_PROFILES[explicitCategory];
    return {
      categoryKey: explicitCategory,
      profile,
      matchedKeywords: [explicitCategory],
      confidence: 0.99,
    };
  }

  const normalized = (inputText || '').toLowerCase().trim();
  if (!normalized) {
    return {
      categoryKey: 'childhood',
      profile: ROOM_CATEGORY_EXPERIENCE_PROFILES.childhood,
      matchedKeywords: ['default'],
      confidence: 0.78,
    };
  }

  let bestKey: RoomCategoryKey = 'childhood';
  let bestScore = 0;
  let bestMatched: string[] = [];

  for (const profile of ROOM_CATEGORY_LIST) {
    const matched: string[] = [];
    let score = 0;

    if (normalized.includes(profile.key.replace('_', ' '))) {
      score += 6;
      matched.push(profile.key);
    }

    for (const kw of profile.detectionKeywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      if (regex.test(normalized)) {
        score += kw.length > 5 ? 4 : 3;
        matched.push(kw);
      } else if (normalized.includes(kw)) {
        score += 2;
        matched.push(kw);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestKey = profile.key;
      bestMatched = matched;
    }
  }

  // Fallback heuristics if a custom poetic name doesn't match direct keywords
  if (bestScore === 0) {
    if (/sea|ocean|sky|horizon|road|flight|pass|port/i.test(normalized)) {
      bestKey = 'travels';
      bestMatched = ['horizon/voyage'];
    } else if (/house|mama|papa|kitchen|table|roots|kin/i.test(normalized)) {
      bestKey = 'family';
      bestMatched = ['hearth/roots'];
    } else if (/first|little|dream|wonder|story|magic/i.test(normalized)) {
      bestKey = 'childhood';
      bestMatched = ['wonder/story'];
    } else if (/gold|crown|win|summit|goal|work/i.test(normalized)) {
      bestKey = 'achievements';
      bestMatched = ['summit/milestone'];
    } else if (/book|ink|note|hall|class|lecture/i.test(normalized)) {
      bestKey = 'college_years';
      bestMatched = ['scholarly/archive'];
    } else if (/color|light|lens|canvas|form/i.test(normalized)) {
      bestKey = 'creative_atelier';
      bestMatched = ['atelier/visual'];
    } else {
      bestKey = 'special_moments';
      bestMatched = ['curated-moment'];
    }
  }

  return {
    categoryKey: bestKey,
    profile: ROOM_CATEGORY_EXPERIENCE_PROFILES[bestKey],
    matchedKeywords: Array.from(new Set(bestMatched)).slice(0, 5),
    confidence: bestScore > 0 ? Math.min(0.99, 0.82 + bestScore * 0.03) : 0.8,
  };
}

/**
 * Computes the mandatory Memory Content & Data Visual Representation for a room,
 * using either the room's actual memories or its category starter memories when previewing/initializing.
 */
export function computeRoomMemoryVisualData(
  categoryKey: RoomCategoryKey,
  roomName: string,
  memoriesInput: Array<
    Partial<Memory> | MemorySanitizedContext | RoomStarterMemoryTemplate
  >,
): RoomMemoryVisualDataSummary {
  const profile =
    ROOM_CATEGORY_EXPERIENCE_PROFILES[categoryKey] ||
    ROOM_CATEGORY_EXPERIENCE_PROFILES.childhood;

  const sourceList =
    memoriesInput && memoriesInput.length > 0
      ? memoriesInput
      : profile.starterMemories;

  const totalExhibits = sourceList.length;

  // 1. Chronological Era / Year Distribution
  const years: number[] = [];
  const eraMap = new Map<
    string,
    { count: number; highlightTitle: string; sortYear: number }
  >();

  sourceList.forEach((m) => {
    const y =
      typeof m.year === 'number' && m.year > 1800
        ? m.year
        : m.date && /^\d{4}/.test(m.date)
          ? Number(m.date.slice(0, 4))
          : 2020;
    years.push(y);
    const eraStart = Math.floor(y / 5) * 5;
    const eraLabel = `${eraStart}–${eraStart + 4}`;
    const existing = eraMap.get(eraLabel);
    if (existing) {
      existing.count += 1;
    } else {
      eraMap.set(eraLabel, {
        count: 1,
        highlightTitle: m.title || 'Untitled Exhibit',
        sortYear: eraStart,
      });
    }
  });

  const earliestYear = years.length > 0 ? Math.min(...years) : null;
  const latestYear = years.length > 0 ? Math.max(...years) : null;

  const eraTimelineDistribution = Array.from(eraMap.entries())
    .sort((a, b) => a[1].sortYear - b[1].sortYear)
    .map(([label, info]) => ({
      label,
      count: info.count,
      percentage: Math.max(
        10,
        Math.round((info.count / Math.max(1, totalExhibits)) * 100),
      ),
      highlightTitle: info.highlightTitle,
    }));

  // 2. Media Type Breakdown
  const mediaMeta: Record<
    MemoryMediaType,
    { label: string; colorHex: string }
  > = {
    image: { label: 'Photographs & Canvases', colorHex: '#D6A15D' },
    video: { label: 'Cinema & Motion Reels', colorHex: '#C98D87' },
    audio: { label: 'Voice & Sonic Recordings', colorHex: '#5B8A72' },
    story: { label: 'Written Narratives', colorHex: '#87977C' },
    document: { label: 'Letters & Documents', colorHex: '#B87B4B' },
    chat: { label: 'Conversations & Notes', colorHex: '#4E8098' },
    certificate: { label: 'Certificates & Laurels', colorHex: '#C9A66B' },
  };

  const mediaCounts = new Map<MemoryMediaType, number>();
  sourceList.forEach((m) => {
    const rawType = (m as Partial<Memory>).type || 'image';
    const validType: MemoryMediaType = mediaMeta[rawType] ? rawType : 'image';
    mediaCounts.set(validType, (mediaCounts.get(validType) || 0) + 1);
  });

  const mediaBreakdown = Array.from(mediaCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      label: mediaMeta[type].label,
      count,
      percentage: Math.round((count / Math.max(1, totalExhibits)) * 100),
      colorHex: mediaMeta[type].colorHex,
    }));

  // 3. Top Tags
  const tagCounts = new Map<string, number>();
  sourceList.forEach((m) => {
    (m.tags || []).forEach((t) => {
      const clean = t.trim().toLowerCase();
      if (clean) {
        tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
      }
    });
  });
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));

  // 4. Places & People Highlights
  const placePeopleCounts = new Map<
    string,
    { kind: 'place' | 'person'; count: number }
  >();
  sourceList.forEach((m) => {
    if (m.location && m.location.trim()) {
      const loc = m.location.trim();
      const prev = placePeopleCounts.get(`place:${loc}`);
      placePeopleCounts.set(`place:${loc}`, {
        kind: 'place',
        count: (prev?.count || 0) + 1,
      });
    }
    const peopleArr = (m as Partial<Memory>).people || [];
    peopleArr.forEach((p) => {
      if (p && p.trim()) {
        const person = p.trim();
        const prev = placePeopleCounts.get(`person:${person}`);
        placePeopleCounts.set(`person:${person}`, {
          kind: 'person',
          count: (prev?.count || 0) + 1,
        });
      }
    });
  });

  const placeAndPeopleHighlights = Array.from(placePeopleCounts.entries())
    .map(([key, val]) => ({
      label: key.replace(/^(place|person):/, ''),
      kind: val.kind,
      count: val.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 5. Emotion & Theme Metrics
  const emotionAndThemeMetrics = profile.emotionMetrics.map((em, idx) => ({
    theme: em.theme,
    score: Math.min(99, em.baseScore + ((totalExhibits + idx) % 4)),
    colorHex: em.colorHex,
    note: em.note,
  }));

  const yearSpanText =
    earliestYear && latestYear
      ? earliestYear === latestYear
        ? `${earliestYear}`
        : `${earliestYear}–${latestYear}`
      : 'Timeless Archive';

  const narrativeDataSynthesis = `"${roomName || profile.label}" is curated as a ${profile.label} exhibition spanning ${yearSpanText} across ${totalExhibits} ${totalExhibits === 1 ? 'exhibit' : 'exhibits'}. Dominant themes center on ${emotionAndThemeMetrics[0]?.theme || profile.shortBadge} (${emotionAndThemeMetrics[0]?.score || 95}% resonance) with physical 3D installations including ${profile.interactive3DInstallations.slice(0, 2).join(' and ')}.`;

  return {
    detectedCategory: categoryKey,
    categoryBadge: profile.shortBadge,
    totalExhibits,
    earliestYear,
    latestYear,
    eraTimelineDistribution,
    mediaBreakdown,
    emotionAndThemeMetrics,
    topTags,
    placeAndPeopleHighlights,
    narrativeDataSynthesis,
  };
}

/**
 * Builds the category-specific OUTPUT A (3D Environment Blueprint) and
 * OUTPUT B (Memory Exhibition Blueprint) grounded strictly in real memory IDs.
 */
export function generateImmersiveRoomBlueprint(params: {
  roomName: string;
  categoryKey: RoomCategoryKey;
  description?: string;
  memories?: Array<
    Partial<Memory> | MemorySanitizedContext | RoomStarterMemoryTemplate
  >;
}): ImmersiveRoomBlueprint {
  const profile =
    ROOM_CATEGORY_EXPERIENCE_PROFILES[params.categoryKey] ||
    ROOM_CATEGORY_EXPERIENCE_PROFILES.childhood;
  const cat = profile.key;

  const getCategoryEnvironmentSpec = (): BlueprintEnvironmentSpec => {
    if (cat === 'childhood') {
      return {
        style:
          'Warm nostalgic childhood bedroom & playroom sanctuary with cream, pastel yellow, muted sage green, and natural wood finishes',
        colors: ['#F3EBDD', '#F6E2B3', '#8FA88B', '#C9A66B', '#6E4F35'],
        materials: [
          {
            surface: 'Walls & Wainscoting',
            material: 'Warm Cream Plaster & Pastel Yellow/Sage Childhood Wallpaper',
            finish: 'Soft Matte & Natural Oak Chair Rail',
            colorHex: '#F3EBDD',
          },
          {
            surface: 'Flooring',
            material: 'Honey Oak Parquet & Woven Playroom Rug',
            finish: 'Warm Satin Wood',
            colorHex: '#E8D9C3',
          },
          {
            surface: 'Furniture & Shelving',
            material: 'Handcrafted Cedar & Natural Maple Wood',
            finish: 'Smooth Tactile Timber',
            colorHex: '#8C6239',
          },
        ],
        architecture: [
          {
            element: 'Sunlit Childhood Window Bay',
            style: 'Mullioned wooden window streaming soft golden daylight',
            position: { x: -6.55, y: 2.6, z: -2.2 },
          },
          {
            element: 'Childhood Wainscoting & Storyboard Rail',
            style: 'Natural wood dado rail with pastel yellow & muted green trim',
            position: { x: 0, y: 1.15, z: -6.7 },
          },
        ],
        furniture: [
          {
            id: 'childhood-study-table',
            type: 'wooden-study-table',
            label: 'Wooden Study Table, Chair & Brass Desk Lamp',
            position: { x: -4.55, y: 0, z: -3.85 },
            dimensions: { width: 1.45, height: 0.78, depth: 0.72 },
            rotationY: 0.35,
          },
          {
            id: 'childhood-bookshelf-toys',
            type: 'bookshelf-toy-shelves',
            label: 'Storybook Bookshelves, Toy Shelves & Vintage Storage Boxes',
            position: { x: -5.45, y: 0, z: 0.2 },
            dimensions: { width: 0.62, height: 2.15, depth: 2.2 },
            rotationY: Math.PI / 2,
          },
          {
            id: 'childhood-cosy-bed',
            type: 'cosy-daybed-seating',
            label: 'Cosy Childhood Daybed, Pastel Cushions & Reading Nook',
            position: { x: 5.15, y: 0, z: 0.2 },
            dimensions: { width: 1.15, height: 0.86, depth: 2.1 },
            rotationY: -Math.PI / 2,
          },
          {
            id: 'childhood-vintage-tv-console',
            type: 'vintage-television-console',
            label: 'Vintage Wooden CRT Television & Scrapbook Lectern',
            position: { x: 4.45, y: 0, z: -3.85 },
            dimensions: { width: 1.1, height: 1.28, depth: 0.64 },
            rotationY: -0.4,
          },
        ],
        decorations: [
          {
            id: 'prop-school-bag',
            type: 'interactive-school-bag',
            label: 'Interactive Vintage Leather & Canvas School Bag',
            position: { x: -3.75, y: 0.28, z: -3.65 },
          },
          {
            id: 'prop-treehouse-pond',
            type: 'cedar-treehouse-pavilion',
            label: 'Cedar Treehouse Model, Rainwater Pond & Origami Paper Boats',
            position: { x: -4.35, y: 0.65, z: 4.15 },
          },
          {
            id: 'prop-alphabet-blocks',
            type: 'wooden-toy-blocks',
            label: 'Stacked Vintage Wooden Alphabet Blocks & Toy Train',
            position: { x: -5.3, y: 1.1, z: 0.2 },
          },
          {
            id: 'prop-scrapbook-album',
            type: 'interactive-scrapbook',
            label: 'Interactive Personal Story Scrapbook & Keepsake Box',
            position: { x: 4.45, y: 0.92, z: -3.55 },
          },
        ],
        lighting: [
          {
            type: 'sunlight-window-beam',
            colorHex: '#FFE6B8',
            intensity: 2.4,
            position: { x: -5.8, y: 3.4, z: -2.2 },
          },
          {
            type: 'warm-playroom-chandelier',
            colorHex: '#FFE2B5',
            intensity: 2.2,
            position: { x: 0, y: 4.8, z: -0.8 },
          },
        ],
        zones: [
          {
            id: 'zone-school-study',
            name: 'School Days & Study Desk Corner',
            purpose: 'Displays school milestones, interactive school bag, and early notebooks',
            center: { x: -4.3, z: -3.5 },
            radius: 2.2,
          },
          {
            id: 'zone-playroom-shelves',
            name: 'Toy Shelves, Bookshelves & Treehouse Bay',
            purpose: 'Houses childhood toys, vintage storage boxes, and favorite keepsakes',
            center: { x: -4.8, z: 1.2 },
            radius: 2.4,
          },
          {
            id: 'zone-cosy-bed-cinema',
            name: 'Cosy Daybed, Vintage TV & Scrapbook Nook',
            purpose: 'Features childhood home videos on the vintage TV and family photo walls',
            center: { x: 4.6, z: -1.0 },
            radius: 2.5,
          },
        ],
      };
    }

    if (cat === 'travels') {
      return {
        style:
          'Grand Explorer Cartographic Lounge & Destination Pavilion with travertine, teakwood, and burnished brass',
        colors: ['#F2ECE1', '#D8C7AE', '#4E8098', '#C9A66B', '#493629'],
        materials: [
          {
            surface: 'Walls',
            material: 'Coastal Travertine & Meridian Map Inlay',
            finish: 'Honed Stone & Brass',
            colorHex: '#F2ECE1',
          },
          {
            surface: 'Flooring',
            material: 'Compass-Rose Inlaid Limestone & Teak Decking',
            finish: 'Satin Stone',
            colorHex: '#E5DAC8',
          },
        ],
        architecture: [
          {
            element: 'Panoramic Horizon Window Bay',
            style: 'Arched coastal observatory window with brass meridian mullions',
            position: { x: 6.55, y: 2.6, z: -1.8 },
          },
        ],
        furniture: [
          {
            id: 'travel-map-table',
            type: 'cartographic-navigation-table',
            label: 'Cartographer World Map Table & Compass Dividers',
            position: { x: -4.95, y: 0, z: -0.2 },
            dimensions: { width: 1.15, height: 0.86, depth: 2.1 },
            rotationY: Math.PI / 2,
          },
          {
            id: 'travel-steamer-trunks',
            type: 'vintage-steamer-trunks',
            label: 'Stacked Leather Expedition Steamer Trunks & Souvenir Chest',
            position: { x: -4.55, y: 0, z: -3.85 },
            dimensions: { width: 1.25, height: 0.95, depth: 0.75 },
            rotationY: 0.35,
          },
          {
            id: 'travel-souvenir-vitrine',
            type: 'destination-keepsake-shelves',
            label: 'Destination Souvenir, Postcard & Passport Vitrine',
            position: { x: 5.2, y: 0, z: 0.2 },
            dimensions: { width: 0.65, height: 2.05, depth: 2.1 },
            rotationY: -Math.PI / 2,
          },
        ],
        decorations: [
          {
            id: 'prop-armillary-globe',
            type: 'brass-armillary-sphere',
            label: 'Interactive Brass Armillary Globe & Expedition Trunk',
            position: { x: -4.35, y: 0.85, z: 4.15 },
          },
          {
            id: 'prop-brass-telescope',
            type: 'observatory-telescope',
            label: 'Tripod Brass Horizon Telescope',
            position: { x: 4.55, y: 0, z: -3.75 },
          },
        ],
        lighting: [
          {
            type: 'golden-horizon-wash',
            colorHex: '#FFE2B5',
            intensity: 2.5,
            position: { x: 0, y: 4.8, z: -1.2 },
          },
        ],
        zones: [
          {
            id: 'zone-atlas-table',
            name: 'Cartographic Map & Route Station',
            purpose: 'Displays journey routes, coordinates, and expedition trunks',
            center: { x: -4.6, z: -1.2 },
            radius: 2.4,
          },
          {
            id: 'zone-souvenir-gallery',
            name: 'Destination Landscapes & Souvenir Vitrine',
            purpose: 'Exhibits travel photography, postcards, and horizon panoramas',
            center: { x: 4.6, z: 0.0 },
            radius: 2.5,
          },
        ],
      };
    }

    if (cat === 'family') {
      return {
        style:
          'Warm Heirloom Hearth Salon & Family Heritage Sanctuary with walnut, linen, and glowing fireplace mantel',
        colors: ['#F4EBDF', '#E5D5C0', '#B87B4B', '#C9A66B', '#493629'],
        materials: [
          {
            surface: 'Walls',
            material: 'Warm Venetian Plaster & Walnut Panelling',
            finish: 'Hand-Troweled Satin',
            colorHex: '#F4EBDF',
          },
          {
            surface: 'Flooring',
            material: 'Heirloom Walnut Herringbone & Woven Heritage Rug',
            finish: 'Warm Oiled Timber',
            colorHex: '#E5D5C0',
          },
        ],
        architecture: [
          {
            element: 'Architectural Limestone & Walnut Fireplace Hearth',
            style: 'Carved stone mantel with glowing warm hearth embers',
            position: { x: -5.45, y: 0, z: 0.0 },
          },
        ],
        furniture: [
          {
            id: 'family-fireplace-mantel',
            type: 'heirloom-fireplace-hearth',
            label: 'Grand Limestone Fireplace Hearth & Mantelpiece',
            position: { x: -5.4, y: 0, z: 0.0 },
            dimensions: { width: 0.75, height: 1.85, depth: 2.2 },
            rotationY: Math.PI / 2,
          },
          {
            id: 'family-heirloom-sideboard',
            type: 'walnut-heirloom-sideboard',
            label: 'Heirloom Walnut Credenza, Candlesticks & Family Album Lectern',
            position: { x: 5.2, y: 0, z: 0.1 },
            dimensions: { width: 0.68, height: 1.05, depth: 2.15 },
            rotationY: -Math.PI / 2,
          },
        ],
        decorations: [
          {
            id: 'prop-hearth-candlesticks',
            type: 'brass-candlesticks-hearth',
            label: 'Glowing Hearth Ember Core & Twin Brass Candlesticks',
            position: { x: -4.35, y: 0.85, z: 4.15 },
          },
        ],
        lighting: [
          {
            type: 'hearth-firelight-glow',
            colorHex: '#FFD599',
            intensity: 2.4,
            position: { x: -4.8, y: 1.2, z: 0 },
          },
        ],
        zones: [
          {
            id: 'zone-hearth-mantel',
            name: 'Family Hearth & Lineage Mantel',
            purpose: 'Displays multi-generational family portraits and cherished gatherings',
            center: { x: -4.5, z: 0 },
            radius: 2.4,
          },
          {
            id: 'zone-heirloom-table',
            name: 'Heirloom Sideboard & Recipe Archive',
            purpose: 'Preserves handwritten family stories, recipes, and holiday traditions',
            center: { x: 4.5, z: 0 },
            radius: 2.4,
          },
        ],
      };
    }

    // Default rich environment blueprint for friendships, music_sound, college_years, achievements, special_moments, creative_atelier, nature_sanctuary
    return {
      style: `${profile.themeName} — ${profile.roomDescription}`,
      colors: [
        profile.wallColorHex,
        profile.floorTintHex,
        profile.accentColorHex,
        profile.archColorHex,
        '#493629',
      ],
      materials: [
        {
          surface: 'Walls',
          material: 'Venetian Plaster & Architectural Reveals',
          finish: 'Warm Matte',
          colorHex: profile.wallColorHex,
        },
        {
          surface: 'Flooring',
          material: 'Honed Stone & Custom Gallery Inlay',
          finish: 'Satin',
          colorHex: profile.floorTintHex,
        },
      ],
      architecture: [
        {
          element: `${profile.shortBadge} Feature Wall & Archway`,
          style: profile.exhibitionStyle,
          position: { x: 0, y: 2.4, z: -6.6 },
        },
      ],
      furniture: [
        {
          id: `${cat}-west-console`,
          type: `${cat}-signature-console`,
          label: profile.interactive3DInstallations[0] || 'Signature Curatorial Console',
          position: { x: -5.2, y: 0, z: 0.1 },
          dimensions: { width: 0.72, height: 1.45, depth: 2.0 },
          rotationY: Math.PI / 2,
        },
        {
          id: `${cat}-east-lounge`,
          type: `${cat}-signature-showcase`,
          label: profile.interactive3DInstallations[1] || 'Interactive Memory Vitrine',
          position: { x: 5.2, y: 0, z: 0.1 },
          dimensions: { width: 0.72, height: 1.45, depth: 2.0 },
          rotationY: -Math.PI / 2,
        },
      ],
      decorations: (profile.interactive3DInstallations || []).map((inst, idx) => ({
        id: `${cat}-decor-${idx}`,
        type: profile.decorativeStyle,
        label: inst,
        position: { x: idx % 2 === 0 ? -4.35 : 4.35, y: 0.9, z: 4.15 },
      })),
      lighting: [
        {
          type: profile.lightingPreset,
          colorHex: '#FFE2B5',
          intensity: profile.lightIntensity,
          position: { x: 0, y: 4.8, z: -0.8 },
        },
      ],
      zones: [
        {
          id: `zone-${cat}-north`,
          name: `${profile.shortBadge} Focal Wall`,
          purpose: 'Primary curatorial memory installations',
          center: { x: 0, z: -4.2 },
          radius: 3.0,
        },
        {
          id: `zone-${cat}-wings`,
          name: `${profile.label} Interactive Wings`,
          purpose: 'Interactive 3D props, keepsakes, and chronological exhibits',
          center: { x: 0, z: 0.2 },
          radius: 3.5,
        },
      ],
    };
  };

  // OUTPUT B — MEMORY EXHIBITION BLUEPRINT
  // Only map actual memories that have an ID; never invent fake memory IDs or fake personal data.
  const validMemories = (params.memories || []).filter(
    (m): m is (Partial<Memory> | MemorySanitizedContext) & { id: string } =>
      Boolean(m && typeof (m as { id?: string }).id === 'string' && (m as { id: string }).id.trim().length > 0),
  );

  // Wall mount slots around North, West, and East walls
  const wallSlots: Array<{ x: number; y: number; z: number; rotY: number }> = [
    { x: -3.2, y: 2.25, z: -6.58, rotY: 0 },
    { x: 0.0, y: 2.35, z: -6.58, rotY: 0 },
    { x: 3.2, y: 2.25, z: -6.58, rotY: 0 },
    { x: -6.58, y: 2.25, z: -3.0, rotY: Math.PI / 2 },
    { x: -6.58, y: 2.25, z: 0.2, rotY: Math.PI / 2 },
    { x: -6.58, y: 2.25, z: 3.2, rotY: Math.PI / 2 },
    { x: 6.58, y: 2.25, z: -3.0, rotY: -Math.PI / 2 },
    { x: 6.58, y: 2.25, z: 0.2, rotY: -Math.PI / 2 },
    { x: 6.58, y: 2.25, z: 3.2, rotY: -Math.PI / 2 },
  ];

  const selectExhibitFormat = (
    m: Partial<Memory> | MemorySanitizedContext,
    index: number,
  ): {
    type: BlueprintExhibitFormatType;
    associated3DObject: string;
    interaction: BlueprintExhibitInteractionType;
  } => {
    const mediaType = (m as Partial<Memory>).type || 'image';
    const textBlob = `${m.title || ''} ${m.description || ''} ${(m.tags || []).join(' ')}`.toLowerCase();

    if (mediaType === 'video') {
      return {
        type: 'vintage-television',
        associated3DObject:
          cat === 'childhood'
            ? 'Vintage Wooden CRT Television Console'
            : 'Cinema Screening Monitor',
        interaction: 'play-video',
      };
    }
    if (mediaType === 'story' || mediaType === 'document' || mediaType === 'chat') {
      return {
        type: 'interactive-scrapbook',
        associated3DObject: 'Interactive Personal Story Scrapbook Folio',
        interaction: 'flip-scrapbook',
      };
    }
    if (cat === 'childhood') {
      if (/school|class|desk|bag|pencil|grade|teacher/i.test(textBlob)) {
        return {
          type: 'interactive-school-bag',
          associated3DObject: 'Wooden Study Desk & Interactive School Bag',
          interaction: 'inspect-keepsake',
        };
      }
      if (index % 3 === 1) {
        return {
          type: 'keepsake-vitrine',
          associated3DObject: 'Childhood Toy & Keepsake Display Shelf',
          interaction: 'inspect-keepsake',
        };
      }
      if (index % 3 === 2) {
        return {
          type: 'school-timeline-plaque',
          associated3DObject: 'Childhood Growth & Milestone Timeline Rail',
          interaction: 'open-memory',
        };
      }
      return {
        type: 'framed-photo',
        associated3DObject: 'Warm Cedar Childhood Portrait Frame',
        interaction: 'open-memory',
      };
    }
    if (cat === 'travels') {
      return {
        type: index % 2 === 0 ? 'travel-globe-station' : 'framed-photo',
        associated3DObject:
          index % 2 === 0
            ? 'Cartographic Atlas & Destination Vitrine'
            : 'Teakwood & Brass Horizon Frame',
        interaction: 'open-memory',
      };
    }
    if (cat === 'family') {
      return {
        type: 'heirloom-frame',
        associated3DObject: 'Heirloom Walnut & Hearth Portrait Mount',
        interaction: 'open-memory',
      };
    }
    if (cat === 'friendships' || cat === 'music_sound') {
      return {
        type: index % 2 === 0 ? 'vinyl-listening-post' : 'interactive-scrapbook',
        associated3DObject: 'Hi-Fi Vinyl Console & Polaroid Memory Board',
        interaction: 'open-memory',
      };
    }
    if (cat === 'achievements' || cat === 'college_years') {
      return {
        type: 'laurel-pedestal',
        associated3DObject: 'Brushed-Brass Milestone & Certificate Vitrine',
        interaction: 'inspect-keepsake',
      };
    }
    return {
      type: 'framed-photo',
      associated3DObject: 'Illuminated Museum Gallery Frame',
      interaction: 'open-memory',
    };
  };

  const exhibits: BlueprintMemoryExhibitSpec[] = validMemories.map((m, idx) => {
    const slot = wallSlots[idx % wallSlots.length];
    const fmt = selectExhibitFormat(m, idx);
    const mediaType = (m as Partial<Memory>).type || 'image';

    return {
      memoryId: m.id,
      type: fmt.type,
      title: m.title || 'Untitled Memory',
      position: { x: slot.x, y: slot.y, z: slot.z },
      rotationY: slot.rotY,
      dimensions:
        fmt.type === 'vintage-television'
          ? { width: 2.1, height: 1.45, depth: 0.24 }
          : { width: 1.75, height: 1.32, depth: 0.12 },
      associated3DObject: fmt.associated3DObject,
      interaction: fmt.interaction,
      availableMetadata: {
        ...(m.date ? { date: m.date } : {}),
        ...(m.location ? { location: m.location } : {}),
        mediaType,
      },
      storytellingContext:
        m.description ||
        m.story ||
        `Curated ${profile.shortBadge} exhibit preserving "${m.title || 'Memory'}".`,
    };
  });

  return {
    room: {
      name: params.roomName || profile.label,
      category: profile.label,
      categoryKey: cat,
      concept: params.description || profile.roomDescription,
      dimensions: {
        width: 14,
        depth: 14,
        height: 5.5,
      },
    },
    environment: getCategoryEnvironmentSpec(),
    exhibits,
  };
}

/**
 * Validates and normalizes any Gemini-generated ImmersiveRoomBlueprint JSON.
 * Guarantees:
 * - Every exhibit strictly references an existing memoryId from `memories` (never invents fake memory IDs).
 * - Missing or malformed environment/furniture/exhibit fields gracefully fall back to valid defaults.
 */
export function validateAndNormalizeRoomBlueprint(
  rawBlueprint: Partial<ImmersiveRoomBlueprint> | undefined | null,
  fallbackParams: {
    roomName: string;
    categoryKey: RoomCategoryKey;
    description?: string;
    memories?: Array<
      Partial<Memory> | MemorySanitizedContext | RoomStarterMemoryTemplate
    >;
  },
): ImmersiveRoomBlueprint {
  const baseline = generateImmersiveRoomBlueprint(fallbackParams);
  if (!rawBlueprint || typeof rawBlueprint !== 'object') {
    return baseline;
  }

  // Build lookup of real memory IDs so we NEVER allow hallucinated memory IDs
  const realMemoryMap = new Map<
    string,
    Partial<Memory> | MemorySanitizedContext
  >();
  (fallbackParams.memories || []).forEach((m) => {
    const id = (m as { id?: string })?.id;
    if (typeof id === 'string' && id.trim().length > 0) {
      realMemoryMap.set(id, m as Partial<Memory> | MemorySanitizedContext);
    }
  });

  const validFormatTypes = new Set<BlueprintExhibitFormatType>([
    'framed-photo',
    'vintage-television',
    'interactive-scrapbook',
    'interactive-school-bag',
    'keepsake-vitrine',
    'school-timeline-plaque',
    'travel-globe-station',
    'vinyl-listening-post',
    'heirloom-frame',
    'laurel-pedestal',
  ]);

  const validInteractions = new Set<BlueprintExhibitInteractionType>([
    'open-memory',
    'play-video',
    'flip-scrapbook',
    'inspect-keepsake',
  ]);

  let validatedExhibits = baseline.exhibits;
  if (Array.isArray(rawBlueprint.exhibits) && realMemoryMap.size > 0) {
    const byId = new Map<string, BlueprintMemoryExhibitSpec>();
    rawBlueprint.exhibits.forEach((ex) => {
      if (!ex || typeof ex.memoryId !== 'string') return;
      const realMem = realMemoryMap.get(ex.memoryId);
      if (!realMem) return; // Reject any invented memoryId!

      const fallbackEx =
        baseline.exhibits.find((b) => b.memoryId === ex.memoryId) ||
        baseline.exhibits[0];
      const fmtType: BlueprintExhibitFormatType = validFormatTypes.has(
        ex.type as BlueprintExhibitFormatType,
      )
        ? (ex.type as BlueprintExhibitFormatType)
        : fallbackEx.type;
      const interaction: BlueprintExhibitInteractionType = validInteractions.has(
        ex.interaction as BlueprintExhibitInteractionType,
      )
        ? (ex.interaction as BlueprintExhibitInteractionType)
        : fallbackEx.interaction;

      byId.set(ex.memoryId, {
        memoryId: ex.memoryId,
        type: fmtType,
        title: realMem.title || fallbackEx.title,
        position: {
          x:
            typeof ex.position?.x === 'number' && Number.isFinite(ex.position.x)
              ? Math.max(-6.6, Math.min(6.6, ex.position.x))
              : fallbackEx.position.x,
          y:
            typeof ex.position?.y === 'number' && Number.isFinite(ex.position.y)
              ? Math.max(0.8, Math.min(4.2, ex.position.y))
              : fallbackEx.position.y,
          z:
            typeof ex.position?.z === 'number' && Number.isFinite(ex.position.z)
              ? Math.max(-6.6, Math.min(6.6, ex.position.z))
              : fallbackEx.position.z,
        },
        rotationY:
          typeof ex.rotationY === 'number' && Number.isFinite(ex.rotationY)
            ? ex.rotationY
            : fallbackEx.rotationY,
        dimensions: fallbackEx.dimensions,
        associated3DObject:
          ex.associated3DObject || fallbackEx.associated3DObject,
        interaction,
        availableMetadata: fallbackEx.availableMetadata,
        storytellingContext:
          ex.storytellingContext || fallbackEx.storytellingContext,
      });
    });

    // Ensure every real memory in the room is represented
    validatedExhibits = baseline.exhibits.map(
      (baseEx) => byId.get(baseEx.memoryId) || baseEx,
    );
  }

  return {
    room: {
      name: rawBlueprint.room?.name || baseline.room.name,
      category: rawBlueprint.room?.category || baseline.room.category,
      categoryKey: baseline.room.categoryKey,
      concept: rawBlueprint.room?.concept || baseline.room.concept,
      dimensions: baseline.room.dimensions,
    },
    environment: {
      style: rawBlueprint.environment?.style || baseline.environment.style,
      colors:
        Array.isArray(rawBlueprint.environment?.colors) &&
        rawBlueprint.environment.colors.length >= 3
          ? rawBlueprint.environment.colors
          : baseline.environment.colors,
      materials:
        Array.isArray(rawBlueprint.environment?.materials) &&
        rawBlueprint.environment.materials.length > 0
          ? rawBlueprint.environment.materials
          : baseline.environment.materials,
      architecture: baseline.environment.architecture,
      furniture: baseline.environment.furniture,
      decorations: baseline.environment.decorations,
      lighting: baseline.environment.lighting,
      zones: baseline.environment.zones,
    },
    exhibits: validatedExhibits,
  };
}

/**
 * Builds a complete RoomDesignConfig for any room name, optional category selection,
 * and memory list, ensuring both 3D visual design, ImmersiveRoomBlueprint (Output A + Output B),
 * and memory content data visual representation are populated.
 */
export function buildSynthesizedRoomDesignConfig(params: {
  roomName: string;
  promptOrNotes?: string;
  explicitCategory?: RoomCategoryKey;
  memories?: Array<
    Partial<Memory> | MemorySanitizedContext | RoomStarterMemoryTemplate
  >;
}): RoomDesignConfig {
  const combinedInput = `${params.roomName || ''} ${params.promptOrNotes || ''}`.trim();
  const detection = detectRoomCategoryFromInput(
    combinedInput,
    params.explicitCategory,
  );
  const { profile, categoryKey } = detection;

  const visualDataSummary = computeRoomMemoryVisualData(
    categoryKey,
    params.roomName || profile.label,
    params.memories && params.memories.length > 0
      ? params.memories
      : profile.starterMemories,
  );

  const blueprint = generateImmersiveRoomBlueprint({
    roomName: params.roomName || profile.label,
    categoryKey,
    description: params.promptOrNotes || profile.roomDescription,
    memories: params.memories,
  });

  return {
    themeName: profile.themeName,
    wallColorHex: profile.wallColorHex,
    floorTintHex: profile.floorTintHex,
    archColorHex: profile.archColorHex,
    accentColorHex: profile.accentColorHex,
    lightingPreset: profile.lightingPreset,
    lightIntensity: profile.lightIntensity,
    exhibitLayout: profile.exhibitLayout,
    decorations: profile.decorations,
    roomDescription: profile.roomDescription,
    curatorRationale: `${profile.curatorRationale} (${visualDataSummary.narrativeDataSynthesis})`,
    detectedCategory: categoryKey,
    categoryLabel: profile.label,
    exhibitionStyle: profile.exhibitionStyle,
    galleryLayout: profile.galleryLayout,
    decorativeStyle: profile.decorativeStyle,
    featuredMotif: profile.featuredMotif,
    curatorQuote: profile.curatorQuote,
    interactive3DInstallations: profile.interactive3DInstallations,
    visualDataSummary,
    suggestedStarterMemories: profile.starterMemories,
    blueprint,
  };
}

/**
 * Converts RoomStarterMemoryTemplate items into full Memory records for a room.
 */
export function instantiateStarterMemoriesForRoom(
  roomId: string,
  templates: RoomStarterMemoryTemplate[],
): Memory[] {
  const now = Date.now();
  return templates.map((tpl, idx) => ({
    id: `mem-starter-${roomId}-${now}-${idx}`,
    roomId,
    title: tpl.title,
    date: tpl.date,
    year: tpl.year,
    location: tpl.location,
    category: tpl.category,
    description: tpl.description,
    story: tpl.story,
    accessionNumber: `MM-${tpl.year}-${String(idx + 1).padStart(3, '0')}`,
    tags: tpl.tags,
    people: tpl.people,
    isFavorite: idx === 0,
    type: tpl.type,
    motif: tpl.motif,
    palette: tpl.palette,
    frameStyle: tpl.frameStyle,
    displayOrder: idx,
  }));
}
