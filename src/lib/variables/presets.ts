import type { Idea, VariableIsolator } from '@/types/domain';

/** Copies learner answers only; preset choice never asks AI to fill a design. */
export function createIsolator(idea: Idea, preset: 'science'): Extract<VariableIsolator, { preset: 'science' }>;
export function createIsolator(idea: Idea, preset: 'computing'): Extract<VariableIsolator, { preset: 'computing' }>;
export function createIsolator(idea: Idea, preset: VariableIsolator['preset']): VariableIsolator;
export function createIsolator(idea: Idea, preset: VariableIsolator['preset']): VariableIsolator {
  if (idea.isolator?.preset === preset) return idea.isolator;
  if (preset === 'computing') return {
    preset, input: '', output: '', baseline: '', metric: '', unit: '', dataSplit: '', replicates: 0,
  };
  return {
    preset, independent: idea.variables?.independent ?? '', dependent: idea.variables?.dependent ?? '',
    controlled: idea.variables?.controlled ?? [], controlGroup: idea.variables?.controlGroup ?? '',
    unit: '', replicates: idea.variables?.replicates ?? 0,
  };
}
