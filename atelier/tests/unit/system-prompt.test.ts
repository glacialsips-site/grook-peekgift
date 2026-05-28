import { describe, expect, it } from 'vitest';
import {
  buildSystemBlocks,
  STATIC_SYSTEM_PROMPT_TEXT,
} from '@/lib/anthropic/system-prompt';
import { classifyOccasionToTemplate } from '@/lib/anthropic/classify-occasion';

describe('buildSystemBlocks', () => {
  it('emits exactly 3 blocks when no conditional skill applies', () => {
    const blocks = buildSystemBlocks({ curatorName: 'Frank', peekId: 'p1' });
    expect(blocks).toHaveLength(3);
    expect(blocks[0]?.type).toBe('text');
    expect(blocks[0]?.text).toBe(STATIC_SYSTEM_PROMPT_TEXT);
    // Common skills always present in block 2.
    expect(blocks[1]?.text).toContain('# Skill: copy-house-style');
    expect(blocks[1]?.text).toContain('# Skill: vibe-direction');
    // Block 3 is the dynamic context.
    expect(blocks[2]?.text).toContain('# Context (per-turn)');
    expect(blocks[2]?.text).toContain('Curator: Frank');
    expect(blocks[2]?.text).toContain('Peek: p1');
  });

  it('emits 4 blocks when occasion + voice + cards phases load', () => {
    const blocks = buildSystemBlocks({
      curatorName: 'Sam',
      peekId: 'p2',
      occasionType: 'wedding',
      voiceMode: true,
      cardsPhase: true,
      threadPhase: 'assembling',
    });
    expect(blocks).toHaveLength(4);
    const block3 = blocks[2]?.text ?? '';
    expect(block3).toContain('# Skill: occasion-templates/wedding');
    expect(block3).toContain('# Skill: voice-camera-protocol');
    expect(block3).toContain('# Skill: affiliate-strategy');
  });

  it('loads share-mechanics in post-publish phase', () => {
    const blocks = buildSystemBlocks({
      threadPhase: 'post-publish',
    });
    const block3 = blocks[2]?.text ?? '';
    expect(block3).toContain('# Skill: share-mechanics');
    expect(block3).not.toContain('# Skill: reveal-mechanics');
  });

  it('loads reveal-mechanics in pre-publish + polishing phases', () => {
    const prePublish = buildSystemBlocks({ threadPhase: 'pre-publish' });
    expect(prePublish[2]?.text).toContain('# Skill: reveal-mechanics');
    const polishing = buildSystemBlocks({ threadPhase: 'polishing' });
    expect(polishing[2]?.text).toContain('# Skill: reveal-mechanics');
  });

  it('reports anonymous turn count when supplied', () => {
    const blocks = buildSystemBlocks({ anonymousTurnsRemaining: 1 });
    const block4 = blocks[blocks.length - 1]?.text ?? '';
    expect(block4).toContain('Anonymous turns remaining: 1');
  });

  it('falls back to (anonymous) when curator name is missing', () => {
    const blocks = buildSystemBlocks({ peekId: 'p3' });
    const block4 = blocks[blocks.length - 1]?.text ?? '';
    expect(block4).toContain('Curator: (anonymous)');
  });

  it('replaces the old static prompt with the trimmed base prompt', () => {
    // Smoke test that we replaced the old prompt — the new base talks about
    // "Mutate first, narrate second" rather than the tools-list dump.
    expect(STATIC_SYSTEM_PROMPT_TEXT).toContain('Mutate first, narrate second');
    expect(STATIC_SYSTEM_PROMPT_TEXT).toContain('The shape of the work');
    expect(STATIC_SYSTEM_PROMPT_TEXT).not.toContain('# Tools available');
  });
});

describe('classifyOccasionToTemplate', () => {
  it('maps common occasion strings to templates', () => {
    expect(classifyOccasionToTemplate('wedding')).toBe('wedding');
    expect(classifyOccasionToTemplate('Bachelorette weekend')).toBe(
      'bachelorette',
    );
    expect(classifyOccasionToTemplate('25th anniversary')).toBe('anniversary');
    expect(classifyOccasionToTemplate('baby shower')).toBe('baby-shower');
    expect(classifyOccasionToTemplate('retirement party')).toBe('retirement');
    expect(classifyOccasionToTemplate('graduation')).toBe('teen-grad');
    expect(classifyOccasionToTemplate('80th birthday')).toBe('milestone-bday');
  });

  it('returns null for unmatched strings', () => {
    expect(classifyOccasionToTemplate(null)).toBeNull();
    expect(classifyOccasionToTemplate('')).toBeNull();
    expect(classifyOccasionToTemplate('bday')).toBeNull();
  });
});
