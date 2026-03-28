import 'dotenv/config';
import fs from 'fs';

// Create a tiny valid WAV file (silence) to test the endpoint
function createSilentWav() {
  const sampleRate = 16000;
  const duration = 1; // 1 second
  const numSamples = sampleRate * duration;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  return buffer;
}

const wavBuffer = createSilentWav();

const res = await fetch('https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.HF_API_KEY}`,
    'Content-Type': 'audio/wav',
    'x-wait-for-model': 'true',
  },
  body: wavBuffer,
});

console.log('Whisper status:', res.status);
const data = await res.text();
console.log('Response:', data.slice(0, 300));
