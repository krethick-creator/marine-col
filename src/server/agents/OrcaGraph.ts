import { StateGraph, START, END, CompiledStateGraph } from '@langchain/langgraph';
import { OrcaState } from './OrcaState';
import { 
  plannerAgent, 
  dataDiscoveryAgent, 
  weatherAgent, 
  oceanAgent, 
  satelliteAgent, 
  geospatialAgent, 
  alertAgent, 
  riskAgent, 
  routeAgent, 
  synthesisAgent 
} from './nodes';

// Initialize the StateGraph with our schema and chain everything so TS infers node names
const graphBuilder = new StateGraph(OrcaState)
  .addNode('plannerAgent', plannerAgent)
  .addNode('dataDiscoveryAgent', dataDiscoveryAgent)
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
  .addEdge('dataDiscoveryAgent', 'weatherAgent')
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
