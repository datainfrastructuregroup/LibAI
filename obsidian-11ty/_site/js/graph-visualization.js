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
    
    // Create a main container for zoom/pan functionality
    this.mainContainer = new PIXI.Container();
    this.app.stage.addChild(this.mainContainer);
    this.mainContainer.addChild(this.linkGraphics);
    this.mainContainer.addChild(this.nodeGraphics);
    
    // Zoom and pan variables
    this.scale = 1;
    this.minScale = 0.1;
    this.maxScale = 5;
    this.isDragging = false;
    this.lastPointerPos = { x: 0, y: 0 };
    this.panStart = { x: 0, y: 0 };

    this.setupInteractions();
    
    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
  }

  setupInteractions() {
    // Enable interaction on the main container
    this.mainContainer.eventMode = 'static';
    this.mainContainer.hitArea = this.app.screen;
    
    // Wheel event for zooming
    this.app.view.addEventListener('wheel', (event) => {
      event.preventDefault();
      
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta));
      
      // Get the pointer position in world coordinates
      const pointer = this.app.renderer.events.pointer.global;
      const worldPos = {
        x: (pointer.x - this.mainContainer.x) / this.scale,
        y: (pointer.y - this.mainContainer.y) / this.scale
      };
      
      // Update scale
      this.scale = newScale;
      this.mainContainer.scale.set(this.scale);
      
      // Adjust position to zoom towards pointer
      const newWorldPos = {
        x: (pointer.x - this.mainContainer.x) / this.scale,
        y: (pointer.y - this.mainContainer.y) / this.scale
      };
      
      this.mainContainer.x += (newWorldPos.x - worldPos.x) * this.scale;
      this.mainContainer.y += (newWorldPos.y - worldPos.y) * this.scale;
    });
    
    // Mouse/touch events for panning
    this.app.stage.eventMode = 'static';
    
    this.app.stage.on('pointerdown', (event) => {
      // Check if clicking on a node (don't pan if clicking a node)
      if (event.target.parent && event.target.parent.parent === this.nodeGraphics) {
        return;
      }
      
      this.isDragging = true;
      this.lastPointerPos = { x: event.global.x, y: event.global.y };
      this.panStart = { x: this.mainContainer.x, y: this.mainContainer.y };
    });
    
    this.app.stage.on('pointermove', (event) => {
      if (!this.isDragging) return;
      
      const deltaX = event.global.x - this.lastPointerPos.x;
      const deltaY = event.global.y - this.lastPointerPos.y;
      
      this.mainContainer.x = this.panStart.x + deltaX;
      this.mainContainer.y = this.panStart.y + deltaY;
    });
    
    this.app.stage.on('pointerup', () => {
      this.isDragging = false;
    });
    
    this.app.stage.on('pointerupoutside', () => {
      this.isDragging = false;
    });
    
    // Add zoom controls
    this.addZoomControls();
  }

  addZoomControls() {
    // Create zoom control buttons
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      z-index: 1000;
    `;
    
    // Zoom in button
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.style.cssText = `
      width: 30px;
      height: 30px;
      background: #333;
      color: #00ff00;
      border: 1px solid #00ff00;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    `;
    zoomInBtn.addEventListener('click', () => this.zoom(1.2));
    
    // Zoom out button
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '-';
    zoomOutBtn.style.cssText = `
      width: 30px;
      height: 30px;
      background: #333;
      color: #00ff00;
      border: 1px solid #00ff00;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    `;
    zoomOutBtn.addEventListener('click', () => this.zoom(0.8));
    
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.innerHTML = '⟲';
    resetBtn.style.cssText = `
      width: 30px;
      height: 30px;
      background: #333;
      color: #00ff00;
      border: 1px solid #00ff00;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    `;
    resetBtn.addEventListener('click', () => this.resetView());
    
    controlsContainer.appendChild(zoomInBtn);
    controlsContainer.appendChild(zoomOutBtn);
    controlsContainer.appendChild(resetBtn);
    this.container.appendChild(controlsContainer);
  }

  zoom(factor) {
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
    
    // Zoom towards center
    const centerX = this.app.screen.width / 2;
    const centerY = this.app.screen.height / 2;
    
    const worldPos = {
      x: (centerX - this.mainContainer.x) / this.scale,
      y: (centerY - this.mainContainer.y) / this.scale
    };
    
    this.scale = newScale;
    this.mainContainer.scale.set(this.scale);
    
    const newWorldPos = {
      x: (centerX - this.mainContainer.x) / this.scale,
      y: (centerY - this.mainContainer.y) / this.scale
    };
    
    this.mainContainer.x += (newWorldPos.x - worldPos.x) * this.scale;
    this.mainContainer.y += (newWorldPos.y - worldPos.y) * this.scale;
  }

  resetView() {
    this.scale = 1;
    this.mainContainer.scale.set(this.scale);
    this.mainContainer.x = 0;
    this.mainContainer.y = 0;
  }

  generateNodeUrl(nodeId) {
    // Handle different node ID formats and map to actual pages
    if (nodeId === 'readme' || nodeId === 'home') {
      return '/';
    }
    
    // Handle section anchors (like "readme#features")
    if (nodeId.includes('#')) {
      const [page, anchor] = nodeId.split('#');
      if (page === 'readme') {
        return `/#${anchor}`;
      }
    }
    
    // Handle notes pages
    if (nodeId === 'about') {
      return '/about/';
    }
    
    if (nodeId === 'notes') {
      return '/notes/';
    }
    
    // For note files, convert to URL format
    if (!nodeId.includes('#') && !nodeId.includes('/')) {
      return `/notes/${nodeId}/`;
    }
    
    // Default fallback
    return `#${nodeId}`;
  }

  async loadGraphData() {
  try {
    const response = await fetch('/.garden-graph.json', {
      headers: { 'Accept': 'application/json' }
    });
    const data = await response.json();
    
    // Process nodes (convert object to array)
    const nodesArray = Object.entries(data.nodes).map(([id, node]) => ({
      id: id,
      label: node.label || id,
      url: this.generateNodeUrl(id),
      x: Math.random() * this.app.screen.width,
      y: Math.random() * this.app.screen.height
    }));

    this.nodes = nodesArray;

    // Process links - filter using the actual nodes array
    const nodeIds = new Set(nodesArray.map(node => node.id));
    const links = data.links.map(link => ({
      source: link.source,
      target: link.target
    })).filter(link => 
      nodeIds.has(link.source) && nodeIds.has(link.target)
    );

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
      graphics.lineStyle(2, 0x00ff00, 0.8); // Make links more visible
      
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
        graphics.lineStyle(2, 0x00ff00, 0.8); // Match render style
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
    this.mainContainer.hitArea = this.app.screen;
    
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
