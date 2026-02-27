/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string} YouTube video ID
 */
function getYouTubeId(url) {
  const urlObj = new URL(url);
  if (urlObj.hostname.includes('youtu.be')) {
    return urlObj.pathname.substring(1);
  }
  return urlObj.searchParams.get('v');
}

/**
 * Check if URL is a YouTube URL
 * @param {string} url - URL to check
 * @returns {boolean} true if YouTube URL
 */
function isYouTubeUrl(url) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Create YouTube embed iframe
 * @param {string} videoId - YouTube video ID
 * @param {string} title - Video title for accessibility
 * @returns {HTMLElement} iframe element
 */
function createYouTubeEmbed(videoId, title = 'YouTube video player') {
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${videoId}`;
  iframe.title = title;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  return iframe;
}

export default function decorate(block) {
  const link = block.querySelector('a');
  if (!link) return;

  const url = link.href;
  const title = link.textContent.trim() || 'Video';

  // Clear the block
  block.textContent = '';

  // Create video container
  const videoContainer = document.createElement('div');
  videoContainer.className = 'video-container';

  if (isYouTubeUrl(url)) {
    const videoId = getYouTubeId(url);
    if (videoId) {
      const iframe = createYouTubeEmbed(videoId, title);
      videoContainer.appendChild(iframe);
    }
  } else {
    // For non-YouTube videos, create a standard video element
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.title = title;
    video.loading = 'lazy';
    videoContainer.appendChild(video);
  }

  block.appendChild(videoContainer);
}
