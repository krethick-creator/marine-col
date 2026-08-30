import { groqModelRouter } from './src/server/llm/GroqModelRouter';
import { HumanMessage } from '@langchain/core/messages';
import assert from 'assert';
import { ChatGroq } from '@langchain/groq';

// 1. Mocking ChatGroq at the module level
jest.mock('@langchain/groq', () => {
  return {
    ChatGroq: jest.fn().mockImplementation((config) => {
      return {
        model: config.model,
        invoke: async () => {
          const sim = (global as any).__SIMULATION__ || {};
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
          
          return { content: 'Success from ' + config.model };
        }
      };
    })
  };
});

async function runStandaloneTests() {
  // Test code will go here.
}
