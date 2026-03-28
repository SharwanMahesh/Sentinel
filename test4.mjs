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

await testModel('facebook/bart-large-mnli');
