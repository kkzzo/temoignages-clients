'use client';

const CDN_HOSTNAME = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || 'vz-xxx.b-cdn.net';

export default function VideoGrid({ videos, onVideoClick }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {videos.map(v => (
        <VideoCard key={v.guid} video={v} onOpen={() => onVideoClick(v)} />
      ))}
    </div>
  );
}

function VideoCard({ video, onOpen }) {
  const thumbnail = `https://${CDN_HOSTNAME}/${video.guid}/thumbnail.jpg`;

  return (
    <button
      onClick={onOpen}
      className="group text-left bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-sm transition"
    >
      <div className="aspect-video bg-gray-900 relative overflow-hidden">
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
          <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-md group-hover:scale-110 transition">
            <svg width="14" height="14" viewBox="0 0 12 12" className="ml-0.5">
              <path d="M3 2 L9 6 L3 10 Z" fill="#111" />
            </svg>
          </div>
        </div>
        {video.duration && (
          <span className="absolute bottom-1.5 right-1.5 text-[11px] bg-black/70 text-white px-1.5 py-0.5 rounded">
            {video.duration}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium truncate">{video.clientName}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {[video.role, video.company].filter(Boolean).join(' · ')}
        </p>
      </div>
    </button>
  );
}
