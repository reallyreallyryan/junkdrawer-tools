// Simple content script to track right-click position and detect background images

(function() {
  let lastRightClickX = 0;
  let lastRightClickY = 0;
  let lastClickedElement = null;

  // Track right-click position
  document.addEventListener('contextmenu', (e) => {
    lastRightClickX = e.clientX;
    lastRightClickY = e.clientY;
    lastClickedElement = e.target;
    
    // Store globally for background script
    window.lastRightClickData = {
      x: e.clientX,
      y: e.clientY,
      element: e.target
    };
  }, true);

  // Function to find image at specific coordinates
  window.findImageAtPosition = function(x, y) {
    const element = document.elementFromPoint(x, y) || lastClickedElement;
    return getImageFromElement(element);
  };

  function getImageFromElement(element) {
    if (!element) return null;

    // Check for standard img tag
    if (element.tagName === 'IMG') {
      return resolveUrl(element.src || element.getAttribute('src'));
    }

    // Check for background image on clicked element
    const style = getComputedStyle(element);
    if (style.backgroundImage && style.backgroundImage !== 'none') {
      const url = extractUrlFromCss(style.backgroundImage);
      if (url) return url;
    }

    // Check parent elements (common in page builders)
    let parent = element.parentElement;
    let levels = 0;
    while (parent && levels < 5) {
      const parentStyle = getComputedStyle(parent);
      if (parentStyle.backgroundImage && parentStyle.backgroundImage !== 'none') {
        const url = extractUrlFromCss(parentStyle.backgroundImage);
        if (url) return url;
      }
      parent = parent.parentElement;
      levels++;
    }

    // Check for child images
    const childImg = element.querySelector('img');
    if (childImg) {
      return resolveUrl(childImg.src || childImg.getAttribute('src'));
    }

    // WordPress/page builder specific selectors
    const containers = [
      '.wp-block-image',
      '.elementor-image',
      '.divi-image', 
      '.fusion-image',
      '.vc_single_image',
      '.image-container',
      '.featured-image',
      '[class*="image"]',
      '[style*="background-image"]'
    ];

    for (const selector of containers) {
      const container = element.closest(selector);
      if (container) {
        const containerStyle = getComputedStyle(container);
        if (containerStyle.backgroundImage && containerStyle.backgroundImage !== 'none') {
          const url = extractUrlFromCss(containerStyle.backgroundImage);
          if (url) return url;
        }
        
        const containerImg = container.querySelector('img');
        if (containerImg) {
          return resolveUrl(containerImg.src || containerImg.getAttribute('src'));
        }
      }
    }

    return null;
  }

  function extractUrlFromCss(cssValue) {
    const matches = cssValue.match(/url\(['"]?(.*?)['"]?\)/);
    if (matches && matches[1]) {
      return resolveUrl(matches[1]);
    }
    return null;
  }

  function resolveUrl(url) {
    if (!url) return null;
    
    try {
      if (url.startsWith('data:') || url.startsWith('http')) {
        return url;
      }
      if (url.startsWith('//')) {
        return window.location.protocol + url;
      }
      if (url.startsWith('/')) {
        return window.location.origin + url;
      }
      return new URL(url, window.location.href).href;
    } catch (e) {
      return null;
    }
  }

})();