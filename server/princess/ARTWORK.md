# Generated visual assets

These original raster atlases establish the visual direction for the digital
game. The playing-card, Round, and suit-family art was regenerated with
OpenAI's built-in image-generation tool on August 14, 2026. The Princess art
recovers the initial July 15 portrait atlas and its later Deluxe extension,
reframed into the current unified atlas on August 15, 2026. The complete set is
licensed with the rest of this repository under GPL-3.0-only.

The commercial Rebel Princess materials were used only to identify the required
component categories and rule concepts. These images do not copy the published
illustrations, logo, card frames, or trade dress and were explicitly generated
without imitating the original illustrator or any other named artist.

## Files

- `generated/cards/fairies.png`: Fairy ranks 1–12 in a 6 × 2 row-major grid.
- `generated/cards/queens.png`: Queen ranks 1–12 in a 6 × 2 row-major grid.
- `generated/cards/princes.png`: Prince ranks 1–12 in a 6 × 2 row-major grid.
- `generated/cards/pets.png`: Pet ranks 1–12 in a 6 × 2 row-major grid.
  The species are rabbit, fox, hedgehog, owl, cat, tortoise, squirrel, frog,
  dragon, dog, raven, and fawn.
- `generated/princesses.png`: all twelve restored Princess portraits in one
  6 × 2 row-major grid.
- `generated/round-cards.png`: all twenty-seven Round cards in one 9 × 3
  row-major grid.
- `generated/suit-families.png`: four panels for Fairies, Queens, Princes, and
  Pets. Values, names, and rules are rendered by the client.
- `manifest.json`: stable row-major mapping from grid cells to game IDs.

## Uniform atlas contract

Every source image is an edge-to-edge regular grid with equal cells. Each cell
owns its complete border; there are no outer margins, inter-cell
gutters, shared borders, crop marks, or material outside the grid. Every sheet
is assembled by `scripts/assemble-atlas.ts`. The tool center-crops each source
illustration into a fixed interior and draws the frame appropriate to its game
role. Only the four playing suits use the Pet-inspired ornamental geometry: a
dark jewel-toned ground, layered gold rules, angular corner filigree, and
centered diamond medallions. The Fairy, Queen, Prince, and Pet diamonds contain
a sparkle, crown, sword, and paw respectively. Princesses use a thin white
edge, Round cards use a simple beige frame, and the suit-family overview uses a
thin neutral edge. The tool rejects an atlas unless all four frame-strip hashes
match across every cell at its declared 20-, 12-, or 4-pixel band. Outputs use
dimensions exactly divisible by their grids:

- each gameplay suit: 1800 × 1000, 6 × 2, 300 × 500 cells
- suit families: 1200 × 500, 4 × 1, 300 × 500 cells
- Princesses: 1800 × 1000, 6 × 2, 300 × 500 cells
- Round cards: 2700 × 900, 9 × 3, 300 × 300 cells

Keep typography out of the bitmap assets. HTML-rendered names, values, and rule
text remain exact, accessible, localizable, and deterministic under E2E tests.
The atlases are source assets; an implementation may crop optimized derivatives
during its build without changing the canonical IDs in the manifest.

The app's `/assets` route displays the seven logical atlases, their computed
integer-pixel grids, and all 91 rendered cells. Runtime rendering has one path: `SpriteCard`
selects a regular grid cell with an SVG view box and maps that complete cell
edge-to-edge into its matching frame. No atlas has crop overrides or fit modes.

## Prompt record

All source prompts requested original hand-painted storybook gouache, subtle
paper texture, no logos, no readable text, no watermarks, no existing Rebel
Princess artwork, and no imitation of a named artist. Existing atlases were
supplied only as style references during the August regeneration; every
playing-card character and symbolic Round composition was regenerated.

An initial attempt asked image generation to produce complete multi-card grids.
Although the output bitmap dimensions were divisible by the declared grids,
the model drew ornamental frames at inconsistent offsets inside those cells.
The runtime crop math was exact but some visible cards were therefore narrower,
wider, or clipped. The rejected sheets were replaced by standalone prompts:
one full-bleed illustration per card, explicitly prohibiting borders, outlines,
ornamental frames, rounded rectangles, margins, gutters, and blank strips.
Mechanical card geometry now comes only from the deterministic assembler.

The standalone Fairy prompts use amber, honey-gold, ochre, and bronze; Fairy 10
explicitly remains amber rather than blue. Queen prompts use plum, aubergine,
burgundy, wine, and rose-gold, with blue dominance prohibited in every card.
Prince prompts use midnight blue, cobalt, navy, silver, and restrained antique
gold. Each rank requests a distinct adult character pose, prop, and setting.
Pet artwork remains moss green and emerald, with its fixed species order and the
only Frog at rank 8. Its paw medallion established the ornamental frame language
now shared by the four playing suits, each with its own emblem.

The suit-family prompt specified four 3:5 concept panels: luminous Fairies with
a crystal wand, an empty Queen throne, an abandoned Prince sword/boot/bouquet,
and enchanted Pets centered on a crowned frog. Its palette constraints match
the four gameplay sheets.

The restored Princess art comes from the original ten-portrait atlas generated
on July 15 and the matching two-portrait Deluxe extension. Their generated
ornamental frames are cropped away by the same deterministic atlas assembler
used for the other families. Snow White through the Ice Princess use a shared
36-pixel source inset; the larger two-card Deluxe source uses a 112-pixel inset.
All twelve portraits now share one regular 6 × 2 atlas with 300 × 500 cells and
a thin white edge.

The twenty-seven Round prompts each request one standalone symbolic scene
matching the row-major IDs in `manifest.json`. The assembler center-crops them
into one square-cell atlas and applies a simple beige frame.
