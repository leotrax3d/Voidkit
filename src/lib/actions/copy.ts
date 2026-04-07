/**
 * Svelte action for copy-to-clipboard with visual feedback.
 * Usage: <button use:copy={text} on:copied={() => ...}>Copy</button>
 *
 * Dispatches a 'copied' event after successful copy.
 * Shows optional feedback message for 1.5 seconds.
 */
import { browser } from '$app/environment';

interface CopyOptions {
  timeout?: number;
}

export function copy(
  node: HTMLElement,
  text: string | (() => string),
  options: CopyOptions = {}
) {
  const { timeout = 1500 } = options;
  let copiedTimeout: ReturnType<typeof setTimeout>;

  const handleClick = async () => {
    try {
      const contentToCopy = typeof text === 'function' ? text() : text;

      if (browser && navigator.clipboard) {
        await navigator.clipboard.writeText(contentToCopy);
        node.dispatchEvent(new CustomEvent('copied', { detail: { text: contentToCopy } }));

        // Optional: Add visual feedback class
        if (node.classList !== undefined) {
          node.classList.add('copied');
          copiedTimeout = setTimeout(() => {
            node.classList.remove('copied');
          }, timeout);
        }
      }
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  node.addEventListener('click', handleClick);

  return {
    update(newText: string | (() => string)) {
      text = newText;
    },
    destroy() {
      node.removeEventListener('click', handleClick);
      clearTimeout(copiedTimeout);
    }
  };
}
