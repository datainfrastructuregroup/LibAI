const fs = require('fs');
const path = require('path');
const markdownGraph = require('@adaptivekind/markdown-graph');

function generateGraph() {
  const notesDir = path.join(__dirname, '../src/notes');
  const outputPath = path.join(__dirname, '../src/_data/graph.json');
  
  try {
    // Check what the package exports
    console.log('Package exports:', Object.keys(markdownGraph));
    
    // Try different possible APIs
    let result;
    if (typeof markdownGraph === 'function') {
      result = markdownGraph(notesDir, {
        pattern: '**/*.md',
        baseUrl: '/notes/',
        linkMatcher: /\[\[([^\]]+)\]\]/g
      });
    } else if (markdownGraph.MarkdownGraph && typeof markdownGraph.MarkdownGraph === 'function') {
      const graph = new markdownGraph.MarkdownGraph({
        root: notesDir,
        pattern: '**/*.md',
        baseUrl: '/notes/',
        linkMatcher: /\[\[([^\]]+)\]\]/g
      });
      result = graph.process();
    } else if (markdownGraph.default) {
      result = markdownGraph.default(notesDir, {
        pattern: '**/*.md',
        baseUrl: '/notes/',
        linkMatcher: /\[\[([^\]]+)\]\]/g
      });
    } else {
      throw new Error('Unable to determine package API');
    }
    
    // Convert to the format we want for visualization
    const graphData = {
      nodes: result.nodes.map(node => ({
        id: node.slug,
        label: node.title || node.slug,
        url: node.url,
        description: node.excerpt || ''
      })),
      edges: result.links.map(link => ({
        source: link.source.slug,
        target: link.target.slug,
        type: link.type || 'wikilink'
      }))
    };

    // Ensure the _data directory exists
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write the graph data to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2));
    
    console.log(`✅ Graph generated: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);
    console.log(`📁 Graph data saved to: ${outputPath}`);
    
    return graphData;
  } catch (error) {
    console.error('❌ Error generating graph:', error);
    return null;
  }
}

module.exports = { generateGraph };
