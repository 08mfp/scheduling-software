export interface Stadium {
    _id: string;
    stadiumName: string;
    stadiumCity?: string;
}

export interface Team {
    _id: string;
    teamName: string;
    teamRanking?: number;
    teamLocation?: string;
    teamCoach?: string;
    stadium?: Stadium;
}

export interface Fixture {
    _id?: string;
    round: number;
    date: string; // ISO string
    homeTeam: Team | null;
    awayTeam: Team | null;
    stadium: { _id: string; stadiumName: string } | null;
    location: string;
    season?: number;
    homeTeamScore?: number;
    awayTeamScore?: number;
    previousFixture?: {
        season: number;
        homeTeam: string;
        awayTeam: string;
    };
    touched: boolean;
}
