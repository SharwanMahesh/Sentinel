import 'dotenv/config';

async function testModel(modelId) {
  const res = await fetch(`https://api-inference.huggingface.co/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HF_API_KEY}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: "Hello, just say OK" }],
      max_tokens: 50
    })
  });
  console.log(modelId, res.status);
  const text = await res.text();
  console.log(text.slice(0, 100));
}

await testModel('meta-llama/Llama-3.2-1B-Instruct');
await testModel('mistralai/Mistral-Nemo-Instruct-2407');
await testModel('Qwen/Qwen2.5-72B-Instruct');
