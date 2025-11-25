/**
 * PCM Audio Worklet Processor for Gemini Realtime API
 *
 * Converts microphone input to 16kHz mono PCM16 format
 * - Downsamples from browser sample rate (usually 48kHz) to 16kHz
 * - Converts Float32 to Int16 PCM format
 * - Sends buffered chunks to main thread
 */
class PCMWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRateRatio = Math.round(sampleRate / 16000);
    this.downsampleCounter = 0;
    this.buffer = [];
    this.bufferSize = 2048; // Send chunks of 2048 samples
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) {
      return true;
    }

    const samples = input[0]; // Mono channel

    // Downsample to 16kHz by taking every Nth sample
    for (let i = 0; i < samples.length; i++) {
      this.downsampleCounter++;
      if (this.downsampleCounter >= this.sampleRateRatio) {
        this.downsampleCounter = 0;

        // Clamp and convert to Int16
        const clamped = Math.max(-1, Math.min(1, samples[i]));
        const pcmValue = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;

        this.buffer.push(Math.round(pcmValue));

        // Send buffer when full
        if (this.buffer.length >= this.bufferSize) {
          const pcm16 = new Int16Array(this.buffer);
          this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
          this.buffer = [];
        }
      }
    }

    return true;
  }
}

registerProcessor("pcm-worklet", PCMWorkletProcessor);
