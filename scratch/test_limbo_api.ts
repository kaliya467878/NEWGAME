const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdjM2E3NDAxLWRjOTQtNDZjMi04ODQ1LWQ5MWIwOGJmNjk4NSIsImlhdCI6MTc4NDAxMTQ5NywiZXhwIjoxNzg2NjAzNDk3fQ.S3HVP68VIf85Gyqo0tq41Z39aHDkixsQJ7oRQKMDwjw";

async function main() {
  const url = "http://localhost:3000/api/limbo/bets/my";
  console.log("Fetching:", url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  console.log("Response Status:", response.status);
  const text = await response.text();
  console.log("Response Text:", text);
}

main().catch(console.error);
