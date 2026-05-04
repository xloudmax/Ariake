import { MechanismNode } from '../generated/graphql'

/**
 * Represents an analogical cue for a mechanism node.
 */
export interface AnalogicalCue {
  domain: string;
  context: string;
  example: string;
  strategy: string;
}

/**
 * Data passed to the React Flow node.
 */
export interface MechanismNodeData extends Record<string, unknown> {
  title: string;
  active_ingredient?: string | null;
  canonicalName?: string;
  communityId?: number | null;
  score?: number;
  seedScore?: number;
  pathStrength?: number;
  matchReasons?: string[];
  aliases?: string[];
  sourcePostIds?: string[];
  applications?: AnalogicalCue[];
  isRoot: boolean;
  isMechanism: boolean;
}

/**
 * Extends the generated MechanismNode with frontend-specific metadata.
 */
export interface ExtendedMechanismNode extends MechanismNode {
  canonical_name?: string;
  community_id?: number;
  score?: number;
  seed_score?: number;
  path_strength?: number;
  match_reasons?: string[];
  aliases?: string[];
  source_post_ids?: string[];
  children?: ExtendedMechanismNode[];
  applications?: AnalogicalCue[];
}
