import type { SatelliteSnapshot, LatLon, ProviderResult } from '../../types';

export interface SatelliteProvider {
  readonly isMock: boolean;
  readonly dataSource: string;
  getSnapshot(location: LatLon): Promise<ProviderResult<SatelliteSnapshot>>;
}
