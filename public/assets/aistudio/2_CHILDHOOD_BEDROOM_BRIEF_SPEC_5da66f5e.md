# MEMORA — COMPLETE INTERACTIVE CHILDHOOD BEDROOM
## Detailed 3D Experience Development Brief

Act as a senior 3D game developer, Three.js engineer, interaction designer and environment artist.

Your task is to upgrade the existing MEMORA project and create a realistic, immersive and fully interactive Childhood Bedroom.

IMPORTANT: First inspect the existing project codebase. Understand its React, TypeScript, Three.js, character controller, camera system, memory storage, uploaded file handling, object interaction and existing components.

Do not rewrite the entire application. Reuse existing architecture and improve it without breaking existing features.

# 1. CORE EXPERIENCE

The user enters a realistic childhood bedroom through a character.

The character must be able to:
- Walk around the room.
- Look around using the camera.
- Approach furniture and objects.
- Discover interactive objects.
- Open drawers and cupboards.
- Pick up and inspect objects.
- Interact with personal memories.
- Watch uploaded videos.
- Listen to uploaded audio.
- View original uploaded photographs.
- Explore special interaction experiences.
- Exit interactions and continue exploring.

This must be a genuine 3D environment, not a collection of static images or ordinary website modals.

All important interactions must take place within the Three.js scene.

# 2. ROOM ENVIRONMENT AND VISUAL QUALITY

Build a realistic nostalgic childhood bedroom.

## Furniture and objects

Include:
- Wooden bed with mattress, pillows and bedsheets.
- Bedside table with functional drawer.
- Trophy and certificate display shelf.
- Large cork pinboard.
- Wooden study table.
- Beige CRT monitor.
- Old CPU tower.
- Keyboard and mouse.
- Wired headphones.
- Study lamp.
- Wooden cupboard.
- School bag.
- Books and notebooks.
- Toys and toy box.
- Cricket bat and ball.
- Wall stickers.
- Old wall clock.
- Window with curtains.
- Small decorations and personal belongings.

Arrange objects naturally with enough walking space.

Avoid an empty showroom appearance. The bedroom should look lived in.

## Materials

Use:
- Aged wooden surfaces with visible grain.
- Slightly faded wall paint.
- Natural cotton bedsheets.
- Aged cream paper.
- Realistic corkboard.
- Old plastic computer materials.
- Metal trophies.
- Glass frames.
- Dusty surfaces where appropriate.

Use PBR materials and realistic texture mapping.

Avoid plain default materials, oversized primitive objects and low-quality placeholders.

# 3. LIGHTING AND ENVIRONMENT ANIMATIONS

The room must feel alive.

## Main sunlight

Create a window as the primary natural light source.

Implementation:
- Use a directional or area-style lighting setup appropriate to the existing renderer.
- Add soft volumetric-looking sun rays from the window.
- Add subtle moving curtain animation.
- Create realistic shadows on the bed and floor.
- Allow light intensity to change subtly.
- Avoid excessive bloom or overexposure.

## Dust particles

Create a subtle dust particle system.

Requirements:
- Dust particles should be visible inside sunlight beams.
- Use small transparent particles.
- Move particles slowly and randomly.
- Use different particle depths and sizes.
- Avoid making the entire room look foggy.
- Reduce or disable particles when performance is low.
- Pause or reduce updates when the room is not visible.

## Other atmosphere animations

Add:
- Gentle curtain movement.
- Slight tree and leaf movement outside the window.
- Subtle light changes.
- Soft lamp glow.
- Realistic object shadows.
- Small ambient movement where appropriate.

Do not animate every object constantly. Keep movement subtle.

# 4. INTERACTION SYSTEM

Build or reuse a central interaction manager.

Every interactive object must support:
- Unique object ID.
- Object type.
- Linked uploaded memory IDs.
- Interaction radius.
- Proximity detection.
- Interaction prompt.
- Animation.
- Camera destination.
- Interaction state.
- Exit behaviour.

Example interaction:

When the character approaches the object:
Show a small prompt:
"E — Interact"

When the character moves away:
Hide the prompt.

When interaction begins:
- Save character position.
- Save camera position.
- Save camera rotation.
- Lock normal movement where required.
- Play interaction animation.
- Move camera to the appropriate view.

When interaction ends:
- Restore the saved character and camera state.
- Unlock movement.
- Return to third-person exploration.

Prevent multiple interactions from opening simultaneously.

# 5. BED AREA — HIDDEN MEMORY BOOK

Create a realistic wooden bed with enough clearance underneath for the character to crawl.

## Step 1: Discover the bed

