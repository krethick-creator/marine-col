export type OrcaRole = 'fisherman' | 'researcher' | 'coastal_guard' | 'general';

export interface QuickAction {
  id: string;
  labelKey: string;
  query: string;
  iconName: string;
}

export interface RoleConfig {
  role: OrcaRole;
  displayNameKey: string;
  titleKey: string;
  badgeColor: string;
  badgeBg: string;
  dashboardPriority: string[];
  quickActions: QuickAction[];
  assistantStyle: 'practical' | 'scientific' | 'operational' | 'simple';
  technicalLevel: 'simple' | 'advanced' | 'professional' | 'basic';
  tripPlannerDefaultPurpose: 'fishing' | 'research' | 'general' | 'transport';
}

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

export const ROLE_CONFIGS: Record<OrcaRole, RoleConfig> = {
  fisherman: {
    role: 'fisherman',
    displayNameKey: 'auth.fisherman',
    titleKey: 'role.fishermanTitle',
    badgeColor: '#10b981', // green
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    dashboardPriority: ['weather', 'alerts', 'fishing', 'planner', 'boundaries', 'activity'],
    quickActions: [
      { id: 'fish-cond', labelKey: 'quickAction.fishCond', query: 'Can I go fishing today? Check weather, waves, and safety.', iconName: 'Fish' },
      { id: 'fish-zones', labelKey: 'quickAction.fishZones', query: 'Where are the active fishing zones near my area?', iconName: 'Compass' },
      { id: 'plan-trip', labelKey: 'quickAction.planTrip', query: 'Plan a safe fishing trip with marine risk analysis.', iconName: 'Calendar' },
      { id: 'check-restricted', labelKey: 'quickAction.checkRestricted', query: 'Are there any restricted zones or boundaries near me?', iconName: 'Flag' },
      { id: 'check-alerts', labelKey: 'quickAction.checkAlerts', query: 'What are the active marine weather alerts in my region?', iconName: 'ShieldAlert' },
      { id: 'safe-return', labelKey: 'quickAction.safeReturn', query: 'What is the recommended safe return time based on sea state?', iconName: 'Clock' },
    ],
    assistantStyle: 'practical',
    technicalLevel: 'simple',
    tripPlannerDefaultPurpose: 'fishing',
  },
  researcher: {
    role: 'researcher',
    displayNameKey: 'auth.researcher',
    titleKey: 'role.researcherTitle',
    badgeColor: '#8b5cf6', // purple
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    dashboardPriority: ['satellite', 'climate', 'reports', 'weather', 'map', 'activity'],
    quickActions: [
      { id: 'ocean-cond', labelKey: 'quickAction.oceanCond', query: 'Analyze current ocean conditions, SST, and chlorophyll concentration.', iconName: 'Activity' },
      { id: 'sat-data', labelKey: 'quickAction.satData', query: 'Show satellite SST and oceanographic observation data.', iconName: 'Compass' },
      { id: 'climate-trends', labelKey: 'quickAction.climateTrends', query: 'Analyze climatological patterns and historical seasonal trends.', iconName: 'BarChart2' },
      { id: 'gen-report', labelKey: 'quickAction.genReport', query: 'Generate an analytical report on temperature and chlorophyll trends.', iconName: 'FileText' },
      { id: 'compare-params', labelKey: 'quickAction.compareParams', query: 'Compare wave height, swell period, and current velocity.', iconName: 'Cloud' },
      { id: 'explore-datasets', labelKey: 'quickAction.exploreDatasets', query: 'What marine datasets and satellite layers are active for this region?', iconName: 'Map' },
    ],
    assistantStyle: 'scientific',
    technicalLevel: 'advanced',
    tripPlannerDefaultPurpose: 'research',
  },
  coastal_guard: {
    role: 'coastal_guard',
    displayNameKey: 'auth.officer',
    titleKey: 'role.coastalGuardTitle',
    badgeColor: '#ef4444', // red
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    dashboardPriority: ['alerts', 'boundaries', 'map', 'risk', 'planner', 'weather', 'sos'],
    quickActions: [
      { id: 'active-alerts', labelKey: 'quickAction.activeAlerts', query: 'Show active maritime alerts and severe weather warnings.', iconName: 'ShieldAlert' },
      { id: 'nearby-restricted', labelKey: 'quickAction.nearbyRestricted', query: 'Identify nearby restricted maritime zones and boundary clearances.', iconName: 'Flag' },
      { id: 'boundary-analysis', labelKey: 'quickAction.boundaryAnalysis', query: 'What is my current distance and bearing to international maritime boundaries?', iconName: 'Compass' },
      { id: 'route-risk', labelKey: 'quickAction.routeRisk', query: 'Assess operational route safety and environmental hazards.', iconName: 'Calendar' },
      { id: 'live-map-status', labelKey: 'quickAction.liveMapStatus', query: 'Open live map intelligence and boundary safety status.', iconName: 'Map' },
      { id: 'emergency-sos', labelKey: 'quickAction.emergencySos', query: 'Check emergency safety status and maritime rescue protocol.', iconName: 'LifeBuoy' },
    ],
    assistantStyle: 'operational',
    technicalLevel: 'professional',
    tripPlannerDefaultPurpose: 'general',
  },
  general: {
    role: 'general',
    displayNameKey: 'auth.general',
    titleKey: 'role.generalTitle',
    badgeColor: '#3b82f6', // blue
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    dashboardPriority: ['weather', 'ocean', 'alerts', 'planner', 'map', 'activity'],
    quickActions: [
      { id: 'weather-forecast', labelKey: 'quickAction.weatherForecast', query: 'What is today\'s marine weather forecast?', iconName: 'Cloud' },
      { id: 'marine-safety', labelKey: 'quickAction.marineSafety', query: 'Is the sea safe for coastal activities today?', iconName: 'ShieldAlert' },
      { id: 'plan-marine-trip', labelKey: 'quickAction.planMarineTrip', query: 'Help me plan a safe marine trip.', iconName: 'Calendar' },
      { id: 'view-map', labelKey: 'quickAction.viewMap', query: 'Show live map and current weather conditions.', iconName: 'Map' },
    ],
    assistantStyle: 'simple',
    technicalLevel: 'basic',
    tripPlannerDefaultPurpose: 'general',
  },
};
