import { generateKeyPairSync, randomUUID } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateJwk = privateKey.export({ format: "jwk" });
const publicJwk = publicKey.export({ format: "jwk" });
const keyId = randomUUID();

privateJwk.kid = keyId;
privateJwk.alg = "EdDSA";
privateJwk.use = "sig";

publicJwk.kid = keyId;
publicJwk.alg = "EdDSA";
publicJwk.use = "sig";

console.log("Set these in your Convex deployment environment:");
console.log("");
console.log(`JWT_PRIVATE_KEY='${JSON.stringify(privateJwk)}'`);
console.log(`JWKS='${JSON.stringify({ keys: [publicJwk] })}'`);
