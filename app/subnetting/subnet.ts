export type Version = 4 | 6;
export type Problem = { version: Version; address: string; prefix: number };

export function parseAddress(input: string, version: Version): bigint | null {
  const value = input.trim();
  if (version === 4) {
    const parts = value.split('.');
    if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p) || Number(p) > 255)) return null;
    return parts.reduce((n, p) => n * 256n + BigInt(p), 0n);
  }
  if (!/^[0-9a-f:]+$/i.test(value)) return null;
  const halves = value.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const parts = [...left, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...right];
  if (parts.some(p => !/^[0-9a-f]{1,4}$/i.test(p))) return null;
  return parts.reduce((n, p) => n * 65536n + BigInt(`0x${p}`), 0n);
}

export function formatAddress(value: bigint, version: Version): string {
  if (version === 4) return [24, 16, 8, 0].map(shift => String((value >> BigInt(shift)) & 255n)).join('.');
  const parts = Array.from({ length: 8 }, (_, i) => ((value >> BigInt((7 - i) * 16)) & 65535n).toString(16));
  let start = -1, length = 1;
  for (let i = 0; i < 8;) {
    if (parts[i] !== '0') { i++; continue; }
    let end = i;
    while (end < 8 && parts[end] === '0') end++;
    if (end - i > length) { start = i; length = end - i; }
    i = end;
  }
  return start < 0 ? parts.join(':') : `${parts.slice(0, start).join(':')}::${parts.slice(start + length).join(':')}`;
}

export function solve(problem: Problem) {
  const bits = problem.version === 4 ? 32 : 128;
  const hostBits = bits - problem.prefix;
  const size = 1n << BigInt(hostBits);
  const address = parseAddress(problem.address, problem.version);
  if (address === null || problem.prefix < 1 || problem.prefix >= bits) throw new Error('Invalid practice problem');
  const network = address / size * size;
  const last = network + size - 1n;
  const fmt = (value: bigint) => formatAddress(value, problem.version);
  const base = [`Keep the first ${problem.prefix} of ${bits} bits; ${hostBits} bits remain for addresses within this block.`, `Set those ${hostBits} trailing bits to zero. The network is ${fmt(network)}.`, `The block contains 2^${hostBits} = ${size.toLocaleString('en-US')} addresses.`];
  const next = network + size;
  const rows = problem.version === 4 ? [
    { id: 'network', label: 'Network address', value: fmt(network), steps: base },
    { id: 'first', label: 'First host', value: fmt(network + 1n), steps: [base[1], 'The network address identifies the subnet and is not a host address.', `Add 1 to the network address: ${fmt(network + 1n)}.`] },
    { id: 'last', label: 'Last host', value: fmt(last - 1n), steps: [base[1], `Add the block size (${size}) minus 1 to get the broadcast: ${fmt(last)}.`, `Subtract 1 from the broadcast: ${fmt(last - 1n)}.`] },
    { id: 'broadcast', label: 'Broadcast', value: fmt(last), steps: [base[1], `Set all ${hostBits} host bits to 1. Equivalently, add ${size - 1n} to the network.`, `The broadcast address is ${fmt(last)}.`] },
    { id: 'next', label: 'Next subnet', value: next < (1n << BigInt(bits)) ? fmt(next) : 'none', steps: [base[1], `Add the full block size (${size}) to the network address. Carry into the preceding octet when a value exceeds 255.`, `The next /${problem.prefix} network is ${next < (1n << BigInt(bits)) ? fmt(next) : 'outside the address space (enter none)'}.`] },
  ] : [
    { id: 'network', label: 'Network prefix address', value: fmt(network), steps: [...base, 'Each hexadecimal digit represents 4 bits; each hextet represents 16. For a prefix that splits a digit, preserve only its network bits.'] },
    { id: 'first', label: 'Network + 1', value: fmt(network + 1n), steps: [base[1], `Add 1 in hexadecimal to get ${fmt(network + 1n)}.`, 'This is an address arithmetic exercise, not a guarantee of host assignability. IPv6 has reserved addresses, including subnet-router anycast.'] },
    { id: 'last', label: 'Last address in block', value: fmt(last), steps: [base[1], `Set the remaining ${hostBits} bits to 1 (a full hexadecimal digit becomes f).`, `The range ends at ${fmt(last)}. This is not a broadcast address; IPv6 has no broadcast.`] },
    { id: 'next', label: 'Next prefix address', value: next < (1n << BigInt(bits)) ? fmt(next) : 'none', steps: [base[1], `Add 2^${hostBits} to the network, carrying between hexadecimal digits and hextets.`, `The next /${problem.prefix} block starts at ${next < (1n << BigInt(bits)) ? fmt(next) : 'outside the address space (enter none)'}.`] },
    { id: 'count', label: 'Addresses in block', value: String(size), steps: [`Subtract the prefix length from 128: 128 − ${problem.prefix} = ${hostBits}.`, `Calculate 2^${hostBits} = ${size.toLocaleString('en-US')}.`, 'Count every address in the block. Do not subtract 2 as you would for conventional IPv4 usable hosts. Enter a decimal number.'] },
  ];
  return { rows, hostBits, size, network };
}

export function isCorrect(input: string, answer: string, version: Version, count = false) {
  if (answer === 'none') return input.trim().toLowerCase() === 'none';
  if (count) return /^\d+$/.test(input.trim()) && BigInt(input.trim()) === BigInt(answer);
  const parsed = parseAddress(input, version);
  return parsed !== null && parsed === parseAddress(answer, version);
}

export const prefixes = { 4: [8, 11, 16, 19, 20, 22, 24, 25, 26, 27, 28, 29, 30], 6: [32, 40, 48, 52, 56, 60, 64, 65, 73, 80, 96, 112, 120, 124, 126] };
export function newProblem(version: Version, prefix?: number): Problem {
  const choices = prefixes[version];
  const p = prefix ?? choices[Math.floor(Math.random() * choices.length)];
  const random = (max: number) => Math.floor(Math.random() * max);
  // Private/documentation ranges keep generated examples away from special-use boundaries.
  const address = version === 4 ? `10.${random(256)}.${random(256)}.${random(256)}` : `2001:db8:${Array.from({length: 6}, () => random(65536).toString(16)).join(':')}`;
  return { version, address, prefix: p };
}
