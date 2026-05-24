const fetch = require('node-fetch');

async function test() {
  const Legajo = "TEST-" + Math.floor(Math.random() * 1000);
  try {
    const res = await fetch('http://localhost:5173/api/admin/add-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: Legajo,
        name: "Test User",
        password: "123"
      })
    });
    
    const data = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Fetch failed", err);
  }
}

test();
