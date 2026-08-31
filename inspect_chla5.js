async function run() {
  const url = "https://coastwatch.noaa.gov/erddap/griddap/noaacwNPPVIIRSSQchlaMonthly.json?chlor_a[(last)][(0.0)][(12.8827):(13.2827)][(80.0707):(80.4707)]";
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const rows = data.table.rows;
  let validValue = null;
  let validCount = 0;
  for (const row of rows) {
    const val = row[row.length - 1];
    if (typeof val === 'number' && !Number.isNaN(val) && val !== null) {
      if (validValue === null) { validValue = val; }
      validCount++;
    }
  }
  console.log("Delta 0.2 Monthly SQ Total rows:", rows.length, "Valid:", validCount, "First valid Chla:", validValue);
}
run();
