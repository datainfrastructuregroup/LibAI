const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

function generateGraph() {
  // Use absolute paths to avoid __dirname issues
  const projectRoot = path.resolve(__dirname, '..');
  const notesDir = path.join(projectRoot, 'src/notes');
  const outputPath = path.join(projectRoot, 'src/_data/graph.json');
  
  console.log('🔍 Debug: projectRoot =', projectRoot);
  console.log('🔍 Debug: notesDir =', notesDir);
  console.log('🔍 Debug: outputPath =', outputPath);
  
  try {
    // Read all markdown files
    const files = fs.readdirSync(notesDir).filter(file => file.endsWith('.md'));
    console.log('🔍 Debug: found files =', files);
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    
    // Process each file
    files.forEach(file => {
      const filePath = path.join(notesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const { data, content: markdownContent } = matter(content);
      
      const slug = file.replace('.md', '');
      const url = `/notes/${slug}/`;
      
      // Create node
      const node = {
        id: slug,
        label: data.title || slug,
        url: url,
        description: markdownContent.slice(0, 200) + '...'
      };
      
      nodes.push(node);
      nodeMap.set(slug, node);
      
      // Extract wikilinks from frontmatter
      ['authors', 'contributors', 'editors'].forEach(field => {
        if (data[field] && Array.isArray(data[field])) {
          data[field].forEach(person => {
            console.log(`Processing ${field}:`, person, typeof person);
            // Remove [[ and ]] from person name
            const personName = typeof person === 'string' ? person.replace(/^\[\[|\]\]$/g, '') : String(person);
            const personSlug = personName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            
            // Create link if person node exists
            if (personSlug !== slug) {
              links.push({
                source: slug,
                target: personSlug,
                type: field.slice(0, -1) // 'author', 'contributor', 'editor'
              });
            }
          });
        }
      });
      
      // Extract wikilinks from markdown content
      const wikilinks = markdownContent.match(/\[\[([^\]]+)\]\]/g);
      if (wikilinks) {
        wikilinks.forEach(link => {
          const linkedName = link.slice(2, -2); // Remove [[ and ]]
          const linkedSlug = linkedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          
          if (linkedSlug !== slug) {
            links.push({
              source: slug,
              target: linkedSlug,
              type: 'wikilink'
            });
          }
        });
      }
    });

    const graphData = { nodes, links };

    // Ensure _data directory exists
    const dataDir = path.dirname(outputPath);
    console.log('🔍 Debug: dataDir =', dataDir);
    console.log('🔍 Debug: dataDir exists?', fs.existsSync(dataDir));
    
    if (!fs.existsSync(dataDir)) {
      console.log('🔍 Debug: Creating dataDir...');
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write graph data to JSON file
    console.log('🔍 Debug: Writing to file:', outputPath);
    fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2));
    
    console.log('🔍 Debug: File written successfully');
    console.log('🔍 Debug: File exists after write?', fs.existsSync(outputPath));
    
    console.log(`✅ Graph generated: ${graphData.nodes.length} nodes, ${graphData.links.length} edges`);
    console.log(`📁 Graph data saved to: ${outputPath}`);
    
    return graphData;
  } catch (error) {
    console.error('❌ Error generating graph:', error);
    return null;
  }
}

module.exports = { generateGraph };
