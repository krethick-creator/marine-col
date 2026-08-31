import { orcaGraph } from './OrcaGraph';

async function test() {
  const testState: any = await orcaGraph.invoke({
    query: "Give me satellite information for Chennai offshore",
    contextData: { location: { lat: 13.1, lon: 80.5, name: 'Chennai Offshore' } }
  });
  console.log("Executed:", testState.executedSteps);
  console.log("Satellite Status:", testState.contextData.satelliteStatus);
  console.log("SST:", testState.contextData.satellite?.sst);
  console.log("Chlorophyll:", testState.contextData.satellite?.chlorophyll);
  process.exit(0);
}
test();
