import { ZeroString } from "./../@types/kinora-sdk";

const toHex = (number: number): ZeroString => {
  let hex = number.toString(16);
  if (hex.length % 2 !== 0) {
    hex = "0" + hex;
  }
  return ("0x" + hex) as ZeroString;
};

export default toHex;
