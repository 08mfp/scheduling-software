// let expect, sinon, generateTravelOptimizedFixtures, Fixture, Stadium;

// function stubFixtureFind(returnData) {
//   return sinon.stub(Fixture, 'find').returns({
//     populate: () => ({
//       populate: () => ({
//         lean: () => Promise.resolve(returnData)
//       })
//     })
//   });
// }

// describe('Travel Optimized Fixture Scheduling', function() {
//   let teams;
//   const season = 2025;

//   before(async function() {
//     const chaiModule = await import('chai');
//     expect = chaiModule.expect;
//     const sinonModule = await import('sinon');
//     sinon = sinonModule.default || sinonModule;
//     const travelModule = await import('../../algorithms/travelOptimizedScheduler.js');
//     generateTravelOptimizedFixtures = travelModule.generateTravelOptimizedFixtures;
//     const FixtureModule = await import('../../models/Fixture.js');
//     Fixture = FixtureModule.default || FixtureModule;
//     const StadiumModule = await import('../../models/Stadium.js');
//     Stadium = StadiumModule.default || StadiumModule;
//   });

//   beforeEach(function() {
//     teams = [
//       {
//         _id: 'England',
//         teamName: 'England',
//         stadium: {
//           _id: 'stadium-England',
//           stadiumCity: 'Twickenham',
//           latitude: 51.456021880294514,
//           longitude: -0.341698676363518
//         }
//       },
//       {
//         _id: 'Italy',
//         teamName: 'Italy',
//         stadium: {
//           _id: 'stadium-Italy',
//           stadiumCity: 'Rome',
//           latitude: 45.4781,
//           longitude: 9.124
//         }
//       },
//       {
//         _id: 'France',
//         teamName: 'France',
//         stadium: {
//           _id: 'stadium-France',
//           stadiumCity: 'Saint-Denis',
//           latitude: 48.9245,
//           longitude: 2.3601
//         }
//       },
//       {
//         _id: 'Ireland',
//         teamName: 'Ireland',
//         stadium: {
//           _id: 'stadium-Ireland',
//           stadiumCity: 'Dublin',
//           latitude: 53.3607,
//           longitude: -6.2511
//         }
//       },
//       {
//         _id: 'Scotland',
//         teamName: 'Scotland',
//         stadium: {
//           _id: 'stadium-Scotland',
//           stadiumCity: 'Murrayfield',
//           latitude: 55.9422,
//           longitude: -3.2409
//         }
//       },
//       {
//         _id: 'Wales',
//         teamName: 'Wales',
//         stadium: {
//           _id: 'stadium-Wales',
//           stadiumCity: 'Cardiff',
//           latitude: 51.4782,
//           longitude: -3.1826
//         }
//       }
//     ];
//   });

//   afterEach(function() {
//     sinon.restore();
//   });

//   it('throws an error if teams.length is not equal to 6', async function() {
//     const invalidTeams = teams.slice(0, 3);
//     try {
//       await generateTravelOptimizedFixtures(invalidTeams, season);
//       throw new Error('Expected error was not thrown');
//     } catch (error) {
//       expect(error.message).to.match(/exactly 6 teams/i);
//     }
//   });

//   it('produces exactly 15 unique fixtures (each team plays every other once)', async function() {
//     stubFixtureFind([]);
//     const { fixtures } = await generateTravelOptimizedFixtures(teams, season);
//     expect(fixtures.length).to.equal(15);

//     const matchupSet = new Set();
//     fixtures.forEach((fixture) => {
//       expect(fixture.homeTeam).to.not.equal(fixture.awayTeam);
//       const key = [fixture.homeTeam, fixture.awayTeam].sort().join('-');
//       matchupSet.add(key);
//     });
//     expect(matchupSet.size).to.equal(15);
//   });

