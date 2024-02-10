# Switch LLM

Switch LLM enables running local models like Mistral, with the option to enhance conversations by
switching to GPT-4.

## Features

- **Local LLM Inference:** Run open LLMs such as Mistral, Llama, and Gemma locally on your ARM-based
  Mac.
- **Local Web Server:** A custom, Zig-based web server wraps around
  [`llama.cpp`](https://github.com/ggerganov/llama.cpp) to facilitate a completions endpoint.
- **Web-Based Chat Interface:** A chat interface hosted locally for direct interaction with various
  LLMs.
- **OpenAI Integration:** Switch conversations to GPT-4 on the fly for enhanced interaction quality.

## Getting Started

```sh
npm run build && npm start
```

```
info(server): listening on http://localhost:3000
```