Character approaches the bed.

Display:
"Something might be hidden underneath."

Interaction:
"E — Look under the bed"

## Step 2: Enter underneath

- Play crawling animation.
- Move character into the under-bed space.
- Transition camera to a low angle.
- Darken the space naturally.
- Reveal the book and flashlight.

## Step 3: Pick up flashlight

Place a flashlight beside the book.

Display:
"E — Pick up torch"

When selected:
- Play pickup animation.
- Attach flashlight to a mouth-held attachment point on the character.
- Activate a spotlight.
- Aim the light using camera direction.
- Create a realistic cone of light.
- Add subtle shadows and illuminated dust particles.

When the character exits the under-bed space:
- Turn off the flashlight.
- Detach it.
- Return it to its original location unless the experience supports persistent possession.

## Step 4: Discover the book

Display:
"E — Open memory book"

When selected:
- Play an opening animation.
- Transition to an overhead camera.
- Position the character beneath the bed.
- Place the open book in front of the character.
- Keep the underside of the bed visible in the upper part of the view.

## Step 5: Book design

Create a realistic 3D scrapbook.

Visual details:
- Old brown leather cover.
- Aged cream pages.
- Slightly curled page corners.
- Vintage photograph borders.
- Dusty surface.
- Soft flashlight lighting.
- Realistic page thickness and shadows.

Populate pages with actual uploaded photographs from the memory collection.

Never replace the actual photograph with an AI-generated version.

## Step 6: Page interaction

- Left arrow: previous page.
- Right arrow: next page.
- Animate page turning.
- Show the character's hand during page turning.
- Add subtle paper movement.
- Disable page turning during an active page animation.
- Show page number.
- Show a helpful empty state if there are no uploaded photographs.

Allow the user to select a photograph to view it in a larger original-image viewer.

## Step 7: Exit

Press Escape or use a visible close control.

- Close book.
- Restore camera.
- Restore character position.
- Return to under-bed exploration.
- Allow the character to crawl out.

# 6. BEDSIDE TABLE — HIDDEN MEMORY DRAWER

Create a realistic wooden bedside table next to the bed.

Include one or more functional drawers.

## Step 1: Approach

When character approaches:
Display:
"E — Open drawer"

## Step 2: Open drawer

- Play realistic drawer-pulling animation.
- Move the drawer along its sliding axis.
- Stop at a natural open position.
- Reveal objects inside.
- Add subtle dust particles when the drawer opens.
- Add a small warm light or use existing bedroom light to reveal the contents.

## Step 3: Drawer contents

The drawer can contain:
- Original uploaded photographs.
- Scanned letters.
- Handwritten notes.
- Documents.
- Envelopes.
- Small memory keepsakes.

Place actual uploaded content inside the drawer using appropriate physical representations.

## Step 4: Pick up objects

When the character selects an item:
- Play a pickup animation.
- Move the object to an inspection position.
- Transition camera to a close-up.
- Display the actual uploaded image or document.
- Support zoom and readable viewing.
- Provide a put-back action.

For archived conversations, display exact original messages and clearly identify them as archived records. Never invent messages.

## Step 5: Close

Character can put the item back and close the drawer.

Animate the drawer closing and return to exploration.

# 7. SHOWPIECE AREA — TROPHIES AND CERTIFICATES

Create a wooden display shelf.

Include:
- Different trophy shapes.
- Medals.
- Certificate frames.
- Small achievement decorations.
- Soft shelf lighting.

## Interaction

1. Character approaches shelf.
2. Display "E — Explore achievements".
3. Individual trophies and frames become selectable.
4. Character selects a certificate.
5. Camera moves closer.
6. Show the original uploaded certificate image in a readable viewer.
7. Allow zoom and close.

## Uploaded data integration

Use uploaded certificate images and verified document data.

AI may recognise a certificate and recommend shelf placement.

Never create fictional awards, names, dates or achievements.

If no certificates are uploaded, keep the shelf decorative or show an empty personalised display state.

# 8. PINBOARD — PERSONAL PHOTO WALL

Create a large corkboard on the bedroom wall.

## Visual design

- Realistic cork material.
- Individual paper photographs.
- Small pushpins on photograph corners.
- Slight photograph rotation.
- Natural uneven arrangement.
- Optional string connections between related photographs.

## Uploaded memory integration

Use original uploaded photographs.

AI recommends photographs for the board based on available evidence and memory relationships.

Preserve source image quality.

## Interaction

