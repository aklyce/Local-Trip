// Web worker that hosts the WebLLM engine (natural-language trip search).
// Running the model off the main thread keeps the page responsive while it loads and thinks.
// The main thread talks to it through CreateWebWorkerMLCEngine in src/lib/tripParser.ts.
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

const handler = new WebWorkerMLCEngineHandler()
self.onmessage = (msg: MessageEvent) => handler.onmessage(msg)
