class PCMWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(48000 * 10); // 10 seconds buffer
    this.writePtr = 0;
    this.readPtr = 0;
    this.bufferLength = this.buffer.length;

    // Input buffering
    this.inputBuffer = [];
    this.FRAMES_PER_SEND = 3; // Send every ~3 frames (approx 20-30ms depending on rate)
    this.frameCount = 0;

    this.port.onmessage = (e) => {
      if (e.data.type === 'audio') {
        this.pushAudio(e.data.data);
      }
    };
  }

  pushAudio(data) {
    // data is Int16Array or Float32Array
    // We assume incoming is Int16 for Gemini (need to convert to Float32 for Audio API)
    // OR Float32 if pre-converted.
    // Let's assume we receive Int16Array buffer from WS (raw bytes)

    let samples;
    if (data instanceof ArrayBuffer) {
      samples = new Int16Array(data);
    } else if (data instanceof Int16Array) {
      samples = data;
    } else {
      return;
    }

    for (let i = 0; i < samples.length; i++) {
      // Convert Int16 to Float32 [-1, 1]
      this.buffer[this.writePtr] = samples[i] / 32768.0;
      this.writePtr = (this.writePtr + 1) % this.bufferLength;
    }
  }

  process(inputs, outputs, parameters) {
    // 1. Handle Input (Mic -> WS)
    const input = inputs[0];
    if (input && input.length > 0) {
      const channel0 = input[0];
      // Convert Float32 to Int16
      const int16Data = new Int16Array(channel0.length);
      for (let i = 0; i < channel0.length; i++) {
        let s = Math.max(-1, Math.min(1, channel0[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // We can send every frame (lowest latency) or batch
      // Sending every frame (128 samples) is very frequent but lowest latency.
      // 128 samples @ 16kHz = 8ms.
      // 3 frames = 24ms.

      this.inputBuffer.push(int16Data);
      this.frameCount++;

      if (this.frameCount >= this.FRAMES_PER_SEND) {
        // Merge and send
        const totalLen = this.inputBuffer.reduce((acc, b) => acc + b.length, 0);
        const merged = new Int16Array(totalLen);
        let offset = 0;
        for (const b of this.inputBuffer) {
          merged.set(b, offset);
          offset += b.length;
        }

        this.port.postMessage(merged.buffer, [merged.buffer]);
        this.inputBuffer = [];
        this.frameCount = 0;
      }
    }

    // 2. Handle Output (WS -> Speaker)
    const output = outputs[0];
    if (output && output.length > 0) {
      const channel0 = output[0];

      // Calculate available samples
      let available = 0;
      if (this.writePtr >= this.readPtr) {
        available = this.writePtr - this.readPtr;
      } else {
        available = (this.bufferLength - this.readPtr) + this.writePtr;
      }

      // Fill output
      for (let i = 0; i < channel0.length; i++) {
        if (available > 0) {
          channel0[i] = this.buffer[this.readPtr];
          this.readPtr = (this.readPtr + 1) % this.bufferLength;
          available--;
        } else {
          channel0[i] = 0; // Silence if underrun
        }
      }
    }

    return true;
  }
}

registerProcessor('pcm-worklet', PCMWorkletProcessor);