//   it('assigns each team exactly once per round (5 rounds with 3 fixtures each)', async function() {
//     stubFixtureFind([]);
//     const { fixtures } = await generateTravelOptimizedFixtures(teams, season);
//     const rounds = {};
//     fixtures.forEach((fixture) => {
//       rounds[fixture.round] = rounds[fixture.round] || [];
//       rounds[fixture.round].push(fixture);
//     });
//     expect(Object.keys(rounds).length).to.equal(5);
//     Object.values(rounds).forEach((roundFixtures) => {
//       expect(roundFixtures.length).to.equal(3);
//       const teamsInRound = new Set();
//       roundFixtures.forEach((fixture) => {
//         teamsInRound.add(fixture.homeTeam);
//         teamsInRound.add(fixture.awayTeam);
//       });
//       expect(teamsInRound.size).to.equal(6);
//     });
//   });

//   it('Teams play either 2 home games and 3 away games OR 3 home games and 2 away games', async function() {
//     sinon.stub(Fixture, 'findOne').resolves(null);
//     sinon.stub(Fixture, 'find').returns({
//       populate: () => ({
//         populate: () => ({
//           lean: () => Promise.resolve([])
//         })
//       })
//     });
    
//     const { fixtures } = await generateTravelOptimizedFixtures(teams, 2025);
//     const homeCount = {};
//     const awayCount = {};
    
//     fixtures.forEach(fixture => {
//       const homeId = fixture.homeTeam.toString();
//       const awayId = fixture.awayTeam.toString();
//       homeCount[homeId] = (homeCount[homeId] || 0) + 1;
//       awayCount[awayId] = (awayCount[awayId] || 0) + 1;
//     });
  
//     teams.forEach(team => {
//       const teamId = team._id.toString();
//       const home = homeCount[teamId] || 0;
//       const away = awayCount[teamId] || 0;
//       console.log(`Team ${teamId}: Home games = ${home}, Away games = ${away}`);
//     });
    
//     teams.forEach(team => {
//       const teamId = team._id.toString();
//       const home = homeCount[teamId] || 0;
//       const away = awayCount[teamId] || 0;
//       expect(home).to.be.oneOf([2, 3]);
//       expect(away).to.equal(5 - home);
//     });
//   });

//   it('schedules all fixtures on a weekend (Saturday) with a minimum 2-hour gap between matches on the same day', async function() {
//     stubFixtureFind([]);
//     const { fixtures } = await generateTravelOptimizedFixtures(teams, season);
//     fixtures.forEach((fixture) => {
//       const day = new Date(fixture.date).getDay();
//       expect(day).to.equal(6);
//     });
//     const rounds = {};
//     fixtures.forEach((fixture) => {
//       rounds[fixture.round] = rounds[fixture.round] || [];
//       rounds[fixture.round].push(new Date(fixture.date));
//     });
//     Object.values(rounds).forEach((dates) => {
//       dates.sort((a, b) => a - b);
//       for (let i = 0; i < dates.length - 1; i++) {
//         const diff = dates[i + 1] - dates[i];
//         expect(diff).to.be.at.least(7200000);
//       }
//     });
//   });

//   it('alternates home advantage based on previous season data', async function() {
//     const prevFixture = {
//       season: season - 1,
//       homeTeam: { _id: 'England' },
//       awayTeam: { _id: 'France' }
//     };
//     stubFixtureFind([prevFixture]);
//     const { fixtures } = await generateTravelOptimizedFixtures(teams, season);
//     const match = fixtures.find((fixture) => {
//       const teamsSorted = [fixture.homeTeam, fixture.awayTeam].sort();
//       return teamsSorted.join('-') === ['England', 'France'].sort().join('-');
//     });
//     expect(match).to.exist;
//     expect(match.homeTeam).to.equal('France');
//     expect(match.awayTeam).to.equal('England');
//   });

