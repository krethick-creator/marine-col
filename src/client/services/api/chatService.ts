export async function streamChat(
  query: string, 
  location: { lat: number, lon: number; locationName?: string } | undefined,
  onStep: (stepName: string, executedSteps: string[]) => void,
  onEnd: (finalResponse: string, riskAssessment: any) => void,
  onError: (error: string) => void
) {
  try {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, location })
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
              onEnd(data.finalResponse, data.riskAssessment);
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
