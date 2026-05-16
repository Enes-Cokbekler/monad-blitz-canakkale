import { recoverTypedDataAddress } from "viem";
import type { Address, TypedDataDomain } from "viem";

export const HUMANPASS_EIP712_PURPOSE = "Request HumanPass proof" as const;

export const HUMANPASS_EIP712_TYPES = {
  HumanPassVerification: [
    { name: "wallet", type: "address" },
    { name: "challengeId", type: "string" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "uint256" },
    { name: "expiresAt", type: "uint256" },
    { name: "purpose", type: "string" },
  ],
} as const;

export type HumanPassVerificationMessage = {
  wallet: Address;
  challengeId: string;
  nonce: string;
  issuedAt: bigint;
  expiresAt: bigint;
  purpose: typeof HUMANPASS_EIP712_PURPOSE;
};

export function getHumanPassDomain(
  chainId: number,
  verifyingContract?: Address,
): TypedDataDomain {
  return {
    name: "HumanPass",
    version: "1",
    chainId,
    verifyingContract,
  };
}

export function getHumanPassTypes() {
  return HUMANPASS_EIP712_TYPES;
}

export function buildHumanPassVerificationMessage(
  wallet: Address,
  challengeId: string,
  nonce: string,
  issuedAt: number,
  expiresAt: number,
): HumanPassVerificationMessage {
  return {
    wallet,
    challengeId,
    nonce,
    issuedAt: BigInt(issuedAt),
    expiresAt: BigInt(expiresAt),
    purpose: HUMANPASS_EIP712_PURPOSE,
  };
}

export async function verifyHumanPassSignature({
  wallet,
  challengeId,
  nonce,
  issuedAt,
  expiresAt,
  signature,
  chainId,
  verifyingContract,
}: {
  wallet: Address;
  challengeId: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  signature: `0x${string}`;
  chainId: number;
  verifyingContract?: Address;
}): Promise<Address> {
  return recoverTypedDataAddress({
    domain: getHumanPassDomain(chainId, verifyingContract),
    types: HUMANPASS_EIP712_TYPES,
    primaryType: "HumanPassVerification",
    message: buildHumanPassVerificationMessage(
      wallet,
      challengeId,
      nonce,
      issuedAt,
      expiresAt,
    ),
    signature,
  });
}
