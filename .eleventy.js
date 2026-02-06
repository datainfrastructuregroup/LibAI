import markdownIt from 'markdown-it';
import markdownItWikilinks from 'markdown-it-wikilinks';
import citationsPlugin from 'eleventy-plugin-citations';
import bibliographyGenerator from './src/_data/bibliography-generator.js';

export default function(eleventyConfig) {
  // Add markdown plugins
  let markdownLib = markdownIt({
    html: true,
    linkify: true,
    typographer: true
  }).use(markdownItWikilinks({
    baseURL: `${process.env.ELEVENTY_BASEPATH || ''}/notes/`,
    makeAllLinksAbsolute: true
  }));

  eleventyConfig.setLibrary('md', markdownLib);

  // Add citations plugin
  eleventyConfig.addPlugin(citationsPlugin, {
    bibliography: ['src/_data/libAI.bib']
  });

  // Create a collection for all notes
  eleventyConfig.addCollection('notes', function(collectionApi) {
    return collectionApi.getFilteredByGlob('src/notes/*.md')
      .filter(item => !item.data.eleventyNavigation);
  });

  // Copy assets
  eleventyConfig.addPassthroughCopy('src/css');
  eleventyConfig.addPassthroughCopy('src/js');
  eleventyConfig.addPassthroughCopy('src/assets');
    eleventyConfig.addPassthroughCopy('.garden-graph.json');

  // Add string contains filter
  eleventyConfig.addFilter('contains', function(str, search) {
    return str.includes(search);
  });

  // Add filter to get notes without circular reference
  eleventyConfig.addFilter('getNotes', function(allNotes) {
    return allNotes.filter(note => 
      note.inputPath.startsWith('src/notes/') && 
      note.url !== '/notes/' // Exclude the notes index
    );
  });

  // Add filter to get backlinks
  eleventyConfig.addFilter('getBacklinks', function(notes, currentPage) {
    if (!notes || !currentPage) return [];
    
    const currentUrl = currentPage.url;
    return notes.filter(note => {
      if (!note.templateContent || note.url === currentUrl) return false;
      const content = note.templateContent.toLowerCase();
      const noteUrl = note.url.toLowerCase();
      return content.includes(currentUrl) && noteUrl !== currentUrl;
    });
  });

  // Add filter to get items by tag
  eleventyConfig.addFilter('getTaggedItems', function(items, tag) {
    if (!items || !tag) return [];
    
    return items.filter(item => {
      if (!item.data || !item.data.tags) return false;
      return item.data.tags.includes(tag);
    });
  });

  // Add filter to get entry by URL
  eleventyConfig.addFilter('getEntryByUrl', function(collection, url) {
    if (!collection || !url) return null;
    
    return collection.find(item => item.url === url);
  });

  // Add global data for complete bibliography
  eleventyConfig.addGlobalData('completeBibliography', function() {
    return bibliographyGenerator.generateCompleteBibliography();
  });

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      layouts: '_includes/layouts',
      data: '_data'
    },
    templateFormats: ['md', 'njk', 'html'],
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    dataTemplateEngine: 'njk',
    pathPrefix: process.env.ELEVENTY_BASEPATH || '/'
  };
};
