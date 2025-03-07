let expect, sinon, generateRound5ExtravaganzaFixtures, Fixture, Stadium;

function createId(idStr) {
  return {
    value: idStr,
    toString() {
      return idStr;
    },
    equals(other) {
      const otherVal = (typeof other === 'object' && other.toString) ? other.toString() : other;
      return idStr === otherVal;
    }
  };
}

describe('Round5 Extravaganza Fixture Scheduling', function() {
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
    const round5Module = await import('../round5Extravaganza.js');
    generateRound5ExtravaganzaFixtures = round5Module.generateRound5ExtravaganzaFixtures;
    const FixtureModule = await import('../../models/Fixture.js');
    Fixture = FixtureModule.default || FixtureModule;
    const StadiumModule = await import('../../models/Stadium.js');
    Stadium = StadiumModule.default || StadiumModule;
  });
  beforeEach(function() {
    teams = [
      { _id: createId('England'), stadium: 'stadium-England', teamName: 'England', teamRanking: 1 },
      { _id: createId('Wales'),    stadium: 'stadium-Wales',    teamName: 'Wales',    teamRanking: 2 },
      { _id: createId('Scotland'), stadium: 'stadium-Scotland', teamName: 'Scotland', teamRanking: 3 },
      { _id: createId('Ireland'),  stadium: 'stadium-Ireland',  teamName: 'Ireland',  teamRanking: 4 },
      { _id: createId('Italy'),    stadium: 'stadium-Italy',    teamName: 'Italy',    teamRanking: 5 },
      { _id: createId('France'),   stadium: 'stadium-France',   teamName: 'France',   teamRanking: 6 }
    ];
    
    teams.forEach(team => {
      team.equals = function(other) {
        const otherVal = (other && other.toString) ? other.toString() : other;
        return team._id.toString() === otherVal;
      };
    });
    sinon.stub(Stadium, 'findById').callsFake(async (id) => {
      return { _id: id, stadiumName: `Stadium ${id}`, stadiumCity: `City ${id}` };
    });
  });
  afterEach(function() {
    sinon.restore();
  });

  it('Teams do not play itself', async function() {
    sinon.stub(Fixture, 'findOne').resolves(null);
    const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
    fixtures.forEach(fixture => {
      expect(fixture.homeTeam.toString()).to.not.equal(fixture.awayTeam.toString());
    });
  });

  it('Team play every other team exactly once', async function() {
    sinon.stub(Fixture, 'findOne').resolves(null);
    const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
    const matchupCount = {};
    fixtures.forEach(fixture => {
      const key = [fixture.homeTeam.toString(), fixture.awayTeam.toString()].sort().join('-');
      matchupCount[key] = (matchupCount[key] || 0) + 1;
    });
    expect(Object.keys(matchupCount).length).to.equal(15);
    Object.values(matchupCount).forEach(count => {
      expect(count).to.equal(1);
    });
  });

  it('Teams play exactly once per round', async function() {
    sinon.stub(Fixture, 'findOne').resolves(null);
    const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
    const rounds = {};
    fixtures.forEach(fixture => {
      rounds[fixture.round] = rounds[fixture.round] || [];
      rounds[fixture.round].push(fixture);
    });
    Object.values(rounds).forEach(roundFixtures => {
      const teamsInRound = new Set();
      roundFixtures.forEach(fixture => {
        teamsInRound.add(fixture.homeTeam.toString());
        teamsInRound.add(fixture.awayTeam.toString());
      });
      expect(teamsInRound.size).to.equal(6);
    });
  });

  it('Teams play either 2 home games and 3 away games OR 3 home games and 2 away games', async function() {
    sinon.stub(Fixture, 'findOne').resolves(null);
    const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
    const homeCount = {};
    const awayCount = {};
    fixtures.forEach(fixture => {
      homeCount[fixture.homeTeam.toString()] = (homeCount[fixture.homeTeam.toString()] || 0) + 1;
      awayCount[fixture.awayTeam.toString()] = (awayCount[fixture.awayTeam.toString()] || 0) + 1;
    });
    teams.forEach(team => {
      const home = homeCount[team._id.toString()] || 0;
      const away = awayCount[team._id.toString()] || 0;
      expect(home).to.be.oneOf([2, 3]);
      expect(away).to.equal(5 - home);
    });
  });

  it('Generates 5 rounds with 3 fixtures per round', async function() {
    sinon.stub(Fixture, 'findOne').resolves(null);
    const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
    const rounds = {};
    fixtures.forEach(fixture => {
      rounds[fixture.round] = rounds[fixture.round] || [];
      rounds[fixture.round].push(fixture);
    });
    expect(Object.keys(rounds).length).to.equal(5);
    Object.values(rounds).forEach(roundFixtures => {
      expect(roundFixtures.length).to.equal(3);
    });
  });

  it('Generates exactly 15 fixtures', async function() {
    sinon.stub(Fixture, 'findOne').resolves(null);
    const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
    expect(fixtures.length).to.equal(15);
  });

  it('Schedules fixtures on a weekend (Saturday or Sunday)', async function() {
    sinon.stub(Fixture, 'findOne').resolves(null);
    const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
    fixtures.forEach(fixture => {
      const day = new Date(fixture.date).getDay();
      expect([0, 6]).to.include(day);
    });
  });

  it('Alternates home advantage based on previous season fixture', async function() {
    sinon.stub(Fixture, 'findOne').callsFake(async (query) => {
      if (query.season === 2024 && query.$or && query.$or[0].homeTeam.equals(teams[0]._id)) {
        return { homeTeam: teams[0]._id };
      }
      return null;
    });
    const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
    const round5Fixtures = fixtures.filter(f => f.round === 5);
    const topMatch = round5Fixtures.find(f => {
      const sorted = [f.homeTeam.toString(), f.awayTeam.toString()].sort();
      return sorted.join('-') === [teams[0]._id.toString(), teams[1]._id.toString()].sort().join('-');
    });
    expect(topMatch).to.exist;
  });

  it('Has a minimum 2-hour gap between fixtures on the same day', async function() {
    sinon.stub(Fixture, 'findOne').resolves(null);
    const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
    const rounds = {};
    fixtures.forEach(fixture => {
      rounds[fixture.round] = rounds[fixture.round] || [];
      rounds[fixture.round].push(fixture);
    });
    Object.values(rounds).forEach(roundFixtures => {
      const sorted = roundFixtures.sort((a, b) => new Date(a.date) - new Date(b.date));
      for (let i = 0; i < sorted.length - 1; i++) {
        const diff = new Date(sorted[i+1].date) - new Date(sorted[i].date);
        expect(diff).to.be.at.least(7200000);
      }
    });
  });

  it('Populates stadium details for each fixture', async function() {
    sinon.stub(Fixture, 'findOne').resolves(null);
    const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
    fixtures.forEach(fixture => {
      expect(fixture.stadium).to.be.a('string');
      expect(fixture.location).to.equal(`City ${fixture.stadium}`);
    });
  });

  it('throws an error if teams.length is not equal to 6', async function() {
    const consoleErrorStub = sinon.stub(console, 'error');
    const invalidTeams = [
      { _id: createId('England'), stadium: 'stadium-England', teamName: 'England', teamRanking: 1 },
      { _id: createId('Wales'),    stadium: 'stadium-Wales',    teamName: 'Wales',    teamRanking: 2 },
      { _id: createId('Scotland'), stadium: 'stadium-Scotland', teamName: 'Scotland', teamRanking: 3 }
    ];
    sinon.stub(Fixture, 'findOne').resolves(null);
    try {
      await generateRound5ExtravaganzaFixtures(invalidTeams, 2025);
      throw new Error('Expected error was not thrown');
    } catch (error) {
      expect(error.message).to.match(/exactly 6 teams/i);
    }
    consoleErrorStub.restore();
  });

