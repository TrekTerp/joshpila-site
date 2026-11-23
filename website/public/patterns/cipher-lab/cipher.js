(function (root) {
  "use strict";

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const isLetter = char => /^[A-Za-z]$/.test(char);
  const index = char => alphabet.indexOf(char.toUpperCase());
  const mod = (n, base) => ((n % base) + base) % base;

  function railAt(position, rails) {
    const period = 2 * (rails - 1);
    const offset = position % period;
    return Math.min(offset, period - offset);
  }

  function transform(message, mode, options) {
    const chars = Array.from(message);
    const letters = chars.filter(isLetter);
    const key = Array.from(options.key || "").filter(isLetter).map(index);
    const steps = [];
    const result = Array(letters.length);
    const decode = options.decode;
    if (mode === "vigenere" && !key.length) return null;

    if (mode === "rail") {
      const rails = options.rails;
      const tracks = Array.from({length: rails}, () => []);
      letters.forEach((_, i) => tracks[railAt(i, rails)].push(i));
      tracks.flat().forEach((plainPos, cipherPos) => {
        const source = decode ? cipherPos : plainPos;
        const target = decode ? plainPos : cipherPos;
        result[target] = letters[source];
        steps[source] = { source, target, plainPos, rail: railAt(plainPos, rails), input: letters[source], output: letters[source] };
      });
    } else {
      letters.forEach((char, i) => {
        const shift = mode === "caesar" ? options.shift : key[i % key.length];
        const outputIndex = mod(index(char) + (decode ? -shift : shift), 26);
        const symbol = alphabet[outputIndex];
        result[i] = char === char.toLowerCase() ? symbol.toLowerCase() : symbol;
        steps.push({ source: i, target: i, shift, input: char, output: result[i] });
      });
    }

    let nextLetter = 0;
    const text = chars.map(char => isLetter(char) ? result[nextLetter++] : char).join("");
    return {text, letters, result, steps};
  }

  function counts(letters) {
    const tally = Array(26).fill(0);
    for (const letter of letters) tally[index(letter)]++;
    return tally;
  }

  function power(base, exponent, prime) {
    let value = 1;
    for (let i = 0; i < exponent; i++) value = value * base % prime;
    return value;
  }

  const api = {alphabet, isLetter, index, mod, railAt, transform, counts, power};
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CipherMath = api;
})(globalThis);
