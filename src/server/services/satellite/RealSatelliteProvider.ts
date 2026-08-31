import { getOceanProvider } from '../ocean';
import type { SatelliteProvider } from './SatelliteProvider';
import type { SatelliteSnapshot, LatLon, FishingZone, ProviderResult } from '../../types';

const FETCH_TIMEOUT_MS = 30000;

type ErddapFetchResult =
  | { ok: true; value: number | null }
  | { ok: false; reason: 'timeout' | 'http_error' | 'no_data' | 'parse_error'; message: string };

export class RealSatelliteProvider implements SatelliteProvider {
  readonly isMock = false;
  readonly dataSource = '[REAL] NOAA CoastWatch (MUR SST & Sentinel-3 OLCI Chlorophyll)';

  private async fetchErddapValue(
    url: string,
    variable: string
  ): Promise<ErddapFetchResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      console.log(`[Satellite] Requesting ${variable} via: ${url}`);
      
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ORCA/1.0',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      console.log(`[Satellite] ${variable} HTTP Status: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        const msg = `ERDDAP HTTP ${res.status} for ${variable}`;
        console.warn(`[Satellite] ${msg}`);
        return { ok: false, reason: 'http_error', message: msg };
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        return { ok: false, reason: 'parse_error', message: `JSON parse error for ${variable}` };
      }

      const rows = data?.table?.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        return { ok: true, value: null }; // Valid response, but no rows
      }

      console.log(`[Satellite] ${variable} returned ${rows.length} rows (response format: JSON table)`);
      if (data?.table?.columnNames) {
        console.log(`[Satellite] ${variable} Columns: ${JSON.stringify(data.table.columnNames)}`);
      }
      
      // Log the first few rows for debugging (up to 3)
      console.log(`[Satellite] ${variable} First rows sample:`);
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        console.log(`   Row ${i}: ${JSON.stringify(rows[i])}`);
      }

      // Search the bounding box for the first valid numerical value
      let validValue: number | null = null;
      
      // The variable we are querying is always the LAST column in the ERDDAP JSON response.
      const valueIndex = data.table.columnNames ? data.table.columnNames.indexOf(variable) : rows[0].length - 1;
      const targetIndex = valueIndex >= 0 ? valueIndex : rows[0].length - 1;
      
      for (const row of rows) {
        const val = row[targetIndex];
        if (typeof val === 'number' && !Number.isNaN(val) && val !== null) {
          validValue = val;
          break; // Use the first valid observation found near the coordinates
        }
      }

      return { ok: true, value: validValue };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err?.name === 'AbortError';
      const reason: 'timeout' | 'http_error' = isAbort ? 'timeout' : 'http_error';
      const message = isAbort
        ? `Satellite provider timed out (${FETCH_TIMEOUT_MS}ms) for ${variable}`
        : `Network error for ${variable}: ${String(err?.message ?? err)}`;
      console.warn(`[Satellite] ${message}`);
      return { ok: false, reason, message };
    }
  }

  async getSnapshot(location: LatLon): Promise<ProviderResult<SatelliteSnapshot>> {
    const ocean = getOceanProvider();
    const pfzZones: FishingZone[] = await ocean.getPFZZones(location);

    console.log('[Satellite] Using RealSatelliteProvider');
    console.log(`[Satellite] Fetching SST and Chlorophyll concurrently for lat=${location.lat.toFixed(4)}, lon=${location.lon.toFixed(4)}`);

    // Define a small bounding box (±0.05 degrees ~ 5km) to capture valid marine pixels for coastal locations
    const delta = 0.05;
    const latMin = (location.lat - delta).toFixed(4);
    const latMax = (location.lat + delta).toFixed(4);
    const lonMin = (location.lon - delta).toFixed(4);
    const lonMax = (location.lon + delta).toFixed(4);

    const sstUrl = `https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.json?analysed_sst[(last)][(${latMin}):(${latMax})][(${lonMin}):(${lonMax})]`;
    // Using Sentinel-3 OLCI (noaacwS3AOLCIchlaDaily) because VIIRS heavily masks coastal turbidity resulting in 100% nulls.
    const chlaUrl = `https://coastwatch.noaa.gov/erddap/griddap/noaacwS3AOLCIchlaDaily.json?chlor_a[(last)][(0.0)][(${latMin}):(${latMax})][(${lonMin}):(${lonMax})]`;

    const [sstResult, chlaResult] = await Promise.allSettled([
      this.fetchErddapValue(sstUrl, 'analysed_sst'),
      this.fetchErddapValue(chlaUrl, 'chlor_a'),
    ]);

    const sst: ErddapFetchResult = sstResult.status === 'fulfilled' ? sstResult.value : { ok: false, reason: 'http_error', message: String(sstResult.reason) };
    const chla: ErddapFetchResult = chlaResult.status === 'fulfilled' ? chlaResult.value : { ok: false, reason: 'http_error', message: String(chlaResult.reason) };

    const sstValue = sst.ok ? sst.value : null;
    const chlaValue = chla.ok ? chla.value : null;

    console.log(`[Satellite] Parsed SST: ${sstValue !== null ? sstValue.toFixed(2) + ' °C' : 'unavailable'}`);
    console.log(`[Satellite] Parsed Chlorophyll: ${chlaValue !== null ? chlaValue.toFixed(3) + ' mg/m³' : 'unavailable'}`);

    let status: 'REAL_DATA_SUCCESS' | 'REAL_DATA_EMPTY' | 'PROVIDER_UNAVAILABLE' | 'MOCK_DATA';
    let errorMsg: string | undefined;

    const sstIsConnError = !sst.ok && (sst.reason === 'timeout' || sst.reason === 'http_error');
    const chlaIsConnError = !chla.ok && (chla.reason === 'timeout' || chla.reason === 'http_error');

    if (sstValue !== null || chlaValue !== null || pfzZones.length > 0) {
      status = 'REAL_DATA_SUCCESS';
    } else if (sstIsConnError || chlaIsConnError) {
      status = 'PROVIDER_UNAVAILABLE';
      const failureReasons = [
        sstIsConnError ? sst.message : null,
        chlaIsConnError ? chla.message : null,
      ].filter(Boolean);
      console.warn(`[Satellite] Provider unavailable: ${failureReasons.join('; ')}`);
      errorMsg = 'Satellite provider is temporarily unavailable.';
    } else {
      status = 'REAL_DATA_EMPTY';
    }

    console.log(`[Satellite] Provider status: ${status}`);

    const snapshot: SatelliteSnapshot = {
      sst: sstValue,
      chlorophyll: chlaValue,
      pfzZones,
      sstGrid: null,
      chlorophyllGrid: null,
      isMockData: false,
      dataSource: this.dataSource,
      issuedAt: new Date(),
      providerStatus: status,
    };

    return {
      data: snapshot,
      status,
      ...(errorMsg ? { error: errorMsg } : {}),
    };
  }
}
