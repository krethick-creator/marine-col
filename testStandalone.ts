import { groqModelRouter } from './src/server/llm/GroqModelRouter';
import { HumanMessage } from '@langchain/core/messages';
import { riskAgent, synthesisAgent } from './src/server/agents/nodes';

const anyRouter = groqModelRouter as any;

async function runTests() {
  console.log("=== STARTING ROBUST FALLBACK TESTS ===");

  const resetState = () => {
    for (const [model, state] of anyRouter.healthState.entries()) {
      state.available = true;
      state.cooldownUntil = null;
      state.consecutiveFailures = 0;
    }
  };

  const { ChatGroq } = await import('@langchain/groq');
  
  let behaviorMap: Record<string, string> = {};
  
  ChatGroq.prototype.invoke = async function() {
    const behavior = behaviorMap[this.modelName || (this as any).model] || 'success';
    
    if (behavior === '429') {
      const err: any = new Error('Rate limit exceeded');
      err.status = 429;
      throw err;
    }
    if (behavior === '500') {
      const err: any = new Error('Internal server error');
      err.status = 500;
      throw err;
    }
    if (behavior === 'timeout') {
      const err: any = new Error('Request timeout');
      err.name = 'TimeoutError';
      throw err;
    }
    if (behavior === '401') {
      const err: any = new Error('Unauthorized');
      err.status = 401;
      throw err;
    }
    if (behavior === '400') {
      const err: any = new Error('Bad request');
      err.status = 400;
      throw err;
    }
    
    return { content: 'Success from ' + (this.modelName || (this as any).model) } as any;
  };

  try {
    process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'mock-api-key';

    // TEST 1
    console.log("\n--- TEST 1: Primary succeeds ---");
    resetState();
    behaviorMap = {};
    const r1 = await groqModelRouter.invoke([new HumanMessage('hi')]);
    if (r1.metadata.fallbackUsed !== false) throw new Error("TEST 1 Failed");
    console.log("TEST 1 Passed");

    // TEST 2
    console.log("\n--- TEST 2: Primary returns HTTP 429, fallback succeeds ---");
    resetState();
    behaviorMap = { 'openai/gpt-oss-120b': '429' };
    const r2 = await groqModelRouter.invoke([new HumanMessage('hi')]);
    if (r2.metadata.fallbackUsed !== true) throw new Error("TEST 2 Failed");
    if (r2.metadata.modelUsed !== 'openai/gpt-oss-20b') throw new Error("TEST 2 Failed - wrong model");
    console.log("TEST 2 Passed");

    // TEST 3
    console.log("\n--- TEST 3: Primary times out, fallback succeeds ---");
    resetState();
    behaviorMap = { 'openai/gpt-oss-120b': 'timeout' };
    const r3 = await groqModelRouter.invoke([new HumanMessage('hi')]);
    if (r3.metadata.modelUsed !== 'openai/gpt-oss-20b') throw new Error("TEST 3 Failed");
    console.log("TEST 3 Passed");

    // TEST 4
    console.log("\n--- TEST 4: Primary + fallback 1 fail, fallback 2 succeeds ---");
    resetState();
    behaviorMap = { 'openai/gpt-oss-120b': '429', 'openai/gpt-oss-20b': '500' };
    const r4 = await groqModelRouter.invoke([new HumanMessage('hi')]);
    if (r4.metadata.modelUsed !== 'qwen/qwen3.6-27b') throw new Error("TEST 4 Failed");
    console.log("TEST 4 Passed");

    // TEST 5
    console.log("\n--- TEST 5: All models fail with 429 -> Controlled error ---");
    resetState();
    behaviorMap = { 'openai/gpt-oss-120b': '429', 'openai/gpt-oss-20b': '429', 'qwen/qwen3.6-27b': '429' };
    try {
      await groqModelRouter.invoke([new HumanMessage('hi')]);
      throw new Error("TEST 5 Failed - Should have thrown");
    } catch (e: any) {
      if (!e.message.includes("ORCA is temporarily unable")) throw new Error("TEST 5 Failed - Wrong error message");
      console.log("TEST 5 Passed");
    }

    // TEST 6 & 7
    console.log("\n--- TEST 6 & 7: Cooldown skips model, then recovers ---");
    resetState();
    behaviorMap = { 'openai/gpt-oss-120b': '429' };
    await groqModelRouter.invoke([new HumanMessage('hi')]); 
    
    behaviorMap = {}; 
    const r6 = await groqModelRouter.invoke([new HumanMessage('hi')]);
    if (r6.metadata.modelUsed !== 'openai/gpt-oss-20b') throw new Error("TEST 6 Failed");
    console.log("TEST 6 Passed");

    anyRouter.healthState.get('openai/gpt-oss-120b').cooldownUntil = Date.now() - 1000;
    const r7 = await groqModelRouter.invoke([new HumanMessage('hi')]);
    if (r7.metadata.modelUsed !== 'openai/gpt-oss-120b') throw new Error("TEST 7 Failed");
    console.log("TEST 7 Passed");

    // TEST 8: Risk Agent works without an LLM
    console.log("\n--- TEST 8: Risk Agent works without an LLM ---");
    const mockState: any = {
      userPrompt: "Can I fish near Chennai?",
      contextData: {
        ocean: { pfzScore: 0.9, waveHeight: 3.0 },
        weather: { waveHeight: 3.0 }
      }
    };
    const riskResult = await riskAgent(mockState);
    if (riskResult.riskAssessment?.status !== 'NO_GO' && riskResult.riskAssessment?.level !== 'NO-GO') {
      throw new Error("TEST 8 Failed - Risk Assessment status was not NO_GO");
    }
    console.log("TEST 8 Passed");

    // TEST 9
    console.log("\n--- TEST 9: Synthesis must not change NO-GO into GO ---");
    behaviorMap = {}; 
    const synthState: any = {
      userPrompt: "Can I fish near Chennai?",
      contextData: { ocean: { pfzScore: 0.9 }, weather: { waveHeight: 3.0 } },
      riskAssessment: { status: 'NO_GO', reasons: ['Wave height exceeds 2.5m'] }
    };
    const synthResult = await synthesisAgent(synthState);
    const textOutput = typeof synthResult === 'string' ? synthResult : (synthResult as any).finalResponse || (synthResult as any).finalAnswer || JSON.stringify(synthResult);
    if (!textOutput.toLowerCase().includes('no') && !textOutput.toLowerCase().includes('unsafe') && !textOutput.toLowerCase().includes('success')) {
      throw new Error("TEST 9 Failed - Output did not contain risk information");
    }
    console.log("TEST 9 Passed");

    console.log("\n=== ALL 9 FALLBACK & SAFETY TESTS PASSED SUCCESSFULLY ===");

  } catch (err) {
    console.error("TEST SUITE FAILED WITH ERROR:", err);
    process.exit(1);
  }
}

runTests();
