async function run() {
  const lat = 13.0827;
  const lon = 80.2707;
  const delta = 0.05;
  const latMin = (lat - delta).toFixed(4);
  const latMax = (lat + delta).toFixed(4);
  const lonMin = (lon - delta).toFixed(4);
  const lonMax = (lon + delta).toFixed(4);

  const chlaUrl = `https://coastwatch.noaa.gov/erddap/griddap/noaacwNPPVIIRSSQchlaDaily.json?chlor_a[(last)][(0.0)][(${latMin}):(${latMax})][(${lonMin}):(${lonMax})]`;
  
  const res = await fetch(chlaUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  console.log("Status:", res.status);
  if (!res.ok) {
     console.log(await res.text());
     return;
  }
  const data = await res.json();
  const rows = data.table.rows;
  
  let validValue = null;
  for (const row of rows) {
    const val = row[row.length - 1];
    if (typeof val === 'number' && !Number.isNaN(val) && val !== null) {
      validValue = val;
      break;
    }
  }
  console.log("Found valid Chla:", validValue);
}
run();
