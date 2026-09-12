# Runtime assets

Generated with `node scripts/assets.mjs`. Original PNGs are retained unchanged when present. Icons are resized from the approved master, or from the SVG logo on a Kyoto Night field when the master is absent. The maskable variant keeps the central artwork within its safe area. Washi is compressed for offline caching. Jar and star graphics are intentionally code-native in JarCanvas.tsx and physics.ts, with real transparency and shared collision geometry.
