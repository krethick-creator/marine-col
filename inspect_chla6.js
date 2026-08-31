async function run() {
  const url = "https://coastwatch.noaa.gov/erddap/griddap/noaacwS3AOLCIchlaDaily.json?chlor_a[(last)][(0.0)][(13.0327):(13.1327)][(80.2207):(80.3207)]";
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const rows = data.table.rows;
  let validValue = null;
  for (const row of rows) {
    const val = row[row.length - 1];
    if (typeof val === 'number' && !Number.isNaN(val) && val !== null) {
      if (validValue === null) { validValue = val; }
    }
  }
  console.log("Sentinel-3 Daily Total rows:", rows.length, "First valid Chla:", validValue);
}
run();
