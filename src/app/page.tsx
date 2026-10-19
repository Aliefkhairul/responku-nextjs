import { prisma } from "@/prisma/prisma";

export default async function Page() {
    const u = await prisma.user.findFirst({ where: { id: 1 } });
    if (!u) return <div>User not found</div>;

    return <div>Page</div>;
}