//   it('Produces different fixture orders on subsequent runs', async function() {
//     let orders = [];
//     for (let i = 0; i < 5; i++) {
//       sinon.stub(Fixture, 'findOne').resolves(null);
//       const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
//       sinon.restore();
//       const order = fixtures.filter(f => f.round === 1).map(f => f.homeTeam.toString()).join(',');
//       orders.push(order);
//     }
//     const uniqueOrders = Array.from(new Set(orders));
//     expect(uniqueOrders.length).to.be.greaterThan(1);
//   });

  it('assign valid ISO date strings to fixtures', async function() {
    sinon.stub(Fixture, 'findOne').resolves(null);
    const { fixtures } = await generateRound5ExtravaganzaFixtures(teams, 2025);
    fixtures.forEach(fixture => {
      expect(Date.parse(fixture.date)).to.be.a('number').and.not.be.NaN;
    });
  });
  it('Attempts to schedule the best matches towards the later rounds and follows all constraints for six nations', async function() {
    sinon.stub(Fixture, 'findOne').resolves(null);
    const { fixtures, summary } = await generateRound5ExtravaganzaFixtures(teams, 2025, [2,4]);
    const round5Fixtures = fixtures.filter(f => f.round === 5);
    const topMatch = round5Fixtures.find(f => {
      const sorted = [f.homeTeam.toString(), f.awayTeam.toString()].sort();
      return sorted.join('-') === [teams[0]._id.toString(), teams[1]._id.toString()].sort().join('-');
    });
    expect(topMatch).to.exist;
    expect(summary.join(' ')).to.include('Match Week 5');
    expect(summary.join(' ')).to.include('Rest Week inserted');
  });
});
