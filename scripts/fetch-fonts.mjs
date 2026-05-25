// no-op: vNext loads fonts via @font-face in globals.css. The legacy site command
// (`node scripts/fetch-fonts.mjs && npm run build`) may still be set at the Netlify
// site level for peek-gift — this stub keeps that command working until the site
// build command can be cleared in the Netlify UI.
console.log('[peek-vnext] fetch-fonts stub: nothing to do');
