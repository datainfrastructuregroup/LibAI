# Obsidian 11ty

The new Liberation + AI site...built with 11ty, inspired by Obsidian Publish. 

## Features
- **Wikilinks**: Link between notes using `[[note-name]]` syntax
- **Backlinks**: Automatically generated backlinks show connections between notes
- **Graph View**: Visualize relationships between notes (placeholder implementation - in development)
- **Responsive Design**: Works on desktop and mobile devices
- **Markdown Support**: Write content in Markdown with full support for code blocks, lists, and more

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. Clone this repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

### Development Server

Start the development server with hot-reload:

```bash
npm start
```

The site will be available at [http://localhost:9090](http://localhost:9090)

### Creating New Notes

1. Add new markdown files to the `src/notes` directory
2. Link between notes using double square brackets: `[[note-name]]`
3. The file name will be used as the URL slug (e.g., `my-note.md` becomes `/notes/my-note/`)

### Building for Production

To create a production build:

```bash
npm run build
```

The built site will be available in the `_site` directory.

## Project Structure

```
obsidian-11ty/
├── src/
│   ├── _includes/     # Layouts and partials
│   ├── notes/         # Your markdown notes
│   ├── css/           # Stylesheets
│   └── js/            # JavaScript files
├── .eleventy.js       # 11ty configuration
└── package.json       # Project dependencies and scripts
```

## Customization

### Styling

Edit the styles in `src/css/style.css` to customize the appearance of your site.

### Configuration

Modify `.eleventy.js` to change site-wide settings and add custom filters or shortcodes.

## License
(tbd)