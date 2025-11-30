const markdownIt = require('markdown-it');
const markdownItWikilinks = require('markdown-it-wikilinks')({
  baseURL: '/notes/',
  makeAllLinksAbsolute: true
});

module.exports = function(eleventyConfig) {
  // Add markdown plugins
  let markdownLib = markdownIt({
    html: true,
    linkify: true,
    typographer: true
  }).use(markdownItWikilinks);

  eleventyConfig.setLibrary('md', markdownLib);

  // Create a collection for all notes
  eleventyConfig.addCollection('notes', function(collectionApi) {
    return collectionApi.getFilteredByGlob('src/notes/*.md')
      .filter(item => !item.data.eleventyNavigation);
  });

  // Copy assets
  eleventyConfig.addPassthroughCopy('src/css');
  eleventyConfig.addPassthroughCopy('src/js');
  eleventyConfig.addPassthroughCopy('.garden-graph.json');

  // Add string contains filter
  eleventyConfig.addFilter('contains', function(str, search) {
    return str.includes(search);
  });

  // Add filter to get notes without circular reference
  eleventyConfig.addFilter('getNotes', function(allNotes) {
    return allNotes.filter(note => 
      note.inputPath.startsWith('src/notes/') && 
      note.inputPath !== 'src/notes.md'
    );
  });

  // Add filter to get backlinks
  eleventyConfig.addFilter('getBacklinks', function(notes, currentPage) {
    if (!notes || !currentPage) return [];
    
    const currentUrl = currentPage.url;
    return notes.filter(note => {
      if (!note.templateContent) return false;
      const content = note.templateContent.toLowerCase();
      const noteUrl = note.url.toLowerCase();
      return content.includes(currentUrl) && noteUrl !== currentUrl;
    });
  });

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data',
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    templateFormats: ['md', 'njk', 'html'],
  };
};
