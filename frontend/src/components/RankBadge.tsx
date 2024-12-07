// frontend/src/components/RankBadge.tsx

import React from 'react';

interface RankBadgeProps {
  rank: number | string;
}

const RankBadge: React.FC<RankBadgeProps> = ({ rank }) => {
  let bgColor = 'bg-yellow-500';

  // Example: Different colors for top 3 ranks
  if (rank === 1) bgColor = 'bg-yellow-500';
  else if (rank === 2) bgColor = 'bg-gray-600';
  else if (rank === 3) bgColor = 'bg-yellow-700';
  else bgColor = 'bg-blue-700';

  return (
    <span className={`inline-block ${bgColor} text-white text-xs font-semibold px-2 py-1 rounded-full ml-2 shadow-lg`}>
      Rank: {rank}
    </span>
  );
};

export default RankBadge;
