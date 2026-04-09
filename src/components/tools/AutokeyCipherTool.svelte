<script lang="ts">
  import type { Tool } from '$lib/types';
  import ClassicalCipherWorkbench from './ClassicalCipherWorkbench.svelte';
  import { autokeyCipher, type CipherMode } from '$lib/utils/classical-ciphers';

  export let tool: Tool;

  const keyFields = [
    { id: 'keyword', label: 'Keyword', placeholder: 'QUEENLY', helperText: 'Autokey extends the key with plaintext (encode) or recovered plaintext (decode).' }
  ];

  function process(mode: CipherMode, input: string, keys: Record<string, string>) {
    return autokeyCipher(input, keys.keyword ?? 'QUEENLY', mode);
  }
</script>

<ClassicalCipherWorkbench
  {tool}
  explanation="Autokey starts with a keyword and then continues the key stream from message text."
  {keyFields}
  exampleInput="ATTACKATDAWN"
  exampleKeys={{ keyword: 'QUEENLY' }}
  placeholder="Enter plaintext or ciphertext..."
  {process}
/>
