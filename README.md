# Switch LLM

> Run local models like Mistral, with the option to enhance conversations by switching to GPT-4.

<img src="./screenshot.png"/>

## Features

- **Local LLM Inference:** Run open LLMs such as Mistral, Llama, and Gemma locally on your Mac.
- **Local Web Server:** A custom, Zig-based web server wraps around
  [`llama.cpp`](https://github.com/ggerganov/llama.cpp) to facilitate a completions endpoint.
- **Web-Based Chat Interface:** A chat interface hosted locally for direct interaction with various
  LLMs.
- **OpenAI Integration:** Switch conversations to GPT-4 on the fly for enhanced interaction quality.

## Prerequisites

- macOS
- Node.js 20+
- Zig 0.12.0 (master)

## Getting started

### Installing npm dependencies

```sh
npm install
```

### Building the app and the server

```sh
npm run build
```

### Starting the server

```sh
npm start
```

```
info(server): listening on http://localhost:3000
```
