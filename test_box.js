async function run() {
  const lat = 13.0827;
  const lon = 80.2707;
  const delta = 0.05;
  const latMin = (lat - delta).toFixed(4);
  const latMax = (lat + delta).toFixed(4);
  const lonMin = (lon - delta).toFixed(4);
  const lonMax = (lon + delta).toFixed(4);

  const sstUrl = `https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.json?analysed_sst[(last)][(${latMin}):(${latMax})][(${lonMin}):(${lonMax})]`;
  console.log(sstUrl);
  
  const res = await fetch(sstUrl);
  const data = await res.json();
  const rows = data.table.rows;
  console.log("Total rows fetched:", rows.length);
  
  let validValue = null;
  for (const row of rows) {
    const val = row[row.length - 1];
    if (typeof val === 'number' && !Number.isNaN(val) && val !== null) {
      validValue = val;
      break;
    }
  }
  console.log("Found valid SST:", validValue);
}
run();
