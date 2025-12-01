---
title: Contributors
layout: base.njk
---

<h1>Contributors</h1>

<p>Meet the people who contribute to this knowledge base through writing, editing, and collaboration.</p>

{% set contributors = collections.all | getTaggedItems("contributor") %}

{% if contributors.length > 0 %}
<div class="contributors-grid">
  {% for contributor in contributors %}
    <div class="contributor-card">
      <h3><a href="{{ contributor.url }}">{{ contributor.data.title }}</a></h3>
      {% if contributor.data.description %}
        <p>{{ contributor.data.description }}</p>
      {% endif %}
      
      {% set personId = contributor.fileSlug %}
      
      {% set authoredArticles = [] %}
      {% set contributedArticles = [] %}
      {% set editedArticles = [] %}
      
      {% for note in collections.notes %}
        {% if note.data.authors %}
          {% for author in note.data.authors %}
            {% if author == "[[" ~ personId ~ "]]" or author == personId %}
              {% set authoredArticles = authoredArticles.concat([note]) %}
            {% endif %}
          {% endfor %}
        {% endif %}
        
        {% if note.data.contributors %}
          {% for contributorLink in note.data.contributors %}
            {% if contributorLink == "[[" ~ personId ~ "]]" or contributorLink == personId %}
              {% set contributedArticles = contributedArticles.concat([note]) %}
            {% endif %}
          {% endfor %}
        {% endif %}
        
        {% if note.data.editors %}
          {% for editor in note.data.editors %}
            {% if editor == "[[" ~ personId ~ "]]" or editor == personId %}
              {% set editedArticles = editedArticles.concat([note]) %}
            {% endif %}
          {% endfor %}
        {% endif %}
      {% endfor %}
      
      <div class="contributor-stats">
        {% if authoredArticles.length > 0 %}
        <span class="stat">{{ authoredArticles.length }} authored</span>
        {% endif %}
        {% if contributedArticles.length > 0 %}
        <span class="stat">{{ contributedArticles.length }} contributed</span>
        {% endif %}
        {% if editedArticles.length > 0 %}
        <span class="stat">{{ editedArticles.length }} edited</span>
        {% endif %}
      </div>
    </div>
  {% endfor %}
</div>
{% else %}
<p>No contributors found.</p>
{% endif %}

<style>
.contributors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.contributor-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.contributor-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.contributor-card h3 {
  margin: 0 0 0.5rem 0;
}

.contributor-card h3 a {
  color: var(--link-color);
  text-decoration: none;
}

.contributor-card h3 a:hover {
  color: var(--link-hover);
  text-decoration: underline;
}

.contributor-card p {
  color: var(--text-color);
  opacity: 0.8;
  margin: 0.5rem 0;
}

.contributor-stats {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stat {
  background: var(--code-bg);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--text-color);
}
</style>
