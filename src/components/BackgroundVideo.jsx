import React, { useEffect, useRef } from 'react';
import useDeferredVideo from '@/hooks/useDeferredVideo';

const BackgroundVideo = ({
  className,
  style,
  poster,
  sources,
  playbackRate = 0.8,
  forceLoad = false,
}) => {
  const videoRef = useRef(null);
  const shouldLoad = useDeferredVideo({ forceLoad });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!shouldLoad) {
      return;
    }

    video.muted = true;
    video.playbackRate = playbackRate;
    const attemptPlay = () => {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    };
    video.addEventListener('canplay', attemptPlay);
    video.addEventListener('loadeddata', attemptPlay);
    video.load();
    attemptPlay();

    return () => {
      video.removeEventListener('canplay', attemptPlay);
      video.removeEventListener('loadeddata', attemptPlay);
    };
  }, [shouldLoad, playbackRate]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={style}
      autoPlay
      muted
      loop
      playsInline
      preload={shouldLoad ? 'metadata' : 'none'}
      poster={poster}
      aria-hidden="true"
      tabIndex={-1}
    >
      {shouldLoad && sources?.webm && (
        <source src={sources.webm} type="video/webm" />
      )}
      {shouldLoad && sources?.mp4 && (
        <source src={sources.mp4} type="video/mp4" />
      )}
    </video>
  );
};

export default BackgroundVideo;
