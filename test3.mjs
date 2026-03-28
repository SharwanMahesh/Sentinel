import 'dotenv/config';

async function testModel(modelId) {
  const res = await fetch(`https://router.huggingface.co/hf-inference/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HF_API_KEY}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 50
    })
  });
  console.log(modelId, res.status);
  const text = await res.text();
  console.log(text.slice(0, 100));
}

await testModel('mistralai/Mistral-7B-Instruct-v0.3');
