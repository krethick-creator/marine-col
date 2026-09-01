import { Router, Request, Response } from 'express';
import { orcaGraph } from '../agents/OrcaGraph';
import { resolveLanguage } from '../utils/language';

const router = Router();

router.post('/stream', async (req: Request, res: Response) => {
  const { query, location, userRole, language } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const resolvedLanguage = await resolveLanguage(query, language);
    const initialState: any = { query, userRole: userRole || 'general' };
    initialState.contextData = { language: resolvedLanguage };

    if (location && typeof location.lat === 'number' && typeof location.lon === 'number') {
      initialState.contextData.location = location;
    }

    const stream = await orcaGraph.stream(initialState);

    let finalStateObj: any = null;
    let contextData: Record<string, any> = {};

    for await (const chunk of stream) {
      const nodeName = Object.keys(chunk)[0];
      const stateUpdate = (chunk as any)[nodeName];
      finalStateObj = { ...finalStateObj, ...stateUpdate };

      if (stateUpdate?.contextData) {
        contextData = { ...contextData, ...stateUpdate.contextData };
      }

      const payload = {
        node: nodeName,
        executedSteps: stateUpdate.executedSteps,
      };

      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }

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
        if (err && typeof err === 'string') entry.error = err;
        providerStatuses[name] = entry;
      }
    }

    res.write(`data: ${JSON.stringify({
      node: 'END',
      finalResponse: finalStateObj?.finalResponse,
      responseLanguage: finalStateObj?.responseLanguage,
      translationFailed: finalStateObj?.translationFailed,
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
