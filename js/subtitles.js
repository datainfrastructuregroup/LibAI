// This script crossfades between pairs of words in the site's subtitle.
// Instead of fading to blank and back, we overlap two spans in the same
// space and fade one in while the other fades out at the same time.

const awords = ['Able', 'Abolitionist', 'Abrasive', 'Absolute', 'Abundant', 'Active', 'Actualized', 'Adaptive', 'Adorable', 'Advantageous', 'Adversarial', 'Affiliated', 'Afloat', 'Agreeable', 'Allied', 'Amalgamated', 'Ambivalent', 'Amorphous', 'Ample', 'Amplified', 'Analog', 'Ancestral', 'Anchored', 'Ancient', 'Antiquated', 'Any kind of', 'Apodictic', 'Applicable', 'Applied', 'Apposite', 'Apropos', 'Apt', 'Assembled', 'Auspicious', 'Authentic'];

const iwords = ['Idealisms', 'Ideographs', 'Ideologies', 'Illusions', 'Images', 'Imaginations', 'Immersions', 'Importance', 'Incantations', 'Inclusion', 'Incrementalness', 'Information', 'Infrastructures', 'Inquisitiveness', 'Insights', 'Insubordination', 'Intelligences', 'Intercommunalism', 'Interconnectedness', 'Interdependence', 'Interjections', 'Interlocutors', 'Intermediaries', 'Interpellations', 'Interpretations', 'Interregnums', 'Interrelations', 'Interrogations', 'Intersections', 'Intertwining', 'Interventions', 'Interweaving', 'Intuitions', 'Iterations'];

// How long each word pair is displayed before crossfading to the next (ms)
const DISPLAY_DURATION = 3000;

// How long the crossfade takes (ms)
// This controls how slowly the two spans overlap during the transition
const FADE_DURATION = 1500;

// Current position in each word list
let aIndex = 0;
let iIndex = 0;

// Find the container span in the HTML
const container = document.getElementById('rotating-subtitle');

// Turn the container into an inline grid.
// This is the key trick: by making both child spans use grid-area: 1/1,
// they occupy the exact same space and overlap each other.
// Without this, the two spans would sit side by side instead of on top of each other.
container.style.display = 'inline-grid';

// Create two spans — one will always be fading in while the other fades out.
// We call them spanA and spanB and alternate which one is "active".
const spanA = document.createElement('span');
const spanB = document.createElement('span');

// grid-area: 1/1 places both spans in row 1, column 1 — i.e. the same cell,
// so they overlap perfectly. The CSS transition handles the smooth fade.
spanA.style.cssText = `grid-area: 1/1; transition: opacity ${FADE_DURATION}ms ease;`;
spanB.style.cssText = `grid-area: 1/1; transition: opacity ${FADE_DURATION}ms ease;`;

// Both start invisible
spanA.style.opacity = '0';
spanB.style.opacity = '0';

// Add both spans to the container
container.appendChild(spanA);
container.appendChild(spanB);

// activeSpan = the one currently visible (fading out)
// inactiveSpan = the one currently hidden (fading in)
// We swap these references on every cycle.
let activeSpan   = spanA;
let inactiveSpan = spanB;

function showNext() {
  // Write the next word pair onto the hidden span BEFORE fading it in,
  // so the user never sees the text change mid-fade.
  inactiveSpan.textContent = `${awords[aIndex]} ${iwords[iIndex]}`;

  // Advance the A index, wrapping back to 0 at the end of the list.
  aIndex = (aIndex + 1) % awords.length;

  // Once we've cycled through all A words, move to the next I word.
  if (aIndex === 0) {
    iIndex = (iIndex + 1) % iwords.length;
  }

  // Crossfade: simultaneously fade out the active span and fade in the inactive one.
  // Because both have CSS transitions set, changing opacity triggers a smooth animation.
  activeSpan.style.opacity   = '0';
  inactiveSpan.style.opacity = '1';

  // Swap the references so next time we do the opposite fade direction.
  // This is JavaScript destructuring assignment — a concise way to swap two variables.
  [activeSpan, inactiveSpan] = [inactiveSpan, activeSpan];
}

// Show the first pair immediately on page load
showNext();

// Then keep rotating every DISPLAY_DURATION ms
setInterval(showNext, DISPLAY_DURATION);