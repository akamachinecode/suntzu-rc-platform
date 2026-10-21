// Health check for load balancers, Docker and uptime monitors: GET /api/health
export function GET() {
  return Response.json({ status: "ok" });
}
