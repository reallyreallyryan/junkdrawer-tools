// Enhanced background script with Starter/Pro licensing tiers and dynamic script injection

console.log("🚀 Enhanced AI Alt Text Extension loaded");

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'validateLicense') {
    const result = validateLicenseKey(request.licenseKey);
    sendResponse(result);
  }
  return true; // Keep message channel open for async response
});

// Create context menu when extension loads
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generateAltText",
    title: "Generate AI Alt Text",
    contexts: ["image", "page"]
  });
  console.log("✅ Context menu created");
});

// Handle right-clicks on images or elements with background images
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "generateAltText") {
    console.log("🖱️ Processing image click");
    
    try {
      // Check if user has API key configured
      const { apiKey } = await chrome.storage.local.get(['apiKey']);
      if (!apiKey) {
        throw new Error("Please set your OpenAI API key in the extension popup first.");
      }

      // Check usage limits
      const { licenseKey, dailyUsage = {}, licenseUsage = {} } = await chrome.storage.local.get(['licenseKey', 'dailyUsage', 'licenseUsage']);
      const today = new Date().toDateString();
      const todayUsage = dailyUsage[today] || 0;
      
      // Validate license key if provided
      const licenseInfo = licenseKey ? validateLicenseKey(licenseKey) : null;
      
      // Check usage limits based on license type
      if (!licenseInfo) {
        // Free user - 5 per day limit
        if (todayUsage >= 5) {
          throw new Error("Daily limit reached (5/day). Purchase a license for more usage.");
        }
      } else if (licenseInfo.type === 'starter') {
        // Starter license - 500 total uses per license key
        const totalUsed = licenseUsage[licenseKey] || 0;
        if (totalUsed >= 500) {
          throw new Error("License limit reached (500 uses). Upgrade to Pro for unlimited usage or buy another Starter license.");
        }
      }
      // Pro license has no limits

      let imageUrl = null;
      
      // Try to get image URL from different sources
      if (info.srcUrl) {
        imageUrl = info.srcUrl;
        console.log("📷 Found standard image:", imageUrl);
      } else {
        console.log("🔍 Searching for background images...");
        
        // First inject the content script dynamically
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          console.log("✅ Content script injected");
        } catch (injectionError) {
          console.log("⚠️ Content script injection failed (may already be injected):", injectionError.message);
        }
        
        // Then call the functions
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            if (window.lastRightClickData && window.findImageAtPosition) {
              return window.findImageAtPosition(window.lastRightClickData.x, window.lastRightClickData.y);
            }
            return null;
          }
        });
        
        if (results && results[0] && results[0].result) {
          imageUrl = results[0].result;
          console.log("📷 Found background/div image:", imageUrl);
        }
      }
      
      if (!imageUrl) {
        throw new Error("No image found. Try right-clicking directly on an image or image container.");
      }
      
      // Convert image to base64
      const base64Image = await getImageAsBase64(imageUrl);
      console.log("📷 Image converted to base64");
      
      // Generate alt text with user's API key
      const altText = await generateAltText(base64Image, apiKey);
      console.log("🤖 Alt text generated:", altText);

      // Update usage counters
      const updatedDailyUsage = { ...dailyUsage };
      const updatedLicenseUsage = { ...licenseUsage };
      
      if (!licenseInfo) {
        // Update daily usage for free users
        updatedDailyUsage[today] = todayUsage + 1;
      } else if (licenseInfo.type === 'starter') {
        // Update total license usage for starter users
        updatedLicenseUsage[licenseKey] = (updatedLicenseUsage[licenseKey] || 0) + 1;
      }
      // Pro users don't need usage tracking
      
      await chrome.storage.local.set({ 
        dailyUsage: updatedDailyUsage,
        licenseUsage: updatedLicenseUsage
      });
      
      // Calculate remaining usage
      let remainingUsage;
      if (!licenseInfo) {
        remainingUsage = `${5 - (todayUsage + 1)}/5 daily`;
      } else if (licenseInfo.type === 'starter') {
        const used = (updatedLicenseUsage[licenseKey] || 0);
        remainingUsage = `${500 - used}/500 total`;
      } else {
        remainingUsage = "unlimited";
      }
      
      // Store result for popup to display
      const result = {
        imageUrl: imageUrl,
        altText: altText,
        timestamp: Date.now(),
        remainingUsage: remainingUsage,
        licenseType: licenseInfo ? licenseInfo.type : 'free'
      };
      
      await chrome.storage.local.set({ 
        latestResult: result,
        allResults: await getAllResults().then(results => [result, ...results].slice(0, 10))
      });
      
      console.log("💾 Result saved to storage");
      
    } catch (error) {
      console.error("❌ Error:", error);
      
      // Store error for popup
      await chrome.storage.local.set({ 
        latestResult: {
          imageUrl: info.srcUrl || "Unknown",
          error: error.message,
          timestamp: Date.now()
        }
      });
    }
  }
});

