// This would be where you'd typically integrate with a graph visualization library
// For a complete implementation, you might want to use D3.js, vis.js, or similar

document.addEventListener('DOMContentLoaded', function() {
    // Graph visualization using the generated graph data
    const graphElement = document.getElementById('graph');
    if (graphElement) {
        // Load the graph data
        fetch('/graph.json')
            .then(response => response.json())
            .then(graphData => {
                if (graphData.nodes.length === 0) {
                    graphElement.innerHTML = `
                        <div style="text-align: center; padding: 2rem;">
                            <p>No graph data available</p>
                            <p><small>Add notes with wikilinks to generate connections</small></p>
                        </div>
                    `;
                    return;
                }
                
                // Simple text-based graph visualization for now
                let graphHTML = '<div style="padding: 1rem;">';
                graphHTML += `<h4>Knowledge 33Graph (${graphData.nodes.length} notes, ${graphData.edges.length} connections)</h4>`;
                
                // Show nodes and connections
                graphData.nodes.forEach(node => {
                    const connections = graphData.edges.filter(edge => 
                        edge.source === node.id || edge.target === node.id
                    );
                    graphHTML += `<div style="margin: 0.5rem 0; font-size: 0.9rem;">`;
                    graphHTML += `<a href="${node.url}" style="color: var(--link-color);">${node.label}</a>`;
                    if (connections.length > 0) {
                        graphHTML += ` <span style="color: #666;">(${connections.length} connections)</span>`;
                    }
                    graphHTML += `</div>`;
                });
                
                graphHTML += '</div>';
                graphElement.innerHTML = graphHTML;
                
                console.log('Graph loaded:', graphData);
            })
            .catch(error => {
                console.error('Error loading graph data:', error);
                graphElement.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <p>Error loading graph data</p>
                    </div>
                `;
            });
    }

    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
