async function run() {
  const url = "https://coastwatch.noaa.gov/erddap/griddap/noaacwNPPVIIRSSQchlaDaily.json?chlor_a[last-14:1:last][(0.0)][(13.0327):(13.1327)][(80.2207):(80.3207)]";
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const rows = data.table.rows;
  let validValue = null;
  let validCount = 0;
  for (const row of rows) {
    const val = row[row.length - 1];
    if (typeof val === 'number' && !Number.isNaN(val) && val !== null) {
      if (validValue === null) validValue = val;
      validCount++;
    }
  }
  console.log("Total rows fetched:", rows.length, "Valid:", validCount, "First valid Chla:", validValue);
}
run();
