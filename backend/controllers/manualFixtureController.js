/**
 * @module backend/controllers/manualFixtureController
 * @description This file contains the controller functions for manually scheduling fixtures in the database.
 * @api ManualFixture
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const Stadium = require('../models/Stadium');

/**
 * @desc    Get previous season's fixture between two teams to determine home/away
 * @route   GET /api/manual-fixtures/previous-fixture
 * @access  Private (Admin only)
 */
exports.getPreviousFixture = async (req, res) => {
    try {
        const { season, teamAId, teamBId } = req.query;

        if (!season || !teamAId || !teamBId) {
            return res.status(400).json({ message: 'season, teamAId, and teamBId are required' });
        }

        const previousSeason = parseInt(season) - 1;

        const previousFixture = await Fixture.findOne({
            season: previousSeason,
            $or: [
                { homeTeam: teamAId, awayTeam: teamBId },
                { homeTeam: teamBId, awayTeam: teamAId },
            ],
        });

        let homeTeamId, awayTeamId;

        if (previousFixture) {
            if (previousFixture.homeTeam.toString() === teamAId) {
                homeTeamId = teamBId;
                awayTeamId = teamAId;
            } else {
                homeTeamId = teamAId;
                awayTeamId = teamBId;
            }
        } else {
            homeTeamId = teamAId;
            awayTeamId = teamBId;
        }

        const homeTeam = await Team.findById(homeTeamId).populate('stadium');
        const awayTeam = await Team.findById(awayTeamId);

        if (!homeTeam || !awayTeam) {
            return res.status(404).json({ message: 'Teams not found' });
        }

        const stadium = homeTeam.stadium;

        res.status(200).json({
            homeTeam: {
                _id: homeTeam._id,
                teamName: homeTeam.teamName,
            },
            awayTeam: {
                _id: awayTeam._id,
                teamName: awayTeam.teamName,
            },
            stadium: {
                _id: stadium._id,
                stadiumName: stadium.stadiumName,
            },
            location: stadium.stadiumCity,
            previousFixture: previousFixture
                ? {
                      season: previousFixture.season,
                      homeTeam: previousFixture.homeTeam.toString(),
                      awayTeam: previousFixture.awayTeam.toString(),
                  }
                : null,
        });
    } catch (error) {
        console.error('Error fetching previous fixture:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Validate manually scheduled fixtures
 * @route   POST /api/manual-fixtures/validate
 * @access  Private (Admin only)
 */
exports.validateFixtures = async (req, res) => {
    try {
        const { fixtures, season } = req.body;

        if (!fixtures || !Array.isArray(fixtures) || fixtures.length === 0) {
            return res.status(400).json({ message: 'No fixtures provided' });
        }

        const validationResult = await validateFixtures(fixtures, season);

        if (!validationResult.isValid) {
            return res.status(400).json({ message: 'Validation failed', errors: validationResult.errors });
        }

        res.status(200).json({ message: 'Fixtures are valid' });
    } catch (error) {
        console.error('Error validating fixtures:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Save manually scheduled fixtures
 * @route   POST /api/manual-fixtures/save
 * @access  Private (Admin only)
 */
exports.saveFixtures = async (req, res) => {
    try {
        const { fixtures, season } = req.body;

        if (!fixtures || !Array.isArray(fixtures) || fixtures.length === 0) {
            return res.status(400).json({ message: 'No fixtures provided' });
        }

        const validationResult = await validateFixtures(fixtures, season);

        if (!validationResult.isValid) {
            return res.status(400).json({ message: 'Validation failed', errors: validationResult.errors });
        }

        await Fixture.deleteMany({ season });

        await Fixture.insertMany(fixtures);

        res.status(200).json({ message: 'Fixtures saved successfully' });
    } catch (error) {
        console.error('Error saving fixtures:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

async function validateFixtures(fixtures, season) {
    const errors = [];
    let isValid = true;

    const teams = await Team.find();
    const teamIds = teams.map(team => team._id.toString());

    const rounds = new Set(fixtures.map(f => f.round));
    if (rounds.size !== 5) {
        isValid = false;
        errors.push('There must be exactly 5 rounds');
    }

    for (let round = 1; round <= 5; round++) {
        const fixturesInRound = fixtures.filter(f => f.round === round);
        if (fixturesInRound.length !== 3) {
            isValid = false;
            errors.push(`Round ${round} must have exactly 3 fixtures`);
        }
    }

    for (let round = 1; round <=5; round++) {
        const fixturesInRound = fixtures.filter(f => f.round === round);
        const teamsInRound = new Set();
        fixturesInRound.forEach(f => {
            teamsInRound.add(f.homeTeam.toString());
            teamsInRound.add(f.awayTeam.toString());
        });
        if (teamsInRound.size !== 6) {
            isValid = false;
            errors.push(`Round ${round} must have 6 unique teams`);
        }
    }

    const matchupSet = new Set();
    fixtures.forEach(f => {
        const teamAId = f.homeTeam.toString();
        const teamBId = f.awayTeam.toString();
        const matchupKey = [teamAId, teamBId].sort().join('-');
        if (matchupSet.has(matchupKey)) {
            isValid = false;
            errors.push(`Duplicate matchup found between teams ${teamAId} and ${teamBId}`);
        } else {
            matchupSet.add(matchupKey);
        }
    });

    for (let fixture of fixtures) {
        const previousSeason = season - 1;
        const previousFixture = await Fixture.findOne({
            season: previousSeason,
            $or: [
                { homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam },
                { homeTeam: fixture.awayTeam, awayTeam: fixture.homeTeam },
            ],
        });

        if (previousFixture) {
            if (previousFixture.homeTeam.toString() === fixture.homeTeam.toString()) {
                isValid = false;
                errors.push(`Home advantage not alternated for fixture between teams ${fixture.homeTeam} and ${fixture.awayTeam}`);
            }
        }
    }

    // Dates can only be between Friday 6pm to Sunday 8pm //! This is a new constraint NO POINT PLAYING WEEKDAYS
    for (let fixture of fixtures) {
        const date = new Date(fixture.date);
        const day = date.getUTCDay();
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();

        if (day === 5) { // Friday
            if (hours < 18) {
                isValid = false;
                errors.push(`Fixture on ${date} is before 6pm on Friday`);
            }
        } else if (day === 6 || day === 0) { 
            if (day === 0 && (hours > 20 || (hours === 20 && minutes > 0))) {
                isValid = false;
                errors.push(`Fixture on ${date} is after 8pm on Sunday`);
            }
        } else {
            isValid = false;
            errors.push(`Fixture on ${date} is not on Friday, Saturday, or Sunday`);
        }
    }

    return { isValid, errors };
}