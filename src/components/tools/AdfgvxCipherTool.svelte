<script lang="ts">
  import type { Tool } from '$lib/types';
  import ClassicalCipherWorkbench from './ClassicalCipherWorkbench.svelte';
  import { adfgvxCipher, type CipherMode } from '$lib/utils/classical-ciphers';

  export let tool: Tool;

  const keyFields = [
    { id: 'squareKey', label: 'Square key', placeholder: 'MATRIX', helperText: 'Builds a keyed 6x6 square with letters and digits.' },
    { id: 'transpositionKey', label: 'Transposition key', placeholder: 'ENIGMA', helperText: 'Columnar transposition key for final stage.' }
  ];

  function process(mode: CipherMode, input: string, keys: Record<string, string>) {
    return adfgvxCipher(input, keys.squareKey ?? 'MATRIX', keys.transpositionKey ?? 'ENIGMA', mode);
  }
</script>

<ClassicalCipherWorkbench
  {tool}
  explanation="ADFGVX extends ADFGX with a 6x6 square that supports letters and digits."
  {keyFields}
  exampleInput="MEETAT0900"
  exampleKeys={{ squareKey: 'MATRIX', transpositionKey: 'ENIGMA' }}
  placeholder="Enter plaintext or ADFGVX ciphertext..."
  {process}
/>
