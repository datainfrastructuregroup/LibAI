import { Bibliography } from 'eleventy-plugin-citations';
import fs from 'fs';
import { resolve } from 'path';

/**
 * Generate a complete bibliography from all entries in the BibTeX file
 * using the Bibliography class from eleventy-plugin-citations
 */
export function generateCompleteBibliography() {
  try {
    // Read the BibTeX file
    const bibPath = resolve('./src/_data/libAI.bib');
    const bibContent = fs.readFileSync(bibPath, 'utf8');
    
    // Create a temporary bibliography file
    const tempBibPath = resolve('./temp-bibliography.bib');
    fs.writeFileSync(tempBibPath, bibContent);
    
    // Create a Bibliography instance with the path to the BibTeX file
    const bibliography = new Bibliography(tempBibPath, {});
    
    // Initialize the bibliography to load the data
    bibliography.init();
    
    // Get all citation keys from the bibliography data
    const allKeys = Object.keys(bibliography.data);
    
    // Cite all entries so they get formatted
    bibliography.cite(allKeys.map(key => ({ id: key })));
    
    // Build the bibliography to format all entries
    bibliography.build();
    
    // Generate bibliography HTML with all entries as a bulleted list
    let bibliographyHTML = '<ul class="bibliography-list">\n';
    
    for (const key of allKeys) {
      const formattedEntry = bibliography.format(key);
      if (formattedEntry && formattedEntry.entry) {
        bibliographyHTML += `<li class="bibliography-entry" id="${key}">\n`;
        bibliographyHTML += formattedEntry.entry;
        bibliographyHTML += '\n</li>\n\n';
      }
    }
    
    bibliographyHTML += '</ul>\n';
    
    // Clean up temporary file
    fs.unlinkSync(tempBibPath);
    
    return bibliographyHTML;
    
  } catch (error) {
    console.error('Error generating bibliography:', error);
    return '<p>Error generating bibliography. Please check the BibTeX file.</p>';
  }
}

/**
 * Generate bibliography by creating a mock page with all citations
 */
export function generateBibliographyWithAllCitations() {
  try {
    // Read the BibTeX file
    const bibPath = resolve('./src/_data/libAI.bib');
    const bibContent = fs.readFileSync(bibPath, 'utf8');
    
    // Create a temporary bibliography file
    const tempBibPath = resolve('./temp-bibliography.bib');
    fs.writeFileSync(tempBibPath, bibContent);
    
    // Create a Bibliography instance
    const bibliography = new Bibliography(tempBibPath, {});
    
    // Initialize the bibliography to load the data
    bibliography.init();
    
    // Get all citation keys
    const allKeys = Object.keys(bibliography.data);
    
    // Cite all entries so they get formatted
    bibliography.cite(allKeys.map(key => ({ id: key })));
    
    // Build the bibliography to format all entries
    bibliography.build();
    
    // Create mock content with all citations
    const mockContent = allKeys.map(key => `[@${key}]`).join(' ');
    
    // Process citations (this would normally be done by the plugin's filter)
    // For now, we'll generate the bibliography directly as a bulleted list
    let bibliographyHTML = '<ul class="bibliography-list">\n';
    
    for (const key of allKeys) {
      const formattedEntry = bibliography.format(key);
      if (formattedEntry && formattedEntry.entry) {
        bibliographyHTML += `<li class="bibliography-entry" id="${key}">\n`;
        bibliographyHTML += formattedEntry.entry;
        bibliographyHTML += '\n</li>\n\n';
      }
    }
    
    bibliographyHTML += '</ul>\n';
    
    // Clean up temporary file
    fs.unlinkSync(tempBibPath);
    
    return bibliographyHTML;
    
  } catch (error) {
    console.error('Error generating bibliography with all citations:', error);
    return '<p>Error generating bibliography. Please check the BibTeX file.</p>';
  }
}

/**
 * Get all bibliography entries as a structured object
 */
export function getAllBibliographyEntries() {
  try {
    const bibPath = resolve('./src/_data/libAI.bib');
    const bibContent = fs.readFileSync(bibPath, 'utf8');
    
    // Create a temporary bibliography file
    const tempBibPath = resolve('./temp-bibliography.bib');
    fs.writeFileSync(tempBibPath, bibContent);
    
    // Create a Bibliography instance
    const bibliography = new Bibliography(tempBibPath, {});
    
    // Initialize the bibliography to load the data
    bibliography.init();
    
    const allKeys = bibliography.keys();
    const entries = {};
    
    for (const key of allKeys) {
      const formattedEntry = bibliography.format(key);
      entries[key] = formattedEntry;
    }
    
    // Clean up temporary file
    fs.unlinkSync(tempBibPath);
    
    return {
      keys: allKeys,
      entries: entries,
      bibliography: bibliography
    };
    
  } catch (error) {
    console.error('Error getting bibliography entries:', error);
    return { keys: [], entries: {}, bibliography: null };
  }
}

// Export the main function for Eleventy
export default {
  generateCompleteBibliography,
  generateBibliographyWithAllCitations,
  getAllBibliographyEntries
};
