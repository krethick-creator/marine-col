async function run() {
  const url = "https://coastwatch.noaa.gov/erddap/griddap/noaacwNPPVIIRSSQchlaMonthly.json?chlor_a[(last)][(0.0)][(12.9827):(13.1827)][(80.1707):(80.3707)]";
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
  console.log("Delta 0.1 Monthly SQ Total rows:", rows.length, "Valid:", validCount, "First valid Chla:", validValue);
}
run();
