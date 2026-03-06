// import graph rendering function
import { renderForceGraph } from "./graph-visualization.js";

document.addEventListener("DOMContentLoaded", () => {
  const graphElement = document.getElementById("force-graph");
  if (!graphElement) return;

  fetch("/.garden-graph.json")
    .then((response) => response.json())
    .then((graphData) => {
        // call function to render the force graph
      renderForceGraph(graphElement, graphData);
    })
    .catch(error => {
        console.error('Error loading graph data:', error);
        graphElement.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p>Error loading graph data</p>
            </div>
        `;
    });

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

