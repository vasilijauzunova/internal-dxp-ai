/**
 * Check if URL is an Instagram URL
 * @param {string} url - URL to check
 * @returns {boolean} true if Instagram URL
 */
function isInstagramUrl(url) {
  return url.includes('instagram.com/p/') || url.includes('instagram.com/reel/');
}

/**
 * Extract Instagram post/reel ID from URL
 * @param {string} url - Instagram URL
 * @returns {string|null} Instagram post/reel ID or null if not found
 */
function getInstagramId(url) {
  try {
    const urlObj = new URL(url);
    const regex = /\/(p|reel)\/([^/]+)/;
    const match = regex.exec(urlObj.pathname);
    return match ? match[2] : null;
  } catch {
    return null;
  }
}

/**
 * Create Instagram embed using oEmbed API
 * @param {string} url - Instagram URL
 * @returns {Promise<HTMLElement>} embed container element
 */
async function createInstagramEmbed(url) {
  const container = document.createElement('div');
  container.className = 'embed-instagram-container';

  try {
    // For security and privacy, we'll create a simple iframe-based embed
    // Instagram's official embed requires their embed.js script
    const instagramId = getInstagramId(url);

    if (instagramId) {
      // Create blockquote structure that Instagram's embed.js will recognize
      const blockquote = document.createElement('blockquote');
      blockquote.className = 'instagram-media';
      blockquote.dataset.instgrmPermalink = url;
      blockquote.dataset.instgrmVersion = '14';
      blockquote.style.maxWidth = '540px';
      blockquote.style.minWidth = '326px';
      blockquote.style.width = '100%';

      // Add a fallback link
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'View this post on Instagram';
      blockquote.appendChild(link);

      container.appendChild(blockquote);

      // Load Instagram's embed script
      if (window.instgrm) {
        // If script already loaded, process embeds
        window.instgrm.Embeds.process();
      } else {
        const script = document.createElement('script');
        script.src = '//www.instagram.com/embed.js';
        script.async = true;
        document.body.appendChild(script);
      }
    } else {
      // Fallback: create a simple link
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'View this post on Instagram';
      link.className = 'embed-instagram-fallback';
      container.appendChild(link);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create Instagram embed:', error);

    // Fallback: create a simple link
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'View this post on Instagram';
    link.className = 'embed-instagram-fallback';
    container.appendChild(link);
  }

  return container;
}

/**
 * Decorate the embed block
 * @param {Element} block the block element
 */
export default async function decorate(block) {
  // Handle different content structures
  const rows = block.querySelectorAll(':scope > div');

  // Clear the block
  block.textContent = '';

  // Process each row (each row can contain one embed)
  const embedPromises = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const row of rows) {
    const link = row.querySelector('a');
    if (!link) continue; // eslint-disable-line no-continue

    const url = link.href;

    // Check if it's an Instagram URL
    if (isInstagramUrl(url)) {
      embedPromises.push(createInstagramEmbed(url));
    } else {
      // For non-Instagram URLs, keep the link
      const fallback = document.createElement('div');
      fallback.className = 'embed-unsupported';
      fallback.appendChild(link.cloneNode(true));
      block.appendChild(fallback);
    }
  }

  // Wait for all embeds to be created and append them
  const embeds = await Promise.all(embedPromises);
  embeds.forEach((embed) => block.appendChild(embed));
}
