// Quick test to see what's causing the case creation failure
const testData = {
  "name": "Test Case",
  "model": "LAYOUT-12x6-BOTH",
  "description": "Test description"
};

fetch('http://localhost:5000/api/cases', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response:', data);
})
.catch(error => {
  console.error('Error:', error);
});