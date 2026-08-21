# Fleet Security Policy (tailnet_policy.json)

## Purpose
Restrict all external/non-fleet access to sensitive ports while maintaining full internal fleet connectivity.

## Key Rules
- **Fleet members (SQUIDSTATION, PINKCADY, STEALTHATTACK)**: Full access to all ports
- **Captain**: SSH + RDP access to all ships
- **Officers**: Service access to designated ports
- **EXTERNAL IPs**: Blocked from Docker API (2375) and direct Redis (6379)

## Fleet Members
- SQUIDSTATION: 192.168.0.39 / 100.83.247.14 (primary ops hub)
- PINKCADY: 192.168.0.3 (Torus Coffee operations)
- STEALTHATTACK: Tailscale-only (Sir Azure's workstation)

## Protected Ports
- **2375**: Docker API (insecure - BLOCKED externally)
- **6379**: Redis (BLOCKED externally)
- **3389**: RDP (Captain only)

## Deployment
Apply via Tailscale admin console or fleet-wide push script.
