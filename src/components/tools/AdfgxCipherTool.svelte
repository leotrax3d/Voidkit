<script lang="ts">
  import type { Tool } from '$lib/types';
  import ClassicalCipherWorkbench from './ClassicalCipherWorkbench.svelte';
  import { adfgxCipher, type CipherMode } from '$lib/utils/classical-ciphers';

  export let tool: Tool;

  const keyFields = [
    { id: 'squareKey', label: 'Square key', placeholder: 'GERMAN', helperText: 'Builds a keyed 5x5 Polybius square (I/J merged).' },
    { id: 'transpositionKey', label: 'Transposition key', placeholder: 'CIPHER', helperText: 'Columnar transposition key for fractionated output.' }
  ];

  function process(mode: CipherMode, input: string, keys: Record<string, string>) {
    return adfgxCipher(input, keys.squareKey ?? 'GERMAN', keys.transpositionKey ?? 'CIPHER', mode);
  }
</script>

<ClassicalCipherWorkbench
  {tool}
  explanation="ADFGX combines Polybius fractionation (A,D,F,G,X) with columnar transposition."
  {keyFields}
  exampleInput="ATTACKATONCE"
  exampleKeys={{ squareKey: 'GERMAN', transpositionKey: 'CIPHER' }}
  placeholder="Enter plaintext or ADFGX ciphertext..."
  {process}
/>
