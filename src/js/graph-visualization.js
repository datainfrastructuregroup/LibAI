import * as d3 from "https://cdn.skypack.dev/d3@7";

/**
 * Render a D3 force-directed graph.
 *
 * This function:
 * 1. Normalizes node data (object → array)
 * 2. Filters invalid links (missing endpoints)
 * 3. Creates SVG elements (links, nodes, labels)
 * 4. Initializes D3 force simulation
 * 5. Enables zoom, drag, tooltip, click navigation
 * 6. Adds a reset button to restore default view
 *
 * @param {HTMLElement} container - Target DOM element
 * @param {Object} data - Graph data (.garden-graph.json)
 * @param {Object} [opts] - Optional config (width, height)
 *
 * @returns {{ svg: any, simulation: any }}
 */
export function renderForceGraph(container, data, opts = {}) {
  // 0) Compute size + reset container
  const width  = opts.width  ?? container.clientWidth ?? 900;
  const height = opts.height ?? 600;

  container.innerHTML = ""; // clear any previous render

  // Create a wrapper div so we can position the reset button over the graph
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  container.appendChild(wrapper);

  // Reset button — floats in the top-right corner of the graph
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "reset";
  resetBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
    background: var(--card-bg);
    color: var(--accent-color);
    border: 1px solid var(--accent-color);
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    cursor: pointer;
    letter-spacing: 1px;
    text-transform: uppercase;
    font-family: inherit;
  `;
  wrapper.appendChild(resetBtn);

  // Pull CSS variables from the root so the graph respects the site's color palette.
  // getComputedStyle reads the actual computed values of CSS custom properties.
  const styles      = getComputedStyle(document.documentElement);
  const colorAccent = styles.getPropertyValue("--accent-color").trim() || "#00f0ff";
  const colorLink   = styles.getPropertyValue("--link-color").trim()   || "#f038ff";
  const colorText   = styles.getPropertyValue("--text-color").trim()   || "#e0e0e0";
  const colorCardBg = styles.getPropertyValue("--card-bg").trim()      || "#2a2a3e";

  // 1) Create SVG + root group (g) and attach to wrapper (not container directly).
  //    Everything is drawn inside g.
  //    Zoom/pan transforms g, not the svg itself.
  const svg = d3
    .select(wrapper)
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .style("width", "100%")
    .style("height", `${height}px`)
    .style("cursor", "grab");

  const g = svg.append("g");

  // 2) Set up zoom/pan and save a reference to the zoom behavior
  //    so the reset button can call it later.
  const zoomBehavior = d3
    .zoom()
    .scaleExtent([0.2, 4])
    .on("zoom", (e) => g.attr("transform", e.transform));

  svg.call(zoomBehavior);

  // 3) Normalize input data: convert nodes to an array.
  //    The graph JSON often stores nodes as an object map { id: {...} }
  //    but D3 wants an array of objects with a stable `id` field.
  const nodesIn = data?.nodes;
  const linksIn = data?.links;

  let nodesArr = [];
  if (Array.isArray(nodesIn)) {
    // Already an array — use as-is
    nodesArr = nodesIn;
  } else if (nodesIn && typeof nodesIn === "object") {
    // Convert object map → array
    nodesArr = Object.entries(nodesIn).map(([id, v]) => {
      const layout  = v?.meta?.layout; // e.g. "note.njk", "person.njk"
      const title   = v?.meta?.title;
      const summary = v?.label;

      // Decide the URL based on the page's layout.
      // People pages live at /people/{id}/, notes at /notes/{id}/.
      // Everything else falls back to /{id}/.
      let url;
      if (layout === "person.njk") {
        url = `/people/${id}/`;
      } else if (layout === "note.njk") {
        url = `/notes/${id}/`;
      } else {
        url = `/${id}/`;
      }

      // Use the page title as the display label if available.
      const displayLabel = title || summary || id;

      // Tooltip description shown on hover.
      const description =
        summary && summary !== title ? summary : v?.meta?.description;

      // People nodes get a different color so they stand out from note nodes.
      const isPerson = layout === "person.njk";

      return {
        id,
        ...v,
        label: displayLabel,
        description,
        url,
        isPerson,
      };
    });
  } else {
    console.error("[graph] data.nodes invalid:", nodesIn);
    return;
  }

  if (!Array.isArray(linksIn)) {
    console.error("[graph] data.links is not an array:", linksIn);
    return;
  }

  // Make shallow copies so D3 can safely mutate x/y positions
  // without touching the original data objects.
  const nodes = nodesArr.map((d) => ({ ...d }));

  // 4) Filter out any links whose source or target node doesn't exist.
  //    D3 forceLink will throw if it finds a reference to a missing node.
  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const rawLinks  = linksIn.map((d) => ({ ...d }));

  // Log any missing node IDs to help debug graph data issues.
  const missing = new Set();
  for (const e of rawLinks) {
    if (!nodeIdSet.has(e.source)) missing.add(e.source);
    if (!nodeIdSet.has(e.target)) missing.add(e.target);
  }
  if (missing.size) {
    console.warn("[graph] missing node ids:", Array.from(missing).sort());
  }

  const links = rawLinks.filter(
    (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
  );

  if (links.length !== rawLinks.length) {
    console.warn(`[graph] dropped ${rawLinks.length - links.length} links with missing endpoints`);
  }

  // Build a set of node IDs that appear in at least one link.
  // Any node NOT in this set is an orphan (no connections at all).
  const connectedIds = new Set();
  links.forEach(l => {
    connectedIds.add(typeof l.source === "object" ? l.source.id : l.source);
    connectedIds.add(typeof l.target === "object" ? l.target.id : l.target);
  });

  // 5) Draw SVG elements.
  //    Positions are meaningless at this stage — the simulation tick() will
  //    update them on every frame.

  // 5.1) Links as lines
  const link = g
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", colorLink)
    .attr("stroke-opacity", 0.5)
    .attr("stroke-width", 1.5);

  // 5.2) Nodes as circles.
  //      People nodes use the accent color; note nodes use the card background.
  //      Full opacity so they're clearly visible on the dark background.
  const node = g
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", (d) => d.isPerson ? 12 : 8) // people nodes slightly larger
    .attr("fill", (d) => d.isPerson ? colorAccent : colorCardBg)
    .attr("stroke", (d) => d.isPerson ? colorAccent : colorLink)
    .attr("stroke-width", 2)
    .style("cursor", "pointer");

  // 5.3) Labels as text — slightly offset to the right of each node
  const label = g
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((d) => d.label)
    .attr("font-size", 13)
    .attr("dx", 14)
    .attr("dy", 4)
    .attr("fill", colorText)
    .attr("opacity", 0.9)
    .style("user-select", "none")
    .style("pointer-events", "none"); // prevent labels from blocking node clicks

  // 6) Interactions: tooltip, click navigation, hover highlight

  // Native SVG title = browser tooltip on hover
  node
    .append("title")
    .text((d) => d.description ? `${d.label}\n${d.description}` : d.label);

  // Click navigates to the node's page
  node.on("click", (_, d) => {
    if (d.url) window.location.href = d.url;
  });

  // Highlight connected nodes on hover.
  // On mouseover: fade everything out, then highlight this node + its neighbors.
  node
    .on("mouseover", (event, d) => {
      // Find all node IDs directly connected to this node
      const neighborIds = new Set();
      links.forEach(l => {
        const srcId = typeof l.source === "object" ? l.source.id : l.source;
        const tgtId = typeof l.target === "object" ? l.target.id : l.target;
        if (srcId === d.id) neighborIds.add(tgtId);
        if (tgtId === d.id) neighborIds.add(srcId);
      });

      // Fade all nodes and labels, then restore the hovered node + its neighbors
      node.attr("opacity", n => n.id === d.id || neighborIds.has(n.id) ? 1 : 0.2);
      label.attr("opacity", n => n.id === d.id || neighborIds.has(n.id) ? 1 : 0.1);
      link.attr("stroke-opacity", l => {
        const srcId = typeof l.source === "object" ? l.source.id : l.source;
        const tgtId = typeof l.target === "object" ? l.target.id : l.target;
        return srcId === d.id || tgtId === d.id ? 1 : 0.05;
      });
    })
    .on("mouseout", () => {
      // Restore everything to default opacity
      node.attr("opacity", 1);
      label.attr("opacity", 0.9);
      link.attr("stroke-opacity", 0.5);
    });

  // 7) Force simulation.
  //    Key forces:
  //    - link: pulls connected nodes toward each other
  //    - charge: pushes ALL nodes apart (negative = repel)
  //    - center: keeps the whole graph centered in the viewport
  //    - collision: prevents nodes from overlapping
  //    - orphan-radial: pulls unconnected nodes toward the center
  //      so they don't scatter to the edges
  //
  //    IMPORTANT: only register "link" force ONCE.
  //    Register id() and distance() in the same chain.
  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3.forceLink(links)
        .id((d) => d.id)   // tell D3 to match links by the `id` field
        .distance(120)      // target distance between connected nodes
        .strength(0.5)      // how strongly links pull nodes together
    )
    .force("charge", d3.forceManyBody().strength(-120)) // repulsion between all nodes
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(30))            // minimum distance between node centers
    .force(
      "orphan-radial",
      // Pull orphan nodes toward a ring near the center.
      // Connected nodes get strength 0 so this doesn't affect them.
      d3.forceRadial(80, width / 2, height / 2)
        .strength(n => connectedIds.has(n.id) ? 0 : 0.8)
    )
    .alphaDecay(0.02)  // slow cooling = simulation stays "alive" longer
    .alphaMin(0.001)   // stop threshold
    .on("tick", ticked);

  // 8) Drag behavior.
  //    On drag start: "heat up" the simulation so nearby nodes react.
  //    On drag: move the dragged node to the cursor position.
  //    On drag end: unpin the node so forces take over again.
  node.call(
    d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart(); // reheat
        d.fx = d.x; // pin x
        d.fy = d.y; // pin y
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0); // cool down
        d.fx = null; // unpin — let forces take over
        d.fy = null;
      })
  );

  // 9) Tick handler: runs on every simulation frame.
  //    After forceLink initializes, d.source and d.target are full node objects
  //    (not just id strings), so we can read .x and .y directly.
  function ticked() {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y);

    label
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y);
  }

  // 10) Wire up the reset button.
  //     Smoothly transitions the zoom back to identity (no pan, no zoom)
  //     and reheats the simulation so nodes re-settle naturally.
  resetBtn.addEventListener("click", () => {
    svg.transition()
      .duration(500)
      .call(zoomBehavior.transform, d3.zoomIdentity);
    simulation.alpha(0.3).restart();
  });

  // 11) Return handles for external control if needed
  return { svg, simulation };
}