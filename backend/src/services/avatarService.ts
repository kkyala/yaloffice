/**
 * Avatar Service
 *
 * Generates lip-synced AI interviewer video using Wav2Lip or SadTalker.
 * Takes TTS audio and a face image/video to produce synchronized video.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface AvatarConfig {
  // Path to the face image or video for the AI interviewer
  faceSource: string;
  // Output directory for generated videos
  outputDir: string;
  // Which renderer to use ('none' disables avatar generation)
  renderer: 'wav2lip' | 'sadtalker' | 'none';
  // Wav2Lip specific settings
  wav2lip?: {
    checkpointPath: string;
    // Quality: 'fast' uses wav2lip, 'hq' uses wav2lip_gan
    quality: 'fast' | 'hq';
  };
  // SadTalker specific settings
  sadtalker?: {
    checkpointDir: string;
    configDir: string;
    // Expression style
    expression: 'neutral' | 'expressive';
    // Pose style: 'still' or 'natural'
    poseStyle: 'still' | 'natural';
  };
}

const DEFAULT_CONFIG: AvatarConfig = {
  faceSource: process.env.AVATAR_FACE_SOURCE || '/app/assets/ai_interviewer.jpg',
  outputDir: process.env.AVATAR_OUTPUT_DIR || '/app/avatar_output',
  renderer: (process.env.AVATAR_RENDERER as 'wav2lip' | 'sadtalker' | 'none') || 'wav2lip',
  wav2lip: {
    checkpointPath: process.env.WAV2LIP_CHECKPOINT || '/app/models/wav2lip_gan.pth',
    quality: 'hq'
  },
  sadtalker: {
    checkpointDir: process.env.SADTALKER_CHECKPOINT_DIR || '/app/models/sadtalker',
    configDir: process.env.SADTALKER_CONFIG_DIR || '/app/models/sadtalker/config',
    expression: 'neutral',
    poseStyle: 'natural'
  }
};

class AvatarService {
  private config: AvatarConfig;
  private isAvailable: boolean = false;

  constructor(config: Partial<AvatarConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.checkAvailability();
  }

  /**
   * Check if avatar rendering is available
   */
  private async checkAvailability(): Promise<void> {
    // If renderer is 'none', skip availability check
    if (this.config.renderer === 'none') {
      console.log('[AvatarService] Avatar rendering disabled (renderer=none)');
      this.isAvailable = false;
      return;
    }

    try {
      // Check if Python and required packages are available
      const pythonCheck = spawn('python', ['--version']);

      pythonCheck.on('close', (code) => {
        if (code === 0) {
          // Check if face source exists
          if (fs.existsSync(this.config.faceSource)) {
            this.isAvailable = true;
            console.log('[AvatarService] Avatar rendering is available');
          } else {
            console.warn('[AvatarService] Face source not found:', this.config.faceSource);
          }
        }
      });

      pythonCheck.on('error', () => {
        console.warn('[AvatarService] Python not available - avatar rendering disabled');
      });
    } catch {
      console.warn('[AvatarService] Avatar rendering not available');
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isAvailable;
  }

  /**
   * Generate lip-synced video from audio
   */
  async generateVideo(
    audioPath: string,
    options?: {
      faceSource?: string;
      outputFileName?: string;
    }
  ): Promise<string> {
    const faceSource = options?.faceSource || this.config.faceSource;
    const outputFileName = options?.outputFileName || `avatar_${uuidv4()}.mp4`;
    const outputPath = path.join(this.config.outputDir, outputFileName);

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    if (this.config.renderer === 'wav2lip') {
      return this.generateWithWav2Lip(audioPath, faceSource, outputPath);
    } else {
      return this.generateWithSadTalker(audioPath, faceSource, outputPath);
    }
  }

  /**
   * Generate video using Wav2Lip
   */
  private generateWithWav2Lip(
    audioPath: string,
    faceSource: string,
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const checkpoint = this.config.wav2lip?.quality === 'hq'
        ? this.config.wav2lip.checkpointPath
        : this.config.wav2lip?.checkpointPath.replace('_gan', '');

      const args = [
        'inference.py',
        '--checkpoint_path', checkpoint || '',
        '--face', faceSource,
        '--audio', audioPath,
        '--outfile', outputPath,
        '--resize_factor', '1',
        '--nosmooth'
      ];

      console.log('[AvatarService] Running Wav2Lip:', args.join(' '));

      const wav2lipProcess = spawn('python', args, {
        cwd: process.env.WAV2LIP_DIR || '/app/Wav2Lip'
      });

      let stderr = '';

      wav2lipProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      wav2lipProcess.on('close', (code: number | null) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          console.log('[AvatarService] Wav2Lip generated:', outputPath);
          resolve(outputPath);
        } else {
          reject(new Error(`Wav2Lip failed with code ${code}: ${stderr}`));
        }
      });

      wav2lipProcess.on('error', (err: Error) => {
        reject(new Error(`Failed to spawn Wav2Lip: ${err.message}`));
      });
    });
  }

  /**
   * Generate video using SadTalker
   */
  private generateWithSadTalker(
    audioPath: string,
    faceSource: string,
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        'inference.py',
        '--driven_audio', audioPath,
        '--source_image', faceSource,
        '--result_dir', path.dirname(outputPath),
        '--checkpoint_dir', this.config.sadtalker?.checkpointDir || '',
        '--config_dir', this.config.sadtalker?.configDir || '',
        '--still', this.config.sadtalker?.poseStyle === 'still' ? 'true' : 'false',
        '--preprocess', 'full',
        '--enhancer', 'gfpgan'
      ];

      if (this.config.sadtalker?.expression === 'expressive') {
        args.push('--expression_scale', '1.5');
      }

      console.log('[AvatarService] Running SadTalker:', args.join(' '));

      const sadtalkerProcess = spawn('python', args, {
        cwd: process.env.SADTALKER_DIR || '/app/SadTalker'
      });

      let stderr = '';

      sadtalkerProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      sadtalkerProcess.on('close', (code: number | null) => {
        if (code === 0) {
          // SadTalker outputs to result_dir with auto-generated name
          // Find the generated file
          const resultDir = path.dirname(outputPath);
          const files = fs.readdirSync(resultDir)
            .filter(f => f.endsWith('.mp4'))
            .sort((a, b) => {
              const statA = fs.statSync(path.join(resultDir, a));
              const statB = fs.statSync(path.join(resultDir, b));
              return statB.mtimeMs - statA.mtimeMs;
            });

          if (files.length > 0) {
            const generatedFile = path.join(resultDir, files[0]);
            // Rename to expected output path
            fs.renameSync(generatedFile, outputPath);
            console.log('[AvatarService] SadTalker generated:', outputPath);
            resolve(outputPath);
          } else {
            reject(new Error('SadTalker did not generate output file'));
          }
        } else {
          reject(new Error(`SadTalker failed with code ${code}: ${stderr}`));
        }
      });

      sadtalkerProcess.on('error', (err: Error) => {
        reject(new Error(`Failed to spawn SadTalker: ${err.message}`));
      });
    });
  }

  /**
   * Generate video from base64 audio data
   */
  async generateFromBase64Audio(
    audioBase64: string,
    mimeType: string = 'audio/wav'
  ): Promise<string> {
    const tempId = uuidv4();
    const ext = mimeType.includes('wav') ? 'wav' : 'mp3';
    const tempAudioPath = path.join(this.config.outputDir, `temp_${tempId}.${ext}`);

    // Write base64 audio to temp file
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    fs.writeFileSync(tempAudioPath, audioBuffer);

    try {
      const videoPath = await this.generateVideo(tempAudioPath);
      // Clean up temp audio
      fs.unlinkSync(tempAudioPath);
      return videoPath;
    } catch (err) {
      // Clean up temp audio on error
      if (fs.existsSync(tempAudioPath)) {
        fs.unlinkSync(tempAudioPath);
      }
      throw err;
    }
  }

  /**
   * Convert PCM audio to WAV format for processing
   */
  async convertPCMToWav(
    pcmData: Buffer,
    sampleRate: number = 24000,
    channels: number = 1
  ): Promise<string> {
    const tempId = uuidv4();
    const wavPath = path.join(this.config.outputDir, `temp_${tempId}.wav`);

    // Create WAV header
    const wavHeader = this.createWavHeader(pcmData.length, sampleRate, channels, 16);
    const wavBuffer = Buffer.concat([wavHeader, pcmData]);

    fs.writeFileSync(wavPath, wavBuffer);
    return wavPath;
  }

  /**
   * Create WAV file header
   */
  private createWavHeader(
    dataLength: number,
    sampleRate: number,
    channels: number,
    bitsPerSample: number
  ): Buffer {
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);

    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);

    // fmt chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // chunk size
    header.writeUInt16LE(1, 20); // audio format (PCM)
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    // data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);

    return header;
  }

  /**
   * Clean up old avatar files
   */
  async cleanup(maxAgeMs: number = 3600000): Promise<void> {
    if (!fs.existsSync(this.config.outputDir)) return;

    const now = Date.now();
    const files = fs.readdirSync(this.config.outputDir);

    for (const file of files) {
      const filePath = path.join(this.config.outputDir, file);
      const stat = fs.statSync(filePath);

      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log('[AvatarService] Cleaned up:', file);
      }
    }
  }
}

export const avatarService = new AvatarService();
