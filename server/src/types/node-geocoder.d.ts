declare module 'node-geocoder' {
  namespace NodeGeocoder {
    interface Options {
      provider: string;
      httpAdapter?: string;
      apiKey?: string;
      formatter?: any;
      language?: string;
      timeout?: number;
    }

    interface GeocoderResult {
      latitude?: number;
      longitude?: number;
      country?: string;
      city?: string;
      state?: string;
      zipcode?: string;
      streetName?: string;
      streetNumber?: string;
      countryCode?: string;
      provider?: string;
      formattedAddress?: string;
    }

    interface Geocoder {
      geocode(value: string): Promise<GeocoderResult[]>;
      reverse(lat: number, lon: number): Promise<GeocoderResult[]>;
    }
  }

  function NodeGeocoder(options: NodeGeocoder.Options): NodeGeocoder.Geocoder;
  export = NodeGeocoder;
}
