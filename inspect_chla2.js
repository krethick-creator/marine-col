async function run() {
  const url = "https://coastwatch.noaa.gov/erddap/griddap/noaacwNPPVIIRSSQchlaDaily.json?chlor_a[(last)][(0.0)][(12.5):(13.5)][(79.5):(81.5)]";
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const rows = data.table.rows;
  let validValues = [];
  for (const row of rows) {
      if (row[row.length-1] !== null) {
          validValues.push(row);
      }
  }
  console.log("Total rows:", rows.length, "Valid:", validValues.length);
  if (validValues.length > 0) {
      console.log("First valid:", validValues[0]);
  }
}
run();
