import 'dotenv/config';

const HF_KEY = process.env.HF_API_KEY;
console.log('Key present:', !!HF_KEY, HF_KEY?.slice(0, 6) + '...');

const res = await fetch('https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${HF_KEY}`,
    'x-wait-for-model': 'true',
  },
  body: JSON.stringify({
    inputs: 'Patient has chest pain and heavy bleeding, unconscious, age 45',
    parameters: {
      candidate_labels: ['chest pain', 'severe bleeding', 'unconscious', 'burn injury', 'minor scrape']
    }
  }),
});

console.log('Status:', res.status);
const data = await res.text();
console.log('Response:', data.slice(0, 500));
