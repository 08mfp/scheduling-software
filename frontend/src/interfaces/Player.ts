export interface Player {
    _id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    age: number;
    team: {
      _id: string;
      teamName: string;
    };
    image?: string;
  }
  