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
    (global as any).__SIMULATION__ = {};
    // Reset router internal state
    // We can't easily reset private members, so we rely on time traveling or just unique states for each test.
    // Or we just reinstantiate it via a dirty hack.
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
    expect(res.metadata.modelUsed).toBe('llama3-70b-8192');
  });

  test('TEST 2: Primary returns HTTP 429, fallback succeeds', async () => {
    (global as any).__SIMULATION__ = {
      'llama3-70b-8192': '429'
    };
    const res = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res.metadata.fallbackUsed).toBe(true);
    expect(res.metadata.fallbackCount).toBe(1);
    expect(res.metadata.modelUsed).toBe('llama3-8b-8192');
    
    // Check cooldown state
    const primaryState = (groqModelRouter as any).healthState.get('llama3-70b-8192');
    expect(primaryState.available).toBe(false);
    expect(primaryState.cooldownUntil).toBeGreaterThan(Date.now());
  });

  test('TEST 3: Primary times out, fallback succeeds', async () => {
    (global as any).__SIMULATION__ = {
      'llama3-70b-8192': 'timeout'
    };
    const res = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res.metadata.fallbackUsed).toBe(true);
    expect(res.metadata.modelUsed).toBe('llama3-8b-8192');
  });

  test('TEST 4: Primary + fallback 1 fail, fallback 2 succeeds', async () => {
    (global as any).__SIMULATION__ = {
      'llama3-70b-8192': '429',
      'llama3-8b-8192': '429'
    };
    const res = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res.metadata.fallbackUsed).toBe(true);
    expect(res.metadata.fallbackCount).toBe(2);
    expect(res.metadata.modelUsed).toBe('mixtral-8x7b-32768');
  });

  test('TEST 5: All models fail with 429 -> Controlled error', async () => {
    (global as any).__SIMULATION__ = {
      'llama3-70b-8192': '429',
      'llama3-8b-8192': '429',
      'mixtral-8x7b-32768': '429',
      'gemma-7b-it': '429',
    };
    await expect(groqModelRouter.invoke([new HumanMessage('hi')], 'general'))
      .rejects.toThrow("ORCA is temporarily unable to process the AI request");
  });

  test('TEST 6 & 7: Model is in cooldown, router skips it. Cooldown expires, router tries again', async () => {
    // Force primary to 429
    (global as any).__SIMULATION__ = { 'llama3-70b-8192': '429' };
    const res1 = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res1.metadata.modelUsed).toBe('llama3-8b-8192'); // Primary skipped
    
    // Now primary is in cooldown
    (global as any).__SIMULATION__ = {}; // Fix primary, but it's still in cooldown
    const res2 = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res2.metadata.modelUsed).toBe('llama3-8b-8192'); // Still skips primary

    // Expire cooldown manually
    const primaryState = (groqModelRouter as any).healthState.get('llama3-70b-8192');
    primaryState.cooldownUntil = Date.now() - 1000; // Past

    const res3 = await groqModelRouter.invoke([new HumanMessage('hi')], 'general');
    expect(res3.metadata.modelUsed).toBe('llama3-70b-8192'); // Recovered!
  });

  test('Auth failure (401) stops iteration and throws controlled error', async () => {
    (global as any).__SIMULATION__ = { 'llama3-70b-8192': '401' };
    await expect(groqModelRouter.invoke([new HumanMessage('hi')], 'general'))
      .rejects.toThrow("ORCA is temporarily unable to process the AI request");
  });
});
