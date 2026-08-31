import { orcaGraph } from './OrcaGraph';

async function test() {
  const testState: any = await orcaGraph.invoke({
    query: "Give me satellite information for Chennai",
    contextData: { location: { lat: 13.0827, lon: 80.2707, name: 'Chennai' } }
  });
  console.log("Executed:", testState.executedSteps);
  console.log("Satellite Status:", testState.contextData.satelliteStatus);
  console.log("SST:", testState.contextData.satellite?.sst);
  console.log("Chlorophyll:", testState.contextData.satellite?.chlorophyll);
  process.exit(0);
}
test();
