import 'dotenv/config';

async function testModel(id) {
  const res = await fetch(`https://router.huggingface.co/hf-inference/models/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HF_API_KEY}`
    },
    body: JSON.stringify({ inputs: "Hello" })
  });
  console.log(id, res.status);
}

await testModel('HuggingFaceH4/zephyr-7b-beta');
await testModel('google/gemma-7b-it');
await testModel('Qwen/Qwen2.5-7B-Instruct');
