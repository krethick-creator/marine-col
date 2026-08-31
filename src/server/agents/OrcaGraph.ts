import { StateGraph, START, END, CompiledStateGraph } from '@langchain/langgraph';
import { OrcaState } from './OrcaState';
import { 
  plannerAgent, 
  dataDiscoveryAgent,
  agentRouterNode,
  weatherAgent, 
  oceanAgent, 
  satelliteAgent, 
  geospatialAgent, 
  alertAgent, 
  riskAgent, 
  routeAgent, 
  synthesisAgent 
} from './nodes';

// ─── ORCA Agent Graph ──────────────────────────────────────────────────────────
// Linear chain — each agent runs exactly once per request.
// Deduplication is enforced via contextData._executedAgents (request-scoped Set).
// The agentRouterNode initialises the dedup set and logs required agents.
const graphBuilder = new StateGraph(OrcaState)
  .addNode('plannerAgent', plannerAgent)
  .addNode('dataDiscoveryAgent', dataDiscoveryAgent)
  .addNode('agentRouterNode', agentRouterNode)
  .addNode('weatherAgent', weatherAgent)
  .addNode('oceanAgent', oceanAgent)
  .addNode('satelliteAgent', satelliteAgent)
  .addNode('geospatialAgent', geospatialAgent)
  .addNode('alertAgent', alertAgent)
  .addNode('riskAgent', riskAgent)
  .addNode('routeAgent', routeAgent)
  .addNode('synthesisAgent', synthesisAgent)
  .addEdge(START, 'plannerAgent')
  .addEdge('plannerAgent', 'dataDiscoveryAgent')
  .addEdge('dataDiscoveryAgent', 'agentRouterNode')
  .addEdge('agentRouterNode', 'weatherAgent')
  .addEdge('weatherAgent', 'oceanAgent')
  .addEdge('oceanAgent', 'geospatialAgent')
  .addEdge('geospatialAgent', 'alertAgent')
  .addEdge('alertAgent', 'satelliteAgent')
  .addEdge('satelliteAgent', 'riskAgent')
  .addEdge('riskAgent', 'routeAgent')
  .addEdge('routeAgent', 'synthesisAgent')
  .addEdge('synthesisAgent', END);

// Compile the graph
export const orcaGraph: CompiledStateGraph<any, any, any> = graphBuilder.compile();
