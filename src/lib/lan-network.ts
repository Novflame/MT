import os from "node:os";

function isPrivateIPv4(address: string): boolean {
  const octets = address.split(".").map(Number);

  if (
    octets.length !== 4 ||
    !octets.every(
      (octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255,
    )
  ) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

export function getPrivateLanIPv4(): string | null {
  const interfaces = os.networkInterfaces();

  const candidates = Object.entries(interfaces).flatMap(
    ([name, entries]) =>
      (entries ?? [])
        .filter(
          (entry) =>
            entry.family === "IPv4" &&
            !entry.internal &&
            isPrivateIPv4(entry.address),
        )
        .map((entry) => {
          const adapter = name.toLowerCase();

          let priority = 2;

          if (/wi-?fi|wireless|wlan/.test(adapter)) {
            priority = 0;
          } else if (/ethernet/.test(adapter)) {
            priority = 1;
          } else if (
            /virtual|vmware|virtualbox|hyper-v|local area connection\*/.test(
              adapter,
            )
          ) {
            priority = 10;
          }

          return {
            address: entry.address,
            priority,
          };
        }),
  );

  candidates.sort((a, b) => a.priority - b.priority);

  return candidates[0]?.address ?? null;
}