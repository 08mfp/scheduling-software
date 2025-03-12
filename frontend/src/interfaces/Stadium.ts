export interface Stadium {
    _id: string;
    stadiumName: string;
    stadiumCity: string;
    stadiumCountry: string;
    latitude: number;
    longitude: number;
    stadiumCapacity: number;
    surfaceType: 'Grass' | 'Artificial Turf';
  }
  