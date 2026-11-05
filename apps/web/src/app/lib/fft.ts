
/**
 * ÉCLAT — Reusable Radix-2 FFT
 *
 * In-place forward Fast Fourier Transform.
 * Uses real and imaginary input arrays.
 */

export function fft(
  real: Float64Array,
  imag: Float64Array
): void {
  const n = real.length;

  if (
    n !== imag.length ||
    n < 2 ||
    (n & (n - 1)) !== 0
  ) {
    throw new Error(
      "FFT requires equal-length power-of-two arrays."
    );
  }

  // Bit-reversal permutation.
  let j = 0;

  for (let i = 1; i < n; i++) {
    let bit = n >> 1;

    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }

    j ^= bit;

    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Iterative butterfly stages.
  for (let len = 2; len <= n; len *= 2) {
    const angle = (-2 * Math.PI) / len;
    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);

    for (let start = 0; start < n; start += len) {
      let wr = 1;
      let wi = 0;

      for (let k = 0; k < len / 2; k++) {
        const even = start + k;
        const odd = even + len / 2;

        const tr =
          real[odd] * wr - imag[odd] * wi;

        const ti =
          real[odd] * wi + imag[odd] * wr;

        const er = real[even];
        const ei = imag[even];

        real[even] = er + tr;
        imag[even] = ei + ti;

        real[odd] = er - tr;
        imag[odd] = ei - ti;

        const nextWr =
          wr * stepReal - wi * stepImag;

        wi = wr * stepImag + wi * stepReal;
        wr = nextWr;
      }
    }
  }
}
