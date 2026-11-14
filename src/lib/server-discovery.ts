import dgram from "node:dgram";
import os from "node:os";
import { getPrivateLanIPv4 } from "@/lib/lan-network";

const DISCOVERY_GROUP = "239.255.77.77";
const DISCOVERY_PORT = Number(process.env.TASEETY_DISCOVERY_PORT ?? "47777");
const DISCOVERY_REQUEST = "TASEETY_DISCOVER_V1";

declare global {
  var __taseetyDiscoverySocket: dgram.Socket | undefined;
}

function normalizeAdvertisedUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    const hostname = url.hostname.toLowerCase();
    const loopbackNames = new Set([
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1",
    ]);

    const octets = hostname.split(".").map(Number);

    const isIPv4 =
      octets.length === 4 &&
      octets.every(
        (octet) =>
          Number.isInteger(octet) && octet >= 0 && octet <= 255,
      );

    const isPrivateIPv4 =
      isIPv4 &&
      (octets[0] === 10 ||
        (octets[0] === 172 &&
          octets[1] >= 16 &&
          octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168));

    if (isIPv4 && !isPrivateIPv4 && !loopbackNames.has(hostname)) {
      console.error(
        "[TASEETY discovery] Configured IPv4 address is not private.",
      );
      return null;
    }

    if (loopbackNames.has(hostname) || !isPrivateIPv4) {
      const lanAddress = getPrivateLanIPv4();

      if (!lanAddress) {
        console.error(
          "[TASEETY discovery] No usable private LAN IPv4 address found.",
        );
        return null;
      }

      url.hostname = lanAddress;
    }

    return url.origin;
  } catch (error) {
    console.error("[TASEETY discovery] Invalid BETTER_AUTH_URL:", error);
    return null;
  }
}

function getAdvertisedBaseUrl(): string | null {
  const configured =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

  if (!configured) {
    console.error("[TASEETY discovery] BETTER_AUTH_URL is not configured.");
    return null;
  }

  return normalizeAdvertisedUrl(configured);
}

/**
 * Starts the LAN discovery responder inside the existing Next.js server process.
 * Tauri clients send a UDP multicast query; this process replies directly to the
 * requesting device with the server's LAN address.
 */
export function startTaseetyServerDiscovery(): void {
  if (globalThis.__taseetyDiscoverySocket) return;

  const baseUrl = getAdvertisedBaseUrl();
  if (!baseUrl) return;

  const interfaceAddress = getPrivateLanIPv4();

  if (!interfaceAddress) {
    console.error(
      "[TASEETY discovery] No private LAN IPv4 address was available for multicast binding.",
    );
    return;
  }

  const socket = dgram.createSocket({
    type: "udp4",
    reuseAddr: true,
  });

  socket.on("error", (error) => {
    console.error("[TASEETY discovery] UDP socket error:", error);

    try {
      socket.close();
    } catch {
      // Ignore close errors during shutdown.
    }

    if (globalThis.__taseetyDiscoverySocket === socket) {
      globalThis.__taseetyDiscoverySocket = undefined;
    }
  });

  socket.on("close", () => {
    if (globalThis.__taseetyDiscoverySocket === socket) {
      globalThis.__taseetyDiscoverySocket = undefined;
    }
  });

  socket.on("message", (message, remote) => {
    if (message.toString("utf8").trim() !== DISCOVERY_REQUEST) return;

    const response = JSON.stringify({
      service: "taseety",
      protocolVersion: 1,
      serverId:
        process.env.TASEETY_SERVER_ID ??
        os.hostname().toLowerCase(),
      serverName:
        process.env.TASEETY_SERVER_NAME ??
        os.hostname(),
      baseUrl,
    });

    socket.send(response, remote.port, remote.address, (error) => {
      if (error) {
        console.error("[TASEETY discovery] Could not reply:", error);
      }
    });
  });

  socket.bind(DISCOVERY_PORT, "0.0.0.0", () => {
    try {
      socket.setMulticastTTL(1);
      socket.setMulticastLoopback(true);
      socket.setMulticastInterface(interfaceAddress);
      socket.addMembership(DISCOVERY_GROUP, interfaceAddress);

      globalThis.__taseetyDiscoverySocket = socket;

      console.info(
        `[TASEETY discovery] Listening on UDP ${DISCOVERY_PORT} on ${interfaceAddress}; advertising ${baseUrl}`,
      );
    } catch (error) {
      console.error(
        "[TASEETY discovery] Could not join multicast group:",
        error,
      );

      socket.close();
    }
  });
}