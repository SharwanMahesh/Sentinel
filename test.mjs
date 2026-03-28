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
  const text = await res.text();
  console.log(text.slice(0, 100));
}

await testModel('mistralai/Mistral-7B-Instruct-v0.3');
await testModel('mistralai/Mistral-7B-Instruct-v0.2');
