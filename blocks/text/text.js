/**
 * Text block
 * https://www.aem.live/developer/block-collection
 */
export default function decorate(block) {
  block.style.textAlign = block.dataset.alignment || 'center';
  // Wrap content in a container for styling
  const content = block.querySelector('div');
  if (content) {
    content.className = 'text-content';
  }
}
