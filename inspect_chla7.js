async function run() {
  const url = "https://coastwatch.noaa.gov/erddap/griddap/noaacwS3AOLCIchlaDaily.json?chlor_a[(last)][(0.0)][(13.0327):(13.1327)][(80.2207):(80.3207)]";
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  console.log("Last time:", data.table.rows[0][0]);
}
run();
