import { groqModelRouter } from './src/server/llm/GroqModelRouter';
import { HumanMessage } from '@langchain/core/messages';

async function testFallback() {
  console.log('Testing Groq Model Router...');
  try {
    const res = await groqModelRouter.invoke([new HumanMessage('Hello, ORCA!')], 'general');
    console.log('Success:', res.metadata);
  } catch (error) {
    console.error('Error:', error);
  }
}

testFallback();
