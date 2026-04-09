<script lang="ts">
  import type { Tool } from '$lib/types';
  import ClassicalCipherWorkbench from './ClassicalCipherWorkbench.svelte';
  import { portaCipher, type CipherMode } from '$lib/utils/classical-ciphers';

  export let tool: Tool;

  const keyFields = [
    { id: 'keyword', label: 'Keyword', placeholder: 'PORTA', helperText: 'Porta is reciprocal: the same transform encodes and decodes.' }
  ];

  function process(_mode: CipherMode, input: string, keys: Record<string, string>) {
    return portaCipher(input, keys.keyword ?? 'PORTA');
  }
</script>

<ClassicalCipherWorkbench
  {tool}
  explanation="Porta uses keyed reciprocal substitution with alphabet-pair tables."
  modeOptions={['encode', 'decode']}
  {keyFields}
  exampleInput="ATTACK AT DAWN"
  exampleKeys={{ keyword: 'PORTA' }}
  placeholder="Enter message text..."
  {process}
/>
