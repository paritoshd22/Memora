import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AIProviderAdapter,
  GeminiProviderAdapter,
  OpenAIProviderAdapter,
  parseAndValidateJson,
} from '../aiProviders';
import { AIRouter } from '../aiRouter';
import { MemoryVaultService } from '../memoryVaultService';
import { AITaskRequest } from '../../types/aiStudio';
import {
  resolveAutomaticRoomPlacement,
  validateUploadFileCandidate,
} from '../../utils/clientMediaExtractor';

async function runTests() {
  console.log('Running MEMORA AI Provider & Task Router Test Suite...\n');
  let passed = 0;

  // 1. Test: Missing credentials handling
  {
    const unconfiguredGemini = new GeminiProviderAdapter(() => '');
    const unconfiguredOpenAI = new OpenAIProviderAdapter(() => 'MY_OPENAI_API_KEY');
    const router = new AIRouter({
      adapters: [unconfiguredGemini, unconfiguredOpenAI],
    });

    const res = await router.routeTask({
      task: 'memory_search',
      providerId: 'gemini',
      userId: 'curator-1',
      consentGranted: true,
      prompt: 'Find my Vermont memories',
    });

    assert.equal(res.ok, false);
    assert.equal(res.error?.code, 'MISSING_CREDENTIALS');
    assert.equal(res.error?.canUseDemoFallback, true);
    console.log('✅ Test 1 Passed: Missing credentials detected without exposing secrets.');
    passed++;
  }

  // 2. Test: Successful and failed provider calls
  {
    const mockSuccessGemini: AIProviderAdapter = {
      id: 'gemini',
      displayName: 'Mock Gemini',
      vendor: 'Google',
      credentialEnvVar: 'GEMINI_API_KEY',
      supportedCapabilities: ['memory_search', 'image_generation'],
      isConfigured: () => true,
      getStatus: () => ({
        id: 'gemini',
        displayName: 'Mock Gemini',
        vendor: 'Google',
        credentialEnvVar: 'GEMINI_API_KEY',
        configured: true,
        connectionStatus: 'connected',
        enabledCapabilities: ['memory_search', 'image_generation'],
        models: { textModel: 'gemini-3.8-flash' },
        costEstimateNote: '',
        setupInstructions: '',
        usage: {
          totalRequests: 1,
          successfulRequests: 1,
          failedRequests: 0,
          estimatedInputTokens: 100,
          estimatedOutputTokens: 100,
        },
      }),
      testConnection: async () => ({
        ok: true,
        latencyMs: 12,
        model: 'gemini-3.8-flash',
        message: 'Connected',
      }),
      executeTask: async (req: AITaskRequest) => {
        if (req.prompt === 'TRIGGER_FAIL') {
          throw new Error('Upstream provider network timeout');
        }
        return {
          data: {
            answerMarkdown: 'Found 1 verified memory.',
            factsSummary: ['Cedar Treehouse (1999)'],
            curatorialSuggestions: ['Create a summer anthology'],
            citations: [],
          },
          modelUsed: 'gemini-3.8-flash',
          inputTokens: 50,
          outputTokens: 60,
          estimatedCostUsd: 0.0002,
        };
      },
    };

    const router = new AIRouter({ adapters: [mockSuccessGemini] });

    const okRes = await router.routeTask({
      task: 'memory_search',
      providerId: 'gemini',
      userId: 'curator-1',
      consentGranted: true,
      prompt: 'Find treehouse',
    });
    assert.equal(okRes.ok, true);
    assert.equal(okRes.providerUsed, 'gemini');
    assert.equal(okRes.isDemo, false);

    const failRes = await router.routeTask({
      task: 'memory_search',
      providerId: 'gemini',
      userId: 'curator-1',
      consentGranted: true,
      prompt: 'TRIGGER_FAIL',
    });
    assert.equal(failRes.ok, false);
    assert.equal(failRes.error?.code, 'PROVIDER_ERROR');
    console.log('✅ Test 2 Passed: Successful and failed provider calls handled accurately.');
    passed++;
  }

  // 3. Test: Malformed AI output validation
  {
    assert.throws(
      () => {
        parseAndValidateJson('{ invalid json ', ['answerMarkdown']);
      },
      (err: any) => err.code === 'MALFORMED_AI_OUTPUT',
    );

    assert.throws(
      () => {
        parseAndValidateJson('{"wrongKey": "value"}', ['answerMarkdown']);
      },
      (err: any) => err.code === 'MALFORMED_AI_OUTPUT',
    );

    const valid = parseAndValidateJson<{ answerMarkdown: string }>(
      '```json\n{"answerMarkdown": "Grounded response"}\n```',
      ['answerMarkdown'],
    );
    assert.equal(valid.answerMarkdown, 'Grounded response');
    console.log('✅ Test 3 Passed: Malformed AI output rejected and valid JSON extracted.');
    passed++;
  }

  // 4. Test: User authorization & cross-user memory isolation
  {
    const router = new AIRouter();
    const unauthorizedRes = await router.routeTask({
      task: 'memory_search',
      userId: 'user-alice',
      consentGranted: true,
      demoMode: true,
      memories: [
        {
          id: 'mem-secret',
          ownerId: 'user-bob', // Belongs to a different user!
          roomId: 'childhood',
          title: 'Bob Private Memory',
          date: '2020-01-01',
          year: 2020,
          location: 'Boston',
          category: 'Private',
          description: 'Private',
          story: 'Private',
          tags: [],
        },
      ],
    });

    assert.equal(unauthorizedRes.ok, false);
    assert.equal(unauthorizedRes.error?.code, 'UNAUTHORIZED_MEMORY_ACCESS');

    // Also test missing privacy consent when calling external provider
    const noConsentRes = await router.routeTask({
      task: 'memory_search',
      userId: 'user-alice',
      consentGranted: false,
      demoMode: false,
      prompt: 'Search',
    });
    assert.equal(noConsentRes.ok, false);
    assert.equal(noConsentRes.error?.code, 'CONSENT_REQUIRED');
    console.log('✅ Test 4 Passed: Authorization checks and privacy consent enforced.');
    passed++;
  }

  // 5. Test: Rate limiting enforcement
  {
    const strictRouter = new AIRouter({ maxRequestsPerMinute: 2 });
    const r1 = await strictRouter.routeTask({
      task: 'room_design',
      userId: 'rate-test-user',
      consentGranted: true,
      demoMode: true,
    });
    const r2 = await strictRouter.routeTask({
      task: 'room_design',
      userId: 'rate-test-user',
      consentGranted: true,
      demoMode: true,
    });
    const r3 = await strictRouter.routeTask({
      task: 'room_design',
      userId: 'rate-test-user',
      consentGranted: true,
      demoMode: true,
    });

    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    assert.equal(r3.ok, false);
    assert.equal(r3.error?.code, 'RATE_LIMITED');
    console.log('✅ Test 5 Passed: Sliding-window rate limiting enforced.');
    passed++;
  }

  // 6. Test: Generation errors & non-silent alternative provider suggestions
  {
    const configuredGemini = new GeminiProviderAdapter(() => 'AIzaSyValidLengthTestKey123456');
    const unconfiguredOpenAI = new OpenAIProviderAdapter(() => '');
    const router = new AIRouter({
      adapters: [configuredGemini, unconfiguredOpenAI],
    });

    // Request OpenAI when OpenAI is missing credentials; router must NOT silently call Gemini,
    // but instead report MISSING_CREDENTIALS and offer ['gemini'] in availableAlternativeProviders!
    const res = await router.routeTask({
      task: 'image_generation',
      providerId: 'openai',
      userId: 'curator-1',
      consentGranted: true,
      prompt: 'Generate cover',
    });

    assert.equal(res.ok, false);
    assert.equal(res.error?.code, 'MISSING_CREDENTIALS');
    assert.deepEqual(res.error?.availableAlternativeProviders, ['gemini']);
    console.log('✅ Test 6 Passed: Non-silent provider error with alternative provider suggestion.');
    passed++;
  }

  // 7. Test: Grounded Local Demo Mode execution
  {
    const router = new AIRouter();
    const demoRes = await router.routeTask({
      task: 'memory_search',
      userId: 'curator-1',
      consentGranted: false, // Demo mode works locally without external transmission
      demoMode: true,
      prompt: 'Find my Ravello Italy memories',
      memories: [
        {
          id: 'mem-travel-1',
          ownerId: 'curator-1',
          roomId: 'travels',
          title: 'Villa Cimbrone Loggia at Dusk',
          date: '2017-09-08',
          year: 2017,
          location: 'Ravello, Amalfi Coast',
          category: 'Architectural Sojourn',
          description: 'Classical travertine arches framing the Tyrrhenian Sea.',
          story: 'Walking through the quiet cloisters.',
          tags: ['Italy', 'Ravello'],
        },
      ],
    });

    assert.equal(demoRes.ok, true);
    assert.equal(demoRes.isDemo, true);
    assert.equal(demoRes.providerUsed, 'demo_local');
    const payload = demoRes.data as any;
    assert.equal(payload.citations.length, 1);
    assert.equal(payload.citations[0].memoryId, 'mem-travel-1');
    console.log('✅ Test 7 Passed: Local Demo Mode grounded strictly in user memory data.');
    passed++;
  }

  // 8. Test: Provider switching & capability compatibility checks
  {
    const configuredOpenAI = new OpenAIProviderAdapter(
      () => 'sk-proj-valid-length-key-123456789',
    );
    const configuredGemini = new GeminiProviderAdapter(
      () => 'AIzaSyValidLengthTestKey123456',
    );
    const router = new AIRouter({
      adapters: [configuredGemini, configuredOpenAI],
    });

    // OpenAI does not support video_generation
    const videoOnOpenAI = await router.routeTask({
      task: 'video_generation',
      providerId: 'openai',
      userId: 'curator-1',
      consentGranted: true,
      prompt: 'Render memory film',
    });

    assert.equal(videoOnOpenAI.ok, false);
    assert.equal(videoOnOpenAI.error?.code, 'CAPABILITY_UNSUPPORTED');
    assert.deepEqual(videoOnOpenAI.error?.availableAlternativeProviders, ['gemini']);
    console.log('✅ Test 8 Passed: Provider switching & capability compatibility verified.');
    passed++;
  }

  // 9. Test: Spotify & YouTube honest status when credentials are missing
  {
    const { PlaylistIntegrationService } = await import('../playlistService');
    const unconfiguredPlaylists = new PlaylistIntegrationService({
      getEnv: () => undefined,
    });
    const statuses = unconfiguredPlaylists.getProvidersStatus();
    const spotify = statuses.find((s) => s.id === 'spotify')!;
    const youtube = statuses.find((s) => s.id === 'youtube')!;

    assert.equal(spotify.configuredOnServer, false);
    assert.equal(spotify.connected, false);
    assert.equal(spotify.connectionState, 'setup_required');
    assert.equal(youtube.configuredOnServer, false);
    assert.equal(youtube.connected, false);
    assert.equal(youtube.connectionState, 'setup_required');

    const authAttempt = unconfiguredPlaylists.getAuthorizationUrl(
      'spotify',
      'https://mymuseum.example.com/auth/callback',
    );
    assert.equal(authAttempt.ok, false);
    assert.ok(authAttempt.error?.includes('SPOTIFY_CLIENT_ID'));
    console.log('✅ Test 9 Passed: Honest Setup Required status when Spotify/YouTube credentials are missing.');
    passed++;
  }

  // 10. Test: Spotify & YouTube OAuth token exchange, playlist fetching, and Disconnect
  {
    const { PlaylistIntegrationService } = await import('../playlistService');
    const mockEnv: Record<string, string> = {
      SPOTIFY_CLIENT_ID: 'spotify-client-id-12345',
      SPOTIFY_CLIENT_SECRET: 'spotify-client-secret-67890',
      YOUTUBE_CLIENT_ID: 'youtube-client-id-12345',
      YOUTUBE_CLIENT_SECRET: 'youtube-client-secret-67890',
      APP_URL: 'https://mymuseum.example.com',
    };

    const mockFetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('accounts.spotify.com/api/token')) {
        return new Response(
          JSON.stringify({
            access_token: 'sp_access_123',
            refresh_token: 'sp_refresh_123',
            expires_in: 3600,
          }),
          { status: 200 },
        );
      }
      if (url.includes('api.spotify.com/v1/me') && !url.includes('/playlists')) {
        return new Response(
          JSON.stringify({ display_name: 'Elena Vance', id: 'elena_sp' }),
          { status: 200 },
        );
      }
      if (url.includes('api.spotify.com/v1/me/playlists')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: '37i9dQZF1DX4sWSpwq3LiO',
                name: 'Peaceful Piano',
                description: 'Warm piano pieces for the atrium',
                owner: { display_name: 'Spotify' },
                tracks: { total: 42 },
                images: [{ url: 'https://i.scdn.co/image/test' }],
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }) as typeof fetch;

    const service = new PlaylistIntegrationService({
      getEnv: (k) => mockEnv[k],
      fetchFn: mockFetch,
    });

    const redirectUri = 'https://mymuseum.example.com/auth/callback';
    const authUrlRes = service.getAuthorizationUrl('spotify', redirectUri);
    assert.equal(authUrlRes.ok, true);
    assert.ok(authUrlRes.url?.includes('accounts.spotify.com/authorize'));
    assert.ok(authUrlRes.url?.includes('playlist-read-private'));

    const callbackRes = await service.handleOAuthCallback(
      'spotify',
      'valid_auth_code',
      redirectUri,
    );
    assert.equal(callbackRes.ok, true);

    const connectedSpotify = service
      .getProvidersStatus()
      .find((s) => s.id === 'spotify')!;
    assert.equal(connectedSpotify.connected, true);
    assert.equal(connectedSpotify.connectionState, 'connected');
    assert.equal(connectedSpotify.accountName, 'Elena Vance');

    const playlistsRes = await service.getSpotifyPlaylists('');
    assert.equal(playlistsRes.ok, true);
    assert.equal(playlistsRes.playlists.length, 1);
    assert.equal(playlistsRes.playlists[0].title, 'Peaceful Piano');
    assert.equal(playlistsRes.playlists[0].trackCount, 42);

    // Disconnect clears session state
    service.disconnectProvider('spotify');
    const afterDisconnect = service
      .getProvidersStatus()
      .find((s) => s.id === 'spotify')!;
    assert.equal(afterDisconnect.connected, false);
    assert.equal(afterDisconnect.connectionState, 'disconnected');
    console.log('✅ Test 10 Passed: Spotify OAuth exchange, live playlist retrieval, and disconnect verified.');
    passed++;
  }

  // 11. Test: Room Visual Themes, 6 Gallery Layouts & 7 Exhibit Formats
  {
    const {
      GALLERY_LAYOUT_OPTIONS,
      EXHIBIT_TYPE_LABELS,
      getRoomVisualThemeProfile,
    } = await import('../../utils/roomThemes');
    const { INITIAL_ROOMS, INITIAL_MEMORIES } = await import(
      '../../data/initialMuseumData'
    );

    assert.equal(GALLERY_LAYOUT_OPTIONS.length, 6);
    assert.deepEqual(
      GALLERY_LAYOUT_OPTIONS.map((o) => o.id),
      ['masonry', 'grid', 'timeline', 'scrapbook', 'wall', 'carousel'],
    );

    assert.deepEqual(Object.keys(EXHIBIT_TYPE_LABELS).sort(), [
      'audio',
      'certificate',
      'chat',
      'document',
      'image',
      'story',
      'video',
    ]);

    const childhoodProfile = getRoomVisualThemeProfile(
      INITIAL_ROOMS.find((r) => r.id === 'childhood')!,
    );
    const travelsProfile = getRoomVisualThemeProfile(
      INITIAL_ROOMS.find((r) => r.id === 'travels')!,
    );
    assert.notEqual(
      childhoodProfile.alcoveWallHex,
      travelsProfile.alcoveWallHex,
    );
    assert.notEqual(
      childhoodProfile.decorativeStyle,
      travelsProfile.decorativeStyle,
    );

    // Verify initial demo archive covers all 7 exhibit formats
    const presentTypes = new Set(INITIAL_MEMORIES.map((m) => m.type || 'image'));
    assert.equal(presentTypes.size, 7);
    console.log('✅ Test 11 Passed: Distinct room visual themes, 6 gallery layouts, and all 7 exhibit formats verified.');
    passed++;
  }

  // 12. Test: Grounded AI Memory Connections (Never fabricates relationships; requires approval)
  {
    const { generateGroundedMemoryConnections } = await import(
      '../../utils/roomThemes'
    );
    const { INITIAL_ROOMS, INITIAL_MEMORIES } = await import(
      '../../data/initialMuseumData'
    );

    const suggestions = generateGroundedMemoryConnections(
      INITIAL_MEMORIES,
      INITIAL_ROOMS,
      'childhood',
      [],
    );

    assert.ok(suggestions.length > 0);
    for (const sug of suggestions) {
      assert.equal(sug.status, 'suggested');
      assert.ok(sug.relationshipLabel.length > 3);
      assert.ok(sug.evidenceReason.length > 10);
    }

    // Disjoint memories with no shared people, location, tags, or year should produce 0 fabricated links
    const disjointMemories = [
      {
        id: 'disjoint-1',
        roomId: 'childhood',
        title: 'Alpha',
        date: '1991-01-01',
        year: 1991,
        location: 'Reykjavik',
        category: 'Note',
        description: 'One',
        story: 'One',
        accessionNumber: 'MM-1991-01',
        tags: ['glacier'],
        people: ['Gunnar'],
        motif: 'treehouse_meadow' as const,
        palette: ['#000', '#111', '#222', '#333'] as [string, string, string, string],
      },
      {
        id: 'disjoint-2',
        roomId: 'travels',
        title: 'Beta',
        date: '2023-08-19',
        year: 2023,
        location: 'Ushuaia',
        category: 'Photo',
        description: 'Two',
        story: 'Two',
        accessionNumber: 'MM-2023-02',
        tags: ['harbor'],
        people: ['Mateo'],
        motif: 'amalfi_arches' as const,
        palette: ['#000', '#111', '#222', '#333'] as [string, string, string, string],
      },
    ];
    const zeroSuggestions = generateGroundedMemoryConnections(
      disjointMemories,
      INITIAL_ROOMS,
      'childhood',
      [],
    );
    assert.equal(zeroSuggestions.length, 0);
    console.log('✅ Test 12 Passed: Grounded AI memory connections verified with zero fabrication.');
    passed++;
  }

  // 13. Test: Part 4, 5 & 7 — Memory-to-3D Blueprint Validation & 4 Childhood Memory Archetypes
  {
    const {
      buildAndValidateMemoryTo3DBlueprint,
      isMemory3DBlueprintApproved,
      loadMemoryBlueprint3DObject,
      disposeMemory3DObject,
    } = await import('../../utils/memoryTo3DAssetResolver');
    const { buildRoomInteriorColliders } = await import(
      '../../utils/roomExhibition3D'
    );
    const { INITIAL_ROOMS } = await import('../../data/initialMuseumData');

    // Guard: Ensure raw LLM text is never accepted as a 3D model and is converted into a valid structured blueprint
    const fromRawString = buildAndValidateMemoryTo3DBlueprint({
      memoryId: 'mem-bike-1',
      sourceMediaId: 'media-bike-1',
      promptText: 'red_backyard_bicycle_photo.jpg First Red Bicycle in the Backyard',
      mediaType: 'image',
      rawBlueprint: 'Here is a text description of a bicycle' as any,
    });
    assert.equal(fromRawString.objectType, 'bicycle');
    assert.equal(fromRawString.connectedSpace, 'backyard');
    assert.equal(fromRawString.interactionType, 'spin_wheels');
    assert.equal(fromRawString.generatedGlbAssetRef.priorityTier, 1);
    assert.equal(fromRawString.userApprovalStatus, 'pending');

    // Example B: Childhood Toy Photograph
    const toyBp = buildAndValidateMemoryTo3DBlueprint({
      memoryId: 'mem-toy-1',
      sourceMediaId: 'media-toy-1',
      promptText: 'wooden_express_toy_train.jpg Wooden Express Toy Train & Play Blocks',
      mediaType: 'image',
    });
    assert.equal(toyBp.objectType, 'childhood_toy');
    assert.equal(toyBp.connectedSpace, 'play_area');
    assert.equal(toyBp.generatedGlbAssetRef.priorityTier, 1);

    // Example C: Childhood Story -> AI-Interpreted 3D Keepsake
    const storyBp = buildAndValidateMemoryTo3DBlueprint({
      memoryId: 'mem-story-1',
      sourceMediaId: 'media-story-1',
      promptText: 'secret_treehouse_lantern_story.txt Written childhood story',
      mediaType: 'story',
    });
    assert.equal(storyBp.objectType, 'story_keepsake');
    assert.equal(storyBp.interactionType, 'read_story');
    assert.equal(storyBp.generatedGlbAssetRef.isAiInterpretation, true);

    // Example D: Family Video -> 3D Vintage Television Display
    const videoBp = buildAndValidateMemoryTo3DBlueprint({
      memoryId: 'mem-video-1',
      sourceMediaId: 'media-video-1',
      promptText: 'sunday_morning_family_video.mp4 Family Home Video',
      mediaType: 'video',
    });
    assert.equal(videoBp.objectType, 'family_video_display');
    assert.equal(videoBp.connectedSpace, 'bedroom');
    assert.equal(videoBp.interactionType, 'play_video');

    console.log('✅ Test 13 Passed: All 4 Childhood Memory-to-3D Archetypes & Blueprint Validator verified.');
    passed++;

    // 14. Test: Part 6, 8 & 14 — User Approval Gating, Room Colliders & Three.js GLB Loading/Disposal
    const baseMemory: any = {
      id: 'mem-bike-1',
      roomId: 'childhood',
      title: 'First Red Bicycle',
      date: '1998-06-10',
      year: 1998,
      location: 'Backyard',
      category: 'Photo',
      description: 'Red bicycle',
      story: 'Riding in backyard',
      accessionNumber: 'ACC.1998.10',
      motif: 'treehouse_meadow',
      palette: ['#F4D8AF', '#D38B52', '#442D1C', '#D6A15D'],
      tags: ['Bicycle'],
      memoryTo3DBlueprint: fromRawString, // status is 'pending'
    };

    assert.equal(isMemory3DBlueprintApproved(baseMemory), false);
    const childhoodRoom = INITIAL_ROOMS.find((r) => r.id === 'childhood') || INITIAL_ROOMS[0];
    const collidersPending = buildRoomInteriorColliders(childhoodRoom, undefined, [baseMemory]);
    assert.equal(
      collidersPending.circles.some((c) => c.id === 'memory_3d_obj_mem-bike-1'),
      false,
    );

    const approvedMemory = {
      ...baseMemory,
      memoryTo3DBlueprint: {
        ...fromRawString,
        userApprovalStatus: 'approved' as const,
      },
    };
    assert.equal(isMemory3DBlueprintApproved(approvedMemory), true);
    const collidersApproved = buildRoomInteriorColliders(childhoodRoom, undefined, [approvedMemory]);
    assert.equal(
      collidersApproved.circles.some((c) => c.id === 'memory_3d_obj_mem-bike-1'),
      true,
    );

    // Load 3D object & verify disposal frees all meshes/materials
    const loadedObj = await loadMemoryBlueprint3DObject({
      blueprint: approvedMemory.memoryTo3DBlueprint,
      memory: approvedMemory,
    });
    assert.ok(loadedObj.group);
    assert.equal(loadedObj.group.userData.kind, 'memory_to_3d_object');
    assert.equal(loadedObj.group.userData.memoryId, 'mem-bike-1');
    const disposedCount = disposeMemory3DObject(loadedObj.group);
    assert.ok(disposedCount > 0);

    console.log('✅ Test 14 Passed: User Approval Gating, 3D Colliders, and Three.js Object Disposal verified.');
    passed++;
  }

  // 15. Test: Foundation 1.1 — MemoryVaultService CRUD, Restart Persistence, User Isolation, Atomic Sync & Empty Sync Protection
  {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { MemoryVaultService } = await import('../memoryVaultService');

    const tmpVaultPath = path.join(
      os.tmpdir(),
      `mymuseum-test-vault-${Date.now()}.json`,
    );

    const vault1 = new MemoryVaultService(tmpVaultPath);

    // 15a. Reject disallowed public/shared fallback IDs
    const sharedAttempt = vault1.upsertUserMemories('curator-primary', [
      { id: 'mem-shared-1', roomId: 'childhood', title: 'Disallowed Shared Bucket', type: 'photo' },
    ]);
    assert.equal(sharedAttempt.ok, false);
    assert.equal(sharedAttempt.code, 'INVALID_USER_ID');

    // 15b. Create memory for user_alpha
    const resAlpha = vault1.upsertUserMemories('user_alpha', [
      {
        id: 'mem-alpha-1',
        roomId: 'childhood',
        title: 'Alpha Childhood Photo',
        description: 'First bike in the backyard',
        category: 'Childhood',
        type: 'photo',
        mediaMimeType: 'image/jpeg',
        mediaUrl: 'javascript:alert(1)', // Should be stripped by URI sanitizer
        updatedAt: '2026-05-01T10:00:00.000Z',
      },
      {
        id: 'mem-alpha-2',
        roomId: 'childhood',
        title: 'Alpha Audio Tape',
        type: 'voice_note',
        mediaType: 'audio',
        mediaMimeType: 'audio/mpeg',
        mediaUrl: 'idb://mem-alpha-2',
        updatedAt: '2026-05-01T10:05:00.000Z',
      },
    ]);
    assert.equal(resAlpha.ok, true);
    assert.equal(resAlpha.savedCount, 2);

    // 15c. Update memory with newer updatedAt & protect against stale overwrite
    const updateNewer = vault1.upsertUserMemories('user_alpha', [
      {
        id: 'mem-alpha-1',
        roomId: 'childhood-bedroom',
        title: 'Alpha Childhood Photo (Updated Room)',
        description: 'Moved to bedroom wall',
        type: 'photo',
        mediaMimeType: 'image/jpeg',
        updatedAt: '2026-05-02T12:00:00.000Z',
      },
    ]);
    assert.equal(updateNewer.ok, true);
    assert.equal(vault1.getUserMemory('user_alpha', 'mem-alpha-1')?.roomId, 'childhood-bedroom');
    assert.equal(vault1.getUserMemory('user_alpha', 'mem-alpha-1')?.title, 'Alpha Childhood Photo (Updated Room)');

    // Stale update with older updatedAt must NOT overwrite newer title/roomId
    vault1.upsertUserMemories('user_alpha', [
      {
        id: 'mem-alpha-1',
        roomId: 'childhood',
        title: 'Stale Old Title',
        type: 'photo',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
    ]);
    assert.equal(vault1.getUserMemory('user_alpha', 'mem-alpha-1')?.title, 'Alpha Childhood Photo (Updated Room)');
    assert.equal(vault1.getUserMemory('user_alpha', 'mem-alpha-1')?.roomId, 'childhood-bedroom');

    // 15d. Isolate second user (user_beta) & reject ownership mismatch
    const resBeta = vault1.upsertUserMemories('user_beta', [
      {
        id: 'mem-beta-1',
        roomId: 'childhood',
        title: 'Beta Secret Song',
        type: 'audio',
        mediaMimeType: 'audio/mpeg',
      },
    ]);
    assert.equal(resBeta.ok, true);

    const crossOwnerAttempt = vault1.upsertUserMemories('user_alpha', [
      {
        id: 'mem-hijack-1',
        userId: 'user_beta',
        roomId: 'childhood',
        title: 'Spoofed Owner Record',
        type: 'story',
      },
    ]);
    assert.equal(crossOwnerAttempt.ok, false);
    assert.equal(crossOwnerAttempt.code, 'VALIDATION_FAILED');
    assert.ok(crossOwnerAttempt.errors[0]?.includes('another user'));

    // 15e. Reject invalid records and preserve existing data during failed atomic sync
    const failedSync = vault1.syncUserMemories('user_alpha', [
      {
        id: 'mem-alpha-valid-new',
        roomId: 'childhood',
        title: 'Valid New Memory',
        type: 'photo',
        mediaMimeType: 'image/png',
      },
      {
        id: 'mem-bad-exe',
        roomId: 'childhood',
        title: 'Malicious Payload',
        type: 'document',
        mediaMimeType: 'application/x-msdownload', // Disallowed executable MIME
      },
    ]);
    assert.equal(failedSync.ok, false);
    assert.equal(failedSync.code, 'SYNC_VALIDATION_FAILED');
    assert.equal(failedSync.savedCount, 0);
    // Existing 2 memories for user_alpha must remain intact and untouched
    assert.equal(vault1.listUserMemories('user_alpha').length, 2);
    assert.equal(vault1.getUserMemory('user_alpha', 'mem-alpha-valid-new'), null);

    // 15f. Protect existing data against accidental empty sync
    const emptySyncAttempt = vault1.syncUserMemories('user_alpha', []);
    assert.equal(emptySyncAttempt.ok, false);
    assert.equal(emptySyncAttempt.code, 'EMPTY_SYNC_REJECTED');
    assert.equal(vault1.listUserMemories('user_alpha').length, 2);

    // 15g. Re-instantiate from disk to verify persistence across service restarts
    const vault2 = new MemoryVaultService(tmpVaultPath);
    const alphaList = vault2.listUserMemories('user_alpha');
    const betaList = vault2.listUserMemories('user_beta');

    assert.equal(alphaList.length, 2);
    assert.equal(alphaList[0].mediaUrl, undefined); // Dangerous javascript: URI stripped
    assert.equal(vault2.getUserMemory('user_alpha', 'mem-alpha-2')?.mediaAssets?.[0]?.assetCategory, 'audio');
    assert.equal(betaList.length, 1);
    assert.equal(betaList[0].id, 'mem-beta-1');

    // 15h. Delete single memory and verify persistence
    const delRes = vault2.deleteUserMemory('user_alpha', 'mem-alpha-2');
    assert.equal(delRes.deleted, true);
    assert.equal(vault2.listUserMemories('user_alpha').length, 1);
    assert.equal(vault2.listUserMemories('user_beta').length, 1);

    // 15i. Explicit reset requires confirmReset: true
    const unconfirmedReset = vault2.resetUserMemories('user_alpha', { confirmReset: false });
    assert.equal(unconfirmedReset.ok, false);
    assert.equal(unconfirmedReset.code, 'CONFIRMATION_REQUIRED');
    assert.equal(vault2.listUserMemories('user_alpha').length, 1);

    const confirmedReset = vault2.resetUserMemories('user_alpha', { confirmReset: true });
    assert.equal(confirmedReset.ok, true);
    assert.equal(confirmedReset.clearedCount, 1);
    assert.equal(vault2.listUserMemories('user_alpha').length, 0);
    assert.equal(vault2.listUserMemories('user_beta').length, 1);

    if (fs.existsSync(tmpVaultPath)) {
      fs.unlinkSync(tmpVaultPath);
    }

    console.log('✅ Test 15 Passed: MemoryVaultService CRUD, restart persistence, user isolation, atomic sync rollback, and empty sync protection verified.');
    passed++;
  }

  // 16. Test: Foundation 1.1 — AuthService Security, Compromised Token Revocation, Expiration & Logout Invalidation
  {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { AuthService } = await import('../authService');

    const tmpAuthPath = path.join(
      os.tmpdir(),
      `mymuseum-test-auth-${Date.now()}.json`,
    );
    const auth = new AuthService(tmpAuthPath);

    // 16a. Compromised tokens from previous export are permanently rejected
    const leakedToken1 = '94c714083690dad85c9a951b314d49cd917c85d411136bb4';
    const leakedToken2 = '0c6d963bd55e9df88d2bf462eff497c52be9bbb90cd752fa';
    assert.equal(auth.isTokenRevokedOrCompromised(leakedToken1), true);
    assert.equal(auth.isTokenRevokedOrCompromised(leakedToken2), true);
    assert.equal(auth.getUserBySessionToken(leakedToken1), null);
    assert.equal(auth.getUserBySessionToken(leakedToken2), null);

    // 16b. Isolated guest sessions
    const guest1 = auth.createGuestSession();
    const guest2 = auth.createGuestSession();
    assert.ok(guest1.user.id.startsWith('guest_'));
    assert.ok(guest2.user.id.startsWith('guest_'));
    assert.notEqual(guest1.user.id, guest2.user.id);
    assert.notEqual(guest1.sessionToken, guest2.sessionToken);
    assert.equal(auth.getUserBySessionToken(guest1.sessionToken)?.id, guest1.user.id);

    // 16c. Valid registration & login, plus invalid login rejection
    const reg = auth.registerUser({
      displayName: 'Archivist Ada',
      email: 'curator@mymuseum.test',
      password: 'StrongPass#2026',
      confirmPassword: 'StrongPass#2026',
      termsAccepted: true,
    });
    assert.equal(reg.ok, true);
    assert.ok(reg.sessionToken);
    assert.equal(auth.getUserBySessionToken(reg.sessionToken)?.email, 'curator@mymuseum.test');

    const badLogin = auth.loginUser({
      email: 'curator@mymuseum.test',
      password: 'WrongPassword999',
    });
    assert.equal(badLogin.ok, false);
    assert.equal(badLogin.code, 'INVALID_CREDENTIALS');

    const goodLogin = auth.loginUser({
      email: 'curator@mymuseum.test',
      password: 'StrongPass#2026',
    });
    assert.equal(goodLogin.ok, true);
    assert.ok(goodLogin.sessionToken);

    // 16d. Verify plaintext bearer tokens are NEVER stored on disk (only SHA-256 tokenHash)
    const rawDiskJson = fs.readFileSync(tmpAuthPath, 'utf8');
    assert.equal(rawDiskJson.includes(guest1.sessionToken), false);
    assert.equal(rawDiskJson.includes(guest2.sessionToken), false);
    if (goodLogin.sessionToken) {
      assert.equal(rawDiskJson.includes(goodLogin.sessionToken), false);
    }

    // 16e. Expired session rejection
    const expiredGuest = auth.createGuestSession({ ttlMs: -5000 });
    assert.equal(auth.getUserBySessionToken(expiredGuest.sessionToken), null);

    // 16f. Revoked session on logout & persistence across restart
    const revoked = auth.revokeSession(guest1.sessionToken);
    assert.equal(revoked, true);
    assert.equal(auth.getUserBySessionToken(guest1.sessionToken), null);
    assert.equal(auth.isTokenRevokedOrCompromised(guest1.sessionToken), true);

    const authRestarted = new AuthService(tmpAuthPath);
    assert.equal(authRestarted.getUserBySessionToken(guest1.sessionToken), null);
    assert.equal(authRestarted.isTokenRevokedOrCompromised(guest1.sessionToken), true);
    assert.equal(authRestarted.getUserBySessionToken(guest2.sessionToken)?.id, guest2.user.id);

    // Ensure workspace .data/mymuseum-auth.json does not exist
    assert.equal(fs.existsSync(path.resolve(process.cwd(), '.data', 'mymuseum-auth.json')), false);

    if (fs.existsSync(tmpAuthPath)) {
      fs.unlinkSync(tmpAuthPath);
    }

    console.log('✅ Test 16 Passed: AuthService hashed token storage, compromised token blocklist, expiration, and logout revocation verified.');
    passed++;
  }

  // 17. Test: Foundation 1.1 — Private Vault Access Authorization & Cross-User Isolation
  {
    process.env.MYMUSEUM_SKIP_AUTO_LISTEN = '1';
    const { resolveAuthorizedVaultUserId, authService } = await import('../../../server');

    const sessionA = authService.createGuestSession();
    const sessionB = authService.createGuestSession();

    const makeMockReq = (headers: Record<string, string>) =>
      ({
        headers,
      }) as any;

    // 17a. Reject unauthenticated request (no Authorization header)
    const unauthCheck = resolveAuthorizedVaultUserId(makeMockReq({}));
    assert.equal(unauthCheck.ok, false);
    if (!unauthCheck.ok) {
      assert.equal(unauthCheck.status, 401);
      assert.equal(unauthCheck.code, 'UNAUTHENTICATED_VAULT_ACCESS');
    }

    // 17b. Reject compromised token from leaked .data/mymuseum-auth.json
    const compromisedCheck = resolveAuthorizedVaultUserId(
      makeMockReq({ authorization: 'Bearer 94c714083690dad85c9a951b314d49cd917c85d411136bb4' }),
    );
    assert.equal(compromisedCheck.ok, false);
    if (!compromisedCheck.ok) {
      assert.equal(compromisedCheck.status, 401);
      assert.equal(compromisedCheck.code, 'INVALID_OR_EXPIRED_SESSION');
    }

    // 17c. Reject cross-user access when User A requests User B's vault or 'curator-primary'
    const crossUserQueryCheck = resolveAuthorizedVaultUserId(
      makeMockReq({ authorization: `Bearer ${sessionA.sessionToken}` }),
      sessionB.user.id,
    );
    assert.equal(crossUserQueryCheck.ok, false);
    if (!crossUserQueryCheck.ok) {
      assert.equal(crossUserQueryCheck.status, 403);
      assert.equal(crossUserQueryCheck.code, 'FORBIDDEN_USER_VAULT');
    }

    const curatorFallbackAttempt = resolveAuthorizedVaultUserId(
      makeMockReq({ authorization: `Bearer ${sessionA.sessionToken}` }),
      'curator-primary',
    );
    assert.equal(curatorFallbackAttempt.ok, false);
    if (!curatorFallbackAttempt.ok) {
      assert.equal(curatorFallbackAttempt.status, 403);
      assert.equal(curatorFallbackAttempt.code, 'FORBIDDEN_USER_VAULT');
    }

    // 17d. Succeed when authenticated user accesses their own vault
    const validCheck = resolveAuthorizedVaultUserId(
      makeMockReq({ authorization: `Bearer ${sessionA.sessionToken}` }),
      sessionA.user.id,
    );
    assert.equal(validCheck.ok, true);
    if (validCheck.ok) {
      assert.equal(validCheck.userId, sessionA.user.id);
    }

    // Clean up test sessions
    authService.revokeSession(sessionA.sessionToken);
    authService.revokeSession(sessionB.sessionToken);

    console.log('✅ Test 17 Passed: Private Vault Access authorization, unauthenticated rejection, and cross-user isolation verified.');
    passed++;
  }

  // 18. Test: Foundation 1.1 — Complete Memory Restoration, Server+Local Merge & Media Reference Handling
  {
    const {
      mergeServerAndLocalMemories,
      normalizeServerVaultRecordToMemory,
      localMediaAdapter,
    } = await import('../../utils/mediaStorage');

    // 18a. Normalize server record and preserve room assignment, metadata, and 3D blueprint
    const serverRecord1 = {
      id: 'mem-restore-1',
      roomId: 'childhood-bedroom',
      title: 'Server Updated Title',
      description: 'Restored from server vault',
      category: 'Childhood',
      type: 'photo',
      mediaUrl: 'idb://mem-restore-1',
      updatedAt: '2026-06-02T15:00:00.000Z',
      memoryTo3DBlueprint: { objectType: 'framed_photo' },
    };
    const serverMem1 = normalizeServerVaultRecordToMemory(serverRecord1);
    assert.ok(serverMem1);
    assert.equal(serverMem1.roomId, 'childhood-bedroom');
    assert.equal(serverMem1.title, 'Server Updated Title');

    const localMem1Stale = {
      id: 'mem-restore-1',
      roomId: 'childhood',
      title: 'Older Local Title',
      subtitle: 'Local Subtitle',
      date: '2010-05-01',
      year: 2010,
      location: 'Home',
      category: 'Childhood',
      type: 'image' as const,
      description: 'Stale local description',
      story: 'Stale local version',
      accessionNumber: 'ACC.2010.0001',
      emotionTags: ['Nostalgic'],
      people: [],
      tags: ['childhood'],
      motif: 'courtyard_lanterns' as const,
      palette: ['#F4D8AF', '#D38B52', '#442D1C', '#D6A15D'] as [string, string, string, string],
      isFavorite: false,
      displayOrder: 1,
      updatedAt: '2026-06-01T10:00:00.000Z',
      mediaUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const localMem2OfflineOnly = {
      id: 'mem-offline-2',
      roomId: 'childhood',
      title: 'Created Offline While Disconnected',
      subtitle: 'Offline Note',
      date: '2012-08-15',
      year: 2012,
      location: 'Backyard',
      category: 'Childhood',
      type: 'story' as const,
      description: 'Offline story description',
      story: 'Needs to be pushed to server on reconnect',
      accessionNumber: 'ACC.2012.0002',
      emotionTags: ['Peaceful'],
      people: [],
      tags: ['offline'],
      motif: 'courtyard_lanterns' as const,
      palette: ['#F4D8AF', '#D38B52', '#442D1C', '#D6A15D'] as [string, string, string, string],
      isFavorite: false,
      displayOrder: 2,
      updatedAt: '2026-06-02T16:00:00.000Z',
    };

    const serverRecord3DeletedLocally = {
      id: 'mem-deleted-3',
      roomId: 'childhood',
      title: 'Deleted Offline',
      type: 'story',
      updatedAt: '2026-06-01T09:00:00.000Z',
    };

    // 18b. Merge local and server datasets without duplicates, keeping newest updatedAt and respecting deletion tombstones
    const merged = mergeServerAndLocalMemories(
      [localMem1Stale, localMem2OfflineOnly],
      [serverRecord1, serverRecord3DeletedLocally],
      ['mem-deleted-3'],
    );

    assert.equal(merged.length, 2);
    const restored1 = merged.find((m) => m.id === 'mem-restore-1');
    const restored2 = merged.find((m) => m.id === 'mem-offline-2');
    const deleted3 = merged.find((m) => m.id === 'mem-deleted-3');

    assert.ok(restored1);
    assert.equal(restored1?.title, 'Server Updated Title');
    assert.equal(restored1?.roomId, 'childhood-bedroom');
    // Local inline base64 preview preserved when server only stored idb:// reference
    assert.ok(restored1?.mediaUrl?.startsWith('data:image/png'));
    assert.ok(restored2);
    assert.equal(restored2?.title, 'Created Offline While Disconnected');
    assert.equal(deleted3, undefined);

    // 18c. Media Storage Adapter capabilities clearly state offline browser cache limitations
    const caps = localMediaAdapter.getCapabilities();
    assert.equal(caps.adapterId, 'indexeddb_offline_cache');
    assert.equal(caps.isCloudStorage, false);
    assert.equal(caps.survivesBrowserRefresh, true);
    assert.equal(caps.crossDeviceSyncAvailable, false);

    console.log('✅ Test 18 Passed: Complete memory restoration, timestamp-aware merge reconciliation, deletion tombstones, and media adapter capabilities verified.');
    passed++;
  }

  // 19. Test: Real Server-Side Gemini Curation Service (Consistent Model IDs, Consent, All 6 States & Zero Silent Fallback)
  {
    const { GEMINI_MODELS } = await import('../geminiConfig');
    const { MemoryCurationService } = await import('../memoryCurationService');
    const { GeminiProviderAdapter } = await import('../aiProviders');

    const prevKey = process.env.GEMINI_API_KEY;
    try {
      // 19a. Missing API key -> honest missing_credentials state, never fakes Gemini analysis
      delete process.env.GEMINI_API_KEY;
      const adapterNoKey = new GeminiProviderAdapter();
      const serviceNoKey = new MemoryCurationService();
      assert.equal(adapterNoKey.getStatus().models.textModel, GEMINI_MODELS.primary);
      assert.equal(adapterNoKey.getStatus().models.visionModel, GEMINI_MODELS.vision);
      assert.equal(serviceNoKey.getStatus().model, GEMINI_MODELS.curation);
      assert.equal(GEMINI_MODELS.primary, 'gemini-4-hydrogen');
      assert.equal(serviceNoKey.getStatus().connectionStatus, 'missing_credentials');

      const missingRes = await serviceNoKey.analyzeItem({
        fileName: 'backyard_swing.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        consentGranted: true,
      });
      assert.equal(missingRes.ok, false);
      assert.equal(missingRes.code, 'MISSING_CREDENTIALS');
      assert.equal(missingRes.analyzedBy, 'none');
      assert.equal(missingRes.connectionStatus, 'missing_credentials');

      // 19b. Consent denied -> rejected even when API key is configured
      process.env.GEMINI_API_KEY = 'AIzaSyTestValidKeyLength1234567890abcdef';
      const serviceWithStub = new MemoryCurationService({
        executeModel: async () =>
          JSON.stringify({
            title: 'Should Not Run',
            summary: 'Should not execute without consent.',
            storyDraft: '',
            verifiedFacts: [],
            aiInferences: [],
            detectedEntities: [],
            tags: [],
            emotionTags: [],
            recommendedLocationId: 'childhood',
            placementReason: 'n/a',
            displayRecommendation: 'frame',
            confidenceScore: 0.9,
            uncertainties: [],
          }),
      });
      const noConsentRes = await serviceWithStub.analyzeItem({
        fileName: 'family_picnic.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        consentGranted: false,
      });
      assert.equal(noConsentRes.ok, false);
      assert.equal(noConsentRes.code, 'CONSENT_REQUIRED');

      // 19c. Valid live Gemini JSON response -> ok: true, analyzedBy: 'gemini', modelUsed matches GEMINI_MODELS.curation
      const statusEvents: string[] = [];
      const serviceSuccess = new MemoryCurationService({
        onStatusUpdate: (status) => statusEvents.push(status),
        executeModel: async ({ model }) => {
          assert.equal(model, GEMINI_MODELS.curation);
          return JSON.stringify({
            suggestedTitle: 'Afternoon Backyard Swing',
            suggestedDescription: 'A sunlit wooden swing beneath garden trees.',
            suggestedDate: '',
            suggestedLocation: '',
            suggestedTags: ['backyard', 'swing'],
            suggestedPeople: [],
            mainSubject: 'Wooden backyard swing',
            eventContext: 'Outdoor afternoon play',
            detectedObjects: ['swing', 'trees'],
            detectedActivities: ['playing outdoors'],
            sceneCues: ['sunlit yard'],
            extractedText: '',
            explicitDates: [],
            topics: ['childhood play'],
            verifiedFacts: ['File uploaded: backyard_swing.jpg'],
            aiInferences: ['Outdoor sunlit garden setting visible in image'],
            uncertainInfo: ['Date and people are not confirmed in the uploaded file.'],
            recommendedLocationId: 'backyard',
            recommendedReason: 'Visible outdoor play scene matches Backyard & Playgrounds.',
            confidenceScore: 0.88,
          });
        },
      });
      const okRes = await serviceSuccess.analyzeItem({
        fileName: 'backyard_swing.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        consentGranted: true,
        existingSpaces: [{ id: 'childhood', name: 'Childhood World', category: 'Childhood' }],
      });
      assert.equal(okRes.ok, true);
      assert.equal(okRes.analyzedBy, 'gemini');
      assert.equal(okRes.modelUsed, 'gemini-4-hydrogen');
      assert.equal(okRes.isDemo, false);
      assert.equal(okRes.isUnsorted, false);
      assert.equal(okRes.connectionStatus, 'connected');
      assert.equal(okRes.report?.recommendedLocationId, 'backyard');
      assert.equal(okRes.suggestedTitle, 'Afternoon Backyard Swing');
      assert.ok(statusEvents.includes('connected'));

      // 19c-ii. User-provided title/description/date take priority over AI suggestions without being overwritten
      const userHintRes = await serviceSuccess.analyzeItem({
        fileName: 'backyard_swing.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        consentGranted: true,
        userTitle: 'Grandpa’s Oak Swing',
        userDescription: 'Our backyard oak tree after rain.',
        userDate: 'Summer 1999',
      });
      assert.equal(userHintRes.ok, true);
      assert.equal(userHintRes.suggestedTitle, 'Grandpa’s Oak Swing');
      assert.equal(userHintRes.suggestedDescription, 'Our backyard oak tree after rain.');
      assert.equal(userHintRes.suggestedDate, 'Summer 1999');

      // 19d. Auth failure (401) -> AUTHENTICATION_FAILED / auth_failed
      const serviceAuthFail = new MemoryCurationService({
        executeModel: async () => {
          const err: any = new Error('API key not valid');
          err.status = 401;
          throw err;
        },
      });
      const authRes = await serviceAuthFail.analyzeItem({
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        consentGranted: true,
      });
      assert.equal(authRes.ok, false);
      assert.equal(authRes.code, 'AUTHENTICATION_FAILED');
      assert.equal(authRes.connectionStatus, 'auth_failed');

      // 19e. Rate limit (429) -> RATE_LIMITED / rate_limited
      const serviceRateLimit = new MemoryCurationService({
        executeModel: async () => {
          const err: any = new Error('RESOURCE_EXHAUSTED quota exceeded');
          err.status = 429;
          throw err;
        },
      });
      const rateRes = await serviceRateLimit.analyzeItem({
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        consentGranted: true,
      });
      assert.equal(rateRes.ok, false);
      assert.equal(rateRes.code, 'RATE_LIMITED');
      assert.equal(rateRes.connectionStatus, 'rate_limited');

      // 19f. Provider unavailable (503) -> PROVIDER_UNAVAILABLE / provider_unavailable
      const serviceUnavailable = new MemoryCurationService({
        executeModel: async () => {
          const err: any = new Error('503 Service Unavailable');
          err.status = 503;
          throw err;
        },
      });
      const unavailRes = await serviceUnavailable.analyzeItem({
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        consentGranted: true,
      });
      assert.equal(unavailRes.ok, false);
      assert.equal(unavailRes.code, 'PROVIDER_UNAVAILABLE');
      assert.equal(unavailRes.connectionStatus, 'provider_unavailable');

      // 19g. Invalid / non-JSON AI response -> INVALID_AI_RESPONSE / invalid_response (never silently falls back)
      const serviceInvalidJson = new MemoryCurationService({
        executeModel: async () => 'Sorry, I cannot output JSON right now.',
      });
      const invalidRes = await serviceInvalidJson.analyzeItem({
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        consentGranted: true,
      });
      assert.equal(invalidRes.ok, false);
      assert.equal(invalidRes.code, 'INVALID_AI_RESPONSE');
      assert.equal(invalidRes.connectionStatus, 'invalid_response');
      assert.equal(invalidRes.analyzedBy, 'none');

      // 19h. Request timeout -> PROVIDER_UNAVAILABLE, retryable: true
      const serviceTimeout = new MemoryCurationService({
        timeoutMs: 25,
        executeModel: () => new Promise<string>(() => {}),
      });
      const timeoutRes = await serviceTimeout.analyzeItem({
        fileName: 'slow_photo.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        consentGranted: true,
      });
      assert.equal(timeoutRes.ok, false);
      assert.equal(timeoutRes.code, 'PROVIDER_UNAVAILABLE');
      assert.equal(timeoutRes.retryable, true);
      assert.equal(timeoutRes.connectionStatus, 'provider_unavailable');

      // 19i. Low-confidence (< 0.55) -> routed to keepsake_corner with isUnsorted: true and warning
      const serviceLowConf = new MemoryCurationService({
        executeModel: async () =>
          JSON.stringify({
            suggestedTitle: 'Blurry Snapshot',
            suggestedDescription: 'An indistinct photograph with low visual clarity.',
            recommendedLocationId: 'treehouse',
            recommendedReason: 'Unclear outdoor background.',
            confidenceScore: 0.32,
            verifiedFacts: ['Uploaded image file received.'],
          }),
      });
      const lowConfRes = await serviceLowConf.analyzeItem({
        fileName: 'blurry.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'photo',
        consentGranted: true,
      });
      assert.equal(lowConfRes.ok, true);
      assert.equal(lowConfRes.isUnsorted, true);
      assert.equal(lowConfRes.report?.recommendedLocationId, 'keepsake_corner');
      assert.ok(lowConfRes.warnings.some((w) => w.toLowerCase().includes('low analysis confidence')));

      // 19j. Unsupported media/location pairing -> auto-corrected by validateLocationPlacement with warning
      const serviceMismatch = new MemoryCurationService({
        executeModel: async () =>
          JSON.stringify({
            suggestedTitle: 'Cassette Voice Note',
            suggestedDescription: 'A childhood voice recording.',
            recommendedLocationId: 'bicycle_trail',
            recommendedReason: 'Outdoor sounds.',
            confidenceScore: 0.85,
            verifiedFacts: ['Audio clip uploaded.'],
          }),
      });
      const mismatchRes = await serviceMismatch.analyzeItem({
        fileName: 'lullaby.mp3',
        mimeType: 'audio/mpeg',
        mediaType: 'audio',
        consentGranted: true,
      });
      assert.equal(mismatchRes.ok, true);
      assert.notEqual(mismatchRes.report?.recommendedLocationId, 'bicycle_trail');
      assert.ok(mismatchRes.warnings.length > 0);
    } finally {
      if (prevKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = prevKey;
      }
    }

    console.log('✅ Test 19 Passed: Real Gemini Curation Service verified across all 6 connection states, consent gating, timeout, low-confidence routing, media validation, user context preservation, and zero silent fallback.');
    passed++;
  }

  // 20. Test: 3D Childhood World Placement Resolver (All 12 Locations, Multi-Photo Spacing & Overflow Routing)
  {
    const { CHILDHOOD_WORLD_LOCATION_CATALOGUE } = await import('../../types/curation');
    const { resolve3DPlacementPosition } = await import('../../utils/roomExhibition3D');

    const allLocationIds = Object.keys(CHILDHOOD_WORLD_LOCATION_CATALOGUE) as Array<
      keyof typeof CHILDHOOD_WORLD_LOCATION_CATALOGUE
    >;
    assert.equal(allLocationIds.length, 12);

    const fallback = { x: 0, y: 1.5, z: 0, rotY: 0 };
    const slot0Coords: Array<{ id: string; x: number; y: number; z: number }> = [];

    for (const locId of allLocationIds) {
      const p0 = resolve3DPlacementPosition({ curatedZoneId: locId }, 0, fallback);
      const p1 = resolve3DPlacementPosition({ curatedZoneId: locId }, 1, fallback);
      const p2 = resolve3DPlacementPosition({ curatedZoneId: locId }, 2, fallback);

      // Coordinates must be finite numbers and mapped to the exact zone
      for (const p of [p0, p1, p2]) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
        assert.equal(p.zoneKey, locId);
      }

      // Multiple photos in the same zone must NOT overlap
      const dist01 = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
      const dist12 = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
      assert.ok(dist01 > 0.5, `Zone ${locId} slot 0 and 1 overlapped (dist=${dist01})`);
      assert.ok(dist12 > 0.5, `Zone ${locId} slot 1 and 2 overlapped (dist=${dist12})`);

      slot0Coords.push({ id: locId, x: p0.x, y: p0.y, z: p0.z });
    }

    // All 9 locations must have distinct primary coordinates (no two zones stacked on each other)
    for (let i = 0; i < slot0Coords.length; i++) {
      for (let j = i + 1; j < slot0Coords.length; j++) {
        const a = slot0Coords[i];
        const b = slot0Coords[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        assert.ok(
          dist > 0.8,
          `Zones ${a.id} and ${b.id} are too close or overlapping (dist=${dist})`,
        );
      }
    }

    // Overflow beyond slot 5 (>= 6) routes cleanly to perimeter meadow gallery without overlapping
    const ov6 = resolve3DPlacementPosition({ curatedZoneId: 'backyard' }, 6, fallback);
    const ov7 = resolve3DPlacementPosition({ curatedZoneId: 'backyard' }, 7, fallback);
    assert.equal(ov6.zoneKey, 'backyard_overflow');
    assert.equal(ov7.zoneKey, 'backyard_overflow');
    assert.equal(ov6.needsEaselStand, true);
    assert.ok(Math.hypot(ov7.x - ov6.x, ov7.z - ov6.z) > 1.0);

    console.log('✅ Test 20 Passed: resolve3DPlacementPosition covers all 9 Childhood World locations with zero overlap and overflow routing.');
    passed++;
  }

  // 21. Task-Specific Gemini Model Routing, Unverified-Until-Success Connection Status, Placeholder Rejection & Image Validation
  {
    const {
      GEMINI_MODELS,
      resolveGeminiModelForTask,
      isValidGeminiApiKey,
      redactSecretsFromMessage,
      classifyGeminiError,
      sanitizeBase64ImageInput,
    } = await import('../geminiConfig');
    const { GeminiProviderAdapter } = await import('../aiProviders');
    const { MemoryCurationService } = await import('../memoryCurationService');

    // 21a. Task routing
    assert.equal(resolveGeminiModelForTask('image_understanding'), GEMINI_MODELS.vision);
    assert.equal(resolveGeminiModelForTask('metadata_extraction'), GEMINI_MODELS.metadata);
    assert.equal(resolveGeminiModelForTask('memory_classification'), GEMINI_MODELS.classification);
    assert.equal(resolveGeminiModelForTask('collection_descriptions'), GEMINI_MODELS.curation);
    assert.equal(resolveGeminiModelForTask('caption_generation', { hasImageInput: true }), GEMINI_MODELS.vision);
    assert.equal(resolveGeminiModelForTask('image_generation'), GEMINI_MODELS.image);
    assert.equal(resolveGeminiModelForTask('video_generation'), GEMINI_MODELS.video);

    // 21b. Placeholder key rejection & secret redaction
    assert.equal(isValidGeminiApiKey('MY_GEMINI_API_KEY'), false);
    assert.equal(isValidGeminiApiKey('YOUR_GEMINI_API_KEY_HERE'), false);
    assert.equal(isValidGeminiApiKey('<GEMINI_API_KEY>'), false);
    assert.equal(isValidGeminiApiKey('REPLACE_WITH_REAL_KEY_12345'), false);
    assert.equal(isValidGeminiApiKey('TODO_ADD_API_KEY_123456'), false);
    assert.equal(isValidGeminiApiKey('AIzaSyRealLookingValidKey9876543210'), true);
    assert.equal(
      redactSecretsFromMessage('Failed with key AIzaSyRealLookingValidKey9876543210 in URL'),
      'Failed with key [REDACTED_KEY] in URL',
    );

    // 21c. Unverified status when key exists before any request succeeds
    const adapterWithKey = new GeminiProviderAdapter(() => 'AIzaSyRealLookingValidKey9876543210');
    assert.equal(adapterWithKey.isConfigured(), true);
    assert.equal(adapterWithKey.getStatus().connectionStatus, 'unverified');
    assert.equal(adapterWithKey.getStatus().verified, false);
    adapterWithKey.recordExternalOutcome('connected', undefined, GEMINI_MODELS.primary);
    assert.equal(adapterWithKey.getStatus().connectionStatus, 'connected');
    assert.equal(adapterWithKey.getStatus().verified, true);

    const curationWithKey = new MemoryCurationService({
      getApiKey: () => 'AIzaSyRealLookingValidKey9876543210',
    });
    assert.equal(curationWithKey.getStatus().connectionStatus, 'unverified');
    assert.equal(curationWithKey.getStatus().verified, false);

    // 21d. MODEL_UNAVAILABLE classification on 404
    const err404: any = new Error('models/nonexistent-model is not found for API version v1beta');
    err404.status = 404;
    const classified404 = classifyGeminiError(err404);
    assert.equal(classified404.code, 'MODEL_UNAVAILABLE');
    assert.equal(classified404.connectionStatus, 'provider_unavailable');

    // 21e. Base64 image & MIME validation
    const validPng = sanitizeBase64ImageInput(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    );
    assert.equal(validPng.ok, true);
    assert.equal(validPng.mimeType, 'image/png');
    assert.ok(validPng.base64Data && !validPng.base64Data.startsWith('data:'));

    const invalidMime = sanitizeBase64ImageInput(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'application/x-msdownload',
    );
    assert.equal(invalidMime.ok, false);

    console.log('✅ Test 21 Passed: Task-specific model routing, unverified-until-tested connection status, placeholder rejection, secret redaction, MODEL_UNAVAILABLE classification, and base64 validation.');
    passed++;
  }

  // 22. Unsupported/Oversized Uploads, AQ.* Secret Redaction, Fallback Model Attribution, Unknown Marking & Review-Before-Save
  {
    const { redactSecretsFromMessage, validateMemoryUploadMediaInput } =
      await import('../geminiConfig');
    const { MemoryCurationService } = await import('../memoryCurationService');
    const { buildFinalMemoryFromReview } = await import('../../utils/curationPipeline');

    // 22a. Redact AQ.* and Bearer tokens as well as AIza*
    assert.equal(
      redactSecretsFromMessage(
        'Error using AQ.Ab8RN6FakeTokenExample1234567890 and Bearer sk_live_secret_token_987654',
      ),
      'Error using [REDACTED_KEY] and Bearer [REDACTED_TOKEN]',
    );

    // 22b. Reject unsupported file formats (.zip, .exe, unsupported MIME) cleanly with 400 INVALID_INPUT
    const zipCheck = validateMemoryUploadMediaInput({
      fileName: 'archive.zip',
      mimeType: 'application/zip',
    });
    assert.equal(zipCheck.ok, false);
    assert.equal(zipCheck.code, 'INVALID_INPUT');
    assert.equal(zipCheck.httpStatus, 400);

    // 22c. Reject oversized files (> 50 MB declared or > 8 MB audio) cleanly with 413 PAYLOAD_TOO_LARGE
    const hugeFileCheck = validateMemoryUploadMediaInput({
      fileName: 'huge-home-video.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 62 * 1024 * 1024,
    });
    assert.equal(hugeFileCheck.ok, false);
    assert.equal(hugeFileCheck.code, 'PAYLOAD_TOO_LARGE');
    assert.equal(hugeFileCheck.httpStatus, 413);

    // 22d. MemoryCurationService rejects unsupported upload BEFORE calling Gemini, and tracks fallback modelUsed + unknown fields
    let modelCalls = 0;
    const svc = new MemoryCurationService({
      getApiKey: () => 'AIzaSyTestValidationKey1234567890',
      executeModel: async () => {
        modelCalls++;
        return {
          text: JSON.stringify({
            suggestedTitle: 'Sunny Bicycle Note',
            suggestedDescription: 'A short written note describing a red bicycle ride after school.',
            assistantResponse: 'This written memory fits neatly on your Bookshelf.',
            suggestedDate: '',
            suggestedLocation: '',
            suggestedTags: ['bicycle', 'summer'],
            topics: ['childhood cycling', 'summer afternoons'],
            suggestedPeople: [],
            verifiedFacts: ['Written note mentions a red bicycle after school.'],
            aiInferences: ['Likely a warm-weather afternoon memory.'],
            uncertainInfo: [],
            recommendedLocationId: 'bookshelf',
            recommendedReason: 'Written reflections belong on the Childhood Room Bookshelf.',
            confidenceScore: 0.9,
          }),
          modelUsed: 'gemini-3.1-flash-lite',
        };
      },
    });

    const badZipRes = await svc.analyzeItem({
      fileName: 'malware.exe',
      mimeType: 'application/x-msdownload',
    });
    assert.equal(badZipRes.ok, false);
    assert.equal(badZipRes.code, 'INVALID_INPUT');
    assert.equal(badZipRes.httpStatus, 400);
    assert.equal(modelCalls, 0);

    const badPdfRes = await svc.analyzeItem({
      fileName: 'notes.pdf',
      mimeType: 'application/pdf',
    });
    assert.equal(badPdfRes.ok, false);
    assert.equal(badPdfRes.code, 'INVALID_INPUT');
    assert.equal(badPdfRes.httpStatus, 400);

    const photoRes = await svc.analyzeItem({
      fileName: 'red-bike.jpg',
      mimeType: 'image/jpeg',
      sourceType: 'image',
      extractedText: 'Red bicycle parked outside after school.',
    });
    assert.equal(photoRes.ok, true);
    assert.equal(photoRes.modelUsed, 'gemini-3.1-flash-lite');
    assert.equal(photoRes.report?.modelUsed, 'gemini-3.1-flash-lite');
    assert.equal(photoRes.report?.autoPlacedIn3D, false);
    assert.deepEqual(photoRes.suggestedThemes, ['childhood cycling', 'summer afternoons']);
    assert.equal(photoRes.suggestedDate, '');
    assert.equal(photoRes.suggestedLocation, '');
    assert.ok(
      (photoRes.report?.uncertainInfo || []).some((u) => /date|year/i.test(u)),
      'Unknown date should be explicitly noted in uncertainInfo',
    );

    // 22e. Review-before-save: Approve with edits vs Reject AI & Save Original
    const draftMemory: any = {
      id: 'mem-review-1',
      ownerId: 'user-1',
      roomId: 'childhood',
      title: 'Sunny Bicycle Photo',
      subtitle: 'Cupboard & Photo Display',
      type: 'image',
      mediaType: 'image',
      mediaFileName: 'red-bike.jpg',
      date: '',
      year: 2026,
      location: '',
      people: [],
      emotionTags: ['Preserved Archive'],
      category: 'Photo',
      description: 'A red bicycle parked outside after school.',
      story: 'I rode my red bicycle down the quiet street after school.',
      accessionNumber: 'ACC.2026.REV1',
      motif: 'treehouse_meadow',
      palette: ['#F4D8AF'],
      tags: ['childhood cycling'],
      aiSummary: 'Fits in Cupboard & Photo Display.',
      assistantNote: 'Fits in Cupboard & Photo Display.',
      curatedZoneId: 'memory_wall',
      hiddenFrom3D: true,
      userProvided: {
        title: 'My Red Bike',
        description: 'Photo from my childhood street.',
        date: '1998',
      },
      aiSuggestions: {
        title: 'Sunny Bicycle Photo',
        description: 'AI description',
        tags: ['childhood cycling'],
        locationId: 'memory_wall',
        modelUsed: 'gemini-3.1-flash-lite',
      },
      curationReport: photoRes.report,
    };

    const approvedMem = buildFinalMemoryFromReview({
      memory: draftMemory,
      mode: 'approved',
      edits: {
        title: 'Red Bike After School',
        description: 'Edited description by user.',
        date: '1998',
        themes: ['cycling', 'after school'],
        locationId: 'study_corner',
      },
    });
    assert.equal(approvedMem.hiddenFrom3D, false);
    assert.equal(approvedMem.title, 'Red Bike After School');
    assert.equal(approvedMem.curatedZoneId, 'study_corner');
    assert.equal(approvedMem.confirmationStatus, 'user_edited');
    assert.deepEqual(approvedMem.tags, ['cycling', 'after school']);
    assert.ok(approvedMem.aiSuggestions, 'Approved memory keeps aiSuggestions attribution separate');

    const rejectedAiMem = buildFinalMemoryFromReview({
      memory: draftMemory,
      mode: 'rejected_ai_saved_manual',
      edits: {
        locationId: 'keepsake_corner',
      },
    });
    assert.equal(rejectedAiMem.hiddenFrom3D, false);
    assert.equal(rejectedAiMem.title, 'My Red Bike');
    assert.equal(rejectedAiMem.description, 'Photo from my childhood street.');
    assert.equal(rejectedAiMem.date, '1998');
    assert.equal(rejectedAiMem.confirmationStatus, 'manual_no_ai');
    assert.equal(rejectedAiMem.aiSuggestions, undefined);
    assert.equal(rejectedAiMem.curationReport, undefined);
    assert.equal(rejectedAiMem.mediaFileName, 'red-bike.jpg');

    console.log('✅ Test 22 Passed: Unsupported/oversized upload rejection, AQ.*/Bearer secret redaction, fallback model tracking, unknown-field transparency, and review/edit/reject-before-save.');
    passed++;
  }

  // -------------------------------------------------------------------------
  // Test 23: Strict Photo/Video/Music Allowlist, PDF/Doc/Chat Rejection,
  // Automatic Room Placement (Radio, Projector, Cupboard), & Video/Audio Disk Persistence
  // -------------------------------------------------------------------------
  {
    // 23a. Client validator accepts ONLY supported photo, video, and music extensions
    const allowedSamples: Array<{
      name: string;
      type: string;
      expected: 'image' | 'video' | 'audio';
    }> = [
      { name: 'family.jpg', type: 'image/jpeg', expected: 'image' },
      { name: 'picnic.jpeg', type: 'image/jpeg', expected: 'image' },
      { name: 'drawing.png', type: 'image/png', expected: 'image' },
      { name: 'garden.webp', type: 'image/webp', expected: 'image' },
      { name: 'birthday.mp4', type: 'video/mp4', expected: 'video' },
      { name: 'vacation.mov', type: 'video/quicktime', expected: 'video' },
      { name: 'clip.webm', type: 'video/webm', expected: 'video' },
      { name: 'lullaby.mp3', type: 'audio/mpeg', expected: 'audio' },
      { name: 'piano.wav', type: 'audio/wav', expected: 'audio' },
      { name: 'song.m4a', type: 'audio/mp4', expected: 'audio' },
      { name: 'melody.ogg', type: 'audio/ogg', expected: 'audio' },
    ];
    for (const sample of allowedSamples) {
      const check = validateUploadFileCandidate({
        name: sample.name,
        type: sample.type,
        size: 1024,
      });
      assert.equal(check.valid, true, `Expected ${sample.name} to be accepted`);
      assert.equal(check.detectedMediaType, sample.expected);
    }

    // 23b. Client validator strictly rejects PDFs, documents, and chat files
    const rejectedSamples = [
      { name: 'report.pdf', type: 'application/pdf' },
      { name: 'whatsapp-chat.txt', type: 'text/plain' },
      { name: 'messages.json', type: 'application/json' },
      { name: 'letter.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { name: 'chat-export.chat', type: '' },
      { name: 'animated.gif', type: 'image/gif' },
    ];
    for (const bad of rejectedSamples) {
      const check = validateUploadFileCandidate({
        name: bad.name,
        type: bad.type,
        size: 1024,
      });
      assert.equal(check.valid, false, `Expected ${bad.name} to be rejected`);
      assert.equal(check.code, 'UNSUPPORTED_FORMAT');
      assert.ok(
        check.reason && /JPG|MP4|MP3/i.test(check.reason),
        'Rejection message should explain supported formats',
      );
    }

    // 23c. Automatic placement routes Music -> Radio, Video -> Projector, Photo -> Cupboard & Photo Display
    const radioPlace = resolveAutomaticRoomPlacement('audio');
    assert.equal(radioPlace.linkedObjectId, 'memory_radio');
    assert.equal(radioPlace.curatedZoneId, 'memory_radio');

    const projectorPlace = resolveAutomaticRoomPlacement('video');
    assert.equal(projectorPlace.linkedObjectId, 'memory_projector');
    assert.equal(projectorPlace.curatedZoneId, 'outdoor_cinema');

    const cupboardPlace = resolveAutomaticRoomPlacement('image');
    assert.equal(cupboardPlace.linkedObjectId, 'wardrobe');
    assert.equal(cupboardPlace.curatedZoneId, 'memory_wall');

    // 23d. Server MemoryVaultService rejects PDF/document/chat uploads and persists video+poster cleanly
    const tmpVault23 = path.join(
      os.tmpdir(),
      `memora-vault-media-test-${Date.now()}.json`,
    );
    const vault23 = new MemoryVaultService(tmpVault23);
    const pdfSave = vault23.upsertUserMemories('user_media_test', [
      {
        id: 'mem-pdf-blocked',
        roomId: 'childhood',
        title: 'Blocked PDF',
        type: 'document',
        mediaFileName: 'blocked.pdf',
        mediaMimeType: 'application/pdf',
      },
    ]);
    assert.equal(pdfSave.ok, false);
    assert.equal(pdfSave.code, 'VALIDATION_FAILED');

    const chatSave = vault23.upsertUserMemories('user_media_test', [
      {
        id: 'mem-chat-blocked',
        roomId: 'childhood',
        title: 'Blocked Chat',
        type: 'chat',
        mediaFileName: 'chat.txt',
        mediaMimeType: 'text/plain',
      },
    ]);
    assert.equal(chatSave.ok, false);

    // Video with both mediaUrl (video/mp4) and customImageUrl (JPEG poster) must save the MP4 binary, NOT overwrite mediaUrl with the JPEG poster
    const fakeMp4Base64 = Buffer.from('00000018667479706d703432', 'hex').toString('base64');
    const fakeJpgBase64 = Buffer.from('ffd8ffe000104a464946', 'hex').toString('base64');
    const videoSave = vault23.upsertUserMemories('user_media_test', [
      {
        id: 'mem-vid-1',
        roomId: 'childhood',
        title: 'Summer Clip',
        type: 'video',
        mediaType: 'video',
        mediaFileName: 'summer.mp4',
        mediaMimeType: 'video/mp4',
        mediaUrl: `data:video/mp4;base64,${fakeMp4Base64}`,
        customImageUrl: `data:image/jpeg;base64,${fakeJpgBase64}`,
      },
    ]);
    assert.equal(videoSave.ok, true);
    const storedVideo = vault23.getUserMemory('user_media_test', 'mem-vid-1');
    assert.equal(storedVideo?.storedMediaFile?.mimeType, 'video/mp4');
    assert.equal(storedVideo?.mediaUrl, '/api/storage/media/mem-vid-1');
    assert.ok(
      storedVideo?.customImageUrl?.startsWith('data:image/jpeg;base64,'),
      'Video poster thumbnail should remain preserved alongside durable video URL',
    );

    const fakeMp3Base64 = Buffer.from('49443303000000000000', 'hex').toString('base64');
    const audioSave = vault23.upsertUserMemories('user_media_test', [
      {
        id: 'mem-aud-1',
        roomId: 'childhood',
        title: 'Bedtime Song',
        type: 'audio',
        mediaType: 'audio',
        mediaFileName: 'bedtime.mp3',
        mediaMimeType: 'audio/mpeg',
        mediaUrl: `data:audio/mpeg;base64,${fakeMp3Base64}`,
      },
    ]);
    assert.equal(audioSave.ok, true);
    const storedAudio = vault23.getUserMemory('user_media_test', 'mem-aud-1');
    assert.equal(storedAudio?.storedMediaFile?.mimeType, 'audio/mpeg');
    assert.equal(storedAudio?.mediaUrl, '/api/storage/media/mem-aud-1');

    // Clean up temporary test vault and media files
    vault23.deleteUserMemory('user_media_test', 'mem-vid-1');
    vault23.deleteUserMemory('user_media_test', 'mem-aud-1');
    if (fs.existsSync(tmpVault23)) fs.unlinkSync(tmpVault23);

    console.log('✅ Test 23 Passed: Strict Photo/Video/Music allowlist, PDF/Doc/Chat rejection, automatic Radio/Projector/Cupboard placement, and video/audio vault persistence.');
    passed++;
  }

  console.log(`\n🎉 All ${passed}/23 AI Provider, Gemini Curation, 3D Placement, Memory-to-3D, Persistence & Security tests passed!`);
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
