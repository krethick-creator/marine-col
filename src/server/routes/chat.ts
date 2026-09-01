import { Router } from 'express';
import { orcaGraph } from '../agents/OrcaGraph';

const router = Router();

router.post('/stream', async (req, res) => {
  const { query, location, userRole } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Set up SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const initialState: any = { query, userRole: userRole || 'general' };
    if (location && typeof location.lat === 'number' && typeof location.lon === 'number') {
      initialState.contextData = { location };
    }

    const stream = await orcaGraph.stream(initialState);

    let finalStateObj: any = null;
    let contextData: Record<string, any> = {};

    // Iterate through the graph execution steps
    for await (const chunk of stream) {
      // chunk is an object keyed by the node name that just executed
      const nodeName = Object.keys(chunk)[0];
      const stateUpdate = (chunk as any)[nodeName];
      finalStateObj = { ...finalStateObj, ...stateUpdate };

      // Accumulate contextData across nodes (same reducer as OrcaState)
      if (stateUpdate?.contextData) {
        contextData = { ...contextData, ...stateUpdate.contextData };
      }

      const payload = {
        node: nodeName,
        executedSteps: stateUpdate.executedSteps,
      };

      // Send the agent step update to the frontend
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }

    // Build providerStatuses map from accumulated contextData
    const providerStatuses: Record<string, { status: string; error?: string }> = {};
    const providerKeys = [
      ['weather', 'weatherStatus', 'weatherError'],
      ['ocean', 'oceanStatus', 'oceanError'],
      ['satellite', 'satelliteStatus', 'satelliteError'],
      ['geospatial', 'geospatialStatus', 'geospatialError'],
      ['alert', 'alertStatus', 'alertError'],
    ] as const;

    for (const [name, statusKey, errorKey] of providerKeys) {
      const status = contextData[statusKey];
      if (status) {
        const entry: { status: string; error?: string } = { status };
        const err = contextData[errorKey];
        if (err && typeof err === 'string') {
          // Only include sanitized error strings — never raw stack traces
          entry.error = err;
        }
        providerStatuses[name] = entry;
      }
    }

    res.write(`data: ${JSON.stringify({
      node: 'END',
      finalResponse: finalStateObj?.finalResponse,
      riskAssessment: finalStateObj?.riskAssessment,
      routePlan: finalStateObj?.routePlan,
      providerStatuses,
    })}\n\n`);

  } catch (error: any) {
    console.error('Graph execution error:', error);
    res.write(`data: ${JSON.stringify({ error: 'An internal error occurred. Please try again.' })}\n\n`);
  } finally {
    res.end();
  }
});

export const chatRoutes = router;
