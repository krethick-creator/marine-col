import { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';

// Define the State for the ORCA Agent Graph
export const OrcaState = Annotation.Root({
  // The original user query
  query: Annotation<string>(),

  // The role of the user
  userRole: Annotation<string>(),

  // Array of conversation messages
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  // The identified intent (e.g., 'weather', 'fishing', 'trip_planning', 'general')
  intent: Annotation<string>(),

  // Accumulated context data from various agents
  contextData: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),

  // The output of the deterministic RiskEngine
  riskAssessment: Annotation<Record<string, any> | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Any routing plan determined by the route agent
  routePlan: Annotation<Record<string, any> | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // The final synthesis response generated for the user
  finalResponse: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  // Tracking which steps have executed for SSE reporting
  executedSteps: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});
