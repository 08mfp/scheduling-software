/**
 * @module backend/server/seed
 * @description This module seeds the database with initial data.
 * @description It includes dummy data for teams, stadiums, players, and fixtures (2021-2024).
 * @api NONE
 * @version 1.0.0
 * @authors github.com/08mfp
 */

//! REMEMBER TO REMOVE EMOJIS AFTER IMPLEMENTATION WORKS. COULD REPLACE WITH

const mongoose = require('mongoose');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Stadium = require('../models/Stadium');
const Fixture = require('../models/Fixture'); 
require('dotenv').config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sixnations';

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log('MongoDB Connected ✅ ');
    seedData();
  })
  .catch((err) => {
    console.log('MongoDB Connection Error: ❌ ', err);
  });

async function seedData() {
  try {
    await Fixture.deleteMany({});
    await Player.deleteMany({});
    await Team.deleteMany({});
    await Stadium.deleteMany({});
    console.log('Cleared existing data 🗑️ ');
    const stadiumsData = [
      {
        stadiumName: 'Wembley', // change to twickenham later
        stadiumCity: 'London',
        stadiumCountry: 'United Kingdom',
        latitude: 51.5571,
        longitude: 0.2860,
        stadiumCapacity: 90000,
        surfaceType: 'Artificial Turf',
      },
      {
        stadiumName: 'San Siro', // change to italy rugby stadium later
        stadiumCity: 'Milan',
        stadiumCountry: 'Italy',
        latitude: 45.4781,
        longitude: 9.1240,
        stadiumCapacity: 75817,
        surfaceType: 'Grass',
      },
      {
        stadiumName: 'Stade de France',
        stadiumCity: 'Saint-Denis',
        stadiumCountry: 'France',
        latitude: 48.9245,
        longitude: 2.3601,
        stadiumCapacity: 80000,
        surfaceType: 'Grass',
      },
      {
        stadiumName: 'Croke Park',
        stadiumCity: 'Dublin',
        stadiumCountry: 'Ireland',
        latitude: 53.3607,
        longitude: -6.2511,
        stadiumCapacity: 82300,
        surfaceType: 'Artificial Turf',
      },
      {
        stadiumName: 'Scottish Gas Murrayfield Stadium',
        stadiumCity: 'Edinburgh',
        stadiumCountry: 'Scotland',
        latitude: 55.9422,
        longitude: -3.2409,
        stadiumCapacity: 67144,
        surfaceType: 'Grass',
      },
      {
        stadiumName: 'Principality Stadium',
        stadiumCity: 'Cardiff',
        stadiumCountry: 'Wales',
        latitude: 51.4782,
        longitude: -3.1826,
        stadiumCapacity: 74500,
        surfaceType: 'Grass',
      },
    ];

    const stadiums = await Stadium.insertMany(stadiumsData);
    console.log('🏟️ Stadiums added');

    const teamsData = [
      {
        teamName: 'England',
        teamRanking: 1,
        teamLocation: 'London',
        teamCoach: 'Gareth Southgate',
        stadiumName: 'Wembley',
      },
      {
        teamName: 'Italy',
        teamRanking: 2,
        teamLocation: 'Milan', // change to rome later
        teamCoach: 'Paolo Maldini',
        stadiumName: 'San Siro',
      },
      {
        teamName: 'France',
        teamRanking: 3,
        teamLocation: 'Saint-Denis',
        teamCoach: 'Zinedine Zidane',
        stadiumName: 'Stade de France',
      },
      {
        teamName: 'Ireland',
        teamRanking: 4,
        teamLocation: 'Dublin',
        teamCoach: 'Sean Dyche',
        stadiumName: 'Croke Park',
      },
      {
        teamName: 'Scotland',
        teamRanking: 5,
        teamLocation: 'Edinburgh',
        teamCoach: 'Sir Alex Ferguson',
        stadiumName: 'Scottish Gas Murrayfield Stadium',
      },
      {
        teamName: 'Wales',
        teamRanking: 6,
        teamLocation: 'Cardiff',
        teamCoach: 'Gareth Bale',
        stadiumName: 'Principality Stadium',
      },
    ];

    const updatedTeamsData = teamsData.map((team) => {
      const stadium = stadiums.find((s) => s.stadiumName === team.stadiumName);
      if (stadium) {
        return {
          ...team,
          stadium: stadium._id,
        };
      } else {
        console.log(`Stadium not found for team ${team.teamName} ❌ `);
        return team;
      }
    });

    const teams = await Team.insertMany(updatedTeamsData);
    console.log(' ALL Teams added 🏴 ');

    const playersData = [
      { firstName: 'Player', lastName: 'A', dateOfBirth: randomDOB(), teamName: 'England' }, //! ADDD REAL PLAYERS LATER
      { firstName: 'Player', lastName: 'B', dateOfBirth: randomDOB(), teamName: 'England' },
      { firstName: 'Player', lastName: 'C', dateOfBirth: randomDOB(), teamName: 'Italy' },
      { firstName: 'Player', lastName: 'D', dateOfBirth: randomDOB(), teamName: 'Italy' },
      { firstName: 'Player', lastName: 'E', dateOfBirth: randomDOB(), teamName: 'Italy' },
      { firstName: 'Player', lastName: 'F', dateOfBirth: randomDOB(), teamName: 'France' },
      { firstName: 'Player', lastName: 'G', dateOfBirth: randomDOB(), teamName: 'France' },
      { firstName: 'Player', lastName: 'H', dateOfBirth: randomDOB(), teamName: 'France' },
      { firstName: 'Player', lastName: 'I', dateOfBirth: randomDOB(), teamName: 'Ireland' },
      { firstName: 'Player', lastName: 'J', dateOfBirth: randomDOB(), teamName: 'Ireland' },
      { firstName: 'Player', lastName: 'K', dateOfBirth: randomDOB(), teamName: 'Ireland' },
      { firstName: 'Player', lastName: 'L', dateOfBirth: randomDOB(), teamName: 'Scotland' },
      { firstName: 'Player', lastName: 'M', dateOfBirth: randomDOB(), teamName: 'Scotland' },
      { firstName: 'Player', lastName: 'N', dateOfBirth: randomDOB(), teamName: 'Scotland' },
      { firstName: 'Player', lastName: 'O', dateOfBirth: randomDOB(), teamName: 'Wales' },
      { firstName: 'Player', lastName: 'P', dateOfBirth: randomDOB(), teamName: 'Wales' },
      { firstName: 'Player', lastName: 'Q', dateOfBirth: randomDOB(), teamName: 'Wales' },
    ];

    const updatedPlayersData = playersData.map((player) => {
      const team = teams.find((t) => t.teamName === player.teamName);
      if (team) {
        return {
          ...player, 
          team: team._id,
        };
      } else {
        console.log(`Team not found for player ${player.firstName} ${player.lastName} ❌ `);
        return player;
      }
    });

    const players = await Player.insertMany(updatedPlayersData);
    console.log('Players added 👥 ');

    const fixturesData2021 = [
      {
        round: 1,
        date: '2021-02-06',
        homeTeam: 'Italy',
        awayTeam: 'France',
        homeTeamScore: 10,
        awayTeamScore: 50,
        stadiumName: 'San Siro',
        location: 'Milan',
        season: 2021,
      },
      {
        round: 1,
        date: '2021-02-06',
        homeTeam: 'England',
        awayTeam: 'Scotland',
        homeTeamScore: 6,
        awayTeamScore: 11,
        stadiumName: 'Wembley',
        location: 'London',
        season: 2021,
      },
      {
        round: 1,
        date: '2021-02-07',
        homeTeam: 'Wales',
        awayTeam: 'Ireland',
        homeTeamScore: 21,
        awayTeamScore: 16,
        stadiumName: 'Principality Stadium',
        location: 'Cardiff',
        season: 2021,
      },
      {
        round: 2,
        date: '2021-02-13',
        homeTeam: 'England',
        awayTeam: 'Italy',
        homeTeamScore: 41,
        awayTeamScore: 18,
        stadiumName: 'Wembley',
        location: 'London',
        season: 2021,
      },
      {
        round: 2,
        date: '2021-02-13',
        homeTeam: 'Scotland',
        awayTeam: 'Wales',
        homeTeamScore: 24,
        awayTeamScore: 25,
        stadiumName: 'Scottish Gas Murrayfield Stadium',
        location: 'Edinburgh',
        season: 2021,
      },
      {
        round: 2,
        date: '2021-02-14',
        homeTeam: 'Ireland',
        awayTeam: 'France',
        homeTeamScore: 13,
        awayTeamScore: 15,
        stadiumName: 'Croke Park',
        location: 'Dublin',
        season: 2021,
      },
      {
        round: 3,
        date: '2021-02-27',
        homeTeam: 'Italy',
        awayTeam: 'Ireland',
        homeTeamScore: 10,
        awayTeamScore: 48,
        stadiumName: 'San Siro',
        location: 'Milan',
        season: 2021,
      },
      {
        round: 3,
        date: '2021-02-27',
        homeTeam: 'Wales',
        awayTeam: 'England',
        homeTeamScore: 40,
        awayTeamScore: 24,
        stadiumName: 'Principality Stadium',
        location: 'Cardiff',
        season: 2021,
      },
      {
        round: 4,
        date: '2021-03-13',
        homeTeam: 'Italy',
        awayTeam: 'Wales',
        homeTeamScore: 7,
        awayTeamScore: 48,
        stadiumName: 'San Siro',
        location: 'Milan',
        season: 2021,
      },
      {
        round: 4,
        date: '2021-03-13',
        homeTeam: 'England',
        awayTeam: 'France',
        homeTeamScore: 23,
        awayTeamScore: 20,
        stadiumName: 'Wembley',
        location: 'London',
        season: 2021,
      },
      {
        round: 4,
        date: '2021-03-14',
        homeTeam: 'Scotland',
        awayTeam: 'Ireland',
        homeTeamScore: 24,
        awayTeamScore: 27,
        stadiumName: 'Scottish Gas Murrayfield Stadium',
        location: 'Edinburgh',
        season: 2021,
      },
      {
        round: 5,
        date: '2021-03-20',
        homeTeam: 'Scotland',
        awayTeam: 'Italy',
        homeTeamScore: 52,
        awayTeamScore: 10,
        stadiumName: 'Scottish Gas Murrayfield Stadium',
        location: 'Edinburgh',
        season: 2021,
      },
      {
        round: 5,
        date: '2021-03-20',
        homeTeam: 'Ireland',
        awayTeam: 'England',
        homeTeamScore: 32,
        awayTeamScore: 18,
        stadiumName: 'Croke Park',
        location: 'Dublin',
        season: 2021,
      },
      {
        round: 5,
        date: '2021-03-20',
        homeTeam: 'France',
        awayTeam: 'Wales',
        homeTeamScore: 32,
        awayTeamScore: 30,
        stadiumName: 'Stade de France',
        location: 'Saint-Denis',
        season: 2021,
      },
      {
        round: 5,
        date: '2021-03-26',
        homeTeam: 'France',
        awayTeam: 'Scotland',
        homeTeamScore: 23,
        awayTeamScore: 27,
        stadiumName: 'Stade de France',
        location: 'Saint-Denis',
        season: 2021,
      },
    ];

    const fixturesData2022 = [
      {
        round: 1,
        date: '2022-02-05',
        homeTeam: 'Ireland',
        awayTeam: 'Wales',
        homeTeamScore: 29,
        awayTeamScore: 7,
        stadiumName: 'Croke Park',
        location: 'Dublin',
        season: 2022,
      },
      {
        round: 1,
        date: '2022-02-05',
        homeTeam: 'Scotland',
        awayTeam: 'England',
        homeTeamScore: 20,
        awayTeamScore: 17,
        stadiumName: 'Scottish Gas Murrayfield Stadium',
        location: 'Edinburgh',
        season: 2022,
      },
      {
        round: 1,
        date: '2022-02-06',
        homeTeam: 'France',
        awayTeam: 'Italy',
        homeTeamScore: 37,
        awayTeamScore: 10,
        stadiumName: 'Stade de France',
        location: 'Saint-Denis',
        season: 2022,
      },
      {
        round: 2,
        date: '2022-02-12',
        homeTeam: 'Wales',
        awayTeam: 'Scotland',
        homeTeamScore: 20,
        awayTeamScore: 17,
        stadiumName: 'Principality Stadium',
        location: 'Cardiff',
        season: 2022,
      },
      {
        round: 2,
        date: '2022-02-12',
        homeTeam: 'France',
        awayTeam: 'Ireland',
        homeTeamScore: 30,
        awayTeamScore: 24,
        stadiumName: 'Stade de France',
        location: 'Saint-Denis',
        season: 2022,
      },
      {
        round: 2,
        date: '2022-02-13',
        homeTeam: 'Italy',
        awayTeam: 'England',
        homeTeamScore: 0,
        awayTeamScore: 33,
        stadiumName: 'San Siro',
        location: 'Milan',
        season: 2022,
      },
      {
        round: 3,
        date: '2022-02-26',
        homeTeam: 'Scotland',
        awayTeam: 'France',
        homeTeamScore: 17,
        awayTeamScore: 36,
        stadiumName: 'Scottish Gas Murrayfield Stadium',
        location: 'Edinburgh',
        season: 2022,
      },
      {
        round: 3,
        date: '2022-02-26',
        homeTeam: 'England',
        awayTeam: 'Wales',
        homeTeamScore: 23,
        awayTeamScore: 19,
        stadiumName: 'Wembley',
        location: 'London',
        season: 2022,
      },
      {
        round: 3,
        date: '2022-02-27',
        homeTeam: 'Ireland',
        awayTeam: 'Italy',
        homeTeamScore: 57,
        awayTeamScore: 6,
        stadiumName: 'Croke Park',
        location: 'Dublin',
        season: 2022,
      },
      {
        round: 4,
        date: '2022-03-11',
        homeTeam: 'Wales',
        awayTeam: 'France',
        homeTeamScore: 13,
        awayTeamScore: 9,
        stadiumName: 'Principality Stadium',
        location: 'Cardiff',
        season: 2022,
      },
      {
        round: 4,
        date: '2022-03-12',
        homeTeam: 'Italy',
        awayTeam: 'Scotland',
        homeTeamScore: 22,
        awayTeamScore: 33,
        stadiumName: 'San Siro',
        location: 'Milan',
        season: 2022,
      },
      {
        round: 4,
        date: '2022-03-12',
        homeTeam: 'England',
        awayTeam: 'Ireland',
        homeTeamScore: 15,
        awayTeamScore: 32,
        stadiumName: 'Wembley',
        location: 'London',
        season: 2022,
      },
      {
        round: 5,
        date: '2022-03-19',
        homeTeam: 'Wales',
        awayTeam: 'Italy',
        homeTeamScore: 21,
        awayTeamScore: 22,
        stadiumName: 'Principality Stadium',
        location: 'Cardiff',
        season: 2022,
      },
      {
        round: 5,
        date: '2022-03-19',
        homeTeam: 'Ireland',
        awayTeam: 'Scotland',
        homeTeamScore: 26,
        awayTeamScore: 5,
        stadiumName: 'Croke Park',
        location: 'Dublin',
        season: 2022,
      },
      {
        round: 5,
        date: '2022-03-19',
        homeTeam: 'France',
        awayTeam: 'England',
        homeTeamScore: 25,
        awayTeamScore: 13,
        stadiumName: 'Stade de France',
        location: 'Saint-Denis',
        season: 2022,
      },
    ];

    const fixturesData2023 = [
      {
        round: 1,
        date: '2023-02-04',
        homeTeam: 'Wales',
        awayTeam: 'Ireland',
        homeTeamScore: 10,
        awayTeamScore: 34,
        stadiumName: 'Principality Stadium',
        location: 'Cardiff',
        season: 2023,
      },
      {
        round: 1,
        date: '2023-02-04',
        homeTeam: 'England',
        awayTeam: 'Scotland',
        homeTeamScore: 23,
        awayTeamScore: 29,
        stadiumName: 'Wembley',
        location: 'London',
        season: 2023,
      },
      {
        round: 1,
        date: '2023-02-05',
        homeTeam: 'Italy',
        awayTeam: 'France',
        homeTeamScore: 24,
        awayTeamScore: 29,
        stadiumName: 'San Siro',
        location: 'Milan',
        season: 2023,
      },
      {
        round: 2,
        date: '2023-02-11',
        homeTeam: 'Ireland',
        awayTeam: 'France',
        homeTeamScore: 32,
        awayTeamScore: 19,
        stadiumName: 'Croke Park',
        location: 'Dublin',
        season: 2023,
      },
      {
        round: 2,
        date: '2023-02-11',
        homeTeam: 'Scotland',
        awayTeam: 'Wales',
        homeTeamScore: 35,
        awayTeamScore: 7,
        stadiumName: 'Scottish Gas Murrayfield Stadium',
        location: 'Edinburgh',
        season: 2023,
      },
      {
        round: 2,
        date: '2023-02-12',
        homeTeam: 'England',
        awayTeam: 'Italy',
        homeTeamScore: 31,
        awayTeamScore: 14,
        stadiumName: 'Wembley',
        location: 'London',
        season: 2023,
      },
      {
        round: 3,
        date: '2023-02-25',
        homeTeam: 'Italy',
        awayTeam: 'Ireland',
        homeTeamScore: 20,
        awayTeamScore: 34,
        stadiumName: 'San Siro',
        location: 'Milan',
        season: 2023,
      },
      {
        round: 3,
        date: '2023-02-25',
        homeTeam: 'Wales',
        awayTeam: 'England',
        homeTeamScore: 10,
        awayTeamScore: 20,
        stadiumName: 'Principality Stadium',
        location: 'Cardiff',
        season: 2023,
      },
      {
        round: 3,
        date: '2023-02-26',
        homeTeam: 'France',
        awayTeam: 'Scotland',
        homeTeamScore: 32,
        awayTeamScore: 21,
        stadiumName: 'Stade de France',
        location: 'Saint-Denis',
        season: 2023,
      },
      {
        round: 4,
        date: '2023-03-11',
        homeTeam: 'Italy',
        awayTeam: 'Wales',
        homeTeamScore: 19,
        awayTeamScore: 27,
        stadiumName: 'San Siro',
        location: 'Milan',
        season: 2023,
      },
      {
        round: 4,
        date: '2023-03-11',
        homeTeam: 'England',
        awayTeam: 'France',
        homeTeamScore: 10,
        awayTeamScore: 53,
        stadiumName: 'Wembley',
        location: 'London',
        season: 2023,
      },
      {
        round: 4,
        date: '2023-03-12',
        homeTeam: 'Scotland',
        awayTeam: 'Ireland',
        homeTeamScore: 7,
        awayTeamScore: 22,
        stadiumName: 'Scottish Gas Murrayfield Stadium',
        location: 'Edinburgh',
        season: 2023,
      },
      {
        round: 5,
        date: '2023-03-18',
        homeTeam: 'Scotland',
        awayTeam: 'Italy',
        homeTeamScore: 26,
        awayTeamScore: 14,
        stadiumName: 'Scottish Gas Murrayfield Stadium',
        location: 'Edinburgh',
        season: 2023,
      },
      {
        round: 5,
        date: '2023-03-18',
        homeTeam: 'France',
        awayTeam: 'Wales',
        homeTeamScore: 41,
        awayTeamScore: 28,
        stadiumName: 'Stade de France',
        location: 'Saint-Denis',
        season: 2023,
      },
      {
        round: 5,
        date: '2023-03-18',
        homeTeam: 'Ireland',
        awayTeam: 'England',
        homeTeamScore: 29,
        awayTeamScore: 16,
        stadiumName: 'Croke Park',
        location: 'Dublin',
        season: 2023,
      },
    ];

    const fixturesData2024 = [
      {
        round: 1,
        date: '2024-02-02',
        homeTeam: 'France',
        awayTeam: 'Ireland',
        homeTeamScore: 17,
        awayTeamScore: 38,
        stadiumName: 'Stade de France',
        location: 'Saint-Denis',
        season: 2024,
      },
      {
        round: 1,
        date: '2024-02-03',
        homeTeam: 'Italy',
        awayTeam: 'England',
        homeTeamScore: 24,
        awayTeamScore: 27,
        stadiumName: 'San Siro',
        location: 'Milan',
        season: 2024,
      },
      {
        round: 1,
        date: '2024-02-03',
        homeTeam: 'Wales',
        awayTeam: 'Scotland',
        homeTeamScore: 26,
        awayTeamScore: 27,
        stadiumName: 'Principality Stadium',
        location: 'Cardiff',
        season: 2024,
      },
      {
        round: 2,
        date: '2024-02-10',
        homeTeam: 'Scotland',
        awayTeam: 'France',
        homeTeamScore: 16,
        awayTeamScore: 20,
        stadiumName: 'Scottish Gas Murrayfield Stadium',
        location: 'Edinburgh',
        season: 2024,
      },
      {
        round: 2,
        date: '2024-02-10',
        homeTeam: 'England',
        awayTeam: 'Wales',
        homeTeamScore: 16,
        awayTeamScore: 14,
        stadiumName: 'Wembley',
        location: 'London',
        season: 2024,
      },
      {
        round: 2,
        date: '2024-02-11',
        homeTeam: 'Ireland',
        awayTeam: 'Italy',
        homeTeamScore: 36,
        awayTeamScore: 0,
        stadiumName: 'Croke Park',
        location: 'Dublin',
        season: 2024,
      },
      {
        round: 3,
        date: '2024-02-24',
        homeTeam: 'Ireland',
        awayTeam: 'Wales',
        homeTeamScore: 31,
        awayTeamScore: 7,
        stadiumName: 'Croke Park',
        location: 'Dublin',
        season: 2024,
      },
      {
        round: 3,
        date: '2024-02-24',
        homeTeam: 'Scotland',
        awayTeam: 'England',
        homeTeamScore: 30,
        awayTeamScore: 21,
        stadiumName: 'Scottish Gas Murrayfield Stadium',
        location: 'Edinburgh',
        season: 2024,
      },
      {
        round: 3,
        date: '2024-02-25',
        homeTeam: 'France',
        awayTeam: 'Italy',
        homeTeamScore: 13,
        awayTeamScore: 13,
        stadiumName: 'Stade de France',
        location: 'Saint-Denis',
        season: 2024,
      },
      {
        round: 4,
        date: '2024-03-09',
        homeTeam: 'Italy',
        awayTeam: 'Scotland',
        homeTeamScore: 31,
        awayTeamScore: 29,
        stadiumName: 'San Siro',
        location: 'Milan',
        season: 2024,
      },
      {
        round: 4,
        date: '2024-03-09',
        homeTeam: 'England',
        awayTeam: 'Ireland',
        homeTeamScore: 23,
        awayTeamScore: 22,
        stadiumName: 'Wembley',
        location: 'London',
        season: 2024,
      },
      {
        round: 4,
        date: '2024-03-10',
        homeTeam: 'Wales',
        awayTeam: 'France',
        homeTeamScore: 24,
        awayTeamScore: 45,
        stadiumName: 'Principality Stadium',
        location: 'Cardiff',
        season: 2024,
      },
      {
        round: 5,
        date: '2024-03-16',
        homeTeam: 'Wales',
        awayTeam: 'Italy',
        homeTeamScore: 21,
        awayTeamScore: 24,
        stadiumName: 'Principality Stadium',
        location: 'Cardiff',
        season: 2024,
      },
      {
        round: 5,
        date: '2024-03-16',
        homeTeam: 'Ireland',
        awayTeam: 'Scotland',
        homeTeamScore: 17,
        awayTeamScore: 13,
        stadiumName: 'Croke Park',
        location: 'Dublin',
        season: 2024,
      },
      {
        round: 5,
        date: '2024-03-16',
        homeTeam: 'France',
        awayTeam: 'England',
        homeTeamScore: 33,
        awayTeamScore: 31,
        stadiumName: 'Stade de France',
        location: 'Saint-Denis',
        season: 2024,
      },
    ];

    const addTimeToDate = (dateString, time = '14:00') => { //currenly this sets the time to 14:00 for all fixtures
      return new Date(`${dateString}T${time}:00`);
    };


    const fixturesToInsert2021 = fixturesData2021.map((fixture) => {
      const homeTeam = teams.find((t) => t.teamName === fixture.homeTeam);
      const awayTeam = teams.find((t) => t.teamName === fixture.awayTeam);
      if (!homeTeam) {
        console.log(` Home team not found: ${fixture.homeTeam} ❌`);
        return null;
      }
      if (!awayTeam) {
        console.log(`Away team not found: ${fixture.awayTeam} ❌`);
        return null;
      }
      if (!homeTeam.stadium) {
        console.log(`Stadium not found for home team: ${fixture.homeTeam} ❌`);
        return null;
      }

      return {
        round: fixture.round,
        date: addTimeToDate(fixture.date),
        homeTeam: homeTeam._id,
        awayTeam: awayTeam._id,
        stadium: homeTeam.stadium,
        location: homeTeam.teamLocation,
        homeTeamScore: fixture.homeTeamScore, 
        awayTeamScore: fixture.awayTeamScore,
        season: fixture.season, 
      };
    }).filter(fixture => fixture !== null);

    if (fixturesToInsert2021.length !== fixturesData2021.length) {
      console.log('Some 2021 fixtures were not inserted due to missing data. ❌');
    }

    await Fixture.insertMany(fixturesToInsert2021);
    console.log('2021 Fixtures added 📅✅ '); 

    const fixturesToInsert2022 = fixturesData2022.map((fixture) => {
      const homeTeam = teams.find((t) => t.teamName === fixture.homeTeam);
      const awayTeam = teams.find((t) => t.teamName === fixture.awayTeam);
      if (!homeTeam) {
        console.log(`Home team not found: ${fixture.homeTeam} ❌`);
        return null;
      }
      if (!awayTeam) {
        console.log(`Away team not found: ${fixture.awayTeam} ❌`);
        return null;
      }
      if (!homeTeam.stadium) {
        console.log(`Stadium not found for home team: ${fixture.homeTeam}  ❌`);
        return null;
      }

      return {
        round: fixture.round,
        date: addTimeToDate(fixture.date),
        homeTeam: homeTeam._id,
        awayTeam: awayTeam._id,
        stadium: homeTeam.stadium,
        location: homeTeam.teamLocation, 
        homeTeamScore: fixture.homeTeamScore,
        awayTeamScore: fixture.awayTeamScore,
        season: fixture.season, // 2022
      };
    }).filter(fixture => fixture !== null); 

    if (fixturesToInsert2022.length !== fixturesData2022.length) {
      console.log('Some 2022 fixtures were not inserted due to missing data. ❌');
    }

    await Fixture.insertMany(fixturesToInsert2022);
    console.log('2022 Fixtures added 📅✅ ');

    const fixturesToInsert2023 = fixturesData2023.map((fixture) => {
      const homeTeam = teams.find((t) => t.teamName === fixture.homeTeam);
      const awayTeam = teams.find((t) => t.teamName === fixture.awayTeam);
      if (!homeTeam) {
        console.log(`Home team not found: ${fixture.homeTeam} ❌`);
        return null;
      }
      if (!awayTeam) {
        console.log(` Away team not found: ${fixture.awayTeam} ❌`);
        return null;
      }
      if (!homeTeam.stadium) {
        console.log(`Stadium not found for home team: ${fixture.homeTeam} ❌`);
        return null;
      }

      return {
        round: fixture.round,
        date: addTimeToDate(fixture.date), 
        homeTeam: homeTeam._id,
        awayTeam: awayTeam._id,
        stadium: homeTeam.stadium,
        location: homeTeam.teamLocation, 
        homeTeamScore: fixture.homeTeamScore,
        awayTeamScore: fixture.awayTeamScore,
        season: fixture.season, 
      };
    }).filter(fixture => fixture !== null); 

    if (fixturesToInsert2023.length !== fixturesData2023.length) {
      console.log('Some 2023 fixtures were not inserted due to missing data. ❌');
    }

    await Fixture.insertMany(fixturesToInsert2023);
    console.log('2023 Fixtures added 📅✅ ');

    const fixturesToInsert2024 = fixturesData2024.map((fixture) => {
      const homeTeam = teams.find((t) => t.teamName === fixture.homeTeam);
      const awayTeam = teams.find((t) => t.teamName === fixture.awayTeam);
      if (!homeTeam) {
        console.log(`Home team not found: ${fixture.homeTeam} ❌`);
        return null;
      }
      if (!awayTeam) {
        console.log(`Away team not found: ${fixture.awayTeam} ❌`);
        return null;
      }
      if (!homeTeam.stadium) {
        console.log(`Stadium not found for home team: ${fixture.homeTeam} ❌`);
        return null;
      }

      return {
        round: fixture.round,
        date: addTimeToDate(fixture.date),
        homeTeam: homeTeam._id,
        awayTeam: awayTeam._id,
        stadium: homeTeam.stadium,
        location: homeTeam.teamLocation,
        homeTeamScore: fixture.homeTeamScore,
        awayTeamScore: fixture.awayTeamScore,
        season: fixture.season, 
      };
    }).filter(fixture => fixture !== null); 

    if (fixturesToInsert2024.length !== fixturesData2024.length) {
      console.log('Some 2024 fixtures were not inserted due to missing data. ❌');
    }

    await Fixture.insertMany(fixturesToInsert2024);
    console.log('2024 Fixtures added 📅✅ ');

    mongoose.connection.close();
    console.log('🔌 Database seeding completed. ✅✅ ');
  } catch (err) {
    console.error('❌ ❌ Error seeding data:', err);
    mongoose.connection.close();
  }
}

function randomDOB() {
  const start = new Date(1985, 0, 1);
  const end = new Date(2000, 0, 1);
  const dob = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return dob;
}
