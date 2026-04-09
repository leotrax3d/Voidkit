<script lang="ts">
  import type { Tool } from '$lib/types';
  import ClassicalCipherWorkbench from './ClassicalCipherWorkbench.svelte';
  import { polybiusSquare, type CipherMode } from '$lib/utils/classical-ciphers';

  export let tool: Tool;

  const keyFields = [
    { id: 'squareKey', label: 'Square key (optional)', placeholder: 'keyword', helperText: 'J is merged into I in a 5x5 square.' }
  ];

  function process(mode: CipherMode, input: string, keys: Record<string, string>) {
    return polybiusSquare(input, keys.squareKey ?? '', mode);
  }
</script>

<ClassicalCipherWorkbench
  {tool}
  explanation="Polybius maps letters to row/column pairs in a 5x5 grid."
  {keyFields}
  exampleInput="HELLO WORLD"
  exampleKeys={{ squareKey: '' }}
  placeholder="Use text to encode or coordinate pairs like 23 15 31..."
  {process}
/>
