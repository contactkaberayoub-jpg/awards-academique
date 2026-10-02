import { AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPause?: (currentTime: number) => void;
}

export function VideoPlayer({
  url,
  title = 'Video player',
  className = '',
  initialTime = 0,
  onTimeUpdate,
  onEnded,
  onPause,
}: VideoPlayerProps) {
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-surface-tertiary border border-border ${className}`}>
        <div className="text-center space-y-2 p-4">
          <AlertCircle className="mx-auto h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-muted">Aucune URL vidéo fournie.</p>
        </div>
      </div>
    );
  }

  // Helper to detect and extract YouTube Video ID
  const getYouTubeEmbedUrl = (rawUrl: string): string | null => {
    try {
      const parsed = new URL(rawUrl);
      let videoId = '';

      if (parsed.hostname.includes('youtube.com')) {
        if (parsed.pathname.startsWith('/embed/')) {
          videoId = parsed.pathname.split('/')[2];
        } else {
          videoId = parsed.searchParams.get('v') || '';
        }
      } else if (parsed.hostname === 'youtu.be') {
        videoId = parsed.pathname.slice(1);
      }

      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
      }
    } catch {
      // Not a valid URL object, try regex fallback
      const match = rawUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
      }
    }
    return null;
  };

  const youtubeEmbedUrl = getYouTubeEmbedUrl(url);

  if (youtubeEmbedUrl) {
    return (
      <div className={`overflow-hidden rounded-xl bg-black shadow-lg aspect-video ${className}`}>
        <iframe
          src={youtubeEmbedUrl}
          title={title}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  // Check if it's a direct video file or stream
  const isDirectVideo = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) || url.includes('/videos/') || url.includes('blob:');

  if (isDirectVideo || !youtubeEmbedUrl) {
    return (
      <div className={`overflow-hidden rounded-xl bg-black shadow-lg aspect-video ${className}`}>
        <video
          src={url}
          controls
          className="h-full w-full object-contain"
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            if (initialTime > 0 && video.duration && initialTime < video.duration - 2) {
              video.currentTime = initialTime;
            }
          }}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            if (video.duration && !isNaN(video.duration)) {
              onTimeUpdate?.(video.currentTime, video.duration);
            }
          }}
          onPause={(e) => {
            onPause?.(e.currentTarget.currentTime);
          }}
          onEnded={() => {
            onEnded?.();
          }}
          onError={(e) => {
            console.error('Video playback error:', e);
          }}
        >
          Votre navigateur ne supporte pas la lecture de vidéos.
        </video>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center bg-surface-tertiary border border-border ${className}`}>
      <div className="text-center space-y-2 p-4">
        <AlertCircle className="mx-auto h-8 w-8 text-error" />
        <p className="text-sm text-text-secondary">Impossible de charger la vidéo.</p>
        <p className="text-xs text-text-muted truncate max-w-xs">{url}</p>
      </div>
    </div>
  );
}