// Get image as base64 with better error handling
async function getImageAsBase64(imageUrl) {
  try {
    if (imageUrl.startsWith('data:')) {
      return imageUrl.split(',')[1];
    }
    
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    if (!blob.type.startsWith('image/')) {
      throw new Error(`File is not an image (type: ${blob.type})`);
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

// Generate alt text using user's OpenAI API key with SEO-optimized prompt
async function generateAltText(base64Image, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [{
          type: "text",
          text: "Generate SEO-optimized alt text for this image that will improve search rankings and AI search visibility. Focus on descriptive, keyword-rich content that helps search engines understand the image while remaining natural and useful. Include relevant context and be concise under 125 characters. Follow accessibility best practices."
        }, {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${base64Image}` }
        }]
      }],
      max_tokens: 100
    })
  });

  if (!response.ok) {
    const error = await response.json();
    
    // Handle common API errors with helpful messages
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your OpenAI API key in settings.");
    } else if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    } else if (response.status === 402) {
      throw new Error("Insufficient OpenAI credits. Please add credits to your OpenAI account.");
    }
    
    throw new Error(error.error?.message || `OpenAI API failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Helper to get all results
async function getAllResults() {
  const data = await chrome.storage.local.get(['allResults']);
  return data.allResults || [];
}

// Enhanced License Key Validation with Starter/Pro tiers
function validateLicenseKey(licenseKey) {
  if (!licenseKey) return null;
  
  const upperKey = licenseKey.toUpperCase();
  
  // Starter License Keys - 500 uses for $14.99
  const starterKeys = [
    'SEO-STARTER-001', 'SEO-STARTER-002', 'SEO-STARTER-003', 'SEO-STARTER-004', 'SEO-STARTER-005',
    'SEO-STARTER-006', 'SEO-STARTER-007', 'SEO-STARTER-008', 'SEO-STARTER-009', 'SEO-STARTER-010',
    'SEO-STARTER-011', 'SEO-STARTER-012', 'SEO-STARTER-013', 'SEO-STARTER-014', 'SEO-STARTER-015',
    'SEO-STARTER-016', 'SEO-STARTER-017', 'SEO-STARTER-018', 'SEO-STARTER-019', 'SEO-STARTER-020',
    'SEO-STARTER-021', 'SEO-STARTER-022', 'SEO-STARTER-023', 'SEO-STARTER-024', 'SEO-STARTER-025'
  ];
  
  // Pro License Keys - Unlimited uses for $24.99
  const proKeys = [
    'SEO-PRO-001', 'SEO-PRO-002', 'SEO-PRO-003', 'SEO-PRO-004', 'SEO-PRO-005',
    'SEO-PRO-006', 'SEO-PRO-007', 'SEO-PRO-008', 'SEO-PRO-009', 'SEO-PRO-010',
    'SEO-PRO-011', 'SEO-PRO-012', 'SEO-PRO-013', 'SEO-PRO-014', 'SEO-PRO-015',
    'SEO-PRO-016', 'SEO-PRO-017', 'SEO-PRO-018', 'SEO-PRO-019', 'SEO-PRO-020',
    'SEO-PRO-021', 'SEO-PRO-022', 'SEO-PRO-023', 'SEO-PRO-024', 'SEO-PRO-025'
  ];
  
  // Testing keys
  const testKeys = ['SEO-TEST-STARTER', 'SEO-TEST-PRO'];
  
  if (starterKeys.includes(upperKey) || upperKey === 'SEO-TEST-STARTER') {
    return { type: 'starter', limit: 500, name: 'Starter' };
  }
  
  if (proKeys.includes(upperKey) || upperKey === 'SEO-TEST-PRO') {
    return { type: 'pro', limit: -1, name: 'Pro' };
  }
  
  return null; // Invalid license
}