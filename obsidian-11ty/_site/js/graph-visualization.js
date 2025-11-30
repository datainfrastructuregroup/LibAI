// Import D3 and PIXI from CDN
import * as d3 from 'https://cdn.skypack.dev/d3@7';
import * as PIXI from 'https://cdn.skypack.dev/pixi.js@7';

// Graph color constants (matching CSS variables)
function hexToPixiColor(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

// Get colors from CSS variables
function getGraphColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    background: hexToPixiColor(style.getPropertyValue('--graph-bg')),
    cardBg: hexToPixiColor(style.getPropertyValue('--graph-node-bg')),
    accent: hexToPixiColor(style.getPropertyValue('--graph-node-border')),
    text: hexToPixiColor(style.getPropertyValue('--graph-text-color')),
    border: hexToPixiColor(style.getPropertyValue('--border-color'))
  };
}

let GRAPH_COLORS = getGraphColors();

class ForceDirectedGraph {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    // Refresh colors from CSS
    GRAPH_COLORS = getGraphColors();

    this.app = new PIXI.Application({
      width: this.container.offsetWidth,
      height: 400,
      backgroundColor: GRAPH_COLORS.background,
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
    
    // Dragging state
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this.dragStartPos = { x: 0, y: 0 };
    this.dragThreshold = 5; // pixels
    
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
        return; // Let node handle the drag
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
    controlsContainer.className = 'force-graph-controls';
    
    // Zoom in button
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.className = 'force-graph-control-btn';
    zoomInBtn.addEventListener('click', () => this.zoom(1.2));
    
    // Zoom out button
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '-';
    zoomOutBtn.className = 'force-graph-control-btn';
    zoomOutBtn.addEventListener('click', () => this.zoom(0.8));
    
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.innerHTML = '⟲';
    resetBtn.className = 'force-graph-control-btn';
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

    // Store link graphics for updates
    this.linkGraphicsArray = [];

    // Draw links
    this.links.forEach(link => {
      const graphics = new PIXI.Graphics();
      graphics.lineStyle(2, GRAPH_COLORS.accent, 0.8);
      
      const sourceNode = this.nodes.find(n => n.id === link.source);
      const targetNode = this.nodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode) {
        graphics.moveTo(sourceNode.x, sourceNode.y);
        graphics.lineTo(targetNode.x, targetNode.y);
      }
      
      this.linkGraphics.addChild(graphics);
      this.linkGraphicsArray.push(graphics);
    });

    // Draw nodes
    this.nodes.forEach(node => {
      const container = new PIXI.Container();
      
      // Node circle
      const graphics = new PIXI.Graphics();
      graphics.beginFill(GRAPH_COLORS.cardBg);
      graphics.lineStyle(2, GRAPH_COLORS.accent, 0.8);
      graphics.drawCircle(0, 0, 15);
      graphics.endFill();
      
      // Node text
      const text = new PIXI.Text(node.label, {
        fontFamily: 'Courier New, monospace',
        fontSize: 10,
        fill: GRAPH_COLORS.text,
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
      
      // Store reference to node data
      container.nodeData = node;
      
      // Node dragging events
      container.on('pointerdown', (event) => {
        this.startNodeDrag(node, event);
      });
      
      // Click navigation (only if not dragged)
      container.on('pointerup', (event) => {
        this.endNodeDrag();
        if (!this.wasDragged) {
          if (node.url.startsWith('#')) {
            window.location.hash = node.url.substring(1);
          } else {
            window.location.href = node.url;
          }
        }
      });
      
      container.on('pointerover', () => {
        graphics.tint = GRAPH_COLORS.accent;
        if (!this.draggedNode) {
          this.container.style.cursor = 'pointer';
        }
      });
      
      container.on('pointerout', () => {
        graphics.tint = 0xffffff;
        if (!this.draggedNode) {
          this.container.style.cursor = 'default';
        }
      });
      
      // Add cursor change on drag start
      container.on('pointerdown', () => {
        this.container.style.cursor = 'grabbing';
      });
      
      this.nodeGraphics.addChild(container);
    });
  }

  startNodeDrag(node, event) {
    this.draggedNode = node;
    this.wasDragged = false;
    
    // Store initial position for drag detection
    const worldPos = this.app.renderer.events.pointer.global;
    this.dragStartPos = {
      x: (worldPos.x - this.mainContainer.x) / this.scale,
      y: (worldPos.y - this.mainContainer.y) / this.scale
    };
    
    // Add visual feedback
    this.container.classList.add('force-graph-node-dragging');
    const container = this.nodeGraphics.children.find(c => c.nodeData === node);
    if (container) {
      container.scale.set(1.1);
    }
    
    // Calculate offset from node center to pointer position
    this.dragOffset = {
      x: this.dragStartPos.x - node.x,
      y: this.dragStartPos.y - node.y
    };
    
    // Fix the node position during drag
    node.fx = node.x;
    node.fy = node.y;
    
    // Restart simulation with lower alpha for smoother dragging
    this.simulation.alpha(0.3).restart();
    
    // Add global drag listeners
    this.app.stage.on('pointermove', this.handleNodeDrag);
    this.app.stage.on('pointerup', this.endNodeDrag);
    this.app.stage.on('pointerupoutside', this.endNodeDrag);
  }

  handleNodeDrag = (event) => {
    if (!this.draggedNode) return;
    
    // Convert pointer position to world coordinates
    const worldPos = this.app.renderer.events.pointer.global;
    const currentX = (worldPos.x - this.mainContainer.x) / this.scale;
    const currentY = (worldPos.y - this.mainContainer.y) / this.scale;
    
    // Check if we've moved beyond the drag threshold
    const distance = Math.sqrt(
      Math.pow(currentX - this.dragStartPos.x, 2) + 
      Math.pow(currentY - this.dragStartPos.y, 2)
    );
    
    if (distance > this.dragThreshold) {
      this.wasDragged = true;
    }
    
    // Update node position
    const newX = currentX - this.dragOffset.x;
    const newY = currentY - this.dragOffset.y;
    
    this.draggedNode.fx = newX;
    this.draggedNode.fy = newY;
    this.draggedNode.x = newX;
    this.draggedNode.y = newY;
    
    // Update visual position immediately
    const container = this.nodeGraphics.children.find(c => c.nodeData === this.draggedNode);
    if (container) {
      container.x = newX;
      container.y = newY;
    }
    
    // Update links connected to this node
    this.updateConnectedLinks(this.draggedNode);
  }

  endNodeDrag = () => {
    if (!this.draggedNode) return;
    
    // Remove visual feedback
    this.container.classList.remove('force-graph-node-dragging');
    const container = this.nodeGraphics.children.find(c => c.nodeData === this.draggedNode);
    if (container) {
      container.scale.set(1.0);
    }
    
    // Release the node fixed position
    this.draggedNode.fx = null;
    this.draggedNode.fy = null;
    
    // Reset cursor
    this.container.style.cursor = 'default';
    
    // Clear dragged node
    this.draggedNode = null;
    
    // Remove global drag listeners (if they exist)
    try {
      this.app.stage.off('pointermove', this.handleNodeDrag);
      this.app.stage.off('pointerup', this.endNodeDrag);
      this.app.stage.off('pointerupoutside', this.endNodeDrag);
    } catch (e) {
      // Ignore if listeners are already removed
    }
    
    // Give simulation a little boost to settle
    this.simulation.alpha(0.1).restart();
  }

  updateConnectedLinks(node) {
    if (!this.linkGraphicsArray) return;
    
    this.links.forEach((link, index) => {
      if (link.source === node.id || link.target === node.id) {
        const graphics = this.linkGraphicsArray[index];
        if (!graphics) return;
        
        const sourceNode = this.nodes.find(n => n.id === link.source);
        const targetNode = this.nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode) {
          graphics.clear();
          graphics.lineStyle(2, GRAPH_COLORS.accent, 0.8);
          graphics.moveTo(sourceNode.x, sourceNode.y);
          graphics.lineTo(targetNode.x, targetNode.y);
        }
      }
    });
  }

  updatePositions() {
    // Skip position updates for the dragged node (it's handled manually)
    if (this.draggedNode) {
      // Only update non-dragged nodes
      this.nodeGraphics.children.forEach(container => {
        if (container.nodeData !== this.draggedNode) {
          container.x = container.nodeData.x;
          container.y = container.nodeData.y;
        }
      });
      
      // Update all links (dragged node links are updated separately)
      this.linkGraphicsArray.forEach((graphics, index) => {
        const link = this.links[index];
        if (!link) return;
        
        const sourceNode = this.nodes.find(n => n.id === link.source);
        const targetNode = this.nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode) {
          graphics.clear();
          graphics.lineStyle(2, GRAPH_COLORS.accent, 0.8);
          graphics.moveTo(sourceNode.x, sourceNode.y);
          graphics.lineTo(targetNode.x, targetNode.y);
        }
      });
      return;
    }
    
    // Normal position updates when not dragging
    // Update link positions using stored graphics array
    if (this.linkGraphicsArray) {
      this.linkGraphicsArray.forEach((graphics, index) => {
        const link = this.links[index];
        if (!link) return;
        
        const sourceNode = this.nodes.find(n => n.id === link.source);
        const targetNode = this.nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode) {
          graphics.clear();
          graphics.lineStyle(2, GRAPH_COLORS.accent, 0.8);
          graphics.moveTo(sourceNode.x, sourceNode.y);
          graphics.lineTo(targetNode.x, targetNode.y);
        }
      });
    }

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
      <div class="force-graph-error">
        <div>
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
