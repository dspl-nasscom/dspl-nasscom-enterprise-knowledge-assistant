/**
 * Robust helper function to swap domains for secure document URLs.
 * Replaces the Google Storage URL with the application domain while keeping security signatures intact.
 */
export const openSecureDocument = (originalStorageUrl: string) => {
  try {
    // Parse the original Google Storage URL
    const urlObj = new URL(originalStorageUrl);
    
    // Extract the pathname and the query parameters (?X-Goog-Algorithm...)
    const securePathAndQuery = urlObj.pathname + urlObj.search;
    
    // Construct the new URL using your application domain
    // window.location.origin dynamically gets 'https://yourdomain.com'
    const proxiedUrl = `${window.location.origin}${securePathAndQuery}`;
    
    // Open the newly formatted URL in a new tab safely
    window.open(proxiedUrl, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error("Invalid storage URL provided", error);
  }
};
