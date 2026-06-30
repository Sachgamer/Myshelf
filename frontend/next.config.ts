import type { NextConfig } from "next";
import os from "os";

const devOrigins = ['localhost', '127.0.0.1'];
try {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.address) {
        devOrigins.push(net.address);
      }
    }
  }
} catch (e) {}

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: devOrigins,
};

export default nextConfig;
