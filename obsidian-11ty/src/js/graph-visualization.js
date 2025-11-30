// Import D3 and PIXI from CDN
import * as d3 from 'https://cdn.skypack.dev/d3@7';
import * as PIXI from 'https://cdn.skypack.dev/pixi.js@7';

class ForceDirectedGraph {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.app = new PIXI.Application({
      width: this.container.offsetWidth,
      height: 400,
      backgroundColor: 0x1a1a1a,
      antialias: true,
      resolution: window.devicePixelRatio || 1
    });

    this.container.appendChild(this.app.view);
    this.container.style.position = 'relative';
    
    this.nodes = [];
    this.links = [];
    this.simulation = null;
    this.nodeGraphics = new PIXI.Container();
    this.linkGraphics = new PIXI.Container();
    
    this.app.stage.addChild(this.linkGraphics);
    this.app.stage.addChild(this.nodeGraphics);

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
  }

  async loadGraphData() {
    try {
const response = await fetch('/.garden-graph.json', {
  headers: { 'Accept': 'application/json' }
});      const data = await response.json();
      
      // Transform the garden graph data to our format
      const nodesMap = new Map();
      
      // Process nodes
      data.nodes.forEach(node => {
        nodesMap.set(node.id, {
          id: node.id,
          label: node.title || node.id,
          url: node.url || `#${node.id}`,
          x: Math.random() * this.app.screen.width,
          y: Math.random() * this.app.screen.height
        });
      });

      // Process links
      const links = data.links.map(link => ({
        source: link.source,
        target: link.target
      })).filter(link => 
        nodesMap.has(link.source) && nodesMap.has(link.target)
      );

      this.nodes = Array.from(nodesMap.values());
      this.links = links;
      
      this.createSimulation();
      this.render();
      
    } catch (error) {
      console.error('Error loading graph data:', error);
      this.showError();
    }
  }

  createSimulation() {
    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(this.app.screen.width / 2, this.app.screen.height / 2))
      .force('collision', d3.forceCollide().radius(30));

    this.simulation.on('tick', () => this.updatePositions());
  }

  render() {
    // Clear existing graphics
    this.nodeGraphics.removeChildren();
    this.linkGraphics.removeChildren();

    // Draw links
    this.links.forEach(link => {
      const graphics = new PIXI.Graphics();
      graphics.lineStyle(1, 0x666666, 0.6);
      
      const sourceNode = this.nodes.find(n => n.id === link.source);
      const targetNode = this.nodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode) {
        graphics.moveTo(sourceNode.x, sourceNode.y);
        graphics.lineTo(targetNode.x, targetNode.y);
      }
      
      this.linkGraphics.addChild(graphics);
    });

    // Draw nodes
    this.nodes.forEach(node => {
      const container = new PIXI.Container();
      
      // Node circle
      const graphics = new PIXI.Graphics();
      graphics.beginFill(0x333333);
      graphics.lineStyle(2, 0x00ff00, 0.8);
      graphics.drawCircle(0, 0, 15);
      graphics.endFill();
      
      // Node text
      const text = new PIXI.Text(node.label, {
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0xffffff,
        align: 'center'
      });
      text.anchor.set(0.5);
      text.y = 25;
      
      container.addChild(graphics);
      container.addChild(text);
      container.x = node.x;
      container.y = node.y;
      
      // Make interactive
      container.interactive = true;
      container.buttonMode = true;
      container.on('pointerdown', () => {
        if (node.url.startsWith('#')) {
          window.location.hash = node.url.substring(1);
        } else {
          window.location.href = node.url;
        }
      });
      
      container.on('pointerover', () => {
        graphics.tint = 0x00ff00;
      });
      
      container.on('pointerout', () => {
        graphics.tint = 0xffffff;
      });
      
      this.nodeGraphics.addChild(container);
    });
  }

  updatePositions() {
    // Update link positions
    let linkIndex = 0;
    this.linkGraphics.children.forEach(graphics => {
      const link = this.links[linkIndex++];
      if (!link) return;
      
      const sourceNode = this.nodes.find(n => n.id === link.source);
      const targetNode = this.nodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode) {
        graphics.clear();
        graphics.lineStyle(1, 0x666666, 0.6);
        graphics.moveTo(sourceNode.x, sourceNode.y);
        graphics.lineTo(targetNode.x, targetNode.y);
      }
    });

    // Update node positions
    let nodeIndex = 0;
    this.nodeGraphics.children.forEach(container => {
      const node = this.nodes[nodeIndex++];
      if (!node) return;
      
      container.x = node.x;
      container.y = node.y;
    });
  }

  handleResize() {
    this.app.renderer.resize(this.container.offsetWidth, 400);
    if (this.simulation) {
      this.simulation
        .force('center', d3.forceCenter(this.app.screen.width / 2, this.app.screen.height / 2))
        .alpha(0.3)
        .restart();
    }
  }

  showError() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 400px; color: #666;">
        <div style="text-align: center;">
          <p>Unable to load graph data</p>
          <small>Run <code>npx markdown-graph</code> to generate the graph</small>
        </div>
      </div>
    `;
  }

  destroy() {
    if (this.simulation) {
      this.simulation.stop();
    }
    if (this.app) {
      this.app.destroy(true);
    }
  }
}

// Initialize graph on all pages
document.addEventListener('DOMContentLoaded', () => {
  const graphContainer = document.getElementById('force-graph');
  if (graphContainer) {
    const graph = new ForceDirectedGraph('force-graph');
    graph.loadGraphData();
  }
});
