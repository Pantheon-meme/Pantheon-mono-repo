export class CucBalance {
  constructor(public balance: bigint = BigInt(0)) {}

  setConfirmed(balance: bigint): void {
    this.balance = balance;
  }
}
