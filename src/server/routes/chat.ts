import { Router } from 'express';
import { orcaGraph } from '../agents/OrcaGraph';
import { resolveLanguage } from '../utils/language';
import { mapRoleToCanonicalRole } from '../utils/role';

const router = Router();

router.post('/transcribe', async (req, res) => {
  try {
    const { audio, language } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const base64Data = audio.replace(/^data:audio\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: 'audio/webm' });
    const file = new File([blob], 'audio.webm', { type: 'audio/webm' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Groq API key not configured' });
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-large-v3');
    if (language) {
      formData.append('language', language);
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[STT] Groq Whisper API error:', errText);
      return res.status(500).json({ error: 'Failed to transcribe audio' });
    }

    const result: any = await groqRes.json();
    return res.json({ ok: true, text: result.text });
  } catch (err: any) {
    console.error('[STT] Transcription handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal transcription error' });
  }
});

router.post('/stream', async (req, res) => {
  const { query, location, language, role } = req.body;

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
    const resolvedLanguage = await resolveLanguage(query, language);
    const canonicalRole = mapRoleToCanonicalRole(role || req.user?.role);
    const initialState: any = { query };
    initialState.contextData = { language: resolvedLanguage, role: canonicalRole };
    if (location && typeof location.lat === 'number' && typeof location.lon === 'number') {
      initialState.contextData.location = location;
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
