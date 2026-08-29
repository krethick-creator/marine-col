import { Router } from 'express';
import { orcaGraph } from '../agents/OrcaGraph';

const router = Router();

router.post('/stream', async (req, res) => {
  const { query, location } = req.body;

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
    const initialState: any = { query };
    if (location && typeof location.lat === 'number' && typeof location.lon === 'number') {
      initialState.contextData = { location };
    }

    const stream = await orcaGraph.stream(initialState);
    
    let finalStateObj: any = null;
    
    // Iterate through the graph execution steps
    for await (const chunk of stream) {
      // chunk is an object keyed by the node name that just executed
      const nodeName = Object.keys(chunk)[0];
      const stateUpdate = (chunk as any)[nodeName];
      finalStateObj = { ...finalStateObj, ...stateUpdate };
      
      const payload = {
        node: nodeName,
        executedSteps: stateUpdate.executedSteps,
      };

      // Send the agent step update to the frontend
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ 
      node: 'END', 
      finalResponse: finalStateObj?.finalResponse,
      riskAssessment: finalStateObj?.riskAssessment 
    })}\n\n`);

  } catch (error: any) {
    console.error('Graph execution error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  } finally {
    res.end();
  }
});

export const chatRoutes = router;
