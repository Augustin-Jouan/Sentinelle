import { prisma } from '@/donnees/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
	if (!process.env.BETTER_AUTH_SECRET || !process.env.DATABASE_URL) {
		return Response.json({ ok: false }, { status: 503 });
	}
	try {
		await prisma.$queryRaw`SELECT 1`;
		return Response.json({ ok: true });
	} catch {
		return Response.json({ ok: false }, { status: 503 });
	}
}
