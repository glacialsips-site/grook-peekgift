/**
 * Side-effect import bootstrapper. Importing this module exactly once at app
 * start (or before the first chat request) populates `TOOL_REGISTRY`. Each
 * tool module registers itself at import time.
 *
 * Order does not matter for correctness, but keep it alphabetical for diffs.
 */

import './add_card';
import './add_variant_group';
import './generate_hero_image';
import './mark_ready_for_publish';
import './ping';
import './remove_card';
import './reorder_cards';
import './scrape_url';
import './set_hero_image';
import './set_note';
import './set_recipient';
import './set_recipient_profile';
import './set_vibe';
import './update_card';
import './update_vibe';

export {};
