<script lang="ts">
  import type { Tool } from '$lib/types';
  import ClassicalCipherWorkbench from './ClassicalCipherWorkbench.svelte';
  import { beaufortCipher, type CipherMode } from '$lib/utils/classical-ciphers';

  export let tool: Tool;

  const keyFields = [
    { id: 'keyword', label: 'Keyword', placeholder: 'FORTIFY', helperText: 'Beaufort is reciprocal: encode and decode are the same transform.' }
  ];

  function process(_mode: CipherMode, input: string, keys: Record<string, string>) {
    return beaufortCipher(input, keys.keyword ?? 'FORTIFY');
  }
</script>

<ClassicalCipherWorkbench
  {tool}
  explanation="Beaufort uses a reciprocal keyed substitution: C = K - P (mod 26)."
  modeOptions={['encode', 'decode']}
  {keyFields}
  exampleInput="DEFEND THE EAST WALL"
  exampleKeys={{ keyword: 'FORTIFY' }}
  placeholder="Enter message text..."
  {process}
/>
