<script lang="ts">
  import type { Tool } from '$lib/types';
  import ClassicalCipherWorkbench from './ClassicalCipherWorkbench.svelte';
  import { baconCipher, type CipherMode } from '$lib/utils/classical-ciphers';

  export let tool: Tool;

  function process(mode: CipherMode, input: string) {
    return baconCipher(input, mode);
  }
</script>

<ClassicalCipherWorkbench
  {tool}
  explanation="Bacon cipher represents letters as groups of five A/B symbols."
  keyFields={[]}
  exampleInput="HELLO"
  exampleKeys={{}}
  placeholder="Enter text or A/B groups..."
  {process}
/>
