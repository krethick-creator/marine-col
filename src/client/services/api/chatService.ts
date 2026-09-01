import { useAppStore } from '../../store';

import { getCachedData } from '../offline/cacheService';

export async function streamChat(
  query: string,
  location: { lat: number, lon: number; locationName?: string } | undefined,
  onStep: (stepName: string, executedSteps: string[]) => void,
  onEnd: (finalResponse: string, riskAssessment: any, routePlan: any, providerStatuses: Record<string, { status: string; error?: string }>) => void,
  onError: (error: string) => void
) {
  const offlineMode = useAppStore.getState().offlineMode;
  if (offlineMode || !navigator.onLine) {
    onStep('offlineAgent', ['detectOfflineStatus', 'queryLocalCache']);
    
    setTimeout(async () => {
      try {
        const lowerQuery = query.toLowerCase();
        let response = '';
        
        // Handle greetings
        if (['hi', 'hello', 'hey'].includes(lowerQuery.trim())) {
          response = "Hello! I am operating in offline mode. I can check your cached weather, wave, alert, and location data. What would you like to know?";
        }
        // Handle Location queries
        else if (lowerQuery.includes('location') || lowerQuery.includes('where am i')) {
          const user = useAppStore.getState().user;
          const locDetails = (user as any).locationDetails;
          if (user.location) {
            response = `**Last Known Location:** ${user.locationName || 'Unknown'}\n`;
            if (locDetails?.district) response += `- **District:** ${locDetails.district}\n`;
            if (locDetails?.state) response += `- **State:** ${locDetails.state}\n`;
            if (locDetails?.country) response += `- **Country:** ${locDetails.country}\n`;
            response += `- **Coordinates:** ${user.location.lat.toFixed(4)}° N, ${user.location.lon.toFixed(4)}° E\n`;
            response += `\n*(Note: This information is cached locally)*`;
          } else {
            response = "I don't have a cached location saved for you.";
          }
        }
        // Handle Weather & Temperature
        else if (lowerQuery.includes('weather') || lowerQuery.includes('temperature') || lowerQuery.includes('temp')) {
          if (location) {
            const cachedWeather = await getCachedData('weather', location.lat, location.lon);
            if (cachedWeather && cachedWeather.data) {
              const d = cachedWeather.data;
              const dateStr = cachedWeather.fetchedAt ? new Date(cachedWeather.fetchedAt).toLocaleString() : 'recently';
              response = `Based on cached data from **${dateStr}**:\n\nThe temperature is **${d.temperature}°C** (feels like ${d.feelsLike}°C). Conditions are **${d.condition}**.\n\n*Please connect to the internet for live weather updates.*`;
            } else {
              response = "I don't have any cached weather data available for this location. Please connect to the internet.";
            }
          } else {
            response = "I need your location to check the cached weather data.";
          }
        }
        // Handle Ocean/Waves
        else if (lowerQuery.includes('wave') || lowerQuery.includes('ocean') || lowerQuery.includes('sea') || lowerQuery.includes('swell')) {
          if (location) {
            const cachedWeather = await getCachedData('weather', location.lat, location.lon);
            if (cachedWeather && cachedWeather.data) {
              const d = cachedWeather.data;
              const dateStr = cachedWeather.fetchedAt ? new Date(cachedWeather.fetchedAt).toLocaleString() : 'recently';
              response = `Based on cached marine data from **${dateStr}**:\n\n- **Wave Height:** ${d.waveHeight !== null ? `${d.waveHeight} m` : 'Unavailable'}\n- **Sea State:** ${d.seaState}\n- **Wind:** ${d.windSpeed} km/h ${d.windDirection}\n\n*Please connect to the internet for live marine conditions.*`;
            } else {
              response = "I don't have any cached marine data available for this location.";
            }
          } else {
            response = "I need your location to check cached marine data.";
          }
        }
        // Handle Alerts
        else if (lowerQuery.includes('alert') || lowerQuery.includes('warning') || lowerQuery.includes('danger')) {
          if (location) {
            const cachedAlerts = await getCachedData('alerts', location.lat, location.lon);
            if (cachedAlerts && cachedAlerts.data) {
              const alerts = cachedAlerts.data;
              const dateStr = cachedAlerts.fetchedAt ? new Date(cachedAlerts.fetchedAt).toLocaleString() : 'recently';
              if (alerts.length > 0) {
                response = `Based on cached data from **${dateStr}**, there are **${alerts.length}** active alerts:\n\n`;
                alerts.forEach((a: any) => {
                  response += `- **[${a.severity}] ${a.title}**: ${a.description}\n`;
                });
                response += `\n*Warning: These are cached alerts and may not reflect current safety conditions.*`;
              } else {
                response = `Based on cached data from **${dateStr}**, there were **no active alerts**.\n\n*Warning: Always verify current conditions before departing.*`;
              }
            } else {
              response = "I don't have any cached alert data available for this location.";
            }
          } else {
            response = "I need your location to check cached alerts.";
          }
        }
        // Fallback for unrecognized offline queries
        else {
          response = "I am currently offline. I can answer questions about your cached **weather**, **waves**, **alerts**, or **location**. Try asking: 'What is the wave height?' or 'Are there any alerts?'";
        }
        
        onEnd(response, null, null, { offline: { status: 'REAL_DATA_SUCCESS' } });
      } catch (err) {
        onEnd("An error occurred while accessing the offline cache.", null, null, {});
      }
    }, 500);
    return;
  }

  try {
    const user = useAppStore.getState().user;
    const { user: authUser } = await import('../../store/authStore').then(m => m.useAuthStore.getState());
    
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, location, userRole: authUser?.role || 'general' })
    });

    if (!res.ok || !res.body) {
      throw new Error('Network error');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              onError(data.error);
              return;
            }
            if (data.node === 'END') {
              onEnd(data.finalResponse, data.riskAssessment, data.routePlan, data.providerStatuses || {});
            } else if (data.node) {
              onStep(data.node, data.executedSteps || []);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e, line);
          }
        }
      }
    }
  } catch (err: any) {
    onError(err.message || 'Failed to communicate with ORCA.');
  }
}

