export type UserRole = "fisherman" | "researcher" | "coastal_guard" | "general";

export interface RoleConfig {
  aiDepth: "simple" | "scientific" | "operational";
  offlinePriority: string[];
  features: string[];
  dashboardTitle: string;
  dashboardSubtitle: string;
  quickActions: { label: string; action: string }[];
}

export const roleConfigs: Record<UserRole, RoleConfig> = {
  fisherman: {
    aiDepth: "simple",
    offlinePriority: ["weather", "ocean", "boundaries", "alerts", "location", "fishing"],
    features: ["weather", "sea_conditions", "fishing_intelligence", "marine_boundaries", "navigation", "alerts", "sos", "sms", "community"],
    dashboardTitle: "Fisherman Dashboard",
    dashboardSubtitle: "Your Marine Safety & Fishing Intelligence",
    quickActions: [
      { label: "Check Sea", action: "/weather" },
      { label: "Find Fishing Zone", action: "/fishing" },
      { label: "Navigation", action: "/map" },
      { label: "SOS", action: "/sos" }
    ]
  },
  researcher: {
    aiDepth: "scientific",
    offlinePriority: ["historical", "ocean", "climate", "reports", "gis"],
    features: ["research_dashboard", "gis_map", "satellite_data", "ocean_data", "analysis", "historical_climate", "reports", "ai_research_assistant"],
    dashboardTitle: "Marine Research Dashboard",
    dashboardSubtitle: "Ocean Data & Scientific Analysis",
    quickActions: [
      { label: "Open GIS", action: "/map" },
      { label: "Analyze Ocean Data", action: "/weather" },
      { label: "Historical Data", action: "/climate" },
      { label: "Generate Report", action: "/reports" }
    ]
  },
  coastal_guard: {
    aiDepth: "operational",
    offlinePriority: ["alerts", "boundaries", "location", "incidents", "weather", "reports"],
    features: ["operations_dashboard", "alerts", "live_marine_map", "boundaries", "incidents", "disaster_monitoring", "sos", "reports", "sms"],
    dashboardTitle: "Coastal Operations",
    dashboardSubtitle: "Marine Safety & Operational Intelligence",
    quickActions: [
      { label: "View Alerts", action: "/alerts" },
      { label: "Open Operations Map", action: "/map" },
      { label: "View Incidents", action: "/community" },
      { label: "SOS Monitoring", action: "/sos" }
    ]
  },
  general: {
    aiDepth: "simple",
    offlinePriority: ["weather", "ocean", "alerts", "location", "basic_info"],
    features: ["home", "weather", "ocean", "marine_map", "alerts", "learn", "orca_ai"],
    dashboardTitle: "Marine Intelligence",
    dashboardSubtitle: "Explore Your Ocean Environment",
    quickActions: [
      { label: "Weather", action: "/weather" },
      { label: "Ocean", action: "/weather" },
      { label: "Marine Map", action: "/map" },
      { label: "Ask ORCA", action: "/chat" }
    ]
  }
};
