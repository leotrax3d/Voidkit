<script lang="ts">
  import type { Tool } from '$lib/types';
  import ClassicalCipherWorkbench from './ClassicalCipherWorkbench.svelte';
  import { affineCipher, validateAffineKeys, type CipherMode } from '$lib/utils/classical-ciphers';

  export let tool: Tool;

  const keyFields = [
    { id: 'a', label: 'Key a', placeholder: '5', type: 'number', helperText: 'Must be coprime with 26.' },
    { id: 'b', label: 'Key b', placeholder: '8', type: 'number', helperText: 'Shift value in range 0-25.' }
  ];

  function process(mode: CipherMode, input: string, keys: Record<string, string>) {
    const { a, b } = validateAffineKeys(keys.a ?? '5', keys.b ?? '8');
    return affineCipher(input, a, b, mode);
  }
</script>

<ClassicalCipherWorkbench
  {tool}
  explanation="Affine uses y = (a*x + b) mod 26. Decoding requires a modular inverse for key a."
  {keyFields}
  exampleInput="Rclla Oaplx!"
  exampleKeys={{ a: '5', b: '8' }}
  placeholder="Enter plaintext or ciphertext..."
  {process}
/>
