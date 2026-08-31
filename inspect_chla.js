async function run() {
  const url = "https://coastwatch.noaa.gov/erddap/griddap/noaacwNPPVIIRSSQchlaDaily.json?chlor_a[(last)][(0.0)][(13.0327):(13.1327)][(80.2207):(80.3207)]";
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  console.log("Columns:", data.table.columnNames);
  console.log("Rows:");
  for (const row of data.table.rows) {
      console.log(JSON.stringify(row));
  }
}
run();
