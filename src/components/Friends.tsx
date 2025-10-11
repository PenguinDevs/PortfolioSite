import { Friend } from '@/data/types';

interface FriendsProps {
  friends: Friend[];
}

export default function Friends({ friends }: FriendsProps) {
  if (!friends.length) return null;

  return (
    <div className="bg-gradient-to-br from-gray-900/40 via-gray-800/40 to-gray-900/40 backdrop-blur-lg rounded-3xl p-6 border border-gray-700/50 shadow-xl">
      <div className="flex items-center justify-center mb-5">
        <h3 className="text-lg font-semibold text-white">Friends :)</h3>
      </div>
      
      <div className="grid grid-cols-4 gap-4 justify-items-center">
        {friends.map((friend) => (
          <div key={friend.id} className="group">
            {friend.link ? (
              <a
                href={friend.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                title={friend.name}
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5 group-hover:scale-110 transition-transform duration-200">
                    <img
                      src={friend.profileImage}
                      alt={friend.name}
                      className="w-full h-full rounded-full object-cover bg-gray-800"
                    />
                  </div>
                </div>
              </a>
            ) : (
              <div title={friend.name}>
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 p-0.5">
                    <img
                      src={friend.profileImage}
                      alt={friend.name}
                      className="w-full h-full rounded-full object-cover bg-gray-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}