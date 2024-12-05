import { GetApi, HandlerContext, MiddlewareContext } from '@dbos-inc/dbos-sdk';
import { JwtHeader, verify } from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import querystring from "querystring";

type TokenPayload = {
  sub: string; // Subject
  roles?: string[]; // Optional roles array
  [key: string]: unknown; // Allow additional properties
}

// --- Configuration Constants ---
const AUTH0_ISSUER = "https://dev-n7n30lyv58l7gwl7.us.auth0.com/";
const JWKS_URI = `${AUTH0_ISSUER}.well-known/jwks.json`;
const CLIENT_ID = "3zsQ5a1TxicbHNzv0rIjraoI5jTVfCvv";
const TOKEN_ENDPOINT = `${AUTH0_ISSUER}oauth/token`;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = `${process.env.APP_URL}/callback`;

const jwksClient = jwksRsa({
  jwksUri: JWKS_URI,
});

const getKey = async (header: JwtHeader): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!header.kid) {
      return reject(new Error("No 'kid' found in token header"));
    }

    jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err || !key) {
        return reject(new Error("Unable to retrieve signing key"));
      }

      const publicKey = key.getPublicKey();
      if (!publicKey) {
        return reject(new Error("Signing key is undefined"));
      }

      resolve(publicKey);
    });
  });
};

// --- Authentication Middleware ---
export class AuthMiddleware {
  static async authenticate(ctx: MiddlewareContext): Promise<{
    authenticatedUser: string;
    authenticatedRoles: string[];
  }> {
    const token = ctx.koaContext?.header.authorization?.replace("Bearer ", "");
    if (!token) {
      throw new Error("Authorization token is required");
    }
    
    try {
      const decodedToken = await new Promise<TokenPayload>((resolve, reject) => {
        verify(
          token, // Validate the id_token
          async (header: JwtHeader, callback) => {
            try {
              const publicKey = await getKey(header);
              callback(null, publicKey);
            } catch (err) {
              callback(err as Error, undefined);
            }
          },
          {
            algorithms: ["RS256"],
            issuer: AUTH0_ISSUER,
            audience: CLIENT_ID, // Verify the audience matches the Client ID
          },
          (err, decoded) => {
            if (err) return reject(err);
            resolve(decoded as TokenPayload);
          }
        );
      });

      const roles = decodedToken[`${process.env.APP_URL}/claims/roles`] as string[] || [];
      
      return {
        authenticatedUser: decodedToken.sub,
        authenticatedRoles: roles
      };
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  @GetApi("/callback")
  static async callback(ctx: HandlerContext): Promise<string> {
    const { code } = ctx.request.query as { code: string };
  
    if (!code) {
      return `<h1>Error</h1><p>Authorization code not found in the query parameters.</p>`;
    }
  
    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: querystring.stringify({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });
  
    const rawResponse = await tokenResponse.text();
  
    if (!tokenResponse.ok) {
      return `<h1>Error</h1><p>Token endpoint returned an error: ${rawResponse}</p>`;
    }
  
    let tokenData;
    try {
      tokenData = JSON.parse(rawResponse);
    } catch (err) {
      return `<h1>Error</h1><p>Failed to parse token response: ${rawResponse}</p>`;
    }
  
    if (tokenData.error) {
      return `<h1>Error</h1><p>${tokenData.error_description}</p>`;
    }
  
    // Store id_token in localStorage
    const script = `
      <script>
        localStorage.setItem('id_token', '${tokenData.id_token}'); // Save id_token
        window.location.href = '/';
      </script>
    `;
  
    return `<p>Redirecting...</p>${script}`;
  }
}