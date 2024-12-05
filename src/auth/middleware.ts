import { MiddlewareContext } from '@dbos-inc/dbos-sdk';
import { JwtHeader, verify } from "jsonwebtoken";
import jwksRsa from "jwks-rsa";

type TokenPayload = {
  sub: string; // Subject
  roles?: string[]; // Optional roles array
  [key: string]: unknown; // Allow additional properties
}

// --- Configuration Constants ---
const AUTH0_ISSUER = "https://dev-n7n30lyv58l7gwl7.us.auth0.com/";
const JWKS_URI = `${AUTH0_ISSUER}.well-known/jwks.json`;
const CLIENT_ID = "3zsQ5a1TxicbHNzv0rIjraoI5jTVfCvv";

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
}