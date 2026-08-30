/**
 * ORCA Mock Data Provider
 * ─────────────────────────────────────────────────────────────────────
 * All functions in this file return clearly-labeled MOCK/DEMO data.
 * isMockData: true is ALWAYS set — never pretend this is live data.
 * Replace by swapping the service layer when real APIs are available.
 */
import type { WeatherSnapshot, OrcaRecommendation, Alert, FishingZone, TripPlan, CommunityPost, AgentTraceStep } from '../../types';
export declare const mockWeather: WeatherSnapshot;
export declare const mockCautionRecommendation: OrcaRecommendation;
export declare const mockGoRecommendation: OrcaRecommendation;
export declare const mockNoGoRecommendation: OrcaRecommendation;
export declare const mockAgentSteps: AgentTraceStep[];
export declare const mockAlerts: Alert[];
export declare const mockFishingZones: FishingZone[];
export declare const mockTripPlan: TripPlan;
export declare const mockCommunityPosts: CommunityPost[];
export declare function getMockResponseForQuery(query: string): {
    recommendation: OrcaRecommendation;
    answer: string;
};
