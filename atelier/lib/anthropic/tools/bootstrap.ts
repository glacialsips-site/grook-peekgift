/**
 * Side-effect import bootstrapper. Importing this module exactly once at app
 * start (or before the first chat request) populates `TOOL_REGISTRY`. Each
 * tool module registers itself at import time.
 *
 * Order does not matter for correctness, but keep it alphabetical for diffs.
 */

import './ping';
// Future product tools land below (alphabetical):
// import './add-card';
// import './generate-hero';
// import './scrape-url';
// import './set-recipient';
// import './set-rules';
// import './set-vibe';

export {};
