// algorithms/tests/randomSchedulerTest.js

let expect, sinon, generateRandomFixtures, Fixture, Stadium;

describe('Random Fixture Scheduling Algorithm', function() {
  let teams;
  const previousFixtures = [
    { season: 2024, homeTeam: 'England', awayTeam: 'France' },
    { season: 2024, homeTeam: 'Ireland', awayTeam: 'England' },
    { season: 2024, homeTeam: 'England', awayTeam: 'Italy' },
    { season: 2024, homeTeam: 'Scotland', awayTeam: 'England' },
    { season: 2024, homeTeam: 'England', awayTeam: 'Wales' },
    { season: 2024, homeTeam: 'France', awayTeam: 'Ireland' },
    { season: 2024, homeTeam: 'Italy', awayTeam: 'France' },
    { season: 2024, homeTeam: 'France', awayTeam: 'Scotland' },
    { season: 2024, homeTeam: 'Wales', awayTeam: 'France' },
    { season: 2024, homeTeam: 'Ireland', awayTeam: 'Italy' },
    { season: 2024, homeTeam: 'Scotland', awayTeam: 'Ireland' },
    { season: 2024, homeTeam: 'Ireland', awayTeam: 'Wales' },
    { season: 2024, homeTeam: 'Italy', awayTeam: 'Scotland' },
    { season: 2024, homeTeam: 'Wales', awayTeam: 'Italy' },
    { season: 2024, homeTeam: 'Scotland', awayTeam: 'Wales' }
  ];

  before(async function() {
    const chaiModule = await import('chai');
    expect = chaiModule.expect;
    const sinonModule = await import('sinon');
    sinon = sinonModule.default || sinonModule;
    const randomAlgorithmModule = await import('../randomAlgorithm.js');
    generateRandomFixtures = randomAlgorithmModule.generateRandomFixtures;
    const FixtureModule = await import('../../models/Fixture.js');
    Fixture = FixtureModule.default || FixtureModule;
    const StadiumModule = await import('../../models/Stadium.js');
    Stadium = StadiumModule.default || StadiumModule;
  });

  beforeEach(function() {
    teams = [
      { _id: 'England', stadium: 'stadium-England' },
      { _id: 'Wales', stadium: 'stadium-Wales' },
      { _id: 'Scotland', stadium: 'stadium-Scotland' },
      { _id: 'Ireland', stadium: 'stadium-Ireland' },
      { _id: 'Italy', stadium: 'stadium-Italy' },
      { _id: 'France', stadium: 'stadium-France' }
    ];
    sinon.stub(Stadium, 'findById').callsFake(async (id) => {
      return { stadiumName: `Stadium ${id}`, stadiumCity: `City ${id}` };
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  it('Teams do not play itself', async function() {
    sinon.stub(Fixture, 'find').resolves([]);
    const { fixtures } = await generateRandomFixtures(teams, 2025);
    fixtures.forEach((fixture) => {
      expect(fixture.homeTeam._id).to.not.equal(fixture.awayTeam._id);
    });
  });

  it('Team play every other team exactly once', async function() {
    sinon.stub(Fixture, 'find').resolves([]);
    const { fixtures } = await generateRandomFixtures(teams, 2025);
    const matchupCount = {};
    fixtures.forEach((fixture) => {
      const key = [fixture.homeTeam._id, fixture.awayTeam._id].sort().join('-');
      matchupCount[key] = (matchupCount[key] || 0) + 1;
    });
    expect(Object.keys(matchupCount).length).to.equal(15);
    Object.values(matchupCount).forEach((count) => {
      expect(count).to.equal(1);
    });
  });

  it('Teams play exactly once per round', async function() {
    sinon.stub(Fixture, 'find').resolves([]);
    const { fixtures } = await generateRandomFixtures(teams, 2025);
    const rounds = {};
    fixtures.forEach((fixture) => {
      rounds[fixture.round] = rounds[fixture.round] || [];
      rounds[fixture.round].push(fixture);
    });
    Object.values(rounds).forEach((roundFixtures) => {
      const teamsInRound = new Set();
      roundFixtures.forEach((fixture) => {
        teamsInRound.add(fixture.homeTeam._id);
        teamsInRound.add(fixture.awayTeam._id);
      });
      expect(teamsInRound.size).to.equal(6);
    });
  });

  it('Teams play either 2 home games and 3 away games OR 3 home games and 2 away games', async function() {
    sinon.stub(Fixture, 'find').resolves(previousFixtures);
    const { fixtures } = await generateRandomFixtures(teams, 2025);
    const homeCount = {};
    const awayCount = {};
    fixtures.forEach((fixture) => {
      homeCount[fixture.homeTeam._id] = (homeCount[fixture.homeTeam._id] || 0) + 1;
      awayCount[fixture.awayTeam._id] = (awayCount[fixture.awayTeam._id] || 0) + 1;
    });
    teams.forEach((team) => {
      const home = homeCount[team._id] || 0;
      const away = awayCount[team._id] || 0;
      expect(home).to.be.oneOf([2, 3]);
      expect(away).to.equal(5 - home);
    });
  });

  it('Generates 5 rounds with 3 fixtures per round', async function() {
    sinon.stub(Fixture, 'find').resolves([]);
    const { fixtures } = await generateRandomFixtures(teams, 2025);
    const rounds = {};
    fixtures.forEach((fixture) => {
      rounds[fixture.round] = rounds[fixture.round] || [];
      rounds[fixture.round].push(fixture);
    });
    expect(Object.keys(rounds).length).to.equal(5);
    Object.values(rounds).forEach((roundFixtures) => {
      expect(roundFixtures.length).to.equal(3);
    });
  });

  it('Generates exactly 15 fixtures', async function() {
    sinon.stub(Fixture, 'find').resolves([]);
    const { fixtures } = await generateRandomFixtures(teams, 2025);
    expect(fixtures.length).to.equal(15);
  });

  it('Schedules fixtures on a weekend (Saturday or Sunday)', async function() {
    sinon.stub(Fixture, 'find').resolves([]);
    const { fixtures } = await generateRandomFixtures(teams, 2025);
    fixtures.forEach((fixture) => {
      const day = new Date(fixture.date).getDay();
      expect([0, 6]).to.include(day);
    });
  });

  it('Alternates home advantage based on previous season fixture', async function() {
    sinon.stub(Fixture, 'find').resolves([{ season: 2024, homeTeam: 'England', awayTeam: 'Wales' }]);
    const { fixtures } = await generateRandomFixtures(teams, 2025);
    const fixtureEW = fixtures.find((fixture) => {
      const matchup = [fixture.homeTeam._id, fixture.awayTeam._id].sort().join('-');
      return matchup === 'England-Wales';
    });
    expect(fixtureEW).to.exist;
    expect(fixtureEW.homeTeam._id).to.equal('Wales');
    expect(fixtureEW.awayTeam._id).to.equal('England');
  });

  it('Has a minimum 2-hour gap between fixtures on the same day', async function() {
    sinon.stub(Fixture, 'find').resolves([]);
    const { fixtures } = await generateRandomFixtures(teams, 2025);
    const rounds = {};
    fixtures.forEach(fixture => {
      rounds[fixture.round] = rounds[fixture.round] || [];
      rounds[fixture.round].push(fixture);
    });
    Object.values(rounds).forEach(roundFixtures => {
      const sortedFixtures = roundFixtures.sort((a, b) => new Date(a.date) - new Date(b.date));
      for (let i = 0; i < sortedFixtures.length - 1; i++) {
        const dateA = new Date(sortedFixtures[i].date);
        const dateB = new Date(sortedFixtures[i + 1].date);
        if (dateA.toDateString() === dateB.toDateString()) {
          const diff = dateB - dateA;
          expect(diff).to.be.at.least(7200000);
        }
      }
    });
  });

  it('Populates stadium details for each fixture', async function() {
    sinon.stub(Fixture, 'find').resolves([]);
    const { fixtures } = await generateRandomFixtures(teams, 2025);
    fixtures.forEach((fixture) => {
      expect(fixture.stadium).to.have.property('stadiumName').that.matches(/Stadium/);
      expect(fixture.stadium).to.have.property('stadiumCity').that.matches(/City/);
      expect(fixture.location).to.equal(fixture.stadium.stadiumCity);
    });
  });

  it('throws an error if teams.length is not equal to 6', async function() {
    const consoleErrorStub = sinon.stub(console, 'error');
    const invalidTeams = [
      { _id: 'England', stadium: 'stadium-England' },
      { _id: 'Wales', stadium: 'stadium-Wales' },
      { _id: 'Scotland', stadium: 'stadium-Scotland' }
    ];
    sinon.stub(Fixture, 'find').resolves([]);
    try {
      await generateRandomFixtures(invalidTeams, 2025);
      throw new Error('Expected error was not thrown');
    } catch (error) {
      expect(error.message).to.match(/Exactly 6 teams are required/);
    }
    consoleErrorStub.restore();
  });

  it('Produces different fixture orders on subsequent runs', async function() {
    const fixtureFindStub1 = sinon.stub(Fixture, 'find').resolves([]);
    const result1 = await generateRandomFixtures(teams, 2025);
    fixtureFindStub1.restore();
    const fixtureFindStub2 = sinon.stub(Fixture, 'find').resolves([]);
    const result2 = await generateRandomFixtures(teams, 2025);
    fixtureFindStub2.restore();
    const round1Order1 = result1.fixtures.filter(f => f.round === 1).map(f => f.homeTeam._id).join(',');
    const round1Order2 = result2.fixtures.filter(f => f.round === 1).map(f => f.homeTeam._id).join(',');
    expect(round1Order1).to.not.equal(round1Order2);
  });
});
