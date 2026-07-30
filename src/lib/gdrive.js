/**
 * Utility to transform Google Drive sharing links to direct image links.
 * Normal Google Drive sharing links return an HTML page, which cannot be used in <img src="...">.
 * This converts them to the /uc?export=view endpoint.
 */

export const transformGDriveUrl = (url) => {
  if (!url) return url;
  
  // Matches: https://drive.google.com/file/d/FILE_ID/view...
  const fileIdMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
  }
  
  // Matches: https://drive.google.com/open?id=FILE_ID
  const openIdMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openIdMatch && openIdMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${openIdMatch[1]}`;
  }

  return url;
};

export const transformGDriveHtml = (html) => {
  if (!html) return html;
  
  let transformed = html;
  
  // Replace /file/d/ID/view format inside src="..."
  transformed = transformed.replace(
    /src=["']https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)[^"']*["']/g, 
    'src="https://drive.google.com/uc?export=view&id=$1"'
  );
  
  // Replace /open?id=ID format inside src="..."
  transformed = transformed.replace(
    /src=["']https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)[^"']*["']/g,
    'src="https://drive.google.com/uc?export=view&id=$1"'
  );
  
  return transformed;
};
