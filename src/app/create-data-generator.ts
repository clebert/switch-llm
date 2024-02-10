export async function* createDataGenerator(
  reader: Pick<ReadableStreamDefaultReader<Uint8Array>, 'read'>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder(`utf-8`);

  let buffer = ``;

  while (true) {
    const result = await reader.read();

    if (result.done) {
      return;
    }

    buffer += decoder.decode(result.value);

    while (true) {
      const newLineIndex = buffer.indexOf(`\n`);

      if (newLineIndex === -1) break;

      const line = buffer.slice(0, newLineIndex);

      if (line.startsWith(`data:`)) yield line.slice(5).trim();

      buffer = buffer.slice(newLineIndex + 1);
    }
  }
}
