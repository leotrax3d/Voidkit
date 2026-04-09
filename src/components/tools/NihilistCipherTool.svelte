<script lang="ts">
  import type { Tool } from '$lib/types';
  import ClassicalCipherWorkbench from './ClassicalCipherWorkbench.svelte';
  import { nihilistCipher, type CipherMode } from '$lib/utils/classical-ciphers';

  export let tool: Tool;

  const keyFields = [
    { id: 'keyword', label: 'Additive keyword', placeholder: 'KEY', helperText: 'Converted into Polybius numbers and repeated.' },
    { id: 'squareKey', label: 'Polybius square key (optional)', placeholder: 'SQUARE', helperText: 'Used to build the base Polybius mapping.' }
  ];

  function process(mode: CipherMode, input: string, keys: Record<string, string>) {
    return nihilistCipher(input, keys.keyword ?? 'KEY', keys.squareKey ?? '', mode);
  }
</script>

<ClassicalCipherWorkbench
  {tool}
  explanation="Nihilist cipher uses Polybius numbers and an additive keyword stream."
  {keyFields}
  exampleInput="DEFENDTHEEASTWALL"
  exampleKeys={{ keyword: 'KEY', squareKey: '' }}
  placeholder="Enter plaintext or whitespace-separated Nihilist number groups..."
  {process}
/>
