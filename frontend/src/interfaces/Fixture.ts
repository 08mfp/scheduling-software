export interface Fixture {
    _id: string;
    round: number;
    date: string;
    homeTeam: {
      _id: string;
      teamName: string;
    };
    awayTeam: {
      _id: string;
      teamName: string;
    };
    stadium: {
      _id: string;
      stadiumName: string;
    };
    location: string;
    homeTeamScore?: number;
    awayTeamScore?: number;
    season: number;
  }
  