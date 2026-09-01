export type OrcaRole = 'fisherman' | 'researcher' | 'coastal_guard' | 'general';

/**
 * Normalizes any role input string to one of the 4 canonical roles:
 * 'fisherman' | 'researcher' | 'coastal_guard' | 'general'
 */
export function mapRoleToCanonicalRole(rawRole?: string): OrcaRole {
  if (!rawRole) return 'general';
  const norm = rawRole.trim().toLowerCase().replace(/[\s_\-]+/g, '');

  if (norm.includes('fisherman') || norm.includes('fish')) {
    return 'fisherman';
  }
  if (norm.includes('researcher') || norm.includes('research') || norm.includes('marineresearcher')) {
    return 'researcher';
  }
  if (
    norm.includes('coastal') ||
    norm.includes('guard') ||
    norm.includes('officer') ||
    norm.includes('official') ||
    norm.includes('operator') ||
    norm.includes('navy')
  ) {
    return 'coastal_guard';
  }
  return 'general';
}
