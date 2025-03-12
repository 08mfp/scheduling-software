import { Stadium } from './Stadium';

export interface Team {
  _id: string;
  teamName: string;
  teamRanking: number;
  teamLocation: string;
  teamCoach: string;
  stadium: Stadium;
  image?: string;
}
