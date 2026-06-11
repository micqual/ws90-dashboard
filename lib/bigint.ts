// Patch BigInt serialization for JSON
(BigInt.prototype as any).toJSON = function() {
  return this.toString()
}
