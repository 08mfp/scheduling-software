export interface Team {
    _id: string;
    teamName: string;
    logo: string;
    bio: string;
  }
  
  export interface Fixture {
    _id: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
    stadium: string;
  }
  
  export const teams: Team[] = [
    {
      _id: '1',
      teamName: 'England',
      logo: 'https://upload.wikimedia.org/wikipedia/en/b/be/England_national_rugby_union_team_logo.svg',
      bio: 'lorem ipsum and whatever comes next.',
    },
    {
      _id: '2',
      teamName: 'France',
      logo: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Rugby_France_logo.svg',
      bio: 'lorem ipsum and whatever comes next.',
    },
    {
      _id: '3',
      teamName: 'Ireland',
      logo: 'https://upload.wikimedia.org/wikipedia/en/1/19/Ireland_Rugby_Union.svg',
      bio: 'lorem ipsum and whatever comes next.',
    },
    {
      _id: '4',
      teamName: 'Italy',
      logo: 'https://upload.wikimedia.org/wikipedia/en/7/7f/Italy_rugby_union_team_logo.svg',
      bio: 'lorem ipsum and whatever comes next.',
    },
    {
      _id: '5',
      teamName: 'Scotland',
      logo: 'https://upload.wikimedia.org/wikipedia/en/8/8a/Rugby_Scotland_logo.svg',
      bio: 'lorem ipsum and whatever comes next.',
    },
    {
      _id: '6',
      teamName: 'Wales',
      logo: 'https://upload.wikimedia.org/wikipedia/en/7/77/Rugby_Wales_logo.svg',
      bio: 'lorem ipsum and whatever comes next.',
    },
  ];
  
