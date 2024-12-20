import { GetApi, HandlerContext } from "@dbos-inc/dbos-sdk";

// --- Configuration Constants ---
const AUTH0_ISSUER = "https://dev-n7n30lyv58l7gwl7.us.auth0.com/";
const CLIENT_ID = "3zsQ5a1TxicbHNzv0rIjraoI5jTVfCvv";
const REDIRECT_URI = `${process.env.APP_URL}/callback`;

export class Frontend {
  @GetApi("/")
  static async home(_ctx: HandlerContext): Promise<string> {
    const page = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>DBOS Secure Workflow with Auth0</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="font-sans text-gray-800 p-6 max-w-2xl mx-auto">
        <h1 class="text-3xl font-semibold mb-4">Secure Workflow with Auth0</h1>
        <p class="mb-4">Log in with Auth0 and call a secure workflow endpoint:</p>
        <div class="flex gap-4">
          <button id="loginButton" class="bg-blue-500 text-white py-2 px-4 rounded">
            Log in with Auth0
          </button>
          <button id="logoutButton" class="bg-red-500 text-white py-2 px-4 rounded">
            Log Out
          </button>
        </div>
        <button id="callWorkflow" class="bg-green-500 text-white py-2 px-4 rounded mt-4">
          Call Secure Workflow
        </button>
        <script>
          const CLIENT_ID = '${CLIENT_ID}';
          const REDIRECT_URI = '${REDIRECT_URI}';
          const AUTH_ENDPOINT = '${AUTH0_ISSUER}authorize';
          const LOGOUT_ENDPOINT = '${AUTH0_ISSUER}v2/logout';
          const APP_URL = '${process.env.APP_URL}';

          document.getElementById('loginButton').addEventListener('click', () => {
            const authUrl = \`\${AUTH_ENDPOINT}?client_id=\${CLIENT_ID}&response_type=code&scope=openid profile email&redirect_uri=\${REDIRECT_URI}\`;
            window.location.href = authUrl;
          });

          document.getElementById('logoutButton').addEventListener('click', () => {
            // Clear tokens from localStorage
            localStorage.removeItem('id_token');
            localStorage.removeItem('access_token');
            
            // Redirect to Auth0 logout endpoint
            const logoutUrl = \`\${LOGOUT_ENDPOINT}?client_id=\${CLIENT_ID}&returnTo=\${APP_URL}\`;
            window.location.href = logoutUrl;
          });

          const token = localStorage.getItem('access_token');

          document.getElementById("callWorkflow").addEventListener("click", async () => {
            const idToken = localStorage.getItem("id_token"); // Use id_token here
            if (!idToken) {
              alert("Please log in first.");
              return;
            }
            const response = await fetch("/secure-workflow", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + idToken, // Send id_token
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ data: "Successfully ran secure workflow!" }),
            });
            const result = await response.text();
            alert(result);
          });
        </script>
      </body>
      </html>`;
    return page;
  }
}