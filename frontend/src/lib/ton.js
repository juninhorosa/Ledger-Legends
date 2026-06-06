import { beginCell } from "@ton/core";

/**
 * Build a base64 BoC payload containing a text comment (TON standard, op=0).
 * Used by TonConnect sendTransaction `payload` field so the recipient can
 * read it as `in_msg.message` via TON Center API.
 */
export function buildCommentPayload(text) {
  const cell = beginCell().storeUint(0, 32).storeStringTail(String(text)).endCell();
  return cell.toBoc().toString("base64");
}

/**
 * Convert a TON value to nano-tons (string for TonConnect).
 */
export function tonToNanoStr(amountTon) {
  const nano = BigInt(Math.round(Number(amountTon) * 1e9));
  return nano.toString();
}
