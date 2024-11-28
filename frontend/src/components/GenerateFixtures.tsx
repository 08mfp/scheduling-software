// frontend/src/components/GenerateFixtures.tsx

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import ManualFixtureScheduler from './ManualFixtureScheduler'; // Adjust the path as needed
import { AuthContext } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

// Define the Stadium interface
interface Stadium {
  _id: string;
  stadiumName: string;
  stadiumCity?: string; // Include if necessary
}

// Define the Team interface
interface Team {
  _id: string;
  teamName: string;
  teamRanking: number;
  teamLocation: string;
  teamCoach: string;
  stadium: string | Stadium; // Initially a string (ID), populated with Stadium object
}

// Define the Fixture interface
interface Fixture {
  _id?: string;
  round: number;
  date: string; // Changed to string for easier handling with datetime-local
  homeTeam: Team;
  awayTeam: Team;
  stadium: Stadium | null;
  location: string;
  season: number;
}

const GenerateFixtures: React.FC = () => {
  // State variables
  const [season, setSeason] = useState<number>(new Date().getFullYear() + 1);
  const [algorithm, setAlgorithm] = useState<string>('random');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [summary, setSummary] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [generationMethod, setGenerationMethod] = useState<string>('automatic');

  const { user, apiKey } = useContext(AuthContext);

  // Fetch teams on component mount
  useEffect(() => {
    if (user && user.role === 'admin') {
      const fetchTeams = async () => {
        try {
          const response = await axios.get('http://localhost:5003/api/teams');
          setTeams(response.data || []);
        } catch (error) {
          console.error('Error fetching teams:', error);
          setErrorMessage('Failed to load teams. Please try again later.');
        }
      };

      fetchTeams();
    }
  }, [user]);

  // Handle team selection
  const handleTeamSelection = (teamId: string) => {
    setErrorMessage('');
    setSelectedTeamIds((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(teamId)) {
        newSelected.delete(teamId);
      } else {
        if (newSelected.size >= 6) {
          setErrorMessage('You can select up to 6 teams.');
          return prevSelected;
        }
        newSelected.add(teamId);
      }
      return newSelected;
    });
  };

  // Validate team selection before generating fixtures
  const validateSelection = (): boolean => {
    if (selectedTeamIds.size !== 6) {
      setErrorMessage('Please select exactly 6 teams.');
      return false;
    }
    return true;
  };

  // Generate Fixtures
  const generateFixtures = async () => {
    setLoading(true);
    setErrorMessage('');
    setFixtures([]);
    setSummary([]);

    // Validate selection
    if (!validateSelection()) {
      setLoading(false);
      return;
    }

    // Prepare payload
    const payload: any = {
      season,
      algorithm,
      teams: Array.from(selectedTeamIds),
    };

    try {
      const response = await axios.post('http://localhost:5003/api/provisional-fixtures/generate', payload, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      // Convert dates to ISO strings if necessary
      const generatedFixtures: Fixture[] = (response.data.fixtures || []).map((fixture: any) => ({
        ...fixture,
        date: new Date(fixture.date).toISOString().slice(0, 16), // Format for datetime-local
      }));
      setFixtures(generatedFixtures);
      setSummary(response.data.summary || []);
    } catch (error: any) {
      console.error('Error generating fixtures:', error);
      const backendMessage = error.response?.data?.message || 'Error generating fixtures';
      setErrorMessage(backendMessage);
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  };

  // Save Fixtures
  const saveFixtures = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // Convert date strings back to Date objects or appropriate format for backend
      const fixturesToSave = fixtures.map((fixture) => ({
        ...fixture,
        date: new Date(fixture.date),
      }));
      await axios.post(
        'http://localhost:5003/api/provisional-fixtures/save',
        { season, fixtures: fixturesToSave },
        {
          headers: {
            'x-api-key': apiKey,
          },
        }
      );
      alert('Fixtures saved successfully!');
      setFixtures([]);
      setSummary([]);
    } catch (error: any) {
      console.error('Error saving fixtures:', error);
      const backendMessage = error.response?.data?.message || 'Error saving fixtures. Please try again.';
      setErrorMessage(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle generation method change
  const handleGenerationMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGenerationMethod(e.target.value);
    setErrorMessage('');
    setFixtures([]);
    setSummary([]);
    setSelectedTeamIds(new Set());
  };

  // Handle date change for a specific fixture
  const handleDateChange = (index: number, newDate: string) => {
    setFixtures((prevFixtures) => {
      const updatedFixtures = [...prevFixtures];
      updatedFixtures[index].date = newDate;
      return updatedFixtures;
    });
  };

  // If the user is not authenticated or doesn't have admin role, redirect to unauthorized
  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Generate Fixtures</h2>

      {/* Generation Method Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="generationMethod">Fixture Generation Method:</label>
        <select
          id="generationMethod"
          value={generationMethod}
          onChange={handleGenerationMethodChange}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          <option value="automatic">Automatic</option>
          <option value="manual">Manual Scheduler</option>
        </select>
      </div>

      {/* Conditional Rendering based on generationMethod */}
      {generationMethod === 'automatic' && (
        <>
          {/* Season Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="season">Season:</label>
            <input
              type="number"
              id="season"
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value))}
              min={2000} // Example validation
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>

          {/* Algorithm Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="algorithm">Algorithm:</label>
            <select
              id="algorithm"
              value={algorithm}
              onChange={(e) => {
                setAlgorithm(e.target.value);
                setErrorMessage('');
                setSelectedTeamIds(new Set()); // Reset selected teams when algorithm changes
              }}
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              <option value="random">Random</option>
              <option value="round5Extravaganza">Round 5 Extravaganza</option>
              <option value="travelOptimized">Travel Optimized Scheduler</option>
              <option value="balancedTravel">Balanced Travel Scheduler</option>
            </select>
          </div>

          {/* Team Selection */}
          <div style={{ marginBottom: '20px' }}>
            <h3>Select 6 Teams</h3>
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {(teams || []).map((team) => (
                <div key={team._id} style={{ marginRight: '15px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    id={team._id}
                    checked={selectedTeamIds.has(team._id)}
                    onChange={() => handleTeamSelection(team._id)}
                    disabled={!selectedTeamIds.has(team._id) && selectedTeamIds.size >= 6}
                  />
                  <label htmlFor={team._id} style={{ marginLeft: '5px' }}>
                    {team.teamName} (Rank {team.teamRanking})
                  </label>
                </div>
              ))}
            </div>
            <p>{selectedTeamIds.size} of 6 teams selected.</p>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateFixtures}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>

          {/* Display General Error Messages */}
          {errorMessage && <p style={{ color: 'red', marginTop: '20px' }}>{errorMessage}</p>}

          {/* Summary Section */}
          {summary.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3>Summary</h3>
              <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>
                {summary.join('\n')}
              </pre>
            </div>
          )}

          {/* Fixtures Table */}
          {fixtures.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3>Provisional Fixtures</h3>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginTop: '10px',
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Round</th>
                    <th style={tableHeaderStyle}>Date & Time</th>
                    <th style={tableHeaderStyle}>Home Team</th>
                    <th style={tableHeaderStyle}>Away Team</th>
                    <th style={tableHeaderStyle}>Stadium</th>
                    <th style={tableHeaderStyle}>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {(fixtures || []).map((fixture, index) => (
                    <tr key={`${fixture.homeTeam._id}-${fixture.awayTeam._id}-${fixture.round}`}>
                      <td style={tableCellStyle}>{fixture.round}</td>
                      <td style={tableCellStyle}>
                        <input
                          type="datetime-local"
                          value={fixture.date}
                          onChange={(e) => handleDateChange(index, e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td style={tableCellStyle}>{fixture.homeTeam.teamName}</td>
                      <td style={tableCellStyle}>{fixture.awayTeam.teamName}</td>
                      <td style={tableCellStyle}>{fixture.stadium ? fixture.stadium.stadiumName : 'Unknown'}</td>
                      <td style={tableCellStyle}>{fixture.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={saveFixtures}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '20px',
                }}
              >
                {loading ? 'Saving...' : 'Save Fixtures'}
              </button>
            </div>
          )}
        </>
      )}

      {generationMethod === 'manual' && <ManualFixtureScheduler />}

      {/* Display Error Messages Related to Team Selection */}
      {generationMethod === 'manual' && errorMessage && (
        <p style={{ color: 'red', marginTop: '20px' }}>{errorMessage}</p>
      )}
    </div>
  );
};

// Styles for table headers and cells
const tableHeaderStyle: React.CSSProperties = {
  border: '1px solid #dee2e6',
  padding: '8px',
  backgroundColor: '#f1f1f1',
  textAlign: 'left',
};

const tableCellStyle: React.CSSProperties = {
  border: '1px solid #dee2e6',
  padding: '8px',
};

export default GenerateFixtures;