//   it('calculates a total travel distance greater than zero for distant stadiums', async function() {
//     stubFixtureFind([]);
//     const result = await generateTravelOptimizedFixtures(teams, season);
//     expect(result.totalTravelDistance).to.be.a('number');
//     expect(result.totalTravelDistance).to.be.greaterThan(0);
//   });


//   it('produces different variations if run again in the same year', async function() {
//     stubFixtureFind([]);
//     const result1 = await generateTravelOptimizedFixtures(teams, season);
//     sinon.restore();
//     stubFixtureFind([]);
//     const result2 = await generateTravelOptimizedFixtures(teams, season);
//     const round1Order1 = result1.fixtures
//       .filter(f => f.round === 1)
//       .map(f => f.homeTeam.toString())
//       .join(',');
//     const round1Order2 = result2.fixtures
//       .filter(f => f.round === 1)
//       .map(f => f.homeTeam.toString())
//       .join(',');
//     expect(round1Order1).to.not.equal(round1Order2);
//   });

//   it('produces different variations if run in different years', async function() {
//     stubFixtureFind([]);
//     const result2025 = await generateTravelOptimizedFixtures(teams, 2025);
//     sinon.restore();
//     stubFixtureFind([]);
//     const result2026 = await generateTravelOptimizedFixtures(teams, 2026);
//     expect(result2025.fixtures[0].season).to.equal(2025);
//     expect(result2026.fixtures[0].season).to.equal(2026);
//     const round1Order2025 = result2025.fixtures
//       .filter(f => f.round === 1)
//       .map(f => f.homeTeam.toString())
//       .join(',');
//     const round1Order2026 = result2026.fixtures
//       .filter(f => f.round === 1)
//       .map(f => f.homeTeam.toString())
//       .join(',');
//     expect(round1Order2025).to.not.equal(round1Order2026);
//   });

//   it('produces a total travel distance between 14000 and 17000 km', async function() {
//     stubFixtureFind([]);
//     const result = await generateTravelOptimizedFixtures(teams, season);
//     expect(result.totalTravelDistance).to.be.within(14000, 17000);
//   });

//   it('brings teams back home at season end if they finished away', async function() {
//     stubFixtureFind([]);
//     const result = await generateTravelOptimizedFixtures(teams, season);
//     const summaryText = result.summary.join(' ');
//     expect(summaryText).to.include('Return home at season end');
//   });

//   it('schedules all fixture dates within February and March and rounds do not overlap weekends', async function() {
//     stubFixtureFind([]);
//     const { fixtures } = await generateTravelOptimizedFixtures(teams, season);
//     fixtures.forEach(fixture => {
//       const fixtureDate = new Date(fixture.date);
//       const start = new Date(`${season}-02-01`);
//       const end = new Date(`${season}-04-01`);
//       expect(fixtureDate.getTime()).to.be.within(start.getTime(), end.getTime());
//     });
//     const rounds = {};
//     fixtures.forEach(fixture => {
//       rounds[fixture.round] = rounds[fixture.round] || [];
//       rounds[fixture.round].push(new Date(fixture.date));
//     });
//     Object.values(rounds).forEach(dates => {
//       const weekStarts = dates.map(date => {
//         const copy = new Date(date);
//         copy.setDate(copy.getDate() - copy.getDay());
//         copy.setHours(0, 0, 0, 0);
//         return copy.getTime();
//       });
//       const uniqueWeekStarts = new Set(weekStarts);
//       expect(uniqueWeekStarts.size).to.equal(1);
//     });
//     const weekStartsByRound = Object.keys(rounds).map(round => {
//       const dates = rounds[round];
//       const copy = new Date(dates[0]);
//       copy.setDate(copy.getDate() - copy.getDay());
//       copy.setHours(0, 0, 0, 0);
//       return copy.getTime();
//     });
//     const uniqueRounds = new Set(weekStartsByRound);
//     expect(uniqueRounds.size).to.equal(Object.keys(rounds).length);
//   });
// });