1. Character approaches the pinboard.
2. Display "E — Explore photographs".
3. Camera moves closer to the board.
4. Highlight selectable photographs.
5. Character selects a photograph.
6. Show the original image in a large viewer.
7. Allow browsing other photographs.
8. Exit and return to room exploration.

Animate the board photograph slightly when selected, but do not make all photos move constantly.

# 9. STUDY TABLE — RETRO COMPUTER EXPERIENCE

Build a complete old-fashioned computer setup.

## Objects

- Beige CRT monitor.
- CPU tower.
- Keyboard.
- Mouse.
- Wired headphones.
- Desk lamp.
- Mouse pad.
- Books and notebooks.

## Step 1: Approach

Display:
"E — Use computer"

## Step 2: Headphone interaction

- Play a character animation to pick up headphones.
- Attach headphones to the character's head.
- Show a realistic wearing animation.
- Keep the headphones visible during computer mode.

## Step 3: Camera transition

- Character moves into seated position.
- Camera transitions to a seated monitor-facing view.
- Lock normal walking.
- Maintain a natural first-person or over-the-shoulder computer viewpoint.

## Step 4: Monitor activation

- Screen starts dark.
- Play a subtle CRT power-on animation.
- Add screen glow.
- Display a nostalgic boot-up sequence.
- Add subtle screen flicker without excessive flashing.

## Step 5: Desktop interface

Render a retro desktop interface inside the 3D monitor.

Desktop sections:
- My Videos.
- My Music.
- Voice Memories.
- Memory Folders.

Do not render this as an unrelated full-screen webpage.

Use a screen texture, render target or the project's most appropriate existing screen-interaction architecture.

## Step 6: Media playback

Videos:
- Play actual uploaded video files.
- Include pause, resume, volume and close.
- Show a loading state.

Audio:
- Play actual uploaded audio files.
- Include playback controls.
- Never autoplay private recordings.

Memory folders:
- Display real uploaded memory collections.
- Open original media.

## Step 7: Exit

When user presses Escape:
- Stop or pause playback appropriately.
- Close desktop interface.
- Turn monitor off or return to standby.
- Remove headphones with animation.
- Return character to normal standing position.
- Restore third-person camera and movement.

# 10. CUPBOARD AND SCHOOL BAG

## Cupboard

Build a realistic wooden cupboard with opening doors.

Interaction:
- Approach.
- Show "E — Open cupboard".
- Animate both doors.
- Reveal clothes, boxes, toys and personal objects.
- Allow selecting supported memory objects.
- Show linked original uploaded content.

## School bag

Place a school bag beside the study table or cupboard.

Interaction:
- Character picks it up.
- Moves it to the bed.
- Opens the zip.
- Reveals notebooks, drawings, school photographs and certificates.
- Selecting an item opens its original uploaded content.

Use uploaded school-related files only.

# 11. WINDOW EXPERIENCE

Build a realistic bedroom window with curtains.

Interaction:
- Character approaches.
- Show "E — Look outside".
- Character opens the window.
- Play a subtle curtain animation.
- Camera moves to a window-facing angle.
- Display relevant outdoor photographs in an integrated photo viewer or memory sequence.

Add:
- Moving sunlight.
- Subtle outside foliage.
- Gentle ambient sound if available.

Do not fabricate a real location based on a photograph unless verified.

# 12. MEMORY RADIO

Create a vintage radio or cassette player.

Interaction:
- Character approaches and turns the knob.
- Display uploaded audio selections.
- User selects a recording.
- Play the original audio.
- Animate the volume knob.
- Add a subtle speaker vibration effect.
- Allow pause and stop.

Never automatically play private voice recordings.

# 13. MEMORY PROJECTOR

Create a vintage slide projector.

Interaction:
- Character approaches and switches it on.
- Projector beam becomes visible.
- Dust particles appear in the beam.
- Uploaded photographs are projected onto a bedroom wall.
- Character can change slides using physical controls.
- User can open a projected image in its original resolution.

Use actual uploaded photographs.

# 14. CRICKET CORNER

Add a cricket bat and ball.

Interaction:
- Character approaches.
- Picks up the bat.
- Plays a simple batting animation.
- Display related uploaded cricket photographs and videos.
- Allow the user to watch original cricket videos.

Only associate memories with cricket when the uploaded content supports that connection.

# 15. WALL CLOCK AND CALENDAR

Create an old wall clock and calendar.

Interaction:
- Character approaches.
- Clock opens a timeline interface.
- User can explore dates supported by uploaded metadata.
- Selecting a date displays corresponding memories.

Do not infer exact dates from uncertain AI recognition.

# 16. DRAWING WALL

Create a wall area with old drawings and school artwork.

Interaction:
- Character approaches.
- Selects a drawing.
- Removes it from the wall.
- Holds it in an inspection position.
- Opens the original uploaded drawing.
- Allows browsing other uploaded artwork.

Use actual uploaded artwork only.

# 17. VISUAL EFFECTS AND SOUND

Use subtle, realistic effects:
- Dust in sunlight.
- Flashlight beam and shadows.
- CRT screen glow.
- Lamp light.
- Projector light.
- Page-turn animation.
- Drawer movement.
- Curtain movement.
- Small ambient environmental effects.

Add optional subtle sounds:
- Wooden drawer sliding.
- Book opening and paper turning.
- Flashlight switch.
- Keyboard typing.
- Computer power-on.
- Radio knob.
- Projector mechanism.

Allow sound and effects to be muted.

Avoid loud, repetitive or distracting effects.

# 18. CAMERA AND ANIMATION RULES

Create smooth camera transitions between:
- Third-person exploration.
- Under-bed camera.
- Overhead book camera.
- Drawer inspection camera.
- Trophy close-up.
- Pinboard close-up.
- Seated computer camera.
- Window view.

Use easing for camera movement.

Never abruptly teleport the camera unless required by a loading or recovery state.

Keep the character's position consistent when exiting interactions.

Do not allow camera clipping through walls, furniture or the bed.

# 19. MEMORY DATA INTEGRATION

All personalised experiences must connect to actual uploaded user media.

Use existing memory storage and memory IDs.

For every memory object, maintain:
- Unique memory ID.
- Original file reference.
- Media type.
- Available metadata.
- AI analysis result.
- Confidence or verification state where relevant.
- Assigned display location.
- Display format.
- Interaction ID.

Example:
A photograph uploaded by the user should retain its original ID and file reference when displayed inside the book, pinboard or projector.

Avoid unnecessary file duplication.

Do not generate fake personal photographs, letters, chats, dates, certificates or relationships.

If no matching memory exists:
- Show an appropriate empty state.
- Keep the object as a normal room decoration.
- Allow future uploaded memories to populate it.

# 20. PERFORMANCE AND RESPONSIVENESS

The current project has a reported issue where desktop performance lags while mobile works properly.

Pay special attention to desktop performance.

Requirements:
- Reuse and dispose of geometries and materials correctly.
- Optimise textures.
- Use compressed 3D assets where supported.
- Avoid excessive real-time lights.
- Limit particle counts.
- Use efficient shadow settings.
- Use instancing for repeated objects.
- Pause animations outside the visible scene.
- Avoid unnecessary React state updates on every animation frame.
- Use an efficient render loop.
- Implement loading states.
- Test at different resolutions and device capabilities.

Do not reduce visual quality indiscriminately. Use adaptive quality settings.

# 21. IMPLEMENTATION PLAN

Work in the following stages:

Stage 1: Inspect existing project architecture.

Stage 2: Improve bedroom layout, furniture, materials and lighting.

Stage 3: Implement central interaction manager and proximity prompts.

Stage 4: Build bed, under-bed crawling, flashlight and memory book.

Stage 5: Build bedside drawer and uploaded memory inspection.

Stage 6: Build trophy shelf, certificate viewer and pinboard.

Stage 7: Build CRT computer, headphones and media playback.

Stage 8: Build cupboard, school bag, window and radio.

Stage 9: Build projector, cricket corner, calendar and drawing wall.

Stage 10: Add animations, dust, lighting, shadows and sound.

Stage 11: Connect all objects to real uploaded memory data.

Stage 12: Test camera restoration, character movement, media playback, memory persistence and desktop performance.

# 22. TESTING REQUIREMENTS

Test every interaction from beginning to end.

For each object verify:
- Character can approach it.
- Prompt appears at the correct distance.
- Prompt disappears after leaving.
- Interaction starts correctly.
- Correct animation plays.
- Correct camera appears.
- Actual uploaded memory is displayed.
- Empty states work.
- Exit works.
- Character and camera return to their original state.
- No other interaction remains accidentally active.

After implementation, provide:
1. Files changed.
2. New components created.
3. Interactions completed.
4. Uploaded memory connections implemented.
5. Performance improvements made.
6. Known limitations.
7. Build and test results.

Do not claim a feature is complete unless it has been tested in the running application.

FINAL GOAL:

The user should feel as if they have physically entered their childhood bedroom. They should be able to walk around, discover hidden objects, open a drawer, browse old photographs, use a retro computer, listen to voice recordings and explore their actual uploaded memories.

MEMORA should feel personal, immersive, realistic and emotionally engaging.