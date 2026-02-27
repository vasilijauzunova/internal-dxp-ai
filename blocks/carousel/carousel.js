import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Creates a carousel from the block content with auto-play
 * @param {Element} block The carousel block element
 */
export default function decorate(block) {
  const slides = [...block.children];

  if (slides.length === 0) return;

  const track = document.createElement('div');
  track.className = 'carousel-track';

  slides.forEach((slide) => {
    const slideElement = document.createElement('div');
    slideElement.className = 'carousel-slide';
    moveInstrumentation(slide, slideElement);

    // Move slide content (picture and text)
    while (slide.firstElementChild) {
      slideElement.append(slide.firstElementChild);
    }

    const heading = slideElement.querySelector('h2');
    if (heading) {
      heading.style.display = 'none';
    }

    track.append(slideElement);
  });

  block.textContent = '';
  block.append(track);

  // Calculate slides per view based on viewport
  const getSlidesPerView = () => {
    const width = window.innerWidth;
    if (width <= 600) return 1;
    if (width <= 900) return 2;
    if (width <= 1200) return 3;
    return 4;
  };

  let currentIndex = 0;
  let slidesPerView = getSlidesPerView();
  const totalSlides = track.children.length;
  let maxIndex = Math.max(0, totalSlides - slidesPerView);
  let autoplayInterval;

  // Create pagination dots element first
  const pagination = document.createElement('div');
  pagination.className = 'carousel-pagination';

  const updateCarousel = () => {
    const slideWidth = track.children[0].offsetWidth;
    const gap = 32; // Match CSS gap
    const offset = currentIndex * (slideWidth + gap);
    track.style.transform = `translateX(-${offset}px)`;

    const activeDotIndex = Math.floor(currentIndex / slidesPerView);
    pagination.querySelectorAll('.carousel-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === activeDotIndex);
    });
  };

  const advanceSlide = () => {
    currentIndex += slidesPerView;

    if (currentIndex > maxIndex) {
      currentIndex = 0;
    }

    updateCarousel();
  };

  const startAutoplay = () => {
    autoplayInterval = setInterval(advanceSlide, 3000); // Change slide every 3 seconds
  };

  const resetAutoplay = () => {
    clearInterval(autoplayInterval);
    startAutoplay();
  };

  const createDotClickHandler = (dotIndex, perView, maxIdx) => () => {
    currentIndex = Math.min(dotIndex * perView, maxIdx);
    updateCarousel();
    resetAutoplay();
  };

  const updatePaginationDots = () => {
    const numDots = Math.ceil(totalSlides / slidesPerView);
    pagination.textContent = '';

    for (let i = 0; i < numDots; i += 1) {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      if (i === Math.floor(currentIndex / slidesPerView)) {
        dot.classList.add('active');
      }

      dot.addEventListener('click', createDotClickHandler(i, slidesPerView, maxIndex));

      pagination.append(dot);
    }
  };

  updatePaginationDots();

  block.addEventListener('mouseenter', () => {
    clearInterval(autoplayInterval);
  });

  block.addEventListener('mouseleave', () => {
    startAutoplay();
  });

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const newSlidesPerView = getSlidesPerView();
      if (newSlidesPerView !== slidesPerView) {
        slidesPerView = newSlidesPerView;
        maxIndex = Math.max(0, totalSlides - slidesPerView);

        if (currentIndex > maxIndex) {
          currentIndex = maxIndex;
        }

        updatePaginationDots();
        updateCarousel();
      } else {
        updateCarousel();
      }
    }, 250);
  });

  block.append(pagination);

  updateCarousel();

  startAutoplay();
}
