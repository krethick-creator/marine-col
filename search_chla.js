async function run() {
  const url = "https://coastwatch.noaa.gov/erddap/search/index.json?page=1&itemsPerPage=100&searchFor=VIIRS+chlorophyll";
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const rows = data.table.rows;
  for (const row of rows) {
      if (row[1].includes("chla") || row[0].includes("chla")) {
          console.log(row[0], row[3]); // Dataset ID and Title
      }
  }
}
run();
