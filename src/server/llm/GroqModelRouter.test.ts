import { groqModelRouter } from './GroqModelRouter';
import { HumanMessage } from '@langchain/core/messages';
import { ChatGroq } from '@langchain/groq';

jest.mock('@langchain/groq', () => {
  return {
    ChatGroq: jest.fn().mockImplementation((config) => {
      return {
        model: config.model,
        invoke: jest.fn().mockImplementation(async () => {
          // Check global variables we set for our tests to simulate behaviors
          const sim = (global as any).__SIMULATION__;
          if (!sim) {
            return { content: 'Success from ' + config.model };
          }
          const behavior = sim[config.model];
          
          if (behavior === '429') {
            const err: any = new Error('Rate limit exceeded');
            err.status = 429;
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
          
          return { content: 'Success from ' + config.model };
        })
      };
    })
  };
});

describe('GroqModelRouter Fallback Behavior', () => {
  
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'mock-test-api-key';
    (global as any).__SIMULATION__ = {};
    const anyRouter = groqModelRouter as any;
    for (const [model, state] of anyRouter.healthState.entries()) {
      state.available = true;
      state.cooldownUntil = null;
      state.consecutiveFailures = 0;
    }
  });

  test('TEST 1: Primary model succeeds', async () => {
    const res = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res.metadata.fallbackUsed).toBe(false);
    expect(res.metadata.modelUsed).toBe('openai/gpt-oss-120b');
  });

  test('TEST 2: Primary returns HTTP 429, fallback succeeds', async () => {
    (global as any).__SIMULATION__ = {
      'openai/gpt-oss-120b': '429'
    };
    const res = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res.metadata.fallbackUsed).toBe(true);
    expect(res.metadata.fallbackCount).toBe(1);
    expect(res.metadata.modelUsed).toBe('openai/gpt-oss-20b');
    
    // Check cooldown state
    const primaryState = (groqModelRouter as any).healthState.get('openai/gpt-oss-120b');
    expect(primaryState.available).toBe(false);
    expect(primaryState.cooldownUntil).toBeGreaterThan(Date.now());
  });

  test('TEST 3: Primary times out, fallback succeeds', async () => {
    (global as any).__SIMULATION__ = {
      'openai/gpt-oss-120b': 'timeout'
    };
    const res = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res.metadata.fallbackUsed).toBe(true);
    expect(res.metadata.modelUsed).toBe('openai/gpt-oss-20b');
  });

  test('TEST 4: Primary + fallback 1 fail, fallback 2 succeeds', async () => {
    (global as any).__SIMULATION__ = {
      'openai/gpt-oss-120b': '429',
      'openai/gpt-oss-20b': '429'
    };
    const res = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res.metadata.fallbackUsed).toBe(true);
    expect(res.metadata.fallbackCount).toBe(2);
    expect(res.metadata.modelUsed).toBe('qwen/qwen3.6-27b');
  });

  test('TEST 5: All models fail with 429 -> Controlled error', async () => {
    (global as any).__SIMULATION__ = {
      'openai/gpt-oss-120b': '429',
      'openai/gpt-oss-20b': '429',
      'qwen/qwen3.6-27b': '429',
    };
    await expect(groqModelRouter.invoke([new HumanMessage('hi')], 'general'))
      .rejects.toThrow("ORCA is temporarily unable to process the AI request");
  });

  test('TEST 6 & 7: Model is in cooldown, router skips it. Cooldown expires, router tries again', async () => {
    // Force primary to 429
    (global as any).__SIMULATION__ = { 'openai/gpt-oss-120b': '429' };
    const res1 = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res1.metadata.modelUsed).toBe('openai/gpt-oss-20b'); // Primary skipped
    
    // Now primary is in cooldown
    (global as any).__SIMULATION__ = {}; // Fix primary, but it's still in cooldown
    const res2 = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res2.metadata.modelUsed).toBe('openai/gpt-oss-20b'); // Still skips primary

    // Expire cooldown manually
    const primaryState = (groqModelRouter as any).healthState.get('openai/gpt-oss-120b');
    primaryState.cooldownUntil = Date.now() - 1000; // Past

    const res3 = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res3.metadata.modelUsed).toBe('openai/gpt-oss-120b'); // Recovered!
  });

  test('Auth failure (401) stops iteration and throws controlled error', async () => {
    (global as any).__SIMULATION__ = { 'openai/gpt-oss-120b': '401' };
    await expect(groqModelRouter.invoke([new HumanMessage('hi')], 'general'))
      .rejects.toThrow("ORCA is temporarily unable to process the AI request");
  });
});
