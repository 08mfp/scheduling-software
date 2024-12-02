import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

//! NEED TO ADD REDICT TO UNAUTHORIZED PAGE IF USER DOES NOT HAVE PERMISSION

interface Fixture {
  _id: string;
  round: number;
  date: string;
  homeTeam: {
    _id: string;
    teamName: string;
    image?: string;
  };
  awayTeam: {
    _id: string;
    teamName: string;
    image?: string;
  };
  stadium: {
    _id: string;
    stadiumName: string;
  };
  location: string;
  homeTeamScore?: number;
  awayTeamScore?: number;
  season: number;
}

const FixtureDetail: React.FC = () => {
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFixture = async () => {
      try {
        const response = await axios.get<Fixture>(`http://localhost:5003/api/fixtures/${id}`);
        setFixture(response.data);
      } catch (err) {
        console.error('Error fetching fixture', err);
      }
    };
    fetchFixture();
  }, [id]);

  const deleteFixture = async () => {
    if (window.confirm('Are you sure you want to delete this fixture?')) {
      try {
        await axios.delete(`http://localhost:5003/api/fixtures/${id}`);
        navigate('/fixtures');
      } catch (err) {
        console.error('Error deleting fixture', err);
      }
    }
  };

  if (!fixture) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Fixture Details</h2>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <img
            src={fixture.homeTeam.image || '/placeholder-home-team.png'}
            alt={`${fixture.homeTeam.teamName} logo`}
            className="w-12 h-12"
          />
          <span className="font-bold">{fixture.homeTeam.teamName}</span>
          <span>vs</span>
          <img
            src={fixture.awayTeam.image || '/placeholder-away-team.png'}
            alt={`${fixture.awayTeam.teamName} logo`}
            className="w-12 h-12"
          />
          <span className="font-bold">{fixture.awayTeam.teamName}</span>
        </div>
        <span className="text-gray-600">{fixture.date}</span>
      </div>
      <p>
        <strong>Stadium:</strong> {fixture.stadium.stadiumName}
      </p>
      <p>
        <strong>Location:</strong> {fixture.location}
      </p>
      {fixture.homeTeamScore != null && fixture.awayTeamScore != null ? (
        <p>
          <strong>Score:</strong> {fixture.homeTeamScore} - {fixture.awayTeamScore}
        </p>
      ) : (
        <p>No score available</p>
      )}
      {user?.role === 'admin' && (
        <div className="mt-4 space-x-4">
          <Link
            to={`/fixtures/edit/${fixture._id}`}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Edit
          </Link>
          <button
            onClick={deleteFixture}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default FixtureDetail;
