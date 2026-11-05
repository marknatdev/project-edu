/** All auxiliary local records owned by a Project share the PDPA-erased namespace. */
export const PROJECT_RECORD_KINDS = ['judge', 'advisor', 'presentation'] as const;
export type ProjectRecordKind = typeof PROJECT_RECORD_KINDS[number];

export function projectRecordKey(kind: ProjectRecordKind, projectId: string): string {
  if (!projectId) throw new Error('Missing Project ID');
  return `edtech:${kind}:${encodeURIComponent(projectId)}`;
}
