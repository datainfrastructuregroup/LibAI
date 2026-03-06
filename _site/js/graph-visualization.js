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
 *
 * @param {HTMLElement} container - Target DOM element
 * @param {Object} data - Graph data (.garden-graph.json)
 * @param {Object} [opts] - Optional config (width, height)
 *
 * @returns {{ svg: any, simulation: any }}
 */
export function renderForceGraph(container, data, opts = {}) {
  // 0) Compute size + reset container
  const width = opts.width ?? container.clientWidth ?? 900;
  const height = opts.height ?? 600;

  container.innerHTML = ""; // clear

  // 1) Create SVG + root group (g) & plug into container
  //    - everything is drawn inside g
  //    - zoom/pan transforms g, not the svg itself
  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .style("width", "100%")
    .style("height", `${height}px`)
    .style("cursor", "grab");

  const g = svg.append("g");

  // 2) Enable zoom/pan for svgs
  //    - scaleExtent controls min/max zoom
  svg.call(
    d3
      .zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (e) => g.attr("transform", e.transform))
  );

  // 3) Normalize input data: turn graph.json to nodes array
  //    - the nodes are often an object map: { id: {...} }
  //    - D3 wants an array of node objects (with stable `id`)
  const nodesIn = data?.nodes;
  const linksIn = data?.links;

  let nodesArr = [];
  if (Array.isArray(nodesIn)) {
    // Already an array: trust the upstream format
    nodesArr = nodesIn;
  } else if (nodesIn && typeof nodesIn === "object") {
    // Object map -> array
    // nodesArr = Object.entries(nodesIn).map(([id, v]) => {
    //   const title = v?.meta?.title;
    //   return {
    //     id,
    //     // Prefer meta.title when available, then label, then id fallback
    //     label: title || v?.label || id,
    //     description: v?.meta?.description,
    //     // NOTE: adjust if your site uses a different permalink scheme
    //     url: `/notes/${id}/`,
    //     ...v,
    //   };
    // });
    nodesArr = Object.entries(nodesIn).map(([id, v]) => {
      const isHeading = id.includes("#");
      const layout = v?.meta?.layout;         // "note.njk" | "person.njk" | "base.njk" ...
      const title = v?.meta?.title;
      const summary = v?.label;

      const isNoteOrPerson = layout === "note.njk" || layout === "person.njk";

      // ---- URL rules ----
      // notes -> /notes/{id}/ ; others keep old behavior
      const url = isNoteOrPerson ? `/notes/${id}/` : `/${id}/`;

      // ---- LABEL rules ----
      // notes -> always use page title
      // headings -> keep existing heading label (Features, etc.)
      // others -> keep whatever worked before
      let displayLabel;
      if (isNoteOrPerson && title) {
        displayLabel = title;
      } else if (isHeading) {
        displayLabel = summary || id;
      } else {
        displayLabel = title || summary || id;
      }

      // tooltip: for notes, show long summary on hover (optional but nice)
      const description =
        isNoteOrPerson && summary && summary !== title ? summary : v?.meta?.description;

      return {
        id,
        ...v,
        label: displayLabel,
        description,
        url,
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

  // Make shallow copies so D3 can mutate x/y safely without touching originals
  const nodes = nodesArr.map((d) => ({ ...d }));

  // 4) Filter invalid links
  //    - D3 forceLink throws if a link points to a missing node id
  //    - your data may include references like 'wikilinks', 'backlinks', etc.
  const nodeIdSet = new Set(nodes.map((n) => n.id));

  const rawLinks = linksIn.map((d) => ({ ...d }));

  // debugging code in order to check which nodes are missing -> which links are filtered
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
    const dropped = rawLinks.length - links.length;
    console.warn(
      `[graph] dropped ${dropped} links whose endpoints are missing in nodes`
    );
  }

  // 5) Draw elements (initially, positions are not meaningful)
  //    - tick() will update positions on each simulation step

  // 5.1 Links as lines
  const link = g
    .append("g")
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.25)
    .selectAll("line")
    .data(links)
    .join("line");

  // 5.2 Nodes as circles
  const node = g
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", 10)
    .attr("fill", "currentColor")
    .attr("fill-opacity", 0.1);

  // 5.3 Labels as text
  const label = g
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((d) => d.label)
    .attr("font-size", 11)
    .attr("dx", 9)
    .attr("dy", 3)
    .attr("fill", "currentColor")
    .attr("opacity", 0.8)
    .style("user-select", "none")
    .style("pointer-events", "none"); // don't block clicking nodes

  // 6) Add simple interactions (tooltip + click navigation)
  // Tooltip: native SVG title on hover
  node
    .append("title")
    .text((d) => (d.description ? `${d.label}\n${d.description}` : d.label));

  // Click: navigate to node.url if present
  node.on("click", (_, d) => {
    if (d.url) window.location.href = d.url;
  });

  // 7) Create force simulation
  //    Key forces:
  //    - link: pulls connected nodes together
  //    - charge: pushes nodes apart
  //    - center: keeps graph centered in viewport
  //    - collision: prevents overlap
  const simulation = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d) => d.id))
    .force("link", d3.forceLink(links).distance(60))
    .force("charge", d3.forceManyBody().strength(-10))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(20))
    .on("tick", ticked);

  // 8) Drag behavior
  //    - on start: "heat up" the simulation + pin node (fx/fy)
  //    - on drag: move pinned position
  //    - on end: release pin + cool down
  node.call(drag(() => simulation));

  // 9) Simulation tick handler: write positions back to DOM
  function ticked() {
    // After forceLink initializes, d.source/d.target are node objects
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    label.attr("x", (d) => d.x).attr("y", (d) => d.y);
  }

  // 10) Drag factory
  function drag(getSim) {
    return d3
      .drag()
      .on("start", (event, d) => {
        const sim = getSim();
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        const sim = getSim();
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  // 11) Return handles for external control (optional)
  return { svg, simulation };
}