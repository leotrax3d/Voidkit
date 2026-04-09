<script lang="ts">
  import type { Tool } from '$lib/types';
  import ClassicalCipherWorkbench from './ClassicalCipherWorkbench.svelte';
  import { gronsfeldCipher, type CipherMode } from '$lib/utils/classical-ciphers';

  export let tool: Tool;

  const keyFields = [
    { id: 'key', label: 'Numeric key', placeholder: '31415', helperText: 'Digits only. Each digit shifts one letter.' }
  ];

  function process(mode: CipherMode, input: string, keys: Record<string, string>) {
    return gronsfeldCipher(input, keys.key ?? '31415', mode);
  }
</script>

<ClassicalCipherWorkbench
  {tool}
  explanation="Gronsfeld is a Vigenere-like cipher that uses a numeric key instead of letters."
  {keyFields}
  exampleInput="DEFEND THE EAST"
  exampleKeys={{ key: '31415' }}
  placeholder="Enter plaintext or ciphertext..."
  {process}
/>
