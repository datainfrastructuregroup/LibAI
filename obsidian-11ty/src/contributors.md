---
title: Contributors
layout: base.njk
---

<h1>Contributors</h1>

<p></p>

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
