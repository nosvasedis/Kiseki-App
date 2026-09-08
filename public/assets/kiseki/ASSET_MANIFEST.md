# Kiseki visual asset pack

## Runtime audit — 0.1.0

Original PNGs below are preserved as reference artwork. The jar and star sheet are RGB with checkerboard pixels baked in, not transparent PNGs. The jar contains a cork and existing stars. Neither is used as a live physics layer. The Wrapped template contains fixed English lettering and is reference-only.

Production uses runtime/ icon and texture derivatives, existing SVG category symbols, code-native layered glass in src/components/JarCanvas.tsx, shared geometry/origami in src/lib/physics.ts, and dynamic 1080×1920 composition in src/lib/card.ts. Runtime chrome uses the SVG logo and Latin Kiseki with bundled display/UI fonts.

Kyoto Night is the free default theme. Colors: moon, gold, ice, lavender, sakura, jade, peach, aurora. See runtime/README.md for regeneration.

Visual direction: Kyoto Night.

The pack is intentionally split into reusable layers so the same language can serve the PWA first and the later Capacitor Android/iOS builds.

## Core assets

- `brand/kiseki-app-icon-master.png` - master square app icon artwork: glass jar + one luminous star.
- `brand/kiseki-logo.svg` - standalone folded-star and crescent logo mark, with no language-dependent lettering.
- `brand/kiseki-wordmark.svg` - responsive Latin-only `Kiseki` wordmark paired with the folded-star mark.
- `brand/kiseki-tokens.css` - Kyoto Night color, glass, shadow, and typography tokens.
- `illustrations/kiseki-kyoto-night-jar.png` - reusable jar illustration for the hero canvas, empty states, and reveal transitions.
- `stars/kiseki-kyoto-night-star-sprite.png` - five-color origami star sprite sheet: moonlight, gold, ice, lavender, and sakura.
- `textures/kiseki-midnight-washi-texture.png` - low-contrast midnight washi background texture.
- `cards/kiseki-wrapped-kyoto-night-template.png` - 9:16 Wrapped visual template for runtime-generated monthly copy and statistics.
- `icons/kiseki-icons.svg` - vector symbols for effort, kindness, rest, courage, milestone, add-star, and shake-jar actions.

## Usage notes

- Treat generated PNGs as visual source assets; crop or scale them in the app without changing the direction's palette or material language.
- Keep user-specific Wrapped text and statistics in runtime HTML/Canvas layers rather than baking them into the template.
- Use the SVG symbol ids from `icons/kiseki-icons.svg` with `<use href="/assets/kiseki/icons/kiseki-icons.svg#effort" />`.
- Do not add rankings, streak pressure, public scores, or competitive visual language to future screens.
- These are the first approved-direction assets. Additional states, animations, and platform-specific exports should extend this system rather than introduce a second visual language.